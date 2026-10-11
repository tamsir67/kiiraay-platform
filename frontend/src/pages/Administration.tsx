import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Pencil, Plus, ShieldCheck, Unlock, Copy, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { Page } from '../components/Layout';
import { Chargement, Confirmer, Drawer, Field, Modal, Notice, Panel, messageErreur, useToast } from '../components/ui';
import { useResponsables, useTerritoires } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { ROLES } from '@shared/referentiel.js';
import { dateHeure, n, relatif } from '../lib/format';

// =============================================================== Utilisateurs
export function Utilisateurs() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['utilisateurs'], queryFn: () => api.get('/utilisateurs') });
  const [edit, setEdit] = useState<any | null>(null);
  const [secret, setSecret] = useState<{ identifiant: string; mdp: string } | null>(null);
  const [desactiver, setDesactiver] = useState<any | null>(null);
  const toast = useToast();
  const qc = useQueryClient();

  async function reinit(u: any) {
    try { const r = await api.post(`/utilisateurs/${u.id}/reinitialiser`); setSecret({ identifiant: u.identifiant, mdp: r.motDePasseTemporaire }); } catch (e) { toast(messageErreur(e), true); }
  }
  async function deverrouiller(u: any) {
    try { await api.post(`/utilisateurs/${u.id}/deverrouiller`); toast('Compte déverrouillé'); qc.invalidateQueries({ queryKey: ['utilisateurs'] }); } catch (e) { toast(messageErreur(e), true); }
  }
  async function retirer(u: any) {
    try { await api.delete(`/utilisateurs/${u.id}`); toast('Compte désactivé'); qc.invalidateQueries({ queryKey: ['utilisateurs'] }); setDesactiver(null); }
    catch (e) { toast(messageErreur(e), true); }
  }

  return (
    <Page eyebrow="Administration" titre="Utilisateurs et droits" actions={<button className="btn primary" onClick={() => setEdit({ role: 'COMMISSAIRE', perimetres: [], actif: true })}><Plus size={15} /> Nouvel utilisateur</button>}>
      <Panel flush>
        {isLoading ? <div className="panel-b"><Chargement h={300} /></div> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Utilisateur</th><th>Profil</th><th>Contact / fiche</th><th>Périmètre</th><th>Dernière connexion</th><th>État</th><th /></tr></thead>
              <tbody>
                {data?.map((u: any) => (
                  <tr key={u.id}>
                    <td className="who-cell"><b>{u.prenoms} {u.nom}</b><span className="mono">@{u.identifiant}</span></td>
                    <td>{(ROLES as any)[u.role]}</td>
                    <td className="who-cell"><b>{u.email || '—'}</b><span className="mono">{u.telephone || u.numero_militant || '—'}</span></td>
                    <td className="muted" style={{ fontSize: 'var(--fs-xs)', maxWidth: 260 }}>{u.perimetres.length ? u.perimetres.map((p: any) => p.quartier || p.commune).join(', ') : 'Tout le département'}</td>
                    <td className="muted">{relatif(u.derniere_connexion)}</td>
                    <td>
                      {!u.actif ? <span className="pill INACTIF">Désactivé</span> : u.verrouille ? <span className="pill" style={{ background: 'var(--crit-soft)', color: 'var(--crit)' }}>Verrouillé</span>
                        : u.doit_changer_mdp ? <span className="pill EN_ATTENTE">Mot de passe à changer</span> : <span className="pill ACTIF">Actif</span>}
                    </td>
                    <td>
                      <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
                        {u.verrouille && <button className="btn ghost sm" title="Déverrouiller" onClick={() => deverrouiller(u)}><Unlock size={13} /></button>}
                        <button className="btn ghost sm" title="Réinitialiser le mot de passe" onClick={() => reinit(u)}><KeyRound size={13} /></button>
                        <button className="btn ghost sm" title="Modifier" onClick={() => setEdit(u)}><Pencil size={13} /></button>
                        {u.actif && u.id !== user?.id && <button className="btn ghost sm" title="Désactiver le compte" onClick={() => setDesactiver(u)}><Trash2 size={13} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <MatriceDroits />
      {edit && <FormUtilisateur initial={edit} onClose={() => setEdit(null)} onSecret={setSecret} />}
      {desactiver && <Confirmer titre="Désactiver le compte" message={<>Le compte de <b>{desactiver.prenoms} {desactiver.nom}</b> sera déconnecté. Son historique sera conservé.</>} libelle="Désactiver" danger onClose={() => setDesactiver(null)} onOk={() => retirer(desactiver)} />}
      {secret && (
        <Modal titre="Mot de passe temporaire" onClose={() => setSecret(null)} pied={<button className="btn primary" onClick={() => setSecret(null)}>J'ai transmis le mot de passe</button>}>
          <p>Transmettez ce mot de passe à <b>@{secret.identifiant}</b> par un canal sûr. Il ne sera plus affiché et devra être changé à la première connexion.</p>
          <div className="btn-row">
            <code className="mono" style={{ fontSize: '1.1rem', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6, userSelect: 'all', flex: 1 }}>{secret.mdp}</code>
            <button className="btn" onClick={() => navigator.clipboard?.writeText(secret.mdp).catch(() => {})}><Copy size={14} /> Copier</button>
          </div>
        </Modal>
      )}
    </Page>
  );
}

function MatriceDroits() {
  const PERMS: [string, string][] = [
    ['dashboard', 'Dashboard et carte'], ['carte:points', 'Positions individuelles'], ['militants:lire', 'Consulter les fiches'],
    ['militants:ecrire', 'Créer / modifier'], ['militants:valider', 'Valider les fiches'], ['militants:desactiver', 'Désactiver'],
    ['import', 'Importer'], ['export', 'Exporter'], ['export:pii', 'Export complet (tél., adresse)'], ['responsables:gerer', 'Gérer les responsables'],
    ['territoires:gerer', 'Paramétrer les territoires'], ['utilisateurs:gerer', 'Gérer les utilisateurs'], ['audit:lire', "Journal d'audit"],
    ['espace:personnel', 'Espace personnel militant'], ['messagerie', 'Messagerie'],
  ];
  const { data: ref } = useQuery({ queryKey: ['referentiels'], queryFn: () => api.get('/referentiels') });
  if (!ref) return null;
  return (
    <Panel titre="Matrice des droits par profil" hint="CDC §4 — appliquée par l'API à chaque requête" flush>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Droit</th>{Object.values(ROLES).map((r: any) => <th key={r} style={{ textAlign: 'center' }}>{r.split(' ')[0]}</th>)}</tr></thead>
          <tbody>{PERMS.map(([k, l]) => (
            <tr key={k}><td>{l}</td>{Object.keys(ROLES).map((r) => <td key={r} style={{ textAlign: 'center' }}>{ref.permissions[r]?.includes(k) ? <ShieldCheck size={15} style={{ color: 'var(--ok)' }} aria-label="oui" /> : <span className="muted">·</span>}</td>)}</tr>
          ))}</tbody>
        </table>
      </div>
    </Panel>
  );
}

function FormUtilisateur({ initial, onClose, onSecret }: { initial: any; onClose: () => void; onSecret: (s: any) => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: terr } = useTerritoires();
  const { data: resp } = useResponsables();
  const [f, setF] = useState<any>({
    identifiant: initial.identifiant || '', email: initial.email || '', telephone: initial.telephone || '', nom: initial.nom || '', prenoms: initial.prenoms || '',
    role: initial.role, responsable_id: initial.responsable_id || '', actif: initial.actif ?? true,
    perimetres: (initial.perimetres || []).map((p: any) => ({ commune_id: p.commune_id, quartier_id: p.quartier_id })),
  });
  const [busy, setBusy] = useState(false);
  const has = (c: number, q: number | null) => f.perimetres.some((p: any) => p.commune_id === c && p.quartier_id === q);
  const toggle = (c: number, q: number | null) => setF((o: any) => ({ ...o, perimetres: has(c, q) ? o.perimetres.filter((p: any) => !(p.commune_id === c && p.quartier_id === q)) : [...o.perimetres, { commune_id: c, quartier_id: q }] }));

  async function ok() {
    setBusy(true);
    try {
      const body = { ...f, responsable_id: f.responsable_id ? Number(f.responsable_id) : null };
      if (initial.id) { await api.put(`/utilisateurs/${initial.id}`, body); toast('Utilisateur mis à jour'); }
      else { const r = await api.post('/utilisateurs', body); onSecret({ identifiant: f.identifiant, mdp: r.motDePasseTemporaire }); }
      qc.invalidateQueries({ queryKey: ['utilisateurs'] });
      onClose();
    } catch (e) { toast(messageErreur(e), true); } finally { setBusy(false); }
  }
  return (
    <Drawer etroit titre={initial.id ? `Modifier @${initial.identifiant}` : 'Nouvel utilisateur'} onClose={onClose}
      pied={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" disabled={busy} onClick={ok}>Enregistrer</button></>}>
      <div className="form-grid">
        <Field label="Identifiant" requis aide="Lettres, chiffres, . _ -"><input id="u-id" className="input" value={f.identifiant} onChange={(e) => setF({ ...f, identifiant: e.target.value })} /></Field>
        <Field label="Email"><input id="u-email" className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Téléphone de contact"><input id="u-telephone" className="input" type="tel" autoComplete="tel" value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} /></Field>
        <Field label="Nom" requis><input id="u-nom" className="input" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} /></Field>
        <Field label="Prénom(s)" requis><input id="u-prenoms" className="input" value={f.prenoms} onChange={(e) => setF({ ...f, prenoms: e.target.value })} /></Field>
        <Field label="Profil" requis className="full">
          <select id="u-role" className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            {Object.entries(ROLES).filter(([k]) => initial.id || k !== 'MILITANT').map(([k, v]: any) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Responsable lié" className="full" aide="Optionnel : relie le compte à une personne de la chaîne">
          <select id="u-resp" className="input" value={f.responsable_id} onChange={(e) => setF({ ...f, responsable_id: e.target.value })}>
            <option value="">—</option>
            {resp?.map((r) => <option key={r.id} value={r.id}>{r.prenoms} {r.nom} ({r.fonction.toLowerCase()})</option>)}
          </select>
        </Field>
        {initial.id && <label className="check full"><input id="u-actif" type="checkbox" checked={f.actif} onChange={(e) => setF({ ...f, actif: e.target.checked })} /> Compte actif (désactiver ferme immédiatement toutes ses sessions)</label>}
      </div>
      <fieldset>
        <legend>Périmètre territorial</legend>
        <p className="muted" style={{ fontSize: 'var(--fs-xs)', marginBottom: 8 }}>
          {['COORDONNATEUR', 'SUPERVISEUR', 'COMMISSAIRE'].includes(f.role) ? 'Obligatoire pour ce profil.' : 'Laisser vide pour tout le département.'} Cochez une commune entière ou des quartiers.
        </p>
        <div className="stack" style={{ gap: 10 }}>
          {terr?.map((c) => (
            <div key={c.id}>
              <label className="check"><input type="checkbox" checked={has(c.id, null)} onChange={() => toggle(c.id, null)} /> <b>{c.nom}</b> (toute la commune)</label>
              {!has(c.id, null) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 3, paddingLeft: 22, marginTop: 4 }}>
                  {c.quartiers.map((q) => <label key={q.id} className="check"><input type="checkbox" checked={has(c.id, q.id)} onChange={() => toggle(c.id, q.id)} /> {q.nom}</label>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </fieldset>
    </Drawer>
  );
}

// =============================================================== Journal d'audit
const ACTIONS_LIB: Record<string, string> = {
  CONNEXION: 'Connexion', CONNEXION_ECHEC: 'Échec de connexion', CONNEXION_REFUSEE: 'Connexion refusée (verrou)', MILITANT_CREATION: 'Création de fiche',
  MILITANT_MODIFICATION: 'Modification de fiche', MILITANT_CONSULTATION: 'Consultation de fiche', MILITANT_VALIDATION: 'Validation', MILITANT_DESACTIVATION: 'Désactivation',
  MILITANT_REACTIVATION: 'Réactivation', MILITANT_A_VERIFIER: 'Signalée à vérifier', EXPORT: 'Export', IMPORT: 'Import', IMPORT_SIMULATION: "Simulation d'import",
  DOUBLON_RESOLU: 'Doublon résolu', DOUBLON_ECARTE: 'Doublon écarté', CHANGEMENT_MOT_DE_PASSE: 'Changement de mot de passe',
};

export function Journal() {
  const [action, setAction] = useState('');
  const [echecs, setEchecs] = useState(false);
  const [page, setPage] = useState(1);
  const params = { action: action || undefined, succes: echecs ? 'false' : undefined, page };
  const { data, isLoading } = useQuery({ queryKey: ['audit', params], queryFn: () => api.get('/audit', params) });
  const [integrite, setIntegrite] = useState<any | null>(null);
  const toast = useToast();

  return (
    <Page eyebrow="Traçabilité" titre="Journal d'audit"
      actions={<button className="btn" onClick={async () => { try { setIntegrite(await api.get('/audit/integrite')); } catch (e) { toast(messageErreur(e), true); } }}><ShieldCheck size={15} /> Vérifier l'intégrité</button>}
      filtres={
        <div className="filters">
          <select id="a-action" className="input" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} aria-label="Type d'opération">
            <option value="">Toutes les opérations</option>
            {data?.actions?.map((a: string) => <option key={a} value={a}>{ACTIONS_LIB[a] || a}</option>)}
          </select>
          <label className="check"><input id="a-echecs" type="checkbox" checked={echecs} onChange={(e) => { setEchecs(e.target.checked); setPage(1); }} /> Échecs uniquement</label>
        </div>
      }>
      {integrite && (
        <Notice type={integrite.integre ? 'ok' : 'crit'}>
          {integrite.integre
            ? <>Chaîne d'empreintes vérifiée : <b>{n(integrite.lignes)}</b> entrées, aucune altération détectée.</>
            : <>Altération détectée : {integrite.anomalies} entrée(s) incohérente(s), première à l'id {integrite.premiere_anomalie}.</>}
        </Notice>
      )}
      <Panel flush>
        {isLoading ? <div className="panel-b"><Chargement h={300} /></div> : (
          <>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Horodatage</th><th>Utilisateur</th><th>Opération</th><th>Objet</th><th>Adresse IP</th><th>Détails</th></tr></thead>
                <tbody>
                  {data?.resultats.map((l: any) => (
                    <tr key={l.id}>
                      <td className="num" style={{ whiteSpace: 'nowrap' }}>{dateHeure(l.horodatage)}</td>
                      <td>{l.identifiant ? <span className="mono">@{l.identifiant}</span> : <span className="muted">—</span>}</td>
                      <td><span style={{ color: l.succes ? undefined : 'var(--crit)', fontWeight: 600 }}>{ACTIONS_LIB[l.action] || l.action}</span></td>
                      <td className="mono muted" style={{ fontSize: 'var(--fs-xs)' }}>{l.entite ? `${l.entite} ${String(l.entite_id || '').slice(0, 8)}` : '—'}</td>
                      <td className="mono muted" style={{ fontSize: 'var(--fs-xs)' }}>{l.ip || '—'}</td>
                      <td className="muted" style={{ fontSize: 'var(--fs-xs)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.details ? JSON.stringify(l.details) : ''}>{l.details ? JSON.stringify(l.details) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <span>{n(data?.total)} entrées</span>
              <div className="btn-row">
                <button className="btn sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Précédentes</button>
                <button className="btn sm" disabled={!data || page * 50 >= data.total} onClick={() => setPage(page + 1)}>Suivantes</button>
              </div>
            </div>
          </>
        )}
      </Panel>
      <p className="muted" style={{ fontSize: 'var(--fs-xs)' }}>Le journal est en ajout seul : la base refuse toute modification ou suppression, et chaque entrée contient l'empreinte SHA-256 de la précédente.</p>
    </Page>
  );
}
