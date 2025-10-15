import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createOnchainAccount } from "@/lib/solanaService";
import { addOrUpdateDevice, getDevice } from "@/lib/deviceRegistry";
import { verify } from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { macAddress, publicKey, signature, challenge } = body;

  if (!macAddress || !publicKey) {
    return NextResponse.json({ error: "macAddress e publicKey são obrigatórios" }, { status: 400 });
  }

  // === Etapa 1: gerar challenge ===
  if (!signature && !challenge) {
    const nonce = bytesToHex(randomBytes(32));
    await addOrUpdateDevice(publicKey, {
      macAddress,
      publicKey,
      challenge: nonce,
    });
    return NextResponse.json({ challenge: nonce });
  }

  // === Etapa 2: validar assinatura do challenge ===
  const device = await getDevice(publicKey);
  if (!device || !device.challenge) {
    return NextResponse.json({ error: "Challenge não encontrado ou já utilizado" }, { status: 400 });
  }

  try {
    const messageHash = sha256(hexToBytes(device.challenge));
    const isVerified = verify(signature, messageHash, publicKey);

    if (!isVerified) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }

    const { nftAddress, txSignature } = await createOnchainAccount();

    await addOrUpdateDevice(publicKey, {
      macAddress,
      publicKey,
      nftAddress,
      txSignature,
      lastTsSeen: null,
      revoked: false,
      challenge: undefined,
    });

    return NextResponse.json({
      status: "success",
      nftAddress,
      txSignature,
    });
  } catch (err: any) {
    console.error("Erro no registro:", err);
    return NextResponse.json({ error: "Erro ao registrar dispositivo", details: err.message }, { status: 500 });
  }
}