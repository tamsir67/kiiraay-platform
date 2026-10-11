import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { CheckCircle2, CreditCard, History, Pencil, RotateCcw, ShieldAlert, UserMinus, Flag, Printer } from 'lucide-react';
import { api } from '../api/client';
import { Chargement, Confirmer, Drawer, Field, Notice, StatutPill, messageErreur, useToast } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useReferentiels } from '../lib/hooks';
import { date, dateHeure, tel } from '../lib/format';
import logo from '../logo-kiiraay.jpg';

const LIBELLES: Record<string, string> = {
  nom: 'Nom', prenoms: 'Prénoms', sexe: 'Sexe', date_naissance: 'Date de naissance', numero_cni: 'Numéro carte d’identification', telephone: 'Téléphone', telephone2: 'Téléphone 2',
  email: 'Email', adresse: 'Adresse', repere: 'Repère', quartier_id: 'Quartier', commune_id: 'Commune', secteur_id: 'Secteur',
  latitude: 'Latitude', longitude: 'Longitude', statut: 'Statut', commissaire_id: 'Commissaire', superviseur_id: 'Superviseur',
  coordonnateur_id: 'Coordonnateur', source: 'Source', observations: 'Observations', information_personne: 'Personne informée',
  information_date: "Date d'information", motif_desactivation: 'Motif', valide_par: 'Validé par', valide_le: 'Validé le',
};
const OPS: Record<string, string> = { CREATION: 'Création de la fiche', MODIFICATION: 'Modification', VALIDATION: 'Validation', DESACTIVATION: 'Désactivation', REACTIVATION: 'Réactivation' };

