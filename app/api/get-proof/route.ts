import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

/**
 * Busca a Prova Merkle para um hash de dados específico.
 * Recebe via query: /api/get-proof?hash=...
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const hash = searchParams.get('hash');

    if (!hash) {
        return NextResponse.json({ error: "O hash do dado é obrigatório" }, { status: 400 });
    }

    try {
        const proofKey = `proof:${hash}`;
        const proofData = await redis.get(proofKey);

        if (!proofData) {
            return NextResponse.json({ error: "Prova não encontrada. O dado pode não ter sido processado ou é inválido." }, { status: 404 });
        }

        // Retorna a prova (que está como string JSON)
        return NextResponse.json(JSON.parse(proofData), { status: 200 });

    } catch (error: any) {
        console.error("Erro ao buscar prova no Redis:", error);
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
    }
}