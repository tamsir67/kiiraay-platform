import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource/archivo/700.css';
import '@fontsource/archivo/800.css';
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/500.css';
import '@fontsource/public-sans/600.css';
import '@fontsource/public-sans/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import './styles/app.css';
import { AuthProvider, useAuth } from './lib/auth';
import { FiltresProvider } from './lib/filtres';
import { ToastProvider } from './components/ui';
import { Layout } from './components/Layout';
import { DEMO, ApiError } from './api/client';
import { Login, ChangerMotDePasse } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Militants } from './pages/Militants';
import { CartePage } from './pages/CartePage';
import { Rapports } from './pages/Rapports';
import { Qualite } from './pages/Qualite';
import { Echanges } from './pages/Echanges';
import { Responsables } from './pages/Responsables';
import { Territoires } from './pages/Territoires';
import { Utilisateurs, Journal } from './pages/Administration';
import { EspaceMilitant } from './pages/EspaceMilitant';
import { Messagerie } from './pages/Messagerie';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: (n, e) => !(e instanceof ApiError && [401, 403, 404].includes(e.status)) && n < 2, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

function Garde({ perm, children }: { perm?: string | string[]; children: React.ReactElement }) {
  const { can } = useAuth();
  const ok = !perm || (Array.isArray(perm) ? perm.some(can) : can(perm));
  return ok ? children : <Navigate to="/" replace />;
}

function Racine() {
  const { user, pret, can } = useAuth();
  if (!pret) return null;
  if (!user) return <Login />;
  if (user.doit_changer_mdp) return <ChangerMotDePasse />;
  return (
    <FiltresProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={can('dashboard') ? <Dashboard /> : can('espace:personnel') ? <Navigate to="/espace" replace /> : <Navigate to="/militants" replace />} />
          <Route path="espace" element={<Garde perm="espace:personnel"><EspaceMilitant /></Garde>} />
          <Route path="messages" element={<Garde perm="messagerie"><Messagerie /></Garde>} />
          <Route path="carte" element={<Garde perm="dashboard"><CartePage /></Garde>} />
          <Route path="rapports" element={<Garde perm="dashboard"><Rapports /></Garde>} />
          <Route path="militants" element={<Garde perm="militants:lire"><Militants /></Garde>} />
          <Route path="qualite" element={<Garde perm="qualite"><Qualite /></Garde>} />
          <Route path="echanges" element={<Garde perm={['import', 'export']}><Echanges /></Garde>} />
          <Route path="responsables" element={<Garde perm="dashboard"><Responsables /></Garde>} />
          <Route path="territoires" element={<Territoires />} />
          <Route path="utilisateurs" element={<Garde perm="utilisateurs:gerer"><Utilisateurs /></Garde>} />
          <Route path="journal" element={<Garde perm="audit:lire"><Journal /></Garde>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </FiltresProvider>
  );
}

const Router = DEMO ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Racine />
          </Router>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
