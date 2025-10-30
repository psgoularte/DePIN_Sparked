import { Reading } from './types';

// Gera dados históricos falsos
export const generateHistoricalReadings = (sensorId: string, type: string, count: number): Reading[] => {
  const readings: Reading[] = [];
  let lastValue = 25; // Valor inicial
  const now = Date.now();
  const unit = type === 'temperature' ? '°C' : (type === 'humidity' ? '%' : 'pH');

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - (count - i) * 60000); // 1 minuto atrás
    lastValue += (Math.random() - 0.5) * 2; // Variação
    readings.push({
      id: `mock-${sensorId}-reading-${i}`,
      sensorId: sensorId,
      timestamp: timestamp,
      variable: type,
      value: parseFloat(lastValue.toFixed(2)),
      unit: unit,
      verified: false,
      hash: `mockhash${i}`
    });
  }
  return readings;
};

// Gera uma única leitura ao vivo falsa
export const generateLiveReading = (sensorId: string, type: string, lastValue: number | undefined): Reading => {
  const baseValue = lastValue || 25;
  const newValue = baseValue + (Math.random() - 0.5) * 0.5; // Variação menor
  const unit = type === 'temperature' ? '°C' : (type === 'humidity' ? '%' : 'pH');

  return {
    id: `mock-${sensorId}-live-${Date.now()}`,
    sensorId: sensorId,
    timestamp: new Date(),
    variable: type,
    value: parseFloat(newValue.toFixed(2)),
    unit: unit,
    verified: false,
    hash: `livemockhash${Date.now()}`
  };
};
