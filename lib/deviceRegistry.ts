// Importe seu cliente supabase já configurado
import { supabase } from './supabaseClient'; // Ajuste o caminho se necessário

// A interface permanece a mesma
export interface DeviceEntry {
  macAddress: string;
  publicKey: string;
  nftAddress: string;
  txSignature: string | null;
  lastTsSeen: number | null;
  revoked?: boolean;
  challenge?: string;
}

/**
 * Busca um dispositivo pela sua chave pública (Primary Key).
 * @param publicKey A chave pública do dispositivo.
 * @returns O dispositivo ou null se não for encontrado.
 */
export async function getDeviceByPubKey(publicKey: string): Promise<DeviceEntry | null> {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('publicKey', publicKey)
    .single(); // .single() retorna um único objeto ou null

  if (error && error.code !== 'PGRST116') {
    // PGRST116 é o código para "nenhuma linha encontrada", o que é esperado
    console.error("Erro ao buscar dispositivo por publicKey:", error);
    throw error;
  }

  return data;
}

/**
 * Busca um dispositivo pelo endereço do seu NFT.
 * @param nftAddress O endereço do NFT associado ao dispositivo.
 * @returns O dispositivo ou null se não for encontrado.
 */
export async function getDeviceByNft(nftAddress: string): Promise<DeviceEntry | null> {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('nftAddress', nftAddress)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Erro ao buscar dispositivo por NFT:", error);
    throw error;
  }

  return data;
}

/**
 * Adiciona um novo dispositivo ou atualiza um existente.
 * Usa o método `upsert` do Supabase para eficiência.
 * @param publicKey A chave pública do dispositivo a ser atualizado/inserido.
 * @param deviceData Os dados parciais para atualizar ou os dados completos para inserir.
 * @returns O dispositivo criado ou atualizado.
 */
export async function addOrUpdateDevice(publicKey: string, deviceData: Partial<DeviceEntry>): Promise<DeviceEntry> {
  const deviceToUpsert = {
    publicKey, // Garante que a chave primária está no objeto
    ...deviceData,
  };

  const { data, error } = await supabase
    .from('devices')
    .upsert(deviceToUpsert)
    .select()
    .single(); // Retorna o objeto atualizado

  if (error || !data) {
    console.error("Erro ao adicionar ou atualizar dispositivo:", error);
    throw error || new Error("Não foi possível obter os dados do dispositivo após a operação.");
  }

  return data;
}

/**
 * Marca um dispositivo como revogado buscando-o pelo endereço do NFT.
 * @param nftAddress O endereço do NFT do dispositivo a ser revogado.
 */
export async function revokeDevice(nftAddress: string): Promise<void> {
  const { error, count } = await supabase
    .from('devices')
    .update({ revoked: true })
    .eq('nftAddress', nftAddress);

  if (error) {
    console.error("Erro ao revogar dispositivo:", error);
    throw error;
  }

  if (count === 0) {
    throw new Error("Dispositivo não encontrado para revogar.");
  }
}