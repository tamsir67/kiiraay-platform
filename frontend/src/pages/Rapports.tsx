import { Printer } from 'lucide-react';
import { Page } from '../components/Layout';
import { FilterBar } from '../components/FilterBar';
import { Chargement, Notice } from '../components/ui';
import { useDashboard } from './Dashboard';
import { useFiltres } from '../lib/filtres';
import { useTerritoires } from '../lib/hooks';
import { n, pct, moisCourt } from '../lib/format';
import { DEMO } from '../api/client';
import logo from '../logo-kiiraay.jpg';

/** Synthèse imprimable pour les réunions du comité de pilotage. */
export function Rapports() {
  const { data: d, isLoading } = useDashboard();
  const { f } = useFiltres();
  const { data: terr } = useTerritoires();
  const commune = terr?.find((c) => c.id === f.commune);
  const perimetre = commune ? `Commune de ${commune.nom}` : 'Département de Guédiawaye';
  const qs = (d?.par_quartier || []).filter((q: any) => !f.commune || q.commune_id === f.commune);

  return (
    <Page eyebrow="Rapports" titre="Synthèse de mobilisation" filtres={<FilterBar />}
      actions={!DEMO && <button className="btn primary" onClick={() => window.print()}><Printer size={15} /> Imprimer / PDF</button>}>
      {DEMO && <Notice type="info">Dans la plateforme installée, ce rapport s'imprime ou s'enregistre en PDF directement depuis le navigateur.</Notice>}
      {isLoading || !d ? <Chargement h={500} /> : (
        <article className="report-sheet">
          <header>
            <img src={logo} alt="" />
            <div style={{ flex: 1 }}>
              <div className="eyebrow">KIIRAAY — Les Patriotes Républicains · Élections locales 2027</div>
              <h1>Rapport de mobilisation — {perimetre}</h1>
              <div className="muted">Arrêté au {new Date().toLocaleDateString('fr-FR', { dateStyle: 'long' })} · flux du {d.periode.du} au {d.periode.au} · document interne confidentiel</div>
            </div>
          </header>
          <section className="grid g-kpi">
            {[
              ['Militants actifs', n(d.kpis.actifs), `${pct(d.kpis.taux_objectif, 1)} de l'objectif de ${n(d.kpis.objectif)}`],
              ['Nouvelles inscriptions', n(d.kpis.nouvelles), 'sur la période'],
              ['Quartiers couverts', `${d.kpis.quartiers_couverts} / ${d.kpis.quartiers_total}`, `${d.alertes.quartiers_sans_commissaire.length} sans commissaire`],
              ['Responsables actifs', n(d.kpis.responsables_actifs), `${n(d.kpis.en_attente)} fiches à valider`],
            ].map(([l, v, s]) => (
              <div key={l} className="kpi" style={{ border: '1px solid var(--line)', borderRadius: 8 }}>
                <span className="label">{l}</span><span className="value" style={{ fontSize: 'var(--fs-2xl)' }}>{v}</span><span className="sub">{s}</span>
              </div>
            ))}
          </section>
          <section>
            <h2 style={{ marginBottom: 8 }}>Constats</h2>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Le fichier compte <b>{n(d.kpis.actifs)}</b> militants actifs ({pct(d.par_sexe.F / Math.max(1, d.par_sexe.F + d.par_sexe.M) * 100, 0)} de femmes).</li>
              <li><b>{d.alertes.quartiers_sous_objectif}</b> quartier(s) sont sous 50 % de leur objectif : {qs.filter((q: any) => (q.taux ?? 0) < 50).map((q: any) => q.nom).join(', ') || 'aucun'}.</li>
              <li>Quartiers sans commissaire : {d.alertes.quartiers_sans_commissaire.map((q: any) => `${q.nom} (${q.commune})`).join(', ') || 'aucun'}.</li>
              <li>Qualité : {n(d.alertes.doublons_potentiels)} doublons potentiels, {n(d.alertes.a_mettre_a_jour)} fiches à mettre à jour, {n(d.alertes.sans_information)} personnes à informer.</li>
              <li>Dernier mois complet : {d.evolution.length > 1 ? `${n(d.evolution[d.evolution.length - 2].nouvelles)} inscriptions en ${moisCourt(d.evolution[d.evolution.length - 2].mois)}` : '—'}.</li>
            </ul>
          </section>
          <section className="table-wrap">
            <h2 style={{ marginBottom: 8 }}>{commune ? 'Détail par quartier' : 'Détail par commune'}</h2>
            <table className="data">
              <thead><tr><th>{commune ? 'Quartier' : 'Commune'}</th><th className="num">Actifs</th><th className="num">Objectif</th><th className="num">Couverture</th>{!commune && <th className="num">Nouveaux</th>}{commune && <th>Commissaires</th>}</tr></thead>
              <tbody>
                {commune ? qs.map((q: any) => (
                  <tr key={q.id}><td>{q.nom}</td><td className="num">{n(q.actifs)}</td><td className="num">{n(q.objectif)}</td><td className="num">{pct(q.taux)}</td><td>{q.nb_commissaires || 'Aucun'}</td></tr>
                )) : d.par_commune.map((c: any) => (
                  <tr key={c.id}><td>{c.nom}</td><td className="num">{n(c.actifs)}</td><td className="num">{n(c.objectif)}</td><td className="num">{pct(c.taux)}</td><td className="num">{n(c.nouvelles)}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
          <footer className="muted" style={{ fontSize: 'var(--fs-xs)', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
            Données personnelles — diffusion restreinte aux membres habilités du comité de pilotage KIIRAAY.
          </footer>
        </article>
      )}
    </Page>
  );
}
