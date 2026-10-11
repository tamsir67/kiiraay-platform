import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export interface Secteur { id: number; code: string; nom: string; actif: boolean }
export interface Quartier { id: number; code: string; nom: string; objectif_militants: number; actif: boolean; secteurs: Secteur[] }
export interface Commune { id: number; code: string; nom: string; nom_court: string; objectif_militants: number; actif: boolean; quartiers: Quartier[] }
export interface Responsable {
  id: number; fonction: 'COORDONNATEUR' | 'SUPERVISEUR' | 'COMMISSAIRE'; nom: string; prenoms: string; sexe?: 'M' | 'F'; actif: boolean;
  parent_id: number | null; parent: string | null; telephone: string | null; effectif: number; compte: string | null;
  perimetres: { commune_id: number; commune: string; quartier_id: number | null; quartier: string | null }[];
}

export const useTerritoires = () => useQuery({ queryKey: ['territoires'], queryFn: () => api.get<Commune[]>('/territoires'), staleTime: 300_000 });
export const useReferentiels = () => useQuery({ queryKey: ['referentiels'], queryFn: () => api.get('/referentiels'), staleTime: 600_000 });
export const useResponsables = (enabled = true) => useQuery({ queryKey: ['responsables'], queryFn: () => api.get<Responsable[]>('/responsables'), staleTime: 120_000, enabled });

export function useQuartiersPlats() {
  const { data } = useTerritoires();
  return (data || []).flatMap((c) => c.quartiers.map((q) => ({ ...q, commune_id: c.id, commune: c.nom })));
}
