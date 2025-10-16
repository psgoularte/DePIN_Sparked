import { NextRequest, NextResponse } from "next/server";
import { getDeviceByNft, addOrUpdateDevice } from "@/lib/deviceRegistry";
import stringify from "json-stable-stringify";

async function analyzeDataWithHuggingFace(payloadString: string) {
  const API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1";
  const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_API_KEY;
  if (!HUGGINGFACE_TOKEN) throw new Error("Hugging Face API key is not set.");

  const prompt = `
    Context: You are an IoT data analyst.
    Task: Analyze the following JSON and determine if the data is coherent or an anomaly.
    Data: ${payloadString}
    Question: Does this data look coherent between thmeselves? Answer only with "YES" or "NO".
  `;
  
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${HUGGINGFACE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!response.ok) throw new Error(`Hugging Face API request failed with status ${response.status}`);

    const result = await response.json();
    const answer = result[0]?.generated_text || "NO";
    const isCoherent = answer.trim().toUpperCase() === "YES";
    const reason = isCoherent ? "Data appears to be within expected parameters." : "Data appears to be an anomaly or out of the ordinary.";
    return { isCoherent, reason, rawAnswer: answer };
  } catch (error) {
    console.error("Failed to analyze data with Hugging Face:", error);
    throw error;
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