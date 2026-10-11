import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Map, FileBarChart, ShieldCheck, ArrowDownUp, Network, Landmark, UserCog,
  ScrollText, LogOut, Menu, Moon, Sun, FlaskConical, MessageCircle, CreditCard,
} from 'lucide-react';
import logo from '../logo-kiiraay.jpg';
import { useAuth } from '../lib/auth';
import { ROLES } from '@shared/referentiel.js';
import { initiales } from '../lib/format';
import { DEMO } from '../api/client';

const NAV = [
  { groupe: 'Pilotage' },
  { to: '/', label: 'Vue générale', icon: LayoutDashboard, perm: 'dashboard', end: true },
  { to: '/carte', label: 'Cartographie', icon: Map, perm: 'dashboard' },
  { to: '/rapports', label: 'Rapports', icon: FileBarChart, perm: 'dashboard' },
  { groupe: 'Militants' },
  { to: '/espace', label: 'Mon espace', icon: CreditCard, perm: 'espace:personnel' },
  { to: '/militants', label: 'Fichier militants', icon: Users, perm: 'militants:lire' },
  { to: '/qualite', label: 'Qualité des données', icon: ShieldCheck, perm: 'qualite' },
  { to: '/echanges', label: 'Import / Export', icon: ArrowDownUp, perm: ['import', 'export'] },
  { groupe: 'Organisation' },
  { to: '/responsables', label: 'Responsables', icon: Network, perm: 'dashboard' },
  { to: '/territoires', label: 'Territoires', icon: Landmark, perm: null },
  { groupe: 'Administration' },
  { to: '/utilisateurs', label: 'Utilisateurs', icon: UserCog, perm: 'utilisateurs:gerer' },
  { to: '/journal', label: "Journal d'audit", icon: ScrollText, perm: 'audit:lire' },
  { groupe: 'Communication' },
  { to: '/messages', label: 'Messagerie', icon: MessageCircle, perm: 'messagerie' },
] as const;

function lireTheme(): string | null { try { return localStorage.getItem('kry-theme'); } catch { return null; } }
function ecrireTheme(t: string) { try { localStorage.setItem('kry-theme', t); } catch { /* stockage indisponible */ } }

export function Layout() {
  const { user, logout, can } = useAuth();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<string | null>(lireTheme());
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => { if (theme) document.documentElement.dataset.theme = theme; }, [theme]);
  const sombre = theme ? theme === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches;

  const visibles = NAV.filter((it: any, i) => {
    if (it.groupe) {
      // Un groupe n'apparaît que s'il contient au moins une entrée autorisée
      const suite = NAV.slice(i + 1);
      const fin = suite.findIndex((x: any) => x.groupe);
      return (fin === -1 ? suite : suite.slice(0, fin)).some((x: any) => autorise(x.perm));
    }
    return autorise(it.perm);
  });
  function autorise(perm: any) { return perm == null || (Array.isArray(perm) ? perm.some(can) : can(perm)); }

  return (
    <div className="shell">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`rail${open ? ' open' : ''}`}>
        <div className="brand">
          <img src={logo} alt="Logo KIIRAAY — Les Patriotes Républicains" />
          <div>
            <div className="brand-name">KII<b>RAAY</b></div>
            <div className="brand-sub">Guédiawaye 2027</div>
          </div>
        </div>
        <nav className="nav" aria-label="Navigation principale">
          {visibles.map((it: any, i) => it.groupe
            ? <div key={i} className="nav-group">{it.groupe}</div>
            : <NavLink key={it.to} to={it.to} end={it.end}><it.icon size={17} />{it.label}</NavLink>)}
        </nav>
        <div className="rail-foot">
          <div className="rail-user">
            <div className="avatar">{initiales(user?.prenoms, user?.nom)}</div>
            <div className="who"><b>{user?.prenoms} {user?.nom}</b><span>{(ROLES as any)[user!.role]}</span></div>
          </div>
          <div className="rail-actions">
            <button onClick={() => { const t = sombre ? 'light' : 'dark'; setTheme(t); ecrireTheme(t); }} aria-label="Changer de thème">
              {sombre ? <Sun size={14} /> : <Moon size={14} />} Thème
            </button>
            <button onClick={logout}><LogOut size={14} /> Quitter</button>
          </div>
        </div>
      </aside>
      <div className="main">
        <div className="mobile-bar">
          <button onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Menu size={22} /></button>
          <div className="brand-name">KII<b>RAAY</b></div>
          <span style={{ fontSize: 12, opacity: .7, marginLeft: 'auto' }}>{(ROLES as any)[user!.role]}</span>
        </div>
        {DEMO && (
          <div className="demo-banner no-print">
            <FlaskConical size={14} /> Démonstration : données entièrement fictives générées dans votre navigateur. Les modifications sont perdues au rechargement.
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
}

export function Page({ titre, eyebrow, actions, filtres, children }: { titre: ReactNode; eyebrow?: ReactNode; actions?: ReactNode; filtres?: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="topbar">
        <div className="topbar-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h1>{titre}</h1>
          </div>
          {actions && <div className="btn-row">{actions}</div>}
        </div>
        {filtres}
      </header>
      <main className="content">{children}</main>
    </>
  );
}
