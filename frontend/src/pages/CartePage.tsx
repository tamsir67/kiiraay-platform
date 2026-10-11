import { Page } from '../components/Layout';
import { FilterBar } from '../components/FilterBar';
import { Carte } from '../components/Carte';
import { Panel } from '../components/ui';
import { BarList } from '../components/charts';
import { useDashboard } from './Dashboard';
import { useFiltres } from '../lib/filtres';
import { useAuth } from '../lib/auth';
import { pct } from '../lib/format';

export function CartePage() {
  const { data: d } = useDashboard();
  const { f, set } = useFiltres();
  const { can } = useAuth();
  const quartiers = (d?.par_quartier || []).filter((q: any) => !f.commune || q.commune_id === f.commune);
  return (
    <Page eyebrow="Cartographie" titre="Couverture territoriale" filtres={<FilterBar periode={false} />}>
      <div className="grid g-main">
        <Panel titre={f.commune ? 'Quartiers de la commune' : 'Communes et quartiers'} hint={can('carte:points') ? 'Positions précises visibles selon votre profil' : 'Vue agrégée : positions individuelles masquées pour votre profil'}>
          <Carte hauteur="tall" />
        </Panel>
        <Panel titre={f.commune ? 'Couverture par quartier' : 'Couverture par commune'} hint="Militants actifs / objectif">
          {f.commune ? (
            <BarList items={quartiers.map((q: any) => ({ id: q.id, label: q.nom, value: q.actifs, objectif: q.objectif, sub: pct(q.taux) }))}
              onSelect={(id) => set({ quartier: f.quartier === id ? undefined : id })} />
          ) : (
            <BarList items={(d?.par_commune || []).map((c: any) => ({ id: c.id, label: c.nom, value: c.actifs, objectif: c.objectif, sub: pct(c.taux) }))}
              onSelect={(id) => set({ commune: id })} />
          )}
          <div className="legend" style={{ marginTop: 12 }}><span><i style={{ background: 'var(--leaf)' }} />Militants actifs</span><span><i className="goal" />Objectif</span></div>
        </Panel>
      </div>
    </Page>
  );
}
