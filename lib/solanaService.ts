import { Keypair, Connection, Transaction, SystemProgram } from "@solana/web3.js";
import bs58 from "bs58";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const LAMPORTS_TO_FUND = parseInt(process.env.LAMPORTS_TO_FUND || "100000000");
const SERVER_SECRET_KEY_BASE58 = process.env.SERVER_SECRET_KEY_BASE58!;

const connection = new Connection(SOLANA_RPC_URL, "confirmed");
const serverKeypair = Keypair.fromSecretKey(bs58.decode(SERVER_SECRET_KEY_BASE58));

export async function createOnchainAccount() {
  const newKp = Keypair.generate();
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: serverKeypair.publicKey,
      toPubkey: newKp.publicKey,
      lamports: LAMPORTS_TO_FUND,
    })
  );
  try {
    const sig = await connection.sendTransaction(tx, [serverKeypair]);
    return { nftAddress: newKp.publicKey.toBase58(), txSignature: sig };
  } catch (e: any) {
    return { nftAddress: newKp.publicKey.toBase58(), txSignature: `error: ${e.message}` };
  }
}
