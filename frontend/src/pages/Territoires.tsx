import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { api } from '../api/client';
import { Page } from '../components/Layout';
import { Chargement, Field, Modal, Notice, Panel, messageErreur, useToast } from '../components/ui';
import { useTerritoires } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { n } from '../lib/format';

/** Référentiel territorial : communes, quartiers, secteurs, objectifs (CDC §3, §5.3). */
export function Territoires() {
  const { can } = useAuth();
  const { data: terr, isLoading } = useTerritoires();
  const [edit, setEdit] = useState<{ type: 'commune' | 'quartier' | 'nouveau-quartier' | 'secteur'; obj: any } | null>(null);
  const gerer = can('territoires:gerer');

  return (
    <Page eyebrow="Organisation" titre="Territoires">
      <Notice type="info">
        Référentiel de démarrage : 5 communes, quartiers et secteurs à valider par le comité de pilotage. Les limites cartographiques sont
        indicatives et seront remplacées par les limites officielles (import GeoJSON par l'administrateur).
      </Notice>
      {isLoading ? <Chargement h={400} /> : (
        <div className="grid g-2">
          {terr?.map((c) => (
            <Panel key={c.id} titre={c.nom} hint={<>Objectif communal : <b>{n(c.objectif_militants)}</b> · {c.quartiers.length} quartiers</>}
              actions={gerer && <div className="btn-row">
                <button className="btn sm" onClick={() => setEdit({ type: 'commune', obj: c })}><Pencil size={12} /> Objectif</button>
                <button className="btn sm" onClick={() => setEdit({ type: 'nouveau-quartier', obj: { commune_id: c.id, nom: '', objectif_militants: 0, actif: true } })}><Plus size={12} /> Quartier</button>
              </div>} flush>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th>Code</th><th>Quartier</th><th>Secteurs</th><th className="num">Objectif</th>{gerer && <th />}</tr></thead>
                  <tbody>
                    {c.quartiers.map((q) => (
                      <tr key={q.id} style={!q.actif ? { opacity: 0.5 } : undefined}>
                        <td className="mono muted">{q.code}</td>
                        <td><b style={{ fontWeight: 600 }}>{q.nom}</b>{!q.actif && <span className="tag" style={{ marginLeft: 6 }}>inactif</span>}</td>
                        <td className="muted" style={{ fontSize: 'var(--fs-xs)' }}>
                          {q.secteurs.map((s) => s.nom).join(', ') || '—'}
                          {gerer && <button className="chip-reset" onClick={() => setEdit({ type: 'secteur', obj: { quartier_id: q.id, quartier: q.nom, nom: '' } })}> + secteur</button>}
                        </td>
                        <td className="num">{n(q.objectif_militants)}</td>
                        {gerer && <td><button className="btn ghost sm" aria-label={`Modifier ${q.nom}`} onClick={() => setEdit({ type: 'quartier', obj: q })}><Pencil size={12} /></button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ))}
        </div>
      )}
      {edit && <Edition {...edit} onClose={() => setEdit(null)} />}
    </Page>
  );
}

function Edition({ type, obj, onClose }: { type: string; obj: any; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = useState<any>({ ...obj });
  const [busy, setBusy] = useState(false);
  const titres: Record<string, string> = { commune: `Objectif — ${obj.nom}`, quartier: `Quartier — ${obj.nom}`, 'nouveau-quartier': 'Nouveau quartier', secteur: `Nouveau secteur — ${obj.quartier}` };
  async function ok() {
    setBusy(true);
    try {
      if (type === 'commune') await api.put(`/territoires/communes/${obj.id}`, { objectif_militants: Number(f.objectif_militants) });
      if (type === 'quartier') await api.put(`/territoires/quartiers/${obj.id}`, { nom: f.nom, objectif_militants: Number(f.objectif_militants), actif: f.actif });
      if (type === 'nouveau-quartier') await api.post('/territoires/quartiers', { commune_id: obj.commune_id, nom: f.nom, objectif_militants: Number(f.objectif_militants) });
      if (type === 'secteur') await api.post('/territoires/secteurs', { quartier_id: obj.quartier_id, nom: f.nom });
      toast('Référentiel mis à jour');
      for (const k of ['territoires', 'dashboard', 'carte-territoires']) qc.invalidateQueries({ queryKey: [k] });
      onClose();
    } catch (e) { toast(messageErreur(e), true); } finally { setBusy(false); }
  }
  return (
    <Modal titre={titres[type]} onClose={onClose} pied={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" disabled={busy} onClick={ok}>Enregistrer</button></>}>
      {type !== 'commune' && <Field label="Nom" requis><input id="t-nom" className="input" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} /></Field>}
      {type !== 'secteur' && <Field label="Objectif de militants"><input id="t-obj" className="input" type="number" min={0} value={f.objectif_militants} onChange={(e) => setF({ ...f, objectif_militants: e.target.value })} /></Field>}
      {type === 'quartier' && <label className="check"><input id="t-actif" type="checkbox" checked={f.actif} onChange={(e) => setF({ ...f, actif: e.target.checked })} /> Quartier actif</label>}
    </Modal>
  );
}
