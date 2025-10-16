import { Connection, Keypair, PublicKey, clusterApiUrl, Transaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, createTransferInstruction } from "@solana/spl-token"; 
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { keypairIdentity, generateSigner, percentAmount } from '@metaplex-foundation/umi';
import bs58 from "bs58";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const SERVER_SECRET_KEY_BASE58 = process.env.SERVER_SECRET_KEY_BASE58!;

const connection = new Connection(SOLANA_RPC_URL, "confirmed");
const serverKeypair = Keypair.fromSecretKey(bs58.decode(SERVER_SECRET_KEY_BASE58));
console.log("🔑 Server Wallet Address being used by API:", serverKeypair.publicKey.toBase58());

const umi = createUmi(SOLANA_RPC_URL).use(mplTokenMetadata());
const serverUmiSigner = umi.eddsa.createKeypairFromSecretKey(serverKeypair.secretKey);
umi.use(keypairIdentity(serverUmiSigner));

export async function createAndMintNft() {
  const mint = generateSigner(umi);
  console.log("Mintando uma nova NFT para o dispositivo...");
  const result = await createNft(umi, {
    mint,
    name: "DePIN Device Identity",
    symbol: "DEPINID",
    uri: "https://shdw-drive.genesysgo.net/6t1m2L3N9s4z5x6A7B8C9d0E/metadata.json",
    sellerFeeBasisPoints: percentAmount(0),
  }).sendAndConfirm(umi);

  const nftAddress = mint.publicKey.toString();
  const txSignature = bs58.encode(result.signature);
  
  console.log(`NFT mintada com sucesso! Endereço: ${nftAddress}, Tx: ${txSignature}`);
  return { nftAddress, txSignature };
}

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

  const transaction = new Transaction().add(
    createTransferInstruction(
      fromTokenAccount.address,
      toTokenAccount.address,
      serverKeypair.publicKey,
      1 
    )
  );

  const signature = await connection.sendTransaction(transaction, [serverKeypair]);

  await connection.confirmTransaction(signature, 'confirmed');

  console.log(`Transferência CONFIRMADA com sucesso! Assinatura: ${signature}`);
  return signature;
}