export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { addOrUpdateDevice, getDevice } from "@/lib/deviceRegistry";
import { createOnchainAccount } from "@/lib/solanaService";

export async function POST(req: NextRequest) {
  try {
    // Importa libs dinamicamente
    const { randomBytes } = await import("crypto");
    const { sha256 } = await import("js-sha256");
    const { ec: EC } = await import("elliptic");

    const ec = new EC("secp256k1");

    const body = await req.json();
    const { macAddress, publicKey, signature, challenge } = body;

    if (!macAddress || !publicKey) {
      return NextResponse.json(
        { error: "macAddress e publicKey são obrigatórios" },
        { status: 400 }
      );
    }

    // Etapa: gerar challenge
    if (!signature && !challenge) {
      const nonce = randomBytes(32).toString("hex");
      await addOrUpdateDevice(publicKey, {
        macAddress,
        publicKey,
        challenge: nonce,
      });
      return NextResponse.json({ challenge: nonce });
    }

    // Etapa: validar assinatura
    const device = await getDevice(publicKey);
    if (!device || !device.challenge) {
      return NextResponse.json(
        { error: "challenge não encontrado" },
        { status: 400 }
      );
    }

    // --- Corrigir formato da chave pública para elliptic ---
    const pubKeyXY = publicKey.startsWith("04") ? publicKey.slice(2) : publicKey;
    const pub = ec.keyFromPublic(pubKeyXY, "hex");

    // --- Hash do challenge ---
    const hashHex = sha256(Buffer.from(device.challenge, "hex"));

    // --- Extrair r+s da assinatura hex concatenada ---
    if (!signature || signature.length !== 128) {
      return NextResponse.json(
        { error: "assinatura inválida (formato errado)" },
        { status: 400 }
      );
    }
    const sigObj = { r: signature.slice(0, 64), s: signature.slice(64, 128) };

    // --- Verificar assinatura ---
    const verified = pub.verify(hashHex, sigObj);
    if (!verified) {
      return NextResponse.json(
        { error: "assinatura inválida" },
        { status: 401 }
      );
    }

    // Etapa: criar conta on-chain
    const { nftAddress, txSignature } = await createOnchainAccount();

    // Etapa: Atualizar registro
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
