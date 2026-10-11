import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet, FileUp, Download, PlayCircle, Upload } from 'lucide-react';
import { api, DEMO } from '../api/client';
import { Page } from '../components/Layout';
import { Notice, Panel, messageErreur, useToast, Field } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useFiltres, paramsFiltres } from '../lib/filtres';
import { FilterBar } from '../components/FilterBar';
import { dateHeure, n } from '../lib/format';

/** Import Excel/CSV avec simulation et rapport d'erreurs ; exports sécurisés (CDC §5.5). */
export function Echanges() {
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const { f } = useFiltres();
  const input = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [rapport, setRapport] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [inclureDoublons, setInclureDoublons] = useState(false);
  const { data: historique } = useQuery({ queryKey: ['imports'], queryFn: () => api.get('/imports'), enabled: can('import') });

  async function envoyer(simulation: boolean) {
    if (!fichier) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('fichier', fichier);
    try {
      const r = await api.post('/imports', fd, { simulation: String(simulation), inclure_doublons: String(inclureDoublons) });
      setRapport(r);
      if (!simulation) {
        toast(`${n(r.synthese.a_inserer)} fiches importées`);
        for (const k of ['imports', 'militants', 'dashboard']) qc.invalidateQueries({ queryKey: [k] });
      }
    } catch (e) { toast(messageErreur(e), true); setRapport(null); } finally { setBusy(false); }
  }

  async function telecharger(path: string, params?: any) {
    try { await api.telecharger(path, params); toast('Fichier généré — opération journalisée'); } catch (e) { toast(messageErreur(e), true); }
  }

  return (
    <Page eyebrow="Échanges de données" titre="Import / Export" filtres={can('export') ? <FilterBar periode={false} statutDefaut="Tous les statuts" /> : undefined}>
      <div className="grid g-2">
        {can('import') && (
          <Panel titre="Importer des militants" hint="Excel (.xlsx) ou CSV, 10 Mo maximum">
            <div className="stack" style={{ gap: 12 }}>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 'var(--fs-sm)', color: 'var(--fg-2)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <li>Téléchargez le modèle et remplissez une ligne par militant.</li>
                <li>Lancez une <b>simulation</b> : rien n'est enregistré, vous obtenez le rapport d'erreurs et de doublons.</li>
                <li>Corrigez puis <b>importez</b>. Les fiches valides sont créées{can('militants:valider') ? ' et validées' : ' en attente de validation'}.</li>
              </ol>
              <button className="btn" onClick={() => telecharger('/imports/modele.xlsx')} style={{ alignSelf: 'flex-start' }}><FileSpreadsheet size={15} /> Télécharger le modèle Excel</button>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const fl = e.dataTransfer.files[0]; if (fl) { setFichier(fl); setRapport(null); } }}
                onClick={() => input.current?.click()}
                style={{ border: '2px dashed var(--line-strong)', borderRadius: 10, padding: 22, textAlign: 'center', cursor: 'pointer', background: 'var(--surface-2)' }}>
                <FileUp size={22} style={{ color: 'var(--leaf)' }} />
                <div><b>{fichier ? fichier.name : 'Déposez un fichier ici ou cliquez pour choisir'}</b></div>
                <div className="muted" style={{ fontSize: 'var(--fs-xs)' }}>{fichier ? `${(fichier.size / 1024).toFixed(0)} Ko` : '.xlsx ou .csv (séparateur ; ou ,)'}{DEMO && ' · en démo, utilisez un CSV'}</div>
                <input ref={input} id="fichier-import" type="file" accept=".xlsx,.csv" hidden onChange={(e) => { setFichier(e.target.files?.[0] || null); setRapport(null); }} />
              </div>
              <label className="check"><input id="inclure-doublons" type="checkbox" checked={inclureDoublons} onChange={(e) => setInclureDoublons(e.target.checked)} /> Importer aussi les lignes signalées comme doublons</label>
              <div className="btn-row">
                <button className="btn" disabled={!fichier || busy} onClick={() => envoyer(true)}><PlayCircle size={15} /> Simuler</button>
                <button className="btn primary" disabled={!fichier || busy || !rapport?.synthese?.simulation} onClick={() => envoyer(false)}><Upload size={15} /> Importer {rapport?.synthese?.simulation ? `${n(rapport.synthese.a_inserer)} fiches` : ''}</button>
              </div>
              {rapport && (
                <>
                  <Notice type={rapport.synthese.rejetees ? 'warn' : 'ok'}>
                    <b>{rapport.synthese.simulation ? 'Simulation' : 'Import terminé'}</b> — {n(rapport.synthese.lignes)} lignes lues,
                    {' '}{n(rapport.synthese.valides)} valides, {n(rapport.synthese.rejetees)} rejetées, {n(rapport.synthese.doublons)} doublons ;
                    {' '}<b>{n(rapport.synthese.a_inserer)}</b> {rapport.synthese.simulation ? 'seront importées' : 'importées'}.
                  </Notice>
                  {rapport.rapport.length > 0 && (
                    <div className="table-wrap" style={{ maxHeight: 280 }}>
                      <table className="data">
                        <thead><tr><th className="num">Ligne</th><th>Militant</th><th>Problème</th></tr></thead>
                        <tbody>
                          {rapport.rapport.map((r: any) => (
                            <tr key={r.ligne}>
                              <td className="num mono">{r.ligne}</td><td>{r.nom || '—'}</td>
                              <td style={{ color: r.erreurs.length ? 'var(--crit)' : 'var(--warn)' }}>{[...r.erreurs, r.doublon].filter(Boolean).join(' · ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </Panel>
        )}
        {can('export') && (
          <Panel titre="Exporter le fichier" hint="Selon les filtres ci-dessus et votre périmètre">
            <div className="stack" style={{ gap: 12 }}>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-2)' }}>
                L'export contient les fiches de votre périmètre correspondant aux filtres. {can('export:pii')
                  ? 'Votre profil exporte les coordonnées complètes (téléphone, adresse, GPS).'
                  : 'Votre profil exporte les téléphones masqués, sans adresse ni GPS.'} Chaque export est horodaté, nominatif et inscrit au journal d'audit.
              </p>
              <Field label="Format">
                <div className="btn-row">
                  <button className="btn primary" onClick={() => telecharger('/exports/militants.xlsx', { ...paramsFiltres(f, { periode: false }), statut: f.statut || 'TOUS' })}><Download size={15} /> Excel (.xlsx)</button>
                  <button className="btn" onClick={() => telecharger('/exports/militants.csv', { ...paramsFiltres(f, { periode: false }), statut: f.statut || 'TOUS' })}><Download size={15} /> CSV</button>
                </div>
              </Field>
              <Notice type="warn">Un fichier exporté sort du périmètre de protection de la plateforme : conservez-le sur un support chiffré et supprimez-le après usage.</Notice>
            </div>
          </Panel>
        )}
      </div>
      {can('import') && (
        <Panel titre="Historique des imports" flush>
          {!historique?.length ? <div className="panel-b muted">Aucun import pour le moment.</div> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Date</th><th>Fichier</th><th>Auteur</th><th className="num">Lignes</th><th className="num">Importées</th><th className="num">Rejetées</th><th className="num">Doublons</th></tr></thead>
                <tbody>{historique.map((i: any) => (
                  <tr key={i.id}><td>{dateHeure(i.created_at)}</td><td className="mono">{i.fichier}</td><td>{i.auteur}</td><td className="num">{n(i.lignes_total)}</td><td className="num">{n(i.lignes_inserees)}</td><td className="num">{n(i.lignes_rejetees)}</td><td className="num">{n(i.doublons)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </Page>
  );
}
