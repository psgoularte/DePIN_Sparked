import { NextRequest, NextResponse } from "next/server";
import elliptic from "elliptic";
import { sha256 } from "js-sha256";
import { getDeviceByNft, addOrUpdateDevice } from "@/lib/deviceRegistry";

const ec = new elliptic.ec("secp256k1");
const MAX_TIME_SKEW = parseInt(process.env.MAX_TIME_SKEW || "300");

export async function POST(req: NextRequest) {
  try {
    const { nftAddress, payloadString, signature } = await req.json();

    if (!nftAddress || !payloadString || !signature) {
      return NextResponse.json({ error: "Campos ausentes" }, { status: 400 });
    }

    const device = await getDeviceByNft(nftAddress);
    if (!device) return NextResponse.json({ error: "Dispositivo não encontrado" }, { status: 404 });
    if (device.revoked) return NextResponse.json({ error: "Dispositivo revogado" }, { status: 403 });

    const pub = ec.keyFromPublic(device.publicKey, "hex");
    const hashHex = sha256(payloadString);
    const verified = pub.verify(hashHex, signature);
    if (!verified) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }

    const payload = JSON.parse(payloadString);
    const ts = Number(payload.ts);
    const now = Math.floor(Date.now() / 1000);
    if (!ts || Math.abs(now - ts) > MAX_TIME_SKEW)
      return NextResponse.json({ error: "timestamp fora da janela" }, { status: 400 });

    if (device.lastTsSeen && ts <= device.lastTsSeen)
      return NextResponse.json({ error: "replay detectado" }, { status: 409 });

    await addOrUpdateDevice(device.publicKey, { lastTsSeen: ts });

    return NextResponse.json({ status: "accepted", receivedAt: now });
  } catch (err: any) {
    console.error("Erro sensor-data:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
