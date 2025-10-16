import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, transfer as splTransfer } from "@solana/spl-token";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { keypairIdentity, generateSigner, percentAmount } from '@metaplex-foundation/umi'; 
import bs58 from "bs58";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const SERVER_SECRET_KEY_BASE58 = process.env.SERVER_SECRET_KEY_BASE58!;

const connection = new Connection(SOLANA_RPC_URL, "confirmed");
const serverKeypair = Keypair.fromSecretKey(bs58.decode(SERVER_SECRET_KEY_BASE58));

const umi = createUmi(SOLANA_RPC_URL).use(mplTokenMetadata());
const serverUmiSigner = umi.eddsa.createKeypairFromSecretKey(serverKeypair.secretKey);
umi.use(keypairIdentity(serverUmiSigner));

/**
 * Cria (minta) uma nova NFT para servir como identidade digital de um dispositivo.
 * Esta é a função que deve ser chamada durante o registro de um novo dispositivo.
 * @returns Um objeto com o endereço da NFT e a assinatura da transação.
 */
export async function createAndMintNft() {
  const mint = generateSigner(umi);

  console.log("Minting a new NFT for the device...");
  const result = await createNft(umi, {
    mint,
    name: "DePIN Device Identity",
    symbol: "DEPINID",
    uri: "https://shdw-drive.genesysgo.net/6t1m2L3N9s4z5x6A7B8C9d0E/metadata.json",
    sellerFeeBasisPoints: percentAmount(0),
  }).sendAndConfirm(umi);

  const nftAddress = mint.publicKey.toString();
  const txSignature = bs58.encode(result.signature);
  
  console.log(`NFT minted successfully! Address: ${nftAddress}, Tx: ${txSignature}`);
  return { nftAddress, txSignature };
}

/**
 * Transfere a propriedade de uma NFT da carteira do servidor para a carteira de um novo dono.
 * Esta função é chamada pela API de "claim" (reivindicação).
 * @param nftMintAddress O endereço da NFT a ser transferida.
 * @param newOwnerAddress O endereço da carteira Solana do novo dono.
 * @returns A assinatura da transação de transferência.
 */
export async function transferNft(nftMintAddress: string, newOwnerAddress: string) {
  const mintPublicKey = new PublicKey(nftMintAddress);
  const newOwnerPublicKey = new PublicKey(newOwnerAddress);

  console.log(`Iniciando transferência da NFT ${nftMintAddress} para ${newOwnerAddress}`);

  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    serverKeypair,
    mintPublicKey,
    serverKeypair.publicKey
  );

  const toTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    serverKeypair,
    mintPublicKey,
    newOwnerPublicKey 
  );

  const signature = await splTransfer(
    connection,
    serverKeypair, 
    fromTokenAccount.address, 
    toTokenAccount.address, 
    serverKeypair.publicKey,  
    1,
  );

  console.log(`Transferência concluída com sucesso! Assinatura: ${signature}`);
  return signature;
}