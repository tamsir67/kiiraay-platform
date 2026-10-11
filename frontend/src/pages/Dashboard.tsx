import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Copy, MapPinOff, RefreshCw, UserX, Clock, FileWarning } from 'lucide-react';
import { api } from '../api/client';
import { Page } from '../components/Layout';
import { FilterBar } from '../components/FilterBar';
import { Carte } from '../components/Carte';
import { AreaLine, BarList, Columns, SplitBar } from '../components/charts';
import { Chargement, Panel, Notice, messageErreur } from '../components/ui';
import { useFiltres, paramsFiltres } from '../lib/filtres';
import { useAuth } from '../lib/auth';
import { moisCourt, n, pct, dateHeure } from '../lib/format';
import { ROLES } from '@shared/referentiel.js';

export function useDashboard() {
  const { f } = useFiltres();
  const params = paramsFiltres(f);
  return useQuery({ queryKey: ['dashboard', params], queryFn: () => api.get('/dashboard', params), placeholderData: (p) => p });
}

function Kpi({ label, value, sub, ratio }: { label: string; value: React.ReactNode; sub?: React.ReactNode; ratio?: number | null }) {
  return (
    <div className="panel kpi">
      <span className="label">{label}</span>
      <span className="value">{value}</span>
      {ratio != null && <div className="meter" role="img" aria-label={`${Math.round(ratio)} %`}><i style={{ width: `${Math.min(100, ratio)}%` }} /></div>}
      {sub && <span className="sub">{sub}</span>}
    </div>
  );
}

