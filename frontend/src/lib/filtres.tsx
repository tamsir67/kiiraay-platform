// Filtres synchronisés (CDC §8) : partagés entre dashboard, militants et carte.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface Filtres {
  commune?: number; quartier?: number; responsable?: number; statut?: string;
  periode: '30j' | '90j' | '12m' | 'tout' | 'perso'; du?: string; au?: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
export function bornesPeriode(f: Filtres): { du?: string; au?: string } {
  const now = new Date();
  const jours = { '30j': 30, '90j': 90, '12m': 365 }[f.periode as '30j'];
  if (jours) return { du: iso(new Date(now.getTime() - jours * 86400000)), au: iso(now) };
  if (f.periode === 'perso') return { du: f.du, au: f.au };
  return {};
}

const Ctx = createContext<{ f: Filtres; set: (p: Partial<Filtres>) => void; reset: () => void }>(null as any);
const DEFAUT: Filtres = { periode: '30j' };

export function FiltresProvider({ children }: { children: ReactNode }) {
  const [f, setF] = useState<Filtres>(DEFAUT);
  const v = useMemo(() => ({
    f,
    set: (p: Partial<Filtres>) => setF((old) => {
      const n = { ...old, ...p };
      if ('commune' in p && p.commune !== old.commune) n.quartier = undefined;
      return n;
    }),
    reset: () => setF(DEFAUT),
  }), [f]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export const useFiltres = () => useContext(Ctx);

/** Paramètres API dérivés des filtres. */
export function paramsFiltres(f: Filtres, { periode = true } = {}) {
  return { commune: f.commune, quartier: f.quartier, responsable: f.responsable, statut: f.statut, ...(periode ? bornesPeriode(f) : {}) };
}
