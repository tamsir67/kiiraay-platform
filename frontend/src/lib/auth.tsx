import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAccessToken, setOnSessionLost } from '../api/client';
import { PERMISSIONS } from '@shared/referentiel.js';

export type Role = 'ADMIN' | 'COORDONNATEUR' | 'SUPERVISEUR' | 'COMMISSAIRE' | 'OPERATEUR' | 'DECIDEUR' | 'MILITANT';
export interface Utilisateur {
  id: number; identifiant: string; nom: string; prenoms: string; role: Role; militant_id?: string | null; doit_changer_mdp: boolean;
  perimetres: { commune_id: number; quartier_id: number | null }[]; permissions: string[];
}

interface AuthCtx {
  user: Utilisateur | null;
  pret: boolean;
  login: (identifiant: string, motDePasse: string) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (d: { accessToken: string; utilisateur: Utilisateur }) => void;
  can: (perm: string) => boolean;
}

const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Utilisateur | null>(null);
  const [pret, setPret] = useState(false);

  const setSession = useCallback((d: { accessToken: string; utilisateur: Utilisateur }) => {
    setAccessToken(d.accessToken);
    setUser(d.utilisateur);
  }, []);

  useEffect(() => {
    setOnSessionLost(() => { setAccessToken(null); setUser(null); });
    // Reprise de session au chargement (cookie de rafraîchissement)
    (async () => {
      try {
        if (await api.refresh()) setUser(await api.get('/auth/me'));
      } catch { /* pas de session */ }
      setPret(true);
    })();
  }, []);

  const login = useCallback(async (identifiant: string, motDePasse: string) => {
    setSession(await api.post('/auth/login', { identifiant, motDePasse }));
  }, [setSession]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setAccessToken(null);
    setUser(null);
  }, []);

  const can = useCallback((perm: string) => !!user && (PERMISSIONS as any)[user.role]?.includes(perm), [user]);
  const value = useMemo(() => ({ user, pret, login, logout, setSession, can }), [user, pret, login, logout, setSession, can]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
