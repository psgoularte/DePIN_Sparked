import { NextRequest, NextResponse } from "next/server";
import elliptic from "elliptic";
import { sha256 } from "js-sha256";
import { getDeviceByNft, revokeDevice } from "@/lib/deviceRegistry";

const ec = new elliptic.ec("secp256k1");

export async function POST(req: NextRequest) {
  try {
    const { nftAddress, signature } = await req.json();

    if (!nftAddress || !signature) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const device = await getDeviceByNft(nftAddress);
    if (!device) return NextResponse.json({ error: "Dispositivo não encontrado" }, { status: 404 });
    if (device.revoked) return NextResponse.json({ error: "Já revogado" }, { status: 400 });

    const message = `revoke:${nftAddress}`;
    const pub = ec.keyFromPublic(device.publicKey, "hex");
    const hashHex = sha256(message);
    const verified = pub.verify(hashHex, signature);

    if (!verified) {
      return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
    }

    await revokeDevice(nftAddress);
    return NextResponse.json({ status: "revoked", nftAddress });
  } catch (err: any) {
    console.error("Erro revogação:", err);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
