import { NextRequest, NextResponse } from "next/server";
import { getDeviceByNft, addOrUpdateDevice } from "@/lib/deviceRegistry";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const elliptic = await import("elliptic");
    const { sha256 } = await import("js-sha256");
    const BN = (await import("bn.js")).default;

    const ec = new elliptic.ec("secp256k1");

    const { nftAddress, signature, message, temperature, humidity } = body;

    if (!nftAddress || !signature || !message || temperature === undefined || humidity === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const device = await getDeviceByNft(nftAddress);
    if (!device) {
      return NextResponse.json({ error: "Device not registered" }, { status: 404 });
    }

    const msgHash = sha256(message);
    const key = ec.keyFromPublic(device.publicKey, "hex");
    const sig = {
      r: new BN(signature.r, 16),
      s: new BN(signature.s, 16),
    };

    const valid = key.verify(msgHash, sig);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Aqui você poderia salvar no banco ou enviar para blockchain
    console.log(`📡 Sensor data received from ${nftAddress}:`, {
      temperature,
      humidity,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Sensor data error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
