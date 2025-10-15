export const runtime = "nodejs"; // Garante que use ambiente Node (com crypto, Buffer, etc.)

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createOnchainAccount } from "@/lib/solanaService";
import { addOrUpdateDevice, getDevice } from "@/lib/deviceRegistry";
import * as elliptic from "elliptic";
import { sha256 } from "js-sha256";

const EC = elliptic.ec;
const ec = new EC("secp256k1");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { macAddress, publicKey, signature, challenge } = body;

    if (!macAddress || !publicKey) {
      return NextResponse.json(
        { error: "macAddress e publicKey são obrigatórios" },
        { status: 400 }
      );
    }

    // === Etapa 1: gerar challenge ===
    if (!signature && !challenge) {
      const nonce = randomBytes(32).toString("hex");
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
      return NextResponse.json(
        { error: "challenge não encontrado" },
        { status: 400 }
      );
    }

    const pub = ec.keyFromPublic(publicKey, "hex");
    const hashHex = sha256(Buffer.from(device.challenge, "hex"));
    const verified = pub.verify(hashHex, signature);

    if (!verified) {
      return NextResponse.json(
        { error: "assinatura inválida" },
        { status: 401 }
      );
    }

    // Cria a conta on-chain
    const { nftAddress, txSignature } = await createOnchainAccount();

    // Atualiza o registro do dispositivo
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
    return NextResponse.json(
      { error: "Erro ao registrar dispositivo" },
      { status: 500 }
    );
  }
}
