import { NextRequest, NextResponse } from "next/server";
import { getDeviceByNft, addOrUpdateDevice } from "@/lib/deviceRegistry";
import stringify from "json-stable-stringify";

async function analyzeWithFallbackModel(payloadString: string, HUGGINGFACE_TOKEN: string) {
  console.log("⚠️ Primary AI model failed. Using fallback classification model.");
  const API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-mnli";
  
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${HUGGINGFACE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: payloadString,
        parameters: { candidate_labels: ["plausible data", "implausible data"] },
      }),
    });

    if (!response.ok) throw new Error("Fallback model also failed.");

    const result = await response.json();
    const isCoherent = result.labels[0] === "plausible data";
    const reason = `Fallback analysis classified data as '${result.labels[0]}' with score ${result.scores[0].toFixed(2)}.`;
    return { isCoherent, reason, rawResult: result };
  } catch (error) {
    console.error("Fallback AI analysis failed:", error);
    throw error; // Propagate the error if the fallback also fails
  }
}

// --- Primary Analyzer ---
async function analyzeDataWithHuggingFace(payloadString: string) {
  const PRIMARY_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1";
  const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_API_KEY;
  if (!HUGGINGFACE_TOKEN) throw new Error("Hugging Face API key is not set.");

  const prompt = `
[INST]
You are a common-sense data analyst. Look at the JSON payload below. Does it describe a plausible, real-world situation, or is it an anomaly/absurd? Answer only with "YES" for plausible or "NO" for implausible.

JSON to Analyze:
\`\`\`json
${payloadString}
\`\`\`
[/INST]
`;

  try {
    const response = await fetch(PRIMARY_API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${HUGGINGFACE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 5 }
      }),
    });

    // If the primary model is unavailable, trigger the fallback
    if (response.status === 404 || response.status === 503) {
      return await analyzeWithFallbackModel(payloadString, HUGGINGFACE_TOKEN);
    }
    if (!response.ok) throw new Error(`Primary model request failed with status ${response.status}`);

    const result = await response.json();
    const generatedText = result[0]?.generated_text || "";
    const answer = generatedText.split('[/INST]').pop()?.trim() || "NO";
    const isCoherent = answer.toUpperCase().startsWith("YES");
    const reason = isCoherent
      ? "Primary AI deemed the data plausible."
      : `Primary AI deemed the data implausible. Raw answer: '${answer}'`;
    return { isCoherent, reason, rawAnswer: answer };

  } catch (error) {
    console.error("Failed to analyze data with Hugging Face primary model, attempting fallback:", error);
    try {
        return await analyzeWithFallbackModel(payloadString, HUGGINGFACE_TOKEN);
    } catch (fallbackError) {
        throw fallbackError; // If fallback also fails, then we give up
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nftAddress, signature, payload } = body;
    const payloadString = payload ? stringify(payload) : undefined;

    if (!nftAddress || !signature || !payloadString) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    const { timestamp } = payload;
    if (typeof timestamp !== 'number') {
      return NextResponse.json({ error: "Payload must include a valid 'timestamp' field." }, { status: 400 });
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const dataAgeInSeconds = nowInSeconds - timestamp;
    const TEN_MINUTES_IN_SECONDS = 10 * 60;

    if (dataAgeInSeconds > TEN_MINUTES_IN_SECONDS) {
      return NextResponse.json({ error: "Data is too old.", details: `Received data is ${dataAgeInSeconds}s old.` }, { status: 408 });
    }
    if (dataAgeInSeconds < 0) {
      return NextResponse.json({ error: "Data timestamp is in the future." }, { status: 400 });
    }

    const device = await getDeviceByNft(nftAddress);
    if (!device) {
      return NextResponse.json({ error: "Device not registered" }, { status: 404 });
    }

    const elliptic = await import("elliptic");
    const { sha256 } = await import("js-sha256");
    const BN = (await import("bn.js")).default;
    const ec = new elliptic.ec("secp256k1");
    const msgHash = sha256(payloadString);
    const key = ec.keyFromPublic(device.publicKey, "hex");
    const sig = { r: new BN(signature.r, 16), s: new BN(signature.s, 16) };
    const isValid = key.verify(msgHash, sig);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    console.log(`✅ Data received from ${nftAddress} and verified (Timestamp OK):`, payload);

    // Update last seen timestamp for rate-limiting purposes
    try {
      await addOrUpdateDevice(device.publicKey, { 
        macAddress: device.macAddress, 
        nftAddress: device.nftAddress, 
        lastTsSeen: Date.now() 
      });
    } catch (dbError: any) {
      console.error("Failed to update lastTsSeen:", dbError.message);
    }
    let aiAnalysis: any = null;
    try {
      aiAnalysis = await analyzeDataWithHuggingFace(payloadString);
      console.log("🤖 AI Analysis (Hugging Face):", aiAnalysis);
    } catch (aiError: any) {
      aiAnalysis = { error: "AI analysis failed.", details: aiError.message };
    }

    return NextResponse.json({ 
      success: true, 
      message: "Data received",
      analysis: aiAnalysis
    });

  } catch (error: any) {
    console.error("Sensor data error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}