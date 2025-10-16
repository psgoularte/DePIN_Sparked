Secure IoT Data Platform with Blockchain Identity
Este projeto é uma plataforma ponta-a-ponta para registrar dispositivos IoT, dar a eles uma identidade digital única como uma NFT na blockchain Solana, e receber dados assinados criptograficamente para garantir sua autenticidade e integridade.

O sistema é projetado para ser genérico, permitindo que qualquer tipo de dado JSON seja enviado e validado. Ele também inclui uma camada de análise de IA para verificar a plausibilidade dos dados e um mecanismo seguro para transferir a propriedade da identidade do dispositivo (NFT) para o dono final.

Diagrama da Arquitetura

graph TD
    subgraph Device Physical Space
        User_Input[User sends JSON via Serial] --> ESP8266;
        ESP8266 -- Prints Claim Token & PublicKey --> Serial_Monitor;
    end

    subgraph User Interaction
        User_App[Frontend / Postman]
    end

    subgraph Backend Infrastructure
        API[API Server on Vercel];
        Supabase[Supabase DB];
        Solana[Solana Blockchain];
        HuggingFace[Hugging Face AI];
    end
    
    ESP8266 -- 1. POST /register-device (Registration) --> API;
    API -- Mint & Own NFT --> Solana;
    API -- Store Device Info --> Supabase;
    API -- Returns NFT Address & Claim Token --> ESP8266;

    ESP8266 -- 2. POST /sensor-data (Data Submission) --> API;
    API -- Get PublicKey from NFT Address --> Supabase;
    API -- Verify Signature & Rate Limit --> API;
    API -- Analyze Data --> HuggingFace;
    API -- Update lastTsSeen --> Supabase;

    User_App -- 3. POST /claim-device --> API;
    API -- Find Device by Claim Token --> Supabase;
    API -- Transfer NFT --> Solana;
    API -- Update Owner Address --> Supabase;
    
    User_App -- 4. POST /get-claim-token (Recovery) --> API;
    API -- Find Device by PublicKey --> Supabase;
    API -- Returns stored Claim Token --> User_App;

Core Features

-Identidade Descentralizada: Cada dispositivo IoT gera um par de chaves único e permanente, e sua identidade é registrada como uma NFT na blockchain Solana.

-Integridade Criptográfica: Todos os dados enviados pelo dispositivo são assinados com sua chave privada. A API verifica essa assinatura, garantindo que os dados não foram alterados e vieram do dispositivo correto.

-Propriedade Transferível: Um mecanismo de reivindicação (claimToken) permite que a propriedade da NFT do dispositivo seja transferida de forma segura para a carteira do usuário final.

-Flexibilidade de Dados: O sistema é agnóstico quanto ao payload. Qualquer JSON pode ser enviado e validado, desde que o dispositivo injete um timestamp confiável.

-Validação de Dados:

    -Timestamp Check: Rejeita dados com mais de 10 minutos para prevenir ataques de replay e dados antigos.

    -Rate Limiting: Rejeita dados de um dispositivo que já enviou uma requisição nos últimos 10 minutos.

    -Análise por IA: Utiliza a API da Hugging Face para realizar uma análise de plausibilidade e bom senso nos dados recebidos.

Tecnologia Utilizada

-Hardware: ESP8266

-Blockchain: Solana (Devnet)

-NFTs: Metaplex Umi

-Tokens: Solana Program Library (SPL)

-Backend: Next.js (App Router) / TypeScript

-Hospedagem: Vercel

-Banco de Dados: Supabase (PostgreSQL)

-IA: Hugging Face Inference API

Configuração do Projeto
Crie um arquivo .env.local na raiz do seu projeto com as seguintes variáveis de ambiente:

# Chave privada da sua carteira do servidor (em formato Base58)
# Esta carteira pagará as taxas, criará e será a dona inicial das NFTs.
SERVER_SECRET_KEY_BASE58="sua_chave_privada_aqui"

# URL do RPC da Solana. Para produção, use o Mainnet.
SOLANA_RPC_URL="https'://api.devnet.solana.com"

# Credenciais do seu projeto Supabase
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_ANON_KEY="sua_chave_anon_aqui"

# Seu token de acesso da Hugging Face
HUGGINGFACE_API_KEY="hf_sua_chave_aqui"

Fluxo de Uso
1. Registro de um Novo Dispositivo (ESP8266)
Carregue o código principal no seu ESP8266.

Abra a Serial Monitor (115200 baud).

Na primeira inicialização, o ESP irá:

Gerar e salvar um par de chaves criptográficas na memória EEPROM.

Imprimir sua Chave Pública permanente. Guarde-a para recuperação.

Chamar a API /register-device para criar uma NFT.

Receber e salvar o endereço da NFT na EEPROM.

Receber e imprimir o claimToken. Guarde-o para reivindicar a NFT.

2. Envio de Dados (ESP8266)
Com o dispositivo já registrado, envie um JSON qualquer pela Serial Monitor.

A ordem das chaves NÃO importa. O ESP irá automaticamente adicionar um timestamp, ordenar todas as chaves alfabeticamente, assinar e enviar para a API /sensor-data.

3. Reivindicação da NFT (Postman / Frontend)
Faça uma requisição POST para /api/claim-device.

No corpo (Body) da requisição, envie o seguinte JSON:

{
  "claimToken": "o_token_impresso_pelo_esp",
  "ownerWalletAddress": "o_endereco_da_sua_carteira_solana"
}

Se bem-sucedido, a propriedade da NFT será transferida para a sua carteira.

4. Recuperação do Claim Token (Postman / Frontend)
Caso você tenha perdido o claimToken inicial, faça uma requisição POST para /api/get-claim-token.

No corpo (Body) da requisição, envie o seguinte JSON:

{
  "publicKey": "a_chave_publica_impressa_pelo_esp_no_boot"
}

A API retornará o token, desde que a NFT ainda não tenha sido reivindicada.

Mapeamento das APIs
POST /api/register-device
Função: Registra um novo dispositivo. É um processo de desafio-resposta em duas etapas.

Etapa 1 (Request Challenge) Body: { "macAddress": string, "publicKey": string }

Etapa 2 (Respond Challenge) Body: { "macAddress": string, "publicKey": string, "challenge": string, "signature": { "r": string, "s": string } }

Resposta de Sucesso: { "nftAddress": string, "txSignature": string, "claimToken": string }

POST /api/sensor-data
Função: Recebe dados assinados de um dispositivo registrado.

Body: { "nftAddress": string, "payload": object, "signature": { "r": string, "s": string } }

Resposta de Sucesso: { "success": true, "message": "Data received", "analysis": object }

Erros Notáveis: 401 Unauthorized (assinatura inválida), 408 Request Timeout (dado antigo), 429 Too Many Requests (rate limit).

POST /api/claim-device
Função: Transfere a propriedade da NFT para uma carteira de usuário final.

Body: { "claimToken": string, "ownerWalletAddress": string }

Resposta de Sucesso: { "success": true, "transactionSignature": string }

POST /api/get-claim-token
Função: Recupera um claimToken para um dispositivo não reivindicado.

Body: { "publicKey": string }

Resposta de Sucesso: { "nftAddress": string, "claimToken": string }
