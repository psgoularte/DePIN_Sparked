import fs from "fs/promises";
import path from "path";

export interface DeviceEntry {
  macAddress: string;
  publicKey: string;
  nftAddress: string;
  txSignature: string | null;
  lastTsSeen: number | null;
  revoked?: boolean;
  challenge?: string;
}

const dataDir = path.join(process.cwd(), "data");
const registryFile = path.join(dataDir, "device_registry.json");

async function ensureFile() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.access(registryFile);
  } catch {
    await fs.writeFile(registryFile, JSON.stringify({}, null, 2));
  }
}

export async function loadRegistry(): Promise<Record<string, DeviceEntry>> {
  await ensureFile();
  const data = await fs.readFile(registryFile, "utf8");
  return JSON.parse(data);
}

export async function saveRegistry(registry: Record<string, DeviceEntry>) {
  await ensureFile();
  await fs.writeFile(registryFile, JSON.stringify(registry, null, 2));
}

export async function getDevice(publicKey: string): Promise<DeviceEntry | null> {
  const reg = await loadRegistry();
  return reg[publicKey] || null;
}

export async function getDeviceByNft(nftAddress: string): Promise<DeviceEntry | null> {
  const reg = await loadRegistry();
  return Object.values(reg).find((d) => d.nftAddress === nftAddress) || null;
}

export async function addOrUpdateDevice(publicKey: string, data: Partial<DeviceEntry>) {
  const reg = await loadRegistry();
  const existing = reg[publicKey] || {};
  reg[publicKey] = { ...existing, ...data } as DeviceEntry;
  await saveRegistry(reg);
}

export async function revokeDevice(nftAddress: string) {
  const reg = await loadRegistry();
  const key = Object.keys(reg).find((k) => reg[k].nftAddress === nftAddress);
  if (!key) throw new Error("Device não encontrado");
  reg[key].revoked = true;
  await saveRegistry(reg);
}
