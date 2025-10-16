import { NextRequest, NextResponse } from "next/server";
import elliptic from "elliptic";
import BN from "bn.js";
import { sha256 } from "js-sha256";
import { getDeviceByNft, addOrUpdateDevice } from "@/lib/deviceRegistry";

const ec = new elliptic.ec("secp256k1");
const MAX_TIME_SKEW = parseInt(process.env.MAX_TIME_SKEW || "300"); // segundos

export async function POST(req: NextRequest) {
  try {
    const { nftAddress, payloadString, signature } = await req.json();

    if (!nftAddress || !payloadString || !signature) {
      return NextResponse.json({ error: "Campos ausentes" }, { status: 400 });
    }

    const device = await getDeviceByNft(nftAddress);
    if (!device)
      return NextResponse.json({ error: "Dispositivo não encontrado" }, { status: 404 });
    if (device.revoked)
      return NextResponse.json({ error: "Dispositivo revogado" }, { status: 403 });

    // --- Verificação da assinatura ---
    if (!signature || signature.length !== 128) {
      return NextResponse.json({ error: "Assinatura inválida ou tamanho errado" }, { status: 400 });
    }

    const r = new BN(signature.slice(0, 64), 16);
    const s = new BN(signature.slice(64, 128), 16);

    let pub;
    try {
      const pubKey = device.publicKey.startsWith("04") ? device.publicKey.slice(2) : device.publicKey;
      pub = ec.keyFromPublic(pubKey, "hex");
    } catch (e) {
      console.error("Erro ao criar keyFromPublic:", e);
      return NextResponse.json({ error: "Erro ao processar publicKey" }, { status: 500 });
    }
    const hashHex = sha256(payloadString);
    const verified = pub.verify(hashHex, { r, s });
    if (!verified) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }

    // --- Parse do payload JSON ---
    let payload: any;
    try {
      payload = JSON.parse(payloadString);
    } catch {
      return NextResponse.json({ error: "payloadString não é JSON válido" }, { status: 400 });
    }

    const ts = Number(payload.ts);
    const now = Math.floor(Date.now() / 1000);

    // --- Validação do timestamp ---
    if (!ts || Math.abs(now - ts) > MAX_TIME_SKEW) {
      return NextResponse.json({ error: "timestamp fora da janela" }, { status: 400 });
    }

    // --- Proteção contra replay ---
    if (device.lastTsSeen && ts <= device.lastTsSeen) {
      return NextResponse.json({ error: "replay detectado" }, { status: 409 });
    }

    await addOrUpdateDevice(device.publicKey, { lastTsSeen: ts });

    return NextResponse.json({ status: "accepted", receivedAt: now });
  } catch (err: any) {
    console.error("Erro sensor-data:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
