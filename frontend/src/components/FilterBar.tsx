import { useMemo } from 'react';
import { useFiltres, type Filtres } from '../lib/filtres';
import { useResponsables, useTerritoires } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { STATUTS } from '@shared/referentiel.js';

const PERIODES: [Filtres['periode'], string][] = [['30j', '30 j'], ['90j', '90 j'], ['12m', '12 mois'], ['tout', 'Tout']];

/** Barre de filtres synchronisés : commune, quartier, responsable, statut, période. */
export function FilterBar({ periode = true, statut = true, extra, statutDefaut = 'Statut : actifs' }: { periode?: boolean; statut?: boolean; extra?: React.ReactNode; statutDefaut?: string }) {
  const { f, set, reset } = useFiltres();
  const { can } = useAuth();
  const { data: terr } = useTerritoires();
  const { data: resp } = useResponsables(can('dashboard'));
  const quartiers = useMemo(() => (terr || []).filter((c) => !f.commune || c.id === f.commune).flatMap((c) => c.quartiers), [terr, f.commune]);
  const responsables = useMemo(() => (resp || []).filter((r) => !f.commune || r.perimetres.some((p) => p.commune_id === f.commune))
    .filter((r) => !f.quartier || r.fonction === 'COORDONNATEUR' || r.perimetres.some((p) => p.quartier_id === f.quartier)), [resp, f.commune, f.quartier]);
  const actif = f.commune || f.quartier || f.responsable || f.statut || f.periode !== '30j';
  const num = (v: string) => (v ? Number(v) : undefined);

  return (
    <div className="filters" role="group" aria-label="Filtres">
      {extra}
      {(terr?.length || 0) > 1 && (
        <select id="f-commune" className="input" aria-label="Commune" value={f.commune ?? ''} onChange={(e) => set({ commune: num(e.target.value) })}>
          <option value="">Toutes les communes</option>
          {terr?.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      )}
      <select id="f-quartier" className="input" aria-label="Quartier" value={f.quartier ?? ''} onChange={(e) => set({ quartier: num(e.target.value) })}>
        <option value="">Tous les quartiers</option>
        {quartiers.map((q) => <option key={q.id} value={q.id}>{q.nom}</option>)}
      </select>
      {can('dashboard') && (
        <select id="f-resp" className="input" aria-label="Responsable" value={f.responsable ?? ''} onChange={(e) => set({ responsable: num(e.target.value) })}>
          <option value="">Tous les responsables</option>
          {(['COORDONNATEUR', 'SUPERVISEUR', 'COMMISSAIRE'] as const).map((fn) => (
            <optgroup key={fn} label={fn.charAt(0) + fn.slice(1).toLowerCase() + 's'}>
              {responsables.filter((r) => r.fonction === fn).map((r) => <option key={r.id} value={r.id}>{r.prenoms} {r.nom}</option>)}
            </optgroup>
          ))}
        </select>
      )}
      {statut && (
        <select id="f-statut" className="input" aria-label="Statut" value={f.statut ?? ''} onChange={(e) => set({ statut: e.target.value || undefined })}>
          <option value="">{statutDefaut}</option>
          {Object.entries(STATUTS).map(([k, v]: any) => <option key={k} value={k}>{v.libelle}</option>)}
          {statutDefaut !== 'Tous les statuts' && <option value="TOUS">Tous les statuts</option>}
        </select>
      )}
      {periode && (
        <div className="seg" role="group" aria-label="Période des inscriptions">
          {PERIODES.map(([k, l]) => <button key={k} aria-pressed={f.periode === k} onClick={() => set({ periode: k })}>{l}</button>)}
        </div>
      )}
      {actif && <button className="chip-reset" onClick={reset}>Réinitialiser</button>}
    </div>
  );
}
