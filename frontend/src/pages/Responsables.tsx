import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, UserX, Phone } from 'lucide-react';
import { api } from '../api/client';
import { Page } from '../components/Layout';
import { Chargement, Drawer, Field, Notice, Panel, messageErreur, useToast } from '../components/ui';
import { useResponsables, useTerritoires, type Responsable } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { useDashboard } from './Dashboard';
import { n, tel } from '../lib/format';

const FONCTIONS = { COORDONNATEUR: 'Coordonnateur', SUPERVISEUR: 'Superviseur', COMMISSAIRE: 'Commissaire' } as const;

/** Chaîne de responsabilité coordonnateur → superviseur → commissaire (CDC §5.4). */
export function Responsables() {
  const { can } = useAuth();
  const { data: resp, isLoading } = useResponsables();
  const { data: terr } = useTerritoires();
  const { data: d } = useDashboard();
  const [edition, setEdition] = useState<Partial<Responsable> | null>(null);
  const [commune, setCommune] = useState<number | ''>('');
  const gerer = can('responsables:gerer');

  const arbre = useMemo(() => {
    const r = resp || [];
    return r.filter((x) => x.fonction === 'COORDONNATEUR' && (!commune || x.perimetres.some((p) => p.commune_id === commune)))
      .map((c) => ({ ...c, enfants: r.filter((s) => s.parent_id === c.id).map((s) => ({ ...s, enfants: r.filter((m) => m.parent_id === s.id) })) }));
  }, [resp, commune]);
  const sansCommissaire = d?.alertes.quartiers_sans_commissaire || [];

  const Ligne = ({ r }: { r: any }) => (
    <div className="tree-head">
      <span className={`role-badge ${r.fonction}`}>{FONCTIONS[r.fonction as keyof typeof FONCTIONS]}</span>
      <div className="grow">
        <b>{r.prenoms} {r.nom}</b>
        <div className="muted" style={{ fontSize: 'var(--fs-xs)' }}>{r.perimetres.map((p: any) => p.quartier || `Commune de ${p.commune}`).join(', ')}</div>
      </div>
      {r.telephone && <span className="mono muted" style={{ fontSize: 'var(--fs-xs)' }}><Phone size={11} style={{ verticalAlign: -1 }} /> {tel(r.telephone)}</span>}
      {r.compte && <span className="tag" title="Compte utilisateur lié">@{r.compte}</span>}
      <span className="num" style={{ minWidth: 92, textAlign: 'right' }}><b>{n(r.effectif)}</b> <span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>militants</span></span>
      {gerer && <button className="btn ghost sm" onClick={() => setEdition(r)} aria-label={`Modifier ${r.prenoms} ${r.nom}`}><Pencil size={13} /></button>}
    </div>
  );

  return (
    <Page eyebrow="Organisation" titre="Chaîne de responsabilité"
      actions={gerer && <button className="btn primary" onClick={() => setEdition({ fonction: 'COMMISSAIRE', perimetres: [] })}><Plus size={15} /> Nouveau responsable</button>}
      filtres={(terr?.length || 0) > 1 ? (
        <div className="filters">
          <select id="r-commune" className="input" value={commune} onChange={(e) => setCommune(e.target.value ? Number(e.target.value) : '')} aria-label="Commune">
            <option value="">Toutes les communes</option>
            {terr?.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
      ) : undefined}>
      {sansCommissaire.length > 0 && (
        <Notice type="crit">
          <b>{sansCommissaire.length} quartier(s) sans commissaire</b> : {sansCommissaire.map((q: any) => `${q.nom} (${q.commune}, ${n(q.actifs)} militants)`).join(' · ')}.
          {gerer && ' Affectez un commissaire puis lancez la réaffectation des fiches du quartier.'}
        </Notice>
      )}
      {isLoading ? <Chargement h={400} /> : (
        <div className="tree">
          {arbre.map((c) => (
            <div key={c.id} className="tree-node">
              <Ligne r={c} />
              <div className="tree-children">
                {c.enfants.map((s) => (
                  <div key={s.id} className="tree-node">
                    <Ligne r={s} />
                    <div className="tree-children">
                      {s.enfants.map((m) => <div key={m.id} className="tree-node"><Ligne r={m} /></div>)}
                      {s.perimetres.filter((p) => !s.enfants.some((m) => m.perimetres.some((x) => x.quartier_id === p.quartier_id))).map((p) => (
                        <div key={p.quartier_id} className="tree-node" style={{ borderStyle: 'dashed', borderColor: 'var(--crit)' }}>
                          <div className="tree-head" style={{ color: 'var(--crit)' }}>
                            <UserX size={15} /><div className="grow"><b>{p.quartier}</b> — aucun commissaire</div>
                            {gerer && <button className="btn sm" onClick={() => setEdition({ fonction: 'COMMISSAIRE', parent_id: s.id, perimetres: [{ commune_id: p.commune_id, commune: p.commune, quartier_id: p.quartier_id, quartier: p.quartier }] })}><Plus size={13} /> Affecter</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {edition && <FormResponsable initial={edition} onClose={() => setEdition(null)} />}
    </Page>
  );
}

function FormResponsable({ initial, onClose }: { initial: Partial<Responsable>; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: terr } = useTerritoires();
  const { data: resp } = useResponsables();
  const [f, setF] = useState<any>({
    fonction: initial.fonction || 'COMMISSAIRE', nom: initial.nom || '', prenoms: initial.prenoms || '', sexe: initial.sexe || '',
    telephone: initial.telephone || '', parent_id: initial.parent_id || '', actif: initial.actif ?? true,
    perimetres: (initial.perimetres || []).map((p) => ({ commune_id: p.commune_id, quartier_id: p.quartier_id })),
  });
  const [busy, setBusy] = useState(false);
  const parentFn = { COORDONNATEUR: null, SUPERVISEUR: 'COORDONNATEUR', COMMISSAIRE: 'SUPERVISEUR' }[f.fonction as string];
  const quartiersCoches = new Set(f.perimetres.map((p: any) => p.quartier_id));
  const communesCochees = new Set(f.perimetres.filter((p: any) => !p.quartier_id).map((p: any) => p.commune_id));

  function basculer(commune_id: number, quartier_id: number | null) {
    setF((o: any) => {
      const existe = o.perimetres.some((p: any) => p.commune_id === commune_id && p.quartier_id === quartier_id);
      return { ...o, perimetres: existe ? o.perimetres.filter((p: any) => !(p.commune_id === commune_id && p.quartier_id === quartier_id)) : [...o.perimetres, { commune_id, quartier_id }] };
    });
  }

  async function enregistrer() {
    setBusy(true);
    try {
      const body = { ...f, parent_id: f.parent_id ? Number(f.parent_id) : null, sexe: f.sexe || null, telephone: f.telephone || null };
      if (initial.id) await api.put(`/responsables/${initial.id}`, body); else await api.post('/responsables', body);
      // Applique la nouvelle chaîne aux fiches des quartiers concernés
      if (f.fonction !== 'COORDONNATEUR') for (const p of f.perimetres) if (p.quartier_id) await api.post('/responsables/reaffecter', { quartier_id: p.quartier_id });
      toast(initial.id ? 'Responsable mis à jour' : 'Responsable créé et fiches réaffectées');
      for (const k of ['responsables', 'dashboard', 'carte-territoires']) qc.invalidateQueries({ queryKey: [k] });
      onClose();
    } catch (e) { toast(messageErreur(e), true); } finally { setBusy(false); }
  }

  return (
    <Drawer etroit titre={initial.id ? 'Modifier le responsable' : 'Nouveau responsable'} onClose={onClose}
      pied={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" disabled={busy} onClick={enregistrer}>Enregistrer</button></>}>
      <div className="form-grid">
        <Field label="Fonction" requis>
          <select id="r-fonction" className="input" value={f.fonction} onChange={(e) => setF({ ...f, fonction: e.target.value, parent_id: '', perimetres: [] })}>
            {Object.entries(FONCTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        {parentFn ? (
          <Field label={`Rattaché au ${parentFn.toLowerCase()}`} requis>
            <select id="r-parent" className="input" value={f.parent_id} onChange={(e) => setF({ ...f, parent_id: e.target.value })}>
              <option value="">Choisir…</option>
              {(resp || []).filter((r) => r.fonction === parentFn).map((r) => <option key={r.id} value={r.id}>{r.prenoms} {r.nom}</option>)}
            </select>
          </Field>
        ) : <div />}
        <Field label="Nom" requis><input id="r-nom" className="input" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} /></Field>
        <Field label="Prénom(s)" requis><input id="r-prenoms" className="input" value={f.prenoms} onChange={(e) => setF({ ...f, prenoms: e.target.value })} /></Field>
        <Field label="Sexe"><select id="r-sexe" className="input" value={f.sexe} onChange={(e) => setF({ ...f, sexe: e.target.value })}><option value="">—</option><option value="F">Femme</option><option value="M">Homme</option></select></Field>
        <Field label="Téléphone"><input id="r-tel" className="input" inputMode="tel" value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} /></Field>
        {initial.id && <label className="check full"><input id="r-actif" type="checkbox" checked={f.actif} onChange={(e) => setF({ ...f, actif: e.target.checked })} /> Responsable actif</label>}
      </div>
      <fieldset>
        <legend>Périmètre {f.fonction === 'COORDONNATEUR' ? '(communes)' : '(quartiers)'}</legend>
        <div className="stack" style={{ gap: 10 }}>
          {terr?.map((c) => (
            <div key={c.id}>
              {f.fonction === 'COORDONNATEUR' ? (
                <label className="check"><input type="checkbox" checked={communesCochees.has(c.id)} onChange={() => basculer(c.id, null)} /> {c.nom}</label>
              ) : (
                <>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>{c.nom}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 4 }}>
                    {c.quartiers.map((q) => <label key={q.id} className="check"><input type="checkbox" checked={quartiersCoches.has(q.id)} onChange={() => basculer(c.id, q.id)} /> {q.nom}</label>)}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </fieldset>
    </Drawer>
  );
}
