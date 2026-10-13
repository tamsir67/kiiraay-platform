import React, { useState } from 'react';
import { Utilisateur } from '../types';
import { DEMO_USERS } from '../data/referentiel';
import { KiiraayLogo } from './KiiraayLogo';
import { ChevronDown, Check, UserPlus, Menu, X } from 'lucide-react';

interface HeaderProps {
  currentUser: Utilisateur;
  onSwitchUser: (user: Utilisateur) => void;
  activeTabTitle: string;
  onOpenInscription?: () => void;
  onOpenInstallModal?: () => void;
  mobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentUser, 
  onSwitchUser, 
  activeTabTitle,
  onOpenInscription,
  onOpenInstallModal,
  mobileMenuOpen,
  onToggleMobileMenu
}) => {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const isMilitant = currentUser.role === 'militant';

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur Central';
      case 'coordonnateur': return 'Coordonnateur Communal';
      case 'superviseur': return 'Superviseur de Quartiers';
      case 'commissaire': return 'Commissaire de Quartier';
      case 'saisie': return 'Opérateur de Saisie';
      case 'decideur': return 'Décideur / Consultation';
      case 'militant': return 'Militant';
      default: return role;
    }
  };

  const getPerimetreLabel = (user: Utilisateur) => {
    if (user.role === 'admin' || user.role === 'saisie' || user.role === 'decideur') {
      return 'Tout Guédiawaye (Département)';
    }
    if (user.role === 'coordonnateur') {
      return 'Commune de Golf Sud';
    }
    if (user.role === 'superviseur') {
      return '4 quartiers (Golf Sud)';
    }
    if (user.role === 'commissaire') {
      return 'Hamo 1 (Golf Sud)';
    }
    if (user.role === 'militant') {
      return 'Fiche personnelle & inscription uniquement';
    }
    return '';
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
      <div className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-2.5">
        {/* Zone 1: Hamburger mobile + Logo officiel */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="lg:hidden p-1.5 sm:p-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
              aria-label="Menu principal"
              title="Menu principal"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-slate-900" />
              ) : (
                <Menu className="w-5 h-5 text-slate-900" />
              )}
            </button>
          )}

          <KiiraayLogo size="md" variant="horizontal" />
          <div className="hidden sm:block h-6 w-px bg-slate-200 mx-1" />
          <span className="hidden sm:inline-block text-[11px] font-bold text-[#0284c7] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
            GUÉDIAWAYE 2027
          </span>

          {isMilitant && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              🔒 Espace Militant Cloisonné
            </span>
          )}
        </div>

        {/* Zone 2: Navigation & Fil d'Ariane (affiché sur grands écrans) */}
        <div className="hidden lg:flex items-center gap-2 text-sm text-slate-700 shrink-0">
          <span>Plateforme Militants</span>
          <span className="text-slate-400">/</span>
          <span className="font-semibold text-slate-900">{activeTabTitle}</span>
        </div>

        {/* Zone 3: Boutons PWA, Inscription & Profil utilisateur */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {onOpenInstallModal && (
            <button
              onClick={onOpenInstallModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              title="Installer l'application sur smartphone ou tablette"
            >
              <span>📲</span>
              <span className="hidden md:inline">Installer l'App</span>
            </button>
          )}

          {onOpenInscription && (
            <button
              onClick={onOpenInscription}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white bg-[#0284c7] hover:bg-[#0369a1] rounded-lg shadow-sm transition-all transform hover:scale-[1.02]"
              title="Formulaire d'auto-inscription citoyenne"
            >
              <UserPlus className="w-3.5 h-3.5 text-rose-300" />
              <span className="hidden md:inline">Adhérer / Inscription</span>
              <span className="md:hidden">Adhérer</span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setMenuOuvert(!menuOuvert)}
              className="flex items-center gap-2 sm:gap-3 p-1 sm:p-1.5 sm:pl-3 pr-1.5 sm:pr-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              title={`Connecté en tant que ${currentUser.nomComplet} (${getRoleLabel(currentUser.role)})`}
            >
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-900 leading-tight max-w-[130px] md:max-w-[180px] truncate">
                  {currentUser.nomComplet}
                </span>
                <span className="text-[11px] text-slate-600 font-mono truncate max-w-[130px] md:max-w-[180px]">
                  {currentUser.identifiant} · {getRoleLabel(currentUser.role)}
                </span>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sky-100 text-[#0284c7] border border-sky-300 flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser.nomComplet.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
            </button>

            {/* Menu déroulant de changement de compte démo */}
            {menuOuvert && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900">Changer de compte de test</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Testez les profils et les permissions d'accès
                  </p>
                </div>

                {/* Si on est en mode militant, un bouton rapide pour basculer en admin */}
                {isMilitant ? (
                  <div className="p-2.5 mx-2 my-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-950 text-xs">
                    <p className="font-bold text-[11px]">Mode Militant Actif (Accès Cloisonné)</p>
                    <p className="text-[10px] text-amber-800 mt-0.5">
                      Les autres espaces (Dashboard, Militants, etc.) sont bloqués pour ce profil.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const adminUser = DEMO_USERS.find(u => u.role === 'admin') || DEMO_USERS[0];
                        onSwitchUser(adminUser);
                        setMenuOuvert(false);
                      }}
                      className="mt-2 w-full py-1.5 px-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-[11px] rounded-md transition-colors"
                    >
                      👑 Revenir au mode Administrateur Central
                    </button>
                  </div>
                ) : (
                  <div className="p-2 mx-2 my-1 bg-sky-50 border border-sky-200 rounded-lg text-sky-950 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const milUser = DEMO_USERS.find(u => u.role === 'militant');
                        if (milUser) {
                          onSwitchUser(milUser);
                          setMenuOuvert(false);
                        }
                      }}
                      className="w-full py-1.5 px-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-[11px] rounded-md transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>📱 Tester le Mode Militant (Mobile)</span>
                    </button>
                  </div>
                )}

                <div className="max-h-80 overflow-y-auto py-1">
                  {DEMO_USERS.map((user) => {
                    const isSelected = user.id === currentUser.id;
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          onSwitchUser(user);
                          setMenuOuvert(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left flex items-start justify-between text-xs hover:bg-slate-50 transition-colors ${
                          isSelected ? 'bg-sky-50/70 font-semibold' : ''
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="font-bold text-slate-900 truncate">
                            {user.nomComplet}
                          </span>
                          <span className="text-[11px] text-slate-600">
                            {getRoleLabel(user.role)}
                          </span>
                          <span className="text-[10px] text-sky-700 font-medium">
                            Périmètre : {getPerimetreLabel(user)}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#0284c7] shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-500">
                  Connecté : <span className="font-semibold text-slate-700">{currentUser.email}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
