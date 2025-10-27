// Em: app/api/sensor-data/route.ts (ou similar)

import { NextRequest, NextResponse } from "next/server";
// Funções do registro de dispositivos e serviço Solana
import { getDeviceByNft, addOrUpdateDevice, DeviceEntry } from "@/lib/deviceRegistry"; 
import { getNftOwner } from "@/lib/solanaService"; 
// Cliente Redis para rate limiting E ARMAZENAMENTO DE DADOS
import redis from "@/lib/redis";
// Para garantir a serialização canônica do JSON
import stringify from "json-stable-stringify";

/**
 * (Opcional) Função assíncrona para analisar a plausibilidade dos dados usando a API da Hugging Face.
 * ... (Todo o seu código da função analyzeDataWithHuggingFace vai aqui, se você decidir usá-la) ...
 */
async function analyzeDataWithHuggingFace(payloadString: string) {
  // Modelo primário (instrução)
  const PRIMARY_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1";
  // Modelo de fallback (classificação zero-shot)
  const FALLBACK_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-mnli";
  const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_API_KEY;
  if (!HUGGINGFACE_TOKEN) throw new Error("Hugging Face API key is not set.");

  // Prompt para o modelo primário
  const primaryPrompt = `
[INST]
You are a common-sense data analyst. Look at the JSON payload below. Does it describe a plausible, real-world situation, or is it an anomaly/absurd? Answer only with "YES" for plausible or "NO" for implausible.

JSON to Analyze:
\`\`\`json
${payloadString}
\`\`\`
[/INST]
`;

  try {
    // Tenta chamar o modelo primário
    const responsePrimary = await fetch(PRIMARY_API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${HUGGINGFACE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: primaryPrompt, parameters: { max_new_tokens: 5 } }),
    });

    // Se o primário falhar (404 ou 503), tenta o fallback
    if (responsePrimary.status === 404 || responsePrimary.status === 503) {
      console.warn("Primary AI model unavailable. Using fallback classification model.");
      const responseFallback = await fetch(FALLBACK_API_URL, {
          method: "POST",
          headers: { "Authorization": `Bearer ${HUGGINGFACE_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({
              inputs: payloadString,
              parameters: { candidate_labels: ["plausible data", "implausible data"] },
          }),
      });
      if (!responseFallback.ok) throw new Error("Fallback model also failed.");
      const resultFallback = await responseFallback.json();
      const isCoherentFb = resultFallback.labels[0] === "plausible data";
      const reasonFb = `Fallback analysis classified data as '${resultFallback.labels[0]}' with score ${resultFallback.scores[0].toFixed(2)}.`;
      return { isCoherent: isCoherentFb, reason: reasonFb, rawResult: resultFallback };
    }
    
    // Se o primário respondeu, mas com erro, lança exceção
    if (!responsePrimary.ok) throw new Error(`Primary model request failed with status ${responsePrimary.status}`);

    // Processa a resposta do modelo primário
    const resultPrimary = await responsePrimary.json();
    const generatedText = resultPrimary[0]?.generated_text || "";
    const answer = generatedText.split('[/INST]').pop()?.trim() || "NO";
    const isCoherentPr = answer.toUpperCase().startsWith("YES");
    const reasonPr = isCoherentPr ? "Primary AI deemed the data plausible." : `Primary AI deemed the data implausible. Raw answer: '${answer}'`;
    return { isCoherent: isCoherentPr, reason: reasonPr, rawAnswer: answer };

  } catch (error) {
    console.error("Failed to analyze data with Hugging Face:", error);
    // Retorna um erro genérico se a análise falhar completamente
    return { error: "AI analysis failed.", details: (error as Error).message };
  }
}
// -----------------------------------------------------------------


/**
 * Endpoint principal para receber dados de sensores.
 * Valida a requisição, verifica a assinatura, aplica rate limit,
 * verifica a posse da NFT, atualiza o estado E SALVA OS DADOS NO REDIS.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nftAddress, signature, payload } = body;
    
    // Serializa o payload de forma canônica para verificação e encaminhamento
    const payloadString = payload ? stringify(payload) : undefined;

    // 1. Validação básica da requisição
    if (!nftAddress || !signature || !payloadString) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes: nftAddress, signature, ou payload" }, { status: 400 });
    }
    
    // 2. Validação do timestamp no payload
    const { timestamp } = payload;
    if (typeof timestamp !== 'number') {
      return NextResponse.json({ error: "Payload deve incluir um campo 'timestamp' válido (Unix timestamp em segundos)." }, { status: 400 });
    }

    // Verifica se o dado não é muito antigo ou do futuro
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const dataAgeInSeconds = nowInSeconds - timestamp;
    // O tempo de rate limit (ex: 60s) deve ser maior que o tempo de rejeição (ex: 300s)
    const MAX_DATA_AGE_SECONDS = 5 * 60; // 300 segundos (5 minutos)
    
    if (dataAgeInSeconds > MAX_DATA_AGE_SECONDS) {
      return NextResponse.json({ error: "Dado muito antigo.", details: `Recebido dado com ${dataAgeInSeconds}s de idade.` }, { status: 408 }); // 408 Request Timeout
    }
    if (dataAgeInSeconds < -60) { // Tolera pequena dessincronia, mas rejeita futuro distante
      return NextResponse.json({ error: "Timestamp do dado está no futuro." }, { status: 400 });
    }

    // 3. Verificação de Limitação de Frequência (Rate Limit) usando Redis
    // Define a frequência que CADA dispositivo pode enviar dados (ex: 1 vez a cada 60s)
    const DATA_RATE_LIMIT_SECONDS = 60; 
    const rateLimitKey = `rate_limit:${nftAddress}`;
    const isRateLimited = await redis.get(rateLimitKey);
    
    if (isRateLimited) {
      return NextResponse.json({ error: "Limite de frequência excedido.", details: `Por favor, aguarde. Limite é de 1 envio a cada ${DATA_RATE_LIMIT_SECONDS} segundos.` }, { status: 429 }); // 429 Too Many Requests
    }

    // 4. Busca o dispositivo no banco de dados (Supabase)
    let device = await getDeviceByNft(nftAddress);
    if (!device) {
      return NextResponse.json({ error: "Dispositivo não registado." }, { status: 404 });
    }
    if (device.revoked) {
      return NextResponse.json({ error: "Dispositivo foi revogado." }, { status: 403 }); // 403 Forbidden
    }

    // 5. Verificação e Correção do Dono (Consulta On-chain)
    const blockchainOwner = await getNftOwner(nftAddress);
    if (blockchainOwner && blockchainOwner !== device.ownerAddress) {
      console.log(`Atualização de dono detetada para NFT ${nftAddress}. Atualizando BD.`);
      // Atualiza o dono no Supabase e obtém os dados atualizados do dispositivo
      device = await addOrUpdateDevice(device.publicKey, { ownerAddress: blockchainOwner });
    }

    // 6. Verificação da Assinatura Criptográfica
    const elliptic = await import("elliptic");
    const { sha256 } = await import("js-sha256");
    const BN = (await import("bn.js")).default;
    const ec = new elliptic.ec("secp256k1");
    
    const msgHash = sha256(payloadString);
    const key = ec.keyFromPublic(device.publicKey, "hex");
    const sig = { r: new BN(signature.r, 16), s: new BN(signature.s, 16) };

    if (!key.verify(msgHash, sig)) {
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 }); // 401 Unauthorized
    }

    // --- Se todas as validações passaram ---

    console.log(`✅ Dados recebidos de ${nftAddress} e verificados (Timestamp OK):`, payload);

    // 7. Define o bloqueio de rate limit no Redis
    // Este bloqueio é definido *após* a assinatura ser validada
    await redis.set(rateLimitKey, "true", "EX", DATA_RATE_LIMIT_SECONDS);

    // 8. Salva os dados no Redis e atualiza o timestamp no Supabase
    const now = Date.now();
    // Chave para armazenar os dados do sensor
    const dataKey = `iot_data:${nftAddress}`;
    // Define por quanto tempo os dados do sensor devem ser guardados (ex: 7 dias)
    const DATA_EXPIRATION_SECONDS = 60 * 60 * 24 * 7; // 7 dias

    try {
      // Usamos `Promise.allSettled` para executar ambas as tarefas assíncronas.
      // Isso garante que, mesmo se um falhar, o outro pode ter sucesso.
      const results = await Promise.allSettled([
        // 8a. Salva o payload de dados no Redis
        redis.set(dataKey, payloadString, "EX", DATA_EXPIRATION_SECONDS),
        // 8b. Atualiza o 'lastTsSeen' no Supabase (para monitoramento)
        addOrUpdateDevice(device.publicKey, { lastTsSeen: now })
      ]);

      // Log de sucesso/falha para o salvamento no Redis
      if (results[0].status === 'fulfilled') {
        console.log(`Dados salvos com sucesso no Redis (Chave: ${dataKey})`);
      } else {
        console.error("Falha ao salvar dados no Redis:", results[0].reason);
      }
      
      // Log de sucesso/falha para a atualização no Supabase
      if (results[1].status === 'rejected') {
        console.error("Falha ao atualizar 'lastTsSeen' no Supabase:", results[1].reason);
      }

    } catch (dbError: any) {
      // Este catch pegaria um erro geral, embora 'allSettled' deva tratar erros individuais
      console.error("Erro ao tentar salvar dados ou atualizar timestamp:", dbError.message);
    }
    
    // 9. (Opcional) Análise de IA
    // let aiAnalysis: any = await analyzeDataWithHuggingFace(payloadString);
    // console.log("🤖 Análise IA (Hugging Face):", aiAnalysis);

    // 10. Retorna sucesso para o cliente original (ESP/Script)
    return NextResponse.json({ 
      success: true, 
      message: "Dados recebidos e validados com sucesso.",
      // analysis: aiAnalysis // Incluir se a IA for usada
    });

  } catch (error: any) {
    console.error("Erro no endpoint /sensor-data:", error);
    return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 });
  }
}