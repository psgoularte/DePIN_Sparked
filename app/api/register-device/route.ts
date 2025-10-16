// app/api/register-device/route.ts
import { NextRequest, NextResponse } from "next/server";
import { addOrUpdateDevice, getDeviceByPubKey } from "@/lib/deviceRegistry";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { macAddress, publicKey, challenge, signature } = body;

    // --- Etapa 1: Request challenge ---
    if (!challenge && !signature) {
      if (!macAddress || !publicKey) {
        return NextResponse.json(
          { error: "Missing macAddress or publicKey" },
          { status: 400 }
        );
      }

      // Gerar challenge aleatório (hex string 32 bytes)
      const challengeValue = crypto.randomBytes(32).toString("hex");

      // Salvar temporariamente no registro do dispositivo (ou DB)
      await addOrUpdateDevice(publicKey, { macAddress, challenge: challengeValue });

      return NextResponse.json({ challenge: challengeValue });
    }

    // --- Etapa 2: Respond with signed challenge ---
    if (!publicKey || !challenge || !signature) {
      return NextResponse.json(
        { error: "Missing fields for signature verification" },
        { status: 400 }
      );
    }

    // Import dinâmico (evita erro no build)
    const elliptic = await import("elliptic");
    const { sha256 } = await import("js-sha256");
    const BN = (await import("bn.js")).default;

    const ec = new elliptic.ec("secp256k1");

    const device = await addOrUpdateDevice(publicKey, { challenge });
    if (!device || device.challenge !== challenge) {
      return NextResponse.json({ error: "Invalid challenge" }, { status: 401 });
    }

    // Verifica a assinatura
    const msgHash = sha256(challenge);
    const key = ec.keyFromPublic(publicKey, "hex");
    const sig = {
      r: new BN(signature.r, 16),
      s: new BN(signature.s, 16),
    };

    const valid = key.verify(msgHash, sig);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // --- Registro final ---
    const updatedDevice = await addOrUpdateDevice(publicKey, {
      macAddress: device.macAddress,
      challenge: undefined , // limpa challenge
    });

    // Aqui você pode gerar ou recuperar o NFT associado
    const nftAddress = updatedDevice.nftAddress || "NFT_" + crypto.randomBytes(16).toString("hex");
    updatedDevice.nftAddress = nftAddress;

    return NextResponse.json({ nftAddress });
  } catch (err: any) {
    console.error("Register device error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
