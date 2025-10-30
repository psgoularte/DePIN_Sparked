import { Sensor, Reading, Dataset, SensorMetrics } from './types';

/**
 * Lança um erro padronizado a partir de uma resposta de fetch.
 */
async function handleApiError(response: Response) {
  const errorData = await response.json();
  throw new Error(errorData.error || `Request failed with status ${response.status}`);
}

/**
 * Wrapper de Fetch para chamadas de API autenticadas.
 */
const apiFetch = async (url: string, token: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) await handleApiError(response);
  // Algumas APIs (como delete) podem não retornar JSON
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null;
  }
  return response.json();
};

/**
 * Wrapper de Fetch para chamadas de API públicas.
 */
const publicApiFetch = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) await handleApiError(response);
  return response.json();
};

// --- API de Autenticação (para seu auth-context) ---
export const authAPI = {
  signUp: (email: string, password: string, name: string): Promise<void> => {
    // Esta API é especial, não é autenticada
    // Você precisará criar esta API de backend
    return publicApiFetch('/api/auth/signup', { 
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },
};

// --- API de Sensores (Privada) ---
// Define o tipo para criação de sensor, baseado no que o 'register-sensor-dialog' envia
type SensorCreateData = Omit<Sensor, 'id' | 'owner' | 'createdAt' | 'status' | 'lastReading' | 'updatedAt'>;

export const sensorAPI = {
  list: (token: string): Promise<Sensor[]> => {
    // Você precisará criar esta API de backend
    return apiFetch('/api/sensors', token); 
  },
  create: (sensorData: SensorCreateData, token: string): Promise<Sensor> => {
    // Você precisará criar esta API de backend
    return apiFetch('/api/sensors', token, {
      method: 'POST',
      body: JSON.stringify(sensorData),
    });
  },
  update: (id: string, updates: Partial<Sensor>, token: string): Promise<Sensor> => {
    // Você precisará criar esta API de backend
    return apiFetch(`/api/sensors/${id}`, token, { 
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
  delete: (id: string, token: string): Promise<void> => {
     // Você precisará criar esta API de backend
    return apiFetch(`/api/sensors/${id}`, token, { method: 'DELETE' });
  },
  
  // NOVO: Função adicionada para corrigir o erro do register-sensor-dialog
  retrieveClaimToken: async (walletPublicKey: string, macAddress: string, devicePublicKey: string, token: string): Promise<string> => {
    // Esta função chama a API /api/get-claim-token que você já tem
    // A API que você forneceu em prompts anteriores espera 'publicKey'
    const response = await apiFetch('/api/get-claim-token', token, {
      method: 'POST',
      body: JSON.stringify({ 
        publicKey: devicePublicKey,
        macAddress: macAddress, // Enviando dados extras caso sua API mude
        walletPublicKey: walletPublicKey // Enviando dados extras caso sua API mude
      }), 
    });
    
    if (!response.claimToken) {
      throw new Error("API did not return a claimToken");
    }
    return response.claimToken;
  },
};

// --- API de Stats (Privada) ---
export const statsAPI = {
  get: (token: string): Promise<{ totalSensors: number, activeSensors: number, totalReadings: number, totalDatasets: number }> => {
    // Você precisará criar esta API de backend
    return apiFetch('/api/stats', token); 
  },
};

// --- API de Leituras (Privada) ---
export const readingAPI = {
  list: (sensorId: string, token: string, limit: number): Promise<Reading[]> => {
    // Você precisará criar esta API de backend
    return apiFetch(`/api/readings?sensorId=${sensorId}&limit=${limit}`, token); 
  },
};

// --- API de Datasets (Privada) ---
export const datasetAPI = {
  list: (sensorId: string, token: string): Promise<Dataset[]> => {
    // Sua API /api/datasets deve suportar filtragem por sensorId
    return apiFetch(`/api/datasets?sensorId=${sensorId}`, token);
  },
  create: (data: { name: string, sensorId: string, startDate: Date, endDate: Date, isPublic: boolean }, token: string): Promise<Dataset> => {
    return apiFetch('/api/datasets', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: (id: string, updates: Partial<Dataset>, token: string): Promise<Dataset> => {
     // Você precisará criar esta API de backend
    return apiFetch(`/api/datasets/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
  delete: (id: string, token: string): Promise<void> => {
     // Você precisará criar esta API de backend
    return apiFetch(`/api/datasets/${id}`, token, { method: 'DELETE' });
  },
  anchor: (id: string, token: string): Promise<void> => {
    // Esta chamada deve corresponder à sua API /api/anchor
    // A API 'anchor' que você forneceu não aceita um 'datasetId', ela processa um lote.
    // Vamos assumir que você tem uma API que aciona a ancoragem para um dataset específico.
    // Você precisará criar esta API de backend
    return apiFetch(`/api/datasets/anchor`, token, { 
      method: 'POST',
      body: JSON.stringify({ datasetId: id }),
    });
  },
};

// --- API de Merkle (Privada) ---
export const merkleAPI = {
  getHourlyRoot: (sensorId: string, token: string): Promise<{ merkleRoot: string }> => {
    // Você precisará criar esta API de backend
    return apiFetch(`/api/merkle/hourly?sensorId=${sensorId}`, token); 
  },
};

// --- API Pública (para home page, etc.) ---
export const publicAPI = {
  getFeaturedSensors: (): Promise<{ sensors: SensorMetrics[] }> => {
    // Você precisará criar esta API de backend
    return publicApiFetch('/api/public/featured'); 
  },
  listPublicSensors: (): Promise<Sensor[]> => {
    // Você precisará criar esta API de backend
    return publicApiFetch('/api/public/sensors');
  },
  getPublicSensor: (sensorId: string): Promise<Sensor> => {
    // Você precisará criar esta API de backend
    return publicApiFetch(`/api/public/sensors/${sensorId}`);
  },
  getPublicDatasets: (sensorId: string): Promise<Dataset[]> => {
    // Sua API /api/datasets pública
    return publicApiFetch(`/api/public/datasets?sensorId=${sensorId}`);
  },
  getPublicReadings: (sensorId: string, limit: number): Promise<Reading[]> => {
    // Você precisará criar esta API de backend
    return publicApiFetch(`/api/public/readings?sensorId=${sensorId}&limit=${limit}`);
  },
};

