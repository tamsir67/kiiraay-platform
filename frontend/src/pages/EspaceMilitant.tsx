import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { api } from '../api/client';
import { Page } from '../components/Layout';
import { Chargement, Notice, Panel, StatutPill, messageErreur } from '../components/ui';
import { date, tel } from '../lib/format';

export function EspaceMilitant() {
  const { data: fiche, isLoading, error } = useQuery({ queryKey: ['mon-espace'], queryFn: () => api.get('/espace/mon-espace') });
  return (
    <Page eyebrow="Espace militant" titre="Mon espace personnel"
      actions={<Link className="btn" to="/messages"><MessageCircle size={14} /> Messagerie</Link>}>
      {error && <Notice type="crit">{messageErreur(error)}</Notice>}
      {isLoading ? <Panel><Chargement h={230} /></Panel> : fiche && <>
        <Panel titre="Ma carte militante" hint={<StatutPill statut={fiche.statut} />}>
          <div className="espace-militant">
            <div className="espace-numero">{fiche.numero}</div>
            <h2>{fiche.prenoms} {fiche.nom}</h2>
            <dl className="dl">
              <dt>Statut</dt><dd><StatutPill statut={fiche.statut} /></dd>
              <dt>Date de naissance</dt><dd>{fiche.date_naissance ? date(fiche.date_naissance) : '—'}</dd>
              <dt>Téléphone</dt><dd>{fiche.telephone ? tel(fiche.telephone) : '—'}</dd>
              <dt>Email</dt><dd>{fiche.email || '—'}</dd>
              <dt>Commune</dt><dd>{fiche.commune}</dd>
              <dt>Quartier</dt><dd>{fiche.quartier}</dd>
              <dt>Adresse</dt><dd>{fiche.adresse || '—'}</dd>
              <dt>Inscrit le</dt><dd>{date(fiche.date_enregistrement)}</dd>
            </dl>
          </div>
        </Panel>
        {fiche.statut !== 'ACTIF' && <Notice type="warn">Votre adhésion n'est pas active. Contactez votre responsable pour toute mise à jour.</Notice>}
      </>}
    </Page>
  );
}