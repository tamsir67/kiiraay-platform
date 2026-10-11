import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, CheckCheck, Copy } from 'lucide-react';
import { api } from '../api/client';
import { Page } from '../components/Layout';
import { FilterBar } from '../components/FilterBar';
import { Chargement, Empty, Notice, Panel, StatutPill, messageErreur, useToast } from '../components/ui';
import { useFiltres, paramsFiltres } from '../lib/filtres';
import { useAuth } from '../lib/auth';
import { useDashboard } from './Dashboard';
import { date, n } from '../lib/format';

/** Qualité des données : doublons potentiels et fiches à compléter (CDC §5.5, §7). */
export function Qualite() {
  const { f } = useFiltres();
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const params = paramsFiltres(f, { periode: false });
  const { data, isLoading, error } = useQuery({ queryKey: ['doublons', params], queryFn: () => api.get('/qualite/doublons', params) });
  const { data: d } = useDashboard();
  const [busy, setBusy] = useState<string | null>(null);

  async function agir(chemin: string, body: any, msg: string, cle: string) {
    setBusy(cle);
    try {
      await api.post(`/qualite/doublons/${chemin}`, body);
      toast(msg);
      for (const k of ['doublons', 'dashboard', 'militants']) qc.invalidateQueries({ queryKey: [k] });
    } catch (e) { toast(messageErreur(e), true); } finally { setBusy(null); }
  }

  const Carte = ({ m, autre, cle }: { m: any; autre: any; cle: string }) => (
    <div style={{ flex: '1 1 240px', minWidth: 0, border: '1px solid var(--line)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--surface-2)' }}>
      <div className="btn-row" style={{ justifyContent: 'space-between' }}><span className="mono muted">{m.numero}</span><StatutPill statut={m.statut} /></div>
      <b>{m.prenoms} {m.nom}</b>
      <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>{m.sexe === 'F' ? 'Femme' : 'Homme'} · né(e) le {date(m.date_naissance)}</span>
      <span style={{ fontSize: 'var(--fs-sm)' }}>{m.quartier} · {m.adresse || '—'}</span>
      <span style={{ fontSize: 'var(--fs-sm)' }} className="mono">Tél. •• ••• {m.telephone_suffixe ? `${m.telephone_suffixe.slice(0, 2)} ${m.telephone_suffixe.slice(2)}` : '—'}</span>
      <span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>Enregistré le {date(m.date_enregistrement)}</span>
      {can('militants:ecrire') && (
        <button className="btn sm" style={{ marginTop: 6, alignSelf: 'flex-start' }} disabled={busy === cle}
          onClick={() => agir('resoudre', { conserver: m.id, desactiver: autre.id }, `Fiche ${m.numero} conservée, ${autre.numero} désactivée`, cle)}>
          <Check size={13} /> Conserver cette fiche
        </button>
      )}
    </div>
  );

  return (
    <Page eyebrow="Qualité des données" titre="Doublons et fiches à compléter" filtres={<FilterBar periode={false} statut={false} />}>
      {d && (
        <div className="grid g-kpi">
          {[
            ['Doublons potentiels', d.alertes.doublons_potentiels, '#doublons'],
            ['À mettre à jour', d.alertes.a_mettre_a_jour, '/militants?incomplet=maj'],
            ['Sans coordonnées GPS', d.alertes.sans_gps, '/militants?incomplet=gps'],
            ['Personnes non informées', d.alertes.sans_information, '/militants?incomplet=information'],
          ].map(([l, v, to]) => (
            <div key={l as string} className="panel kpi">
              <span className="label">{l}</span><span className="value">{n(v as number)}</span>
              {String(to).startsWith('/') && can('militants:lire') ? <Link className="sub" to={to as string}>Voir les fiches →</Link> : <span className="sub">Paires à examiner ci-dessous</span>}
            </div>
          ))}
        </div>
      )}
      {error && <Notice type="crit">{messageErreur(error)}</Notice>}
      <Panel id="doublons" titre="Doublons potentiels" hint="Même numéro de téléphone, ou même identité dans le même quartier avec une date de naissance ou une adresse identique">
        {isLoading ? <Chargement h={240} /> : !data?.length ? (
          <Empty><CheckCheck size={22} /><b>Aucun doublon potentiel</b><span>Le fichier est propre pour ce périmètre.</span></Empty>
        ) : (
          <div className="stack">
            {data.map((p: any) => {
              const cle = `${p.a.id}-${p.b.id}`;
              return (
                <div key={cle} style={{ borderTop: '1px solid var(--line)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="btn-row" style={{ justifyContent: 'space-between' }}>
                    <span className="tag"><Copy size={11} style={{ verticalAlign: -1 }} /> {p.motif === 'telephone' ? 'Même numéro de téléphone' : `Identité proche (${Math.round(p.score * 100)} %)`}</span>
                    <button className="btn ghost sm" disabled={busy === cle} onClick={() => agir('ecarter', { a: p.a.id, b: p.b.id }, 'Paire écartée : ce ne sont pas des doublons', cle)}>Ce sont deux personnes différentes</button>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Carte m={p.a} autre={p.b} cle={cle} />
                    <Carte m={p.b} autre={p.a} cle={cle} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </Page>
  );
}
