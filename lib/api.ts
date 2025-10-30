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
    return publicApiFetch('/api/auth/signup', { // Você precisará criar esta API
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },
};

// --- API de Sensores (Privada) ---
export const sensorAPI = {
  list: (token: string): Promise<Sensor[]> => {
    return apiFetch('/api/sensors', token); // Você precisará criar esta API
  },
create: (sensorData: Omit<Sensor, 'id' | 'owner' | 'createdAt' | 'status' | 'lastReading'>, token: string): Promise<Sensor> => {
    return apiFetch('/api/sensors', token, {
      method: 'POST',
      body: JSON.stringify(sensorData),
    });
  },
  update: (id: string, updates: Partial<Sensor>, token: string): Promise<Sensor> => {
    return apiFetch(`/api/sensors/${id}`, token, { // Você precisará criar esta API
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
  delete: (id: string, token: string): Promise<void> => {
    return apiFetch(`/api/sensors/${id}`, token, { method: 'DELETE' });
  },
   retrieveClaimToken: async (walletPublicKey: string, macAddress: string, devicePublicKey: string, token: string): Promise<string> => {
    // Esta função chama a API /api/get-claim-token que você já tem
    const response = await apiFetch('/api/get-claim-token', token, {
      method: 'POST',
      body: JSON.stringify({ publicKey: devicePublicKey, macAddress, walletPublicKey }), // Enviando os dados esperados
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
    return apiFetch('/api/stats', token); // Você precisará criar esta API
  },
};

// --- API de Leituras (Privada) ---
export const readingAPI = {
  list: (sensorId: string, token: string, limit: number): Promise<Reading[]> => {
    return apiFetch(`/api/readings?sensorId=${sensorId}&limit=${limit}`, token); // Você precisará criar esta API
  },
};

// --- API de Datasets (Privada) ---
export const datasetAPI = {
  list: (sensorId: string, token: string): Promise<Dataset[]> => {
    return apiFetch(`/api/datasets?sensorId=${sensorId}`, token);
  },
  create: (data: { name: string, sensorId: string, startDate: Date, endDate: Date, isPublic: boolean }, token: string): Promise<Dataset> => {
    return apiFetch('/api/datasets', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: (id: string, updates: Partial<Dataset>, token: string): Promise<Dataset> => {
    return apiFetch(`/api/datasets/${id}`, token, { // Você precisará criar esta API
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
  delete: (id: string, token: string): Promise<void> => {
    return apiFetch(`/api/datasets/${id}`, token, { method: 'DELETE' });
  },
  anchor: (id: string, token: string): Promise<void> => {
    // Esta é uma chamada especial, pode ser uma API diferente
    return apiFetch(`/api/datasets/anchor`, token, { // API de ancoragem
      method: 'POST',
      body: JSON.stringify({ datasetId: id }),
    });
  },
};

// --- API de Merkle (Privada) ---
export const merkleAPI = {
  getHourlyRoot: (sensorId: string, token: string): Promise<{ merkleRoot: string }> => {
    return apiFetch(`/api/merkle/hourly?sensorId=${sensorId}`, token); // Você precisará criar esta API
  },
};

// --- API Pública (para home page, etc.) ---
export const publicAPI = {
  getFeaturedSensors: (): Promise<{ sensors: SensorMetrics[] }> => {
    return publicApiFetch('/api/public/featured'); // Você precisará criar esta API
  },
  listPublicSensors: (): Promise<Sensor[]> => {
    return publicApiFetch('/api/public/sensors'); // Você precisará criar esta API
  },
  getPublicSensor: (sensorId: string): Promise<Sensor> => {
    return publicApiFetch(`/api/public/sensors/${sensorId}`);
  },
  getPublicDatasets: (sensorId: string): Promise<Dataset[]> => {
    return publicApiFetch(`/api/public/datasets?sensorId=${sensorId}`);
  },
  getPublicReadings: (sensorId: string, limit: number): Promise<Reading[]> => {
    return publicApiFetch(`/api/public/readings?sensorId=${sensorId}&limit=${limit}`);
  },
};
