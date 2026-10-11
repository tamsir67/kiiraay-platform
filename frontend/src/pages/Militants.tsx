import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Download, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api/client';
import { Page } from '../components/Layout';
import { FilterBar } from '../components/FilterBar';
import { Chargement, Empty, Notice, Panel, StatutPill, messageErreur, useToast } from '../components/ui';
import { useFiltres, paramsFiltres } from '../lib/filtres';
import { useAuth } from '../lib/auth';
import { date, n } from '../lib/format';
import { FicheMilitant } from './FicheMilitant';
import { FormulaireMilitant } from './FormulaireMilitant';

const INCOMPLETS: Record<string, string> = {
  maj: 'À mettre à jour', telephone: 'Sans téléphone', gps: 'Sans GPS', commissaire: 'Sans commissaire', information: 'Personne non informée',
};

export function Militants() {
  const { f, set } = useFiltres();
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState('');
  const [qDebounce, setQDebounce] = useState('');
  const [sexe, setSexe] = useState('');
  const [incomplet, setIncomplet] = useState(sp.get('incomplet') || '');
  const [page, setPage] = useState(1);
  const [tri, setTri] = useState<{ col: string; ordre: 'asc' | 'desc' }>({ col: 'date', ordre: 'desc' });
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [edition, setEdition] = useState<any | null>(null);

  // Liens profonds depuis les alertes du dashboard (?statut=…, ?incomplet=…)
  useEffect(() => {
    const s = sp.get('statut');
    if (s) set({ statut: s });
    if (sp.get('incomplet') || s) setSp({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => setQDebounce(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => setPage(1), [qDebounce, sexe, incomplet, f.commune, f.quartier, f.responsable, f.statut]);

  const params = useMemo(() => ({
    ...paramsFiltres(f, { periode: false }), q: qDebounce || undefined, sexe: sexe || undefined, incomplet: incomplet || undefined,
    page, taille: 25, tri: tri.col, ordre: tri.ordre,
  }), [f, qDebounce, sexe, incomplet, page, tri]);
  const { data, isLoading, error, isFetching } = useQuery({ queryKey: ['militants', params], queryFn: () => api.get('/militants', params), placeholderData: keepPreviousData });

  const triPar = (col: string) => setTri((t) => ({ col, ordre: t.col === col && t.ordre === 'desc' ? 'asc' : 'desc' }));
  const Th = ({ col, children, num }: { col?: string; children: React.ReactNode; num?: boolean }) => (
    <th className={num ? 'num' : undefined} aria-sort={col && tri.col === col ? (tri.ordre === 'asc' ? 'ascending' : 'descending') : undefined}>
      {col ? <button onClick={() => triPar(col)}>{children}{tri.col === col && (tri.ordre === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}</button> : children}
    </th>
  );
  const pages = data ? Math.max(1, Math.ceil(data.total / data.taille)) : 1;

  async function exporter(format: 'csv' | 'xlsx') {
    try {
      await api.telecharger(`/exports/militants.${format}`, { ...params, page: undefined, taille: undefined, tri: undefined, ordre: undefined, statut: f.statut || 'TOUS' });
      toast(`Export ${format.toUpperCase()} généré et journalisé`);
    } catch (e) { toast(messageErreur(e), true); }
  }

  return (
    <Page
      eyebrow="Gestion des militants"
      titre="Fichier militants"
      actions={<>
        {can('export') && <button className="btn" onClick={() => exporter('xlsx')}><Download size={15} /> Exporter</button>}
        {can('militants:ecrire') && <button className="btn primary" onClick={() => setEdition({})}><Plus size={15} /> Nouveau militant</button>}
      </>}
      filtres={<FilterBar periode={false} statutDefaut="Tous les statuts" extra={
        <div className="search">
          <Search size={15} />
          <input id="recherche" className="input" type="search" placeholder="Nom, prénom, téléphone, adresse ou n° KRY-…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un militant" />
        </div>
      } />}
    >
      <div className="filters">
        <select id="f-sexe" className="input" value={sexe} onChange={(e) => setSexe(e.target.value)} aria-label="Sexe">
          <option value="">Femmes et hommes</option><option value="F">Femmes</option><option value="M">Hommes</option>
        </select>
        <select id="f-incomplet" className="input" value={incomplet} onChange={(e) => setIncomplet(e.target.value)} aria-label="Qualité">
          <option value="">Toutes les fiches</option>
          {Object.entries(INCOMPLETS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="muted" style={{ fontSize: 'var(--fs-sm)', marginLeft: 'auto' }}>
          {data ? <><b className="num" style={{ color: 'var(--fg)' }}>{n(data.total)}</b> fiche{data.total > 1 ? 's' : ''}{isFetching ? ' · recherche…' : ''}</> : '…'}
        </span>
      </div>
      {error && <Notice type="crit">{messageErreur(error)}</Notice>}
      <Panel flush>
        {isLoading ? <div className="panel-b"><Chargement h={300} /></div> : data?.resultats.length === 0 ? (
          <Empty><Search size={22} /><b>Aucun militant ne correspond</b><span>Modifiez la recherche ou les filtres.</span></Empty>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <Th col="nom">Militant</Th><Th col="numero">N°</Th><Th>Téléphone</Th><Th col="quartier">Quartier</Th>
                    <Th>Commissaire</Th><Th col="statut">Statut</Th><Th col="date">Enregistré</Th>
                  </tr>
                </thead>
                <tbody>
                  {data?.resultats.map((m: any) => (
                    <tr key={m.id} className="clickable" onClick={() => setOuverte(m.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setOuverte(m.id); }}>
                      <td className="who-cell"><b>{m.prenoms} {m.nom}</b><span>{m.sexe === 'F' ? 'Femme' : 'Homme'}{m.age ? ` · ${m.age} ans` : ''}</span></td>
                      <td className="mono muted">{m.numero}</td>
                      <td className="mono">{m.telephone_masque || <span className="muted">—</span>}</td>
                      <td className="who-cell"><b style={{ fontWeight: 500 }}>{m.quartier}</b><span>{m.commune}</span></td>
                      <td>{m.commissaire || <span className="muted">Non affecté</span>}</td>
                      <td><StatutPill statut={m.statut} /></td>
                      <td className="num muted">{date(m.date_enregistrement)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <span>Page {page} sur {n(pages)}</span>
              <div className="btn-row">
                <button className="btn sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /> Précédente</button>
                <button className="btn sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Suivante <ChevronRight size={14} /></button>
              </div>
            </div>
          </>
        )}
      </Panel>
      <p className="muted" style={{ fontSize: 'var(--fs-xs)' }}>Les numéros de téléphone sont chiffrés en base et masqués dans les listes. L'ouverture d'une fiche est enregistrée dans le journal d'audit.</p>

      {ouverte && <FicheMilitant id={ouverte} onClose={() => setOuverte(null)} onModifier={(m) => { setOuverte(null); setEdition(m); }} />}
      {edition && (
        <FormulaireMilitant initial={edition} onClose={() => setEdition(null)} onSaved={(id) => {
          setEdition(null);
          qc.invalidateQueries({ queryKey: ['militants'] }); qc.invalidateQueries({ queryKey: ['dashboard'] });
          setOuverte(id);
        }} />
      )}
    </Page>
  );
}
