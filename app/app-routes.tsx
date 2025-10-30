'use client';

import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { Sensor, Dataset } from '../lib/types';

// Importar Componentes de Layout
import { Header } from '../components/header';
import { Footer } from '../components/footer';
import { Loader2 } from 'lucide-react';

// Importar Views (Páginas)
import { HomePage } from './views/home';
import { DashboardPage } from './views/dashboard';
import { SensorDetailPage } from './views/sensor-detail';
import { PublicSensorsPage } from './views/public-sensors'; // Importação nomeada
// import { PublicSensorDetailPage } from './views/public-sensor-detail'; // Parece ser substituído pelo 'audit.tsx'
import { AuditPage } from './views/audit';

/**
 * Componente para proteger rotas que exigem login.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
 * Este componente é carregado pelo `app/page.tsx` (que contém o <BrowserRouter>)
 */
export function AppRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // --- Gerenciamento de Estado ---
  // Este estado é "levantado" (lifted state) para que o Dashboard possa definir
  // o sensor que a SensorDetailPage irá renderizar.
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  // --- Handlers de Navegação ---
  
  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      // O Header (com o modal de login) é renderizado
      // O usuário pode clicar em "Sign In"
      // Esta função é chamada pelo botão "Get Started" da Home.
      // Se não houver usuário, instrui o usuário a fazer login (o modal é aberto pelo header)
      console.log("Usuário não logado, Header deve mostrar 'Sign In'");
    }
  };

  const handleViewSensor = (sensor: Sensor) => {
    setSelectedSensor(sensor);
    navigate(`/sensor/${sensor.id}`);
  };

  const handleViewAudit = (dataset: Dataset, sensor: Sensor) => {
    setSelectedDataset(dataset);
    setSelectedSensor(sensor);
    navigate(`/audit?sensor=${sensor.id}&dataset=${dataset.id}`);
  };

  const handleBack = () => {
    navigate(-1); // Volta uma página no histórico
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
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
              // CORREÇÃO: 'onViewSensor' removido. Este componente usa useNavigate.
            }
          />
          
          <Route
            path="/audit"
            element={
              <AuditPage
                dataset={selectedDataset || undefined}
                sensor={selectedSensor || undefined} // Permite carregar via query param
                onBack={handleBack}
              />
            }
          />

          {/* Rotas Protegidas (Exigem Login) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {/* Esta prop é necessária e está correta */}
                <DashboardPage onViewSensor={handleViewSensor} /> 
              </ProtectedRoute>
            }
          />
          <Route
            path="/sensor/:id"
            element={
              <ProtectedRoute>
                {!selectedSensor ? (
                  // Se o usuário der refresh, o estado 'selectedSensor'
                  // estará vazio. Redireciona-o de volta ao dashboard.
                  <Navigate to="/dashboard" replace />
                ) : (
                  <SensorDetailPage
                    sensor={selectedSensor}
                    onBack={handleBack}
                    onViewAudit={handleViewAudit}
                  />
                )}
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