export function FicheMilitant({ id, onClose, onModifier }: { id: string; onClose: () => void; onModifier: (m: any) => void }) {
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [onglet, setOnglet] = useState<'fiche' | 'historique'>('fiche');
  const [desactiver, setDesactiver] = useState(false);
  const [motif, setMotif] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [carteAdhesion, setCarteAdhesion] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const { data: ref } = useReferentiels();
  const { data: m, isLoading, error } = useQuery({ queryKey: ['militant', id], queryFn: () => api.get(`/militants/${id}`) });
  const { data: hist } = useQuery({ queryKey: ['militant-hist', id], queryFn: () => api.get(`/militants/${id}/historique`), enabled: onglet === 'historique' });

  useEffect(() => {
    if (!carteAdhesion || !m) return;
    const payload = `KIIRAAY|M|${m.numero}|${m.nom}|${m.prenoms}|${m.commune || ''}|${m.quartier || ''}|${m.statut || ''}`;
    let cancelled = false;
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
      color: { dark: '#10233a', light: '#ffffff' },
    }).then((url) => {
      if (!cancelled) setQrCode(url);
    }).catch(() => {
      if (!cancelled) setQrCode('');
    });
    return () => { cancelled = true; };
  }, [carteAdhesion, m]);

  async function action(chemin: string, msg: string, body?: any) {
    try {
      await api.post(`/militants/${id}/${chemin}`, body);
      toast(msg);
      for (const k of ['militant', 'militant-hist', 'militants', 'dashboard']) qc.invalidateQueries({ queryKey: [k] });
    } catch (e) { toast(messageErreur(e), true); }
  }

  function imprimerCarte() {
    window.print();
  }

  return (
    <Drawer
      titre={m ? `${m.prenoms} ${m.nom}` : 'Fiche militant'}
      sousTitre={m && <span className="btn-row" style={{ gap: 8 }}><span className="mono">{m.numero}</span><StatutPill statut={m.statut} /></span>}
      onClose={onClose}
      entete={
        <div className="seg" style={{ marginTop: 10 }}>
          <button aria-pressed={onglet === 'fiche'} onClick={() => setOnglet('fiche')}>Fiche</button>
          <button aria-pressed={onglet === 'historique'} onClick={() => setOnglet('historique')}><History size={12} style={{ verticalAlign: -2 }} /> Historique</button>
        </div>
      }
      pied={m && <>
        {m.statut === 'INACTIF' && can('militants:desactiver') && <button className="btn" onClick={() => action('reactiver', 'Fiche réactivée')}><RotateCcw size={14} /> Réactiver</button>}
        {m.statut !== 'INACTIF' && can('militants:desactiver') && <button className="btn danger" onClick={() => setDesactiver(true)}><UserMinus size={14} /> Désactiver</button>}
        {['ACTIF', 'EN_ATTENTE'].includes(m.statut) && can('militants:ecrire') && <button className="btn" onClick={() => action('a-verifier', 'Fiche signalée à vérifier')}><Flag size={14} /> À vérifier</button>}
        {['EN_ATTENTE', 'A_VERIFIER'].includes(m.statut) && can('militants:valider') && <button className="btn" onClick={() => action('valider', 'Fiche validée')}><CheckCircle2 size={14} /> Valider</button>}
        {m.statut !== 'INACTIF' && can('militants:ecrire') && <button className="btn primary" onClick={() => onModifier(m)}><Pencil size={14} /> Modifier</button>}
        <button className="btn" onClick={() => setCarteAdhesion(true)}><CreditCard size={14} /> Carte d'adhésion</button>
      </>}
    >
      {carteAdhesion && m && (
        <div className="carte-adhesion-modal no-print">
          <div className="carte-adhesion-actions">
            <button className="btn primary" onClick={imprimerCarte}><Printer size={14} /> Imprimer / PDF</button>
            <button className="btn" onClick={() => setCarteAdhesion(false)}>Fermer</button>
          </div>
          <div id="carte-adhesion-print" className="carte-adhesion-card">
            <div className="carte-adhesion-header">
              <div className="carte-adhesion-brand">
                <img src={logo} alt="Logo KIIRAAY" />
                <div>
                  <div className="carte-adhesion-name">KII<span>RAAY</span></div>
                  <div className="carte-adhesion-subtitle">Les Patriotes Républicains</div>
                </div>
              </div>
              <div className="carte-adhesion-badge">N° {m.numero}</div>
            </div>
            <div className="carte-adhesion-body">
              <div className="carte-adhesion-identite">
                <div className="carte-adhesion-label">Carte d'adhésion</div>
                <h3>{m.prenoms} {m.nom}</h3>
                <dl>
                  <div><dt>Statut</dt><dd>{m.statut}</dd></div>
                  <div><dt>Commune</dt><dd>{m.commune || '—'}</dd></div>
                  <div><dt>Quartier</dt><dd>{m.quartier || '—'}</dd></div>
                  <div><dt>Téléphone</dt><dd>{m.telephone ? tel(m.telephone) : '—'}</dd></div>
                </dl>
              </div>
              <div className="carte-adhesion-qrcode">
                {qrCode ? <img src={qrCode} alt={`QR code de ${m.prenoms} ${m.nom}`} /> : <div className="carte-adhesion-qrcode-empty">QR code</div>}
                <div className="carte-adhesion-qr-label">Vérification d'adhésion</div>
              </div>
            </div>
            <div className="carte-adhesion-footer">
              <span>Valide pour l'identification lors des événements et réunions.</span>
              <span>Scannez pour vérifier l’adhésion KIIRAAY.</span>
            </div>
          </div>
        </div>
      )}
      {error && <Notice type="crit">{messageErreur(error)}</Notice>}
      {isLoading || !m ? <Chargement h={300} /> : onglet === 'fiche' ? (
        <>
          {m.statut === 'EN_ATTENTE' && <Notice type="warn">Fiche saisie le {date(m.date_enregistrement)}, en attente de validation par un coordonnateur.</Notice>}
          {m.statut === 'INACTIF' && <Notice type="info">Fiche désactivée — motif : <b>{m.motif_libelle}</b>. Elle est conservée pour l'historique.</Notice>}
          {!m.information_personne && <Notice type="warn">La personne n'a pas encore été informée de l'utilisation de ses données (CDC §15).</Notice>}
          <fieldset><legend>Identification</legend>
            <dl className="dl">
              <dt>Nom complet</dt><dd>{m.prenoms} {m.nom}</dd>
              <dt>Sexe</dt><dd>{m.sexe === 'F' ? 'Femme' : 'Homme'}</dd>
              <dt>Date de naissance</dt><dd>{m.date_naissance ? `${date(m.date_naissance)} (${m.age} ans)` : '—'}</dd>
              <dt>Numéro carte d’identification</dt><dd className="mono">{m.numero_cni || '—'}</dd>
            </dl>
          </fieldset>
          <fieldset><legend>Coordonnées</legend>
            <dl className="dl">
              <dt>Téléphone</dt><dd className="mono">{tel(m.telephone)}</dd>
              {m.telephone2 && <><dt>Téléphone 2</dt><dd className="mono">{tel(m.telephone2)}</dd></>}
              <dt>Email</dt><dd>{m.email || '—'}</dd>
              <dt>Adresse</dt><dd>{m.adresse || '—'}</dd>
              <dt>Repère</dt><dd>{m.repere || '—'}</dd>
            </dl>
          </fieldset>
          <fieldset><legend>Localisation</legend>
            <dl className="dl">
              <dt>Commune</dt><dd>{m.commune}</dd>
              <dt>Quartier</dt><dd>{m.quartier}{m.secteur && ` · ${m.secteur}`}</dd>
              <dt>GPS</dt><dd className="mono">{m.latitude != null ? `${m.latitude}, ${m.longitude}` : '—'}</dd>
            </dl>
          </fieldset>
          <fieldset><legend>Organisation</legend>
            <dl className="dl">
              <dt>Coordonnateur</dt><dd>{m.coordonnateur || '—'}</dd>
              <dt>Superviseur</dt><dd>{m.superviseur || '—'}</dd>
              <dt>Commissaire</dt><dd>{m.commissaire || <span style={{ color: 'var(--crit)' }}>Non affecté</span>}</dd>
              <dt>Enregistré le</dt><dd>{date(m.date_enregistrement)}</dd>
              {m.valide_le && <><dt>Validé</dt><dd>{dateHeure(m.valide_le)}{m.valide_par_nom && ` par ${m.valide_par_nom}`}</dd></>}
            </dl>
          </fieldset>
          <fieldset><legend>Suivi</legend>
            <dl className="dl">
              <dt>Source</dt><dd>{m.source_libelle || '—'}</dd>
              <dt>Personne informée</dt><dd>{m.information_personne ? `Oui${m.information_date ? `, le ${date(m.information_date)}` : ''}` : 'Non'}</dd>
              <dt>Dernière mise à jour</dt><dd>{dateHeure(m.updated_at)}{m.modifie_par && ` par ${m.modifie_par}`}</dd>
              <dt>Observations</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{m.observations || '—'}</dd>
            </dl>
          </fieldset>
        </>
      ) : (
        <div className="timeline">
          {!hist ? <Chargement h={160} /> : hist.map((h: any) => (
            <div key={h.id} className="tl-item">
              <span className="tl-dot" style={h.operation === 'DESACTIVATION' ? { background: 'var(--crit)' } : h.operation === 'VALIDATION' ? { background: 'var(--ok)' } : undefined} />
              <div>
                <b>{OPS[h.operation] || h.operation}</b>
                <div className="meta">{dateHeure(h.modifie_le)} · {h.auteur || 'Système'}</div>
                {h.champs?.length > 0 && (
                  <div className="diff">
                    {h.champs.map((c: string) => (
                      <span key={c}><b>{LIBELLES[c] || c}</b> :{' '}
                        {['telephone', 'telephone2'].includes(c) ? <i className="muted">numéro modifié (valeur chiffrée)</i> : <>
                          <del>{String(h.avant?.[c] ?? '∅')}</del> → <ins>{String(h.apres?.[c] ?? '∅')}</ins>
                        </>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {desactiver && (
        <Confirmer titre="Désactiver la fiche" danger libelle="Désactiver" onClose={() => setDesactiver(false)}
          onOk={async () => {
            if (!motif) { toast('Choisissez un motif', true); return; }
            await action('desactiver', 'Fiche désactivée', { motif, commentaire: commentaire || undefined });
            setDesactiver(false);
          }}>
          <Notice type="info"><ShieldAlert size={14} style={{ verticalAlign: -2 }} /> La fiche n'est pas supprimée : elle reste dans l'historique et peut être réactivée.</Notice>
          <Field label="Motif" requis>
            <select id="motif" className="input" value={motif} onChange={(e) => setMotif(e.target.value)}>
              <option value="">Choisir…</option>
              {ref?.motifs.filter((x: any) => x.actif).map((x: any) => <option key={x.code} value={x.code}>{x.libelle}</option>)}
            </select>
          </Field>
          <Field label="Commentaire"><textarea id="commentaire" className="input" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} maxLength={500} /></Field>
        </Confirmer>
      )}
    </Drawer>
  );
}
