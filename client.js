/**
 * Cliente Solana - Sistema de Leitura de Sensores IoT
 *
 * Este script demonstra como:
 * 1. Conectar à blockchain Solana
 * 2. Verificar saldo da wallet
 * 3. Registrar hashes de dados de sensores on-chain
 */

const {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} = require("@solana/web3.js");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Configuração
const NETWORK = "devnet"; // 'devnet', 'testnet', ou 'mainnet-beta'
const CONNECTION = new Connection(clusterApiUrl(NETWORK), "confirmed");

/**
 * Carrega keypair do arquivo de configuração Solana
 */
function loadKeypair() {
  try {
    const keypairPath = path.join(process.env.HOME, ".config/solana/id.json");
    const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } catch (error) {
    console.error("❌ Erro ao carregar keypair:", error.message);
    console.log(
      '💡 Dica: Execute "solana-keygen new" para criar uma nova wallet'
    );
    process.exit(1);
  }
}

/**
 * Verifica o saldo da wallet
 */
async function getBalance(publicKey) {
  try {
    const balance = await CONNECTION.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error("❌ Erro ao verificar saldo:", error.message);
    return 0;
  }
}

/**
 * Gera hash SHA-256 dos dados do sensor
 * Na prática, isso seria os dados reais do sensor IoT
 */
function hashSensorData(sensorData) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(sensorData))
    .digest("hex");
}

/**
 * Simula leitura de sensor IoT
 */
function readSensorData() {
  return {
    sensorId: "TEMP_001",
    timestamp: Date.now(),
    temperature: (Math.random() * 30 + 10).toFixed(2), // 10-40°C
    humidity: (Math.random() * 50 + 30).toFixed(2), // 30-80%
    location: { lat: -23.5505, lon: -46.6333 }, // São Paulo
  };
}

/**
 * Solicita airdrop de SOL (apenas para devnet/testnet)
 */
async function requestAirdrop(publicKey) {
  if (NETWORK === "mainnet-beta") {
    console.log("⚠️  Airdrop não disponível na mainnet");
    return false;
  }

  try {
    console.log("💰 Solicitando 1 SOL de airdrop...");
    const signature = await CONNECTION.requestAirdrop(
      publicKey,
      LAMPORTS_PER_SOL
    );
    await CONNECTION.confirmTransaction(signature);
    console.log("✅ Airdrop recebido!");
    return true;
  } catch (error) {
    console.error("❌ Erro no airdrop:", error.message);
    console.log("💡 Use o faucet web: https://faucet.solana.com");
    return false;
  }
}

/**
 * Demonstração de registro de dados de sensor
 * NOTA: Esta é uma versão simplificada. Em produção, você usaria
 * um programa Solana personalizado (smart contract) para armazenar os hashes
 */
async function demonstrateDataIntegrity() {
  console.log("\n🔐 === DEMONSTRAÇÃO: INTEGRIDADE DE DADOS COM SOLANA ===\n");

  // 1. Carregar wallet
  const keypair = loadKeypair();
  const publicKey = keypair.publicKey;
  console.log("📍 Wallet:", publicKey.toString());

  // 2. Verificar saldo
  let balance = await getBalance(publicKey);
  console.log("💵 Saldo:", balance, "SOL");

  // 3. Solicitar airdrop se necessário
  if (balance === 0) {
    await requestAirdrop(publicKey);
    balance = await getBalance(publicKey);
    console.log("💵 Novo saldo:", balance, "SOL");
  }

  // 4. Simular leitura de sensor
  console.log("\n📡 Lendo dados do sensor...");
  const sensorData = readSensorData();
  console.log("📊 Dados:", sensorData);

  // 5. Gerar hash dos dados
  const dataHash = hashSensorData(sensorData);
  console.log("🔑 Hash SHA-256:", dataHash);

  // 6. Demonstrar conceito (em produção, isso seria enviado para um programa on-chain)
  console.log("\n💡 CONCEITO:");
  console.log("1. Dados do sensor são coletados off-chain");
  console.log("2. Hash SHA-256 é gerado localmente");
  console.log("3. Hash + timestamp são registrados on-chain (imutável)");
  console.log("4. Dados completos ficam off-chain (IPFS, database, etc.)");
  console.log("5. Qualquer um pode verificar integridade recomputando o hash");

  // 7. Verificação de integridade
  console.log("\n✅ Verificando integridade...");
  const verifyHash = hashSensorData(sensorData);
  if (verifyHash === dataHash) {
    console.log("✓ Dados íntegros! Hash corresponde.");
  } else {
    console.log("✗ ALERTA: Dados foram alterados!");
  }
  //www.google.com/search?q=make+dir&sourceid=chrome&ie=UTF-8
  // 8. Próximos passos
  https: console.log("\n🚀 PRÓXIMOS PASSOS:");
  console.log("1. Instalar Anchor CLI (em andamento)");
  console.log("2. Criar programa Solana para armazenar hashes");
  console.log("3. Deploy do programa na devnet");
  console.log("4. Integrar com sensores IoT reais");
  console.log("5. Criar interface web para visualização e auditoria");
}

/**
 * Função principal
 */
async function main() {
  try {
    await demonstrateDataIntegrity();
  } catch (error) {
    console.error("\n❌ Erro:", error.message);
    process.exit(1);
  }
}

// Executar
if (require.main === module) {
  main();
}

module.exports = {
  loadKeypair,
  getBalance,
  hashSensorData,
  readSensorData,
};