export function Dashboard() {
  const { data: d, isLoading, error, isFetching } = useDashboard();
  const { f, set } = useFiltres();
  const { user, can } = useAuth();
  const nav = useNavigate();
  const libellePeriode = { '30j': '30 derniers jours', '90j': '90 derniers jours', '12m': '12 derniers mois', tout: 'depuis le début', perso: 'sur la période' }[f.periode];

  return (
    <Page
      eyebrow={<>Dashboard de mobilisation territoriale {isFetching && <RefreshCw size={11} style={{ verticalAlign: -1 }} className="spin" />}</>}
      titre="KIIRAAY — Guédiawaye 2027"
      actions={<span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>{(ROLES as any)[user!.role]} · {new Date().toLocaleDateString('fr-FR')}</span>}
      filtres={<FilterBar />}
    >
      {error && <Notice type="crit">{messageErreur(error)}</Notice>}
      {isLoading || !d ? <Chargement h={420} /> : (
        <>
          <div className="grid g-kpi">
            <Kpi label="Militants actifs" value={n(d.kpis.actifs)}
              ratio={d.kpis.taux_objectif}
              sub={<>
                {d.kpis.evolution_pct != null && (
                  <span className={`delta ${d.kpis.evolution_pct >= 0 ? 'up' : 'down'}`}>
                    {d.kpis.evolution_pct >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{pct(Math.abs(d.kpis.evolution_pct), 1)}
                  </span>
                )}
                <span>{libellePeriode} · {pct(d.kpis.taux_objectif, 1)} de l'objectif ({n(d.kpis.objectif)})</span>
              </>} />
            <Kpi label="Communes couvertes" value={<>{d.kpis.communes_couvertes}<small> / {d.kpis.communes_total}</small></>}
              sub={<>{n(d.kpis.nouvelles)} nouvelles inscriptions {libellePeriode}</>} />
            <Kpi label="Quartiers couverts" value={<>{d.kpis.quartiers_couverts}<small> / {d.kpis.quartiers_total}</small></>}
              ratio={d.kpis.quartiers_total ? (d.kpis.quartiers_couverts / d.kpis.quartiers_total) * 100 : null}
              sub="Couvert = au moins un militant actif et un commissaire" />
            <Kpi label="Responsables actifs" value={n(d.kpis.responsables_actifs)}
              sub={<>{n(d.kpis.mises_a_jour)} fiches mises à jour · {n(d.kpis.en_attente)} en attente</>} />
          </div>

          <div className="grid g-main">
            <Panel titre="Carte de couverture — Département de Guédiawaye" hint="Cliquez une commune ou un quartier pour filtrer">
              <Carte />
            </Panel>
            <div className="stack">
              <Panel titre="Militants par commune" hint="Repère : objectif">
                <BarList
                  items={d.par_commune.map((c: any) => ({ id: c.id, label: c.nom, value: c.actifs, objectif: c.objectif, sub: pct(c.taux) }))}
                  onSelect={(id) => set({ commune: f.commune === id ? undefined : id })} />
                <div className="legend" style={{ marginTop: 12 }}><span><i style={{ background: 'var(--leaf)' }} />Militants actifs</span><span><i className="goal" />Objectif de mobilisation</span></div>
              </Panel>
              <Panel titre="Alertes de couverture et de qualité">
                <div className="alerts">
                  <AlerteLigne ico={<UserX size={14} />} niveau="crit" titre="Quartiers sans commissaire"
                    detail={d.alertes.quartiers_sans_commissaire.slice(0, 3).map((q: any) => q.nom).join(', ') + (d.alertes.quartiers_sans_commissaire.length > 3 ? '…' : '')}
                    valeur={d.alertes.quartiers_sans_commissaire.length} to={can('dashboard') ? '/responsables' : undefined} />
                  <AlerteLigne ico={<FileWarning size={14} />} niveau="warn" titre="Données à mettre à jour" detail="À vérifier, sans téléphone ou non revues depuis 12 mois"
                    valeur={d.alertes.a_mettre_a_jour} to={can('militants:lire') ? '/militants?incomplet=maj' : undefined} />
                  <AlerteLigne ico={<Copy size={14} />} niveau="info" titre="Doublons potentiels" detail="Même téléphone ou même identité"
                    valeur={d.alertes.doublons_potentiels} to={can('qualite') ? '/qualite' : undefined} />
                  <AlerteLigne ico={<Clock size={14} />} niveau="serious" titre="Fiches en attente de validation" detail="Saisies par les commissaires et opérateurs"
                    valeur={d.alertes.en_attente} to={can('militants:lire') ? '/militants?statut=EN_ATTENTE' : undefined} />
                  <AlerteLigne ico={<MapPinOff size={14} />} niveau="info" titre="Sans coordonnées GPS" detail={`${n(d.alertes.sans_information)} personnes non encore informées du traitement`}
                    valeur={d.alertes.sans_gps} to={can('militants:lire') ? '/militants?incomplet=gps' : undefined} />
                </div>
              </Panel>
            </div>
          </div>

          <div className="grid g-3">
            <Panel titre="Évolution des militants actifs" hint="Cumul sur 12 mois">
              <AreaLine objectif={!f.quartier && !f.responsable ? d.kpis.objectif : undefined}
                data={d.evolution.map((e: any) => ({ label: moisCourt(e.mois), value: e.cumul, extra: `+${n(e.nouvelles)} inscrits ce mois` }))} />
            </Panel>
            <Panel titre="Nouvelles inscriptions par mois">
              <Columns data={d.evolution.map((e: any) => ({ label: moisCourt(e.mois).split(' ')[0], value: e.nouvelles, detail: moisCourt(e.mois) }))} />
            </Panel>
            <Panel titre="Profil des militants">
              <div className="stack" style={{ gap: 18 }}>
                <SplitBar a={{ label: 'Femmes', value: d.par_sexe.F }} b={{ label: 'Hommes', value: d.par_sexe.M }} />
                <div>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>Tranches d'âge</div>
                  <Columns height={150} couleur="var(--ink-2)" data={d.par_age.map((a: any) => ({ label: a.tranche === 'Non renseigné' ? 'N. r.' : a.tranche, value: a.n, detail: a.tranche === 'Non renseigné' ? 'Date de naissance non renseignée' : `${a.tranche} ans` }))} />
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid g-2">
            <Panel titre="Couverture par quartier" hint={`${d.alertes.quartiers_sous_objectif} quartier(s) sous 50 % de l'objectif`} flush>
              <div className="table-wrap" style={{ maxHeight: 420 }}>
                <table className="data">
                  <thead><tr><th>Quartier</th><th className="num">Actifs</th><th className="num">Objectif</th><th className="num">Couverture</th><th>Commissaires</th></tr></thead>
                  <tbody>
                    {[...d.par_quartier].sort((a: any, b: any) => (a.taux ?? 0) - (b.taux ?? 0)).map((q: any) => (
                      <tr key={q.id} className="clickable" onClick={() => set({ commune: q.commune_id, quartier: q.id })}>
                        <td className="who-cell"><b>{q.nom}</b><span>{q.commune}</span></td>
                        <td className="num">{n(q.actifs)}</td>
                        <td className="num muted">{n(q.objectif)}</td>
                        <td className="num">
                          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                            <span className="meter" style={{ width: 54, marginTop: 0 }}><i style={{ width: `${Math.min(100, q.taux || 0)}%`, background: (q.taux ?? 0) < 50 ? 'var(--crit)' : (q.taux ?? 0) < 75 ? 'var(--warn-dot)' : 'var(--leaf)' }} /></span>
                            <b>{pct(q.taux)}</b>
                          </span>
                        </td>
                        <td>{q.nb_commissaires ? <span className="tag">{q.nb_commissaires}</span> : <span className="pill" style={{ background: 'var(--crit-soft)', color: 'var(--crit)' }}>Aucun</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel titre="Effectifs par responsable" hint="Militants actifs rattachés" flush>
              <div className="table-wrap" style={{ maxHeight: 420 }}>
                <table className="data">
                  <thead><tr><th>Responsable</th><th>Fonction</th><th>Périmètre</th><th className="num">Effectif</th></tr></thead>
                  <tbody>
                    {d.par_responsable.map((r: any) => (
                      <tr key={r.id} className="clickable" onClick={() => set({ responsable: f.responsable === r.id ? undefined : r.id })}>
                        <td className="who-cell"><b>{r.nom}</b>{r.parent && <span>↳ {r.parent}</span>}</td>
                        <td><span className={`role-badge ${r.fonction}`}>{r.fonction.slice(0, 5)}.</span></td>
                        <td className="muted" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.perimetre}>{r.perimetre}</td>
                        <td className="num"><b>{n(r.effectif)}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
          <p className="muted" style={{ fontSize: 'var(--fs-xs)' }}>
            Indicateurs calculés en direct depuis la base · période des flux : {d.periode.du} → {d.periode.au} · généré le {dateHeure(new Date().toISOString())}.
            {' '}<button className="chip-reset" onClick={() => nav('/rapports')}>Préparer un rapport imprimable</button>
          </p>
        </>
      )}
    </Page>
  );
}

function AlerteLigne({ ico, niveau, titre, detail, valeur, to }: { ico: React.ReactNode; niveau: string; titre: string; detail?: string; valeur: number; to?: string }) {
  const contenu = (
    <>
      <span className={`alert-ico ${niveau}`}>{ico}</span>
      <span style={{ minWidth: 0 }}><span className="t">{titre}</span><span className="d" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</span></span>
      <span className="n">{n(valeur)}</span>
    </>
  );
  return to ? <Link to={to} className="alert-row">{contenu}</Link> : <div className="alert-row">{contenu}</div>;
}
