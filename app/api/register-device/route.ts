import { NextRequest, NextResponse } from "next/server";
import { addOrUpdateDevice } from "@/lib/deviceRegistry";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Import dinâmico (evita erro no build)
    const elliptic = await import("elliptic");
    const { sha256 } = await import("js-sha256");
    const BN = (await import("bn.js")).default;

    const ec = new elliptic.ec("secp256k1");

    const { publicKey, signature, message, nftAddress } = body;

    if (!publicKey || !signature || !message || !nftAddress) {
      return NextResponse.json(
        { error: "Missing fields in request" },
        { status: 400 }
      );
    }

    // Verifica a assinatura
    const msgHash = sha256(message);
    const key = ec.keyFromPublic(publicKey, "hex");
    const sig = {
      r: new BN(signature.r, 16),
      s: new BN(signature.s, 16),
    };

    const valid = key.verify(msgHash, sig);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Registra ou atualiza o dispositivo
    const device = await addOrUpdateDevice(nftAddress, publicKey);
    return NextResponse.json({ success: true, device });
  } catch (error: any) {
    console.error("Register device error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
