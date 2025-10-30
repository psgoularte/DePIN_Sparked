'use client';

import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { Sensor, Dataset } from '../lib/types';

// Importe todas as suas "views"
import { HomePage } from './views/home';
import { DashboardPage } from './views/dashboard';
import { SensorDetailPage } from './views/sensor-detail';
import { PublicSensorsPage } from './views/public-sensors';
import { PublicSensorDetailPage } from './views/public-sensor-detail';
import { AuditPage } from './views/audit';
import { Loader2 } from 'lucide-react';

/**
 * Componente para proteger rotas que exigem login.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * Gerencia toda a lógica de navegação, estado e renderização de views.
 */
export function AppRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // --- Gerenciamento de Estado ---
  // Este estado é "levantado" para que o Dashboard possa definir
  // o sensor que a SensorDetailPage irá renderizar.
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  // --- Handlers de Navegação ---
  
  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      // Aqui você pode acionar seu modal de login
      // ou navegar para uma página /login
      alert("Por favor, faça login para continuar."); // Placeholder
    }
  };

  const handleViewSensor = (sensor: Sensor) => {
    setSelectedSensor(sensor);
    navigate(`/sensor/${sensor.id}`);
  };

  const handleViewPublicSensor = (sensor: Sensor) => {
    setSelectedSensor(sensor);
    navigate(`/public-sensor/${sensor.id}`); // Rota pública
  };

  const handleViewAudit = (dataset: Dataset, sensor: Sensor) => {
    setSelectedDataset(dataset);
    setSelectedSensor(sensor);
    // A página de auditoria usa query params, então não precisamos de /audit/:id
    navigate(`/audit?sensor=${sensor.id}&dataset=${dataset.id}`);
  };

  const handleBack = () => {
    navigate(-1); // Volta uma página no histórico
  };

  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route
        path="/"
        element={
          user ? <Navigate to="/dashboard" replace /> : <HomePage onGetStarted={handleGetStarted} />
        }
      />
     <Route
            path="/public-sensors"
            element={
              <PublicSensorsPage /> 
            }
          />
      <Route
        path="/public-sensor/:id"
        element={
          <PublicSensorDetailPage
            sensor={selectedSensor!} // Assume que foi definido pelo handleViewPublicSensor
            onBack={handleBack}
            onViewAudit={handleViewAudit}
          />
        }
      />
      <Route
        path="/audit"
        element={
          <AuditPage
            dataset={selectedDataset || undefined}
            sensor={selectedSensor || undefined}
            onBack={handleBack}
          />
        }
      />

      {/* Rotas Protegidas */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage onViewSensor={handleViewSensor} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sensor/:id"
        element={
          <ProtectedRoute>
            <SensorDetailPage
              sensor={selectedSensor!} // Assume que foi definido pelo handleViewSensor
              onBack={handleBack}
              onViewAudit={handleViewAudit}
            />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
