import { useState } from 'react';
import { LogIn, Lock, UserPlus, KeyRound } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { api, DEMO } from '../api/client';
import { Field, Notice, messageErreur } from '../components/ui';
import logo from '../logo-kiiraay.jpg';

const COMPTES_DEMO = [
  ['admin', 'Administrateur central', 'Tout le département'],
  ['coord.golfsud', 'Coordonnateur', 'Commune de Golf Sud'],
  ['sup.golfsud', 'Superviseur', 'Quartiers de Golf Sud'],
  ['commissaire.hamo', 'Commissaire', 'Un quartier'],
  ['saisie', 'Opérateur de saisie', 'Saisie sans validation'],
  ['decideur', 'Décideur', 'Dashboard uniquement'],
];

export function Login() {
  const { login } = useAuth();
  const [id, setId] = useState('');
  const [mdp, setMdp] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'connexion' | 'inscription' | 'recuperation'>('connexion');

  async function go(identifiant = id, motDePasse = mdp) {
    setBusy(true); setErr('');
    try { await login(identifiant, motDePasse); } catch (e) { setErr(messageErreur(e)); } finally { setBusy(false); }
  }

  return (
    <div className="login">
      <section className="login-side">
        <div className="brand"><img src={logo} alt="Logo KIIRAAY" style={{ width: 64, height: 64 }} /><div><div className="brand-name" style={{ fontSize: '1.5rem' }}>KII<b>RAAY</b></div><div className="brand-sub">Les Patriotes Républicains</div></div></div>
        <h1>Le fichier militant de <b>Guédiawaye</b>, piloté quartier par quartier.</h1>
        <p>Plateforme sécurisée de gestion et de cartographie des militants, de Golf Sud à Médina Gounass, pour préparer les élections locales de 2027.</p>
        <div className="login-facts">
          <b>5</b><b>46</b><b>2027</b>
          <span>communes</span><span>quartiers</span><span>élections locales</span>
        </div>
      </section>
      <section className="login-form">
        {mode === 'connexion' ? <>
          <div><div className="eyebrow">Espace sécurisé</div><h2 style={{ fontSize: 'var(--fs-2xl)' }}>Connexion</h2></div>
          {err && <Notice type="crit">{err}</Notice>}
          <form className="stack" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); go(); }}>
            <Field label="Identifiant"><input id="login-id" className="input" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} required /></Field>
            <Field label="Mot de passe"><input id="login-mdp" className="input" type="password" autoComplete="current-password" value={mdp} onChange={(e) => setMdp(e.target.value)} required /></Field>
            <button className="btn primary" style={{ padding: '10px 14px' }} disabled={busy}><LogIn size={16} /> Se connecter</button>
          </form>
          {!DEMO && <div className="login-links">
            <button className="btn ghost" onClick={() => { setErr(''); setMode('inscription'); }}><UserPlus size={15} /> S’inscrire</button>
            <button className="btn ghost" onClick={() => { setErr(''); setMode('recuperation'); }}><KeyRound size={15} /> Mot de passe oublié ?</button>
          </div>}
        </> : mode === 'inscription' ? <InscriptionMilitant onRetour={() => setMode('connexion')} />
          : <RecuperationMotDePasse identifiantInitial={id} onRetour={() => setMode('connexion')} />}
        {mode === 'connexion' && (DEMO ? (
          <div className="stack" style={{ gap: 8 }}>
            <div className="eyebrow">Démonstration — entrer avec un profil</div>
            <div className="demo-accounts">
              {COMPTES_DEMO.map(([i, r, p]) => <button key={i} onClick={() => go(i, 'demo')} disabled={busy}><b>{r}</b><span>{p}</span></button>)}
            </div>
            <p className="muted" style={{ fontSize: 'var(--fs-xs)' }}>Chaque profil voit uniquement ce que ses droits autorisent : comparez l'administrateur, le commissaire et le décideur.</p>
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 'var(--fs-xs)', display: 'flex', gap: 6 }}><Lock size={13} /> Après 5 échecs, le compte est verrouillé 15 minutes. Toutes les connexions sont journalisées.</p>
        ))}
      </section>
    </div>
  );
}

function InscriptionMilitant({ onRetour }: { onRetour: () => void }) {
  const [form, setForm] = useState({ identifiant: '', nom: '', prenoms: '', numero: '', date_naissance: '', telephone: '', email: '', motDePasse: '' });
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function envoyer(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErreur(''); setMessage('');
    try {
      const result = await api.post('/auth/inscription', form);
      setMessage(result.message);
    } catch (e) { setErreur(messageErreur(e)); } finally { setBusy(false); }
  }
  return <>
    <div><div className="eyebrow">Création de compte</div><h2 style={{ fontSize: 'var(--fs-2xl)' }}>Inscription militant</h2></div>
    <p className="muted">Réservée aux militants déjà inscrits. L’administration validera votre compte avant l’accès à votre espace.</p>
    {erreur && <Notice type="crit">{erreur}</Notice>}
    {message && <Notice type="ok">{message}</Notice>}
    {!message && <form className="stack" style={{ gap: 10 }} onSubmit={envoyer}>
      <Field label="Identifiant souhaité" requis><input className="input" autoComplete="username" minLength={3} maxLength={60} pattern="[a-zA-Z0-9._-]+" value={form.identifiant} onChange={(e) => setForm({ ...form, identifiant: e.target.value })} required /></Field>
      <div className="form-grid">
        <Field label="Nom" requis><input className="input" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required /></Field>
        <Field label="Prénom(s)" requis><input className="input" value={form.prenoms} onChange={(e) => setForm({ ...form, prenoms: e.target.value })} required /></Field>
      </div>
      <Field label="Numéro de carte militant" requis><input className="input mono" placeholder="KRY-GDW-000001" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} required /></Field>
      <div className="form-grid">
        <Field label="Date de naissance" requis><input className="input" type="date" value={form.date_naissance} onChange={(e) => setForm({ ...form, date_naissance: e.target.value })} required /></Field>
        <Field label="Téléphone enregistré" requis><input className="input" type="tel" autoComplete="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} required /></Field>
      </div>
      <Field label="Email" requis aide="Utilisé pour récupérer un mot de passe oublié."><input className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
      <Field label="Mot de passe" aide="12 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.">
        <input className="input" type="password" autoComplete="new-password" minLength={12} value={form.motDePasse} onChange={(e) => setForm({ ...form, motDePasse: e.target.value })} required />
      </Field>
      <button className="btn primary" disabled={busy}><UserPlus size={16} /> Envoyer la demande</button>
    </form>}
    <button className="btn ghost" onClick={onRetour}>Retour à la connexion</button>
  </>;
}

function RecuperationMotDePasse({ identifiantInitial, onRetour }: { identifiantInitial: string; onRetour: () => void }) {
  const [identifiant, setIdentifiant] = useState(identifiantInitial);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [etapeCode, setEtapeCode] = useState(false);
  const [termine, setTermine] = useState(false);
  const [erreur, setErreur] = useState('');
  const [busy, setBusy] = useState(false);

  async function demanderCode(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErreur('');
    try {
      await api.post('/auth/mot-de-passe-oublie', { identifiant, email });
      setEtapeCode(true);
    } catch (e) { setErreur(messageErreur(e)); } finally { setBusy(false); }
  }
  async function changerMotDePasse(e: React.FormEvent) {
    e.preventDefault(); setErreur('');
    if (nouveau !== confirmation) { setErreur('Les mots de passe ne correspondent pas'); return; }
    setBusy(true);
    try {
      await api.post('/auth/reinitialiser-mot-de-passe', { identifiant, email, code, nouveau });
      setTermine(true);
    } catch (e) { setErreur(messageErreur(e)); } finally { setBusy(false); }
  }
  return <>
    <div><div className="eyebrow">Récupération du compte</div><h2 style={{ fontSize: 'var(--fs-2xl)' }}>{termine ? 'Mot de passe modifié' : 'Mot de passe oublié'}</h2></div>
    {erreur && <Notice type="crit">{erreur}</Notice>}
    {termine ? <Notice type="ok">Mot de passe modifié. Vous pouvez vous connecter.</Notice> : !etapeCode ? (
      <form className="stack" style={{ gap: 12 }} onSubmit={demanderCode}>
        <p className="muted">Un code sera envoyé à l’adresse email liée à votre compte militant actif.</p>
        <Field label="Identifiant" requis><input className="input" autoComplete="username" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} required /></Field>
        <Field label="Email du compte" requis><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <button className="btn primary" disabled={busy}><KeyRound size={15} /> Envoyer le code</button>
      </form>
    ) : (
      <form className="stack" style={{ gap: 12 }} onSubmit={changerMotDePasse}>
        <p className="muted">Saisissez le code reçu par email. Il expire après 10 minutes et 5 essais maximum.</p>
        <Field label="Code à 6 chiffres" requis><input className="input mono" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required /></Field>
        <Field label="Nouveau mot de passe" requis><input className="input" type="password" autoComplete="new-password" minLength={12} value={nouveau} onChange={(e) => setNouveau(e.target.value)} required /></Field>
        <Field label="Confirmer le mot de passe" requis><input className="input" type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required /></Field>
        <button className="btn primary" disabled={busy}>Modifier le mot de passe</button>
      </form>
    )}
    <button className="btn ghost" onClick={termine ? onRetour : () => { setEtapeCode(false); setErreur(''); }}>Retour à la connexion</button>
  </>;
}

export function ChangerMotDePasse() {
  const { setSession, logout, user } = useAuth();
  const [a, setA] = useState(''); const [b, setB] = useState(''); const [c, setC] = useState('');
  const [err, setErr] = useState<string[]>([]);
  async function ok(e: React.FormEvent) {
    e.preventDefault();
    if (b !== c) { setErr(['Les deux mots de passe ne correspondent pas']); return; }
    try { setSession(await api.post('/auth/mot-de-passe', { actuel: a, nouveau: b })); } catch (x: any) { setErr(x.champs?.map((ch: any) => ch.message) || [messageErreur(x)]); }
  }
  return (
    <div className="login" style={{ gridTemplateColumns: '1fr' }}>
      <form className="login-form" style={{ margin: '0 auto' }} onSubmit={ok}>
        <div><div className="eyebrow">Première connexion de @{user?.identifiant}</div><h2 style={{ fontSize: 'var(--fs-2xl)' }}>Choisissez votre mot de passe</h2></div>
        <p className="muted">12 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.</p>
        {err.length > 0 && <Notice type="crit">{err.join(' · ')}</Notice>}
        <Field label="Mot de passe temporaire"><input id="mdp-a" className="input" type="password" autoComplete="current-password" value={a} onChange={(e) => setA(e.target.value)} required /></Field>
        <Field label="Nouveau mot de passe"><input id="mdp-b" className="input" type="password" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} required minLength={12} /></Field>
        <Field label="Confirmation"><input id="mdp-c" className="input" type="password" autoComplete="new-password" value={c} onChange={(e) => setC(e.target.value)} required /></Field>
        <div className="btn-row"><button className="btn primary">Enregistrer</button><button type="button" className="btn ghost" onClick={logout}>Annuler</button></div>
      </form>
    </div>
  );
}
