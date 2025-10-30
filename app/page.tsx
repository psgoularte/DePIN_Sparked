'use client';

// Importa o roteador do react-router-dom
import { BrowserRouter } from 'react-router-dom';

// Importa seu novo componente de lógica de rotas (que criaremos abaixo)
import { AppRoutes } from './app-routes';

// (Opcional) Importe seu Navbar/Header global aqui, se tiver um
// import { Navbar } from '../components/navbar';

/**
 * Ponto de entrada principal do Next.js.
 * Configura o AuthProvider e o BrowserRouter.
 */
export default function Page() {
  return (
    // O BrowserRouter DEVE envolver o componente que usa <Routes>
    // O AuthProvider já está no seu layout.tsx, então não é necessário aqui.
    <BrowserRouter>
      {/* <Navbar /> */}
      <AppRoutes />
    </BrowserRouter>
  );
}

