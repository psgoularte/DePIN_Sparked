import { NextRequest, NextResponse } from "next/server";
import { getDeviceByNft } from "@/lib/deviceRegistry";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nftAddress, signature, payload } = body;

    if (!nftAddress || !signature || !payload) {
      return NextResponse.json(
        { error: "Missing required fields: nftAddress, signature, or payload" },
        { status: 400 }
      );
    }
    
    const device = await getDeviceByNft(nftAddress);
    if (!device) {
      return NextResponse.json({ error: "Device not registered" }, { status: 404 });
    }

    const elliptic = await import("elliptic");
    const { sha256 } = await import("js-sha256");
    const BN = (await import("bn.js")).default;
    const ec = new elliptic.ec("secp256k1");

    const payloadString = JSON.stringify(payload);
    const msgHash = sha256(payloadString);
    
    const key = ec.keyFromPublic(device.publicKey, "hex");
    const sig = {
      r: new BN(signature.r, 16),
      s: new BN(signature.s, 16),
    };

    const isValid = key.verify(msgHash, sig);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    console.log(`✅ Data received from ${nftAddress} and verified:`, payload);
    
    return NextResponse.json({ success: true, message: "Data received" });

  } catch (error: any) {
    console.error("Sensor data error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}