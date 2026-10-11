import { useState } from 'react';
import { LogIn, Lock } from 'lucide-react';
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
        <div><div className="eyebrow">Espace sécurisé</div><h2 style={{ fontSize: 'var(--fs-2xl)' }}>Connexion</h2></div>
        {err && <Notice type="crit">{err}</Notice>}
        <form className="stack" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); go(); }}>
          <Field label="Identifiant"><input id="login-id" className="input" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} required /></Field>
          <Field label="Mot de passe"><input id="login-mdp" className="input" type="password" autoComplete="current-password" value={mdp} onChange={(e) => setMdp(e.target.value)} required /></Field>
          <button className="btn primary" style={{ padding: '10px 14px' }} disabled={busy}><LogIn size={16} /> Se connecter</button>
        </form>
        {DEMO ? (
          <div className="stack" style={{ gap: 8 }}>
            <div className="eyebrow">Démonstration — entrer avec un profil</div>
            <div className="demo-accounts">
              {COMPTES_DEMO.map(([i, r, p]) => <button key={i} onClick={() => go(i, 'demo')} disabled={busy}><b>{r}</b><span>{p}</span></button>)}
            </div>
            <p className="muted" style={{ fontSize: 'var(--fs-xs)' }}>Chaque profil voit uniquement ce que ses droits autorisent : comparez l'administrateur, le commissaire et le décideur.</p>
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 'var(--fs-xs)', display: 'flex', gap: 6 }}><Lock size={13} /> Après 5 échecs, le compte est verrouillé 15 minutes. Toutes les connexions sont journalisées.</p>
        )}
      </section>
    </div>
  );
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
