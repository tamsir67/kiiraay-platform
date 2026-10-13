import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  MapPin, 
  Map, 
  UserCheck, 
  ShieldAlert, 
  FileSpreadsheet, 
  FileLock2, 
  MessageSquare,
  CreditCard,
  RotateCcw,
  UserPlus,
  Clock,
  X
} from 'lucide-react';
import { Utilisateur } from '../types';
import { KiiraayLogo } from './KiiraayLogo';

export type TabId = 
  | 'dashboard' 
  | 'militants' 
  | 'carte' 
  | 'territoires' 
  | 'responsables' 
  | 'qualite' 
  | 'import_export' 
  | 'audit' 
  | 'messagerie'
  | 'espace_militant';

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  currentUser: Utilisateur;
  nbAlertes: number;
  nbMessagesNonLus: number;
  nbEnAttente?: number;
  onResetData: () => void;
  onOpenInscription?: () => void;
  onOpenInstallModal?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  nbAlertes,
  nbMessagesNonLus,
  nbEnAttente = 0,
  onResetData,
  onOpenInscription,
  onOpenInstallModal,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const isMilitant = currentUser.role === 'militant';

  const navItems: { id: TabId; label: string; icon: React.FC<{ className?: string }>; badge?: number; badgeColor?: string; visible: boolean }[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, visible: !isMilitant },
    { 
      id: 'militants', 
      label: 'Militants & Adhérents', 
      icon: Users, 
      badge: nbEnAttente > 0 ? nbEnAttente : undefined,
      badgeColor: 'bg-amber-400 text-slate-900',
      visible: !isMilitant 
    },
    { id: 'carte', label: 'Cartographie', icon: Map, visible: !isMilitant },
    { id: 'territoires', label: 'Territoires & Quartiers', icon: MapPin, visible: !isMilitant },
    { id: 'responsables', label: 'Chaîne de responsabilité', icon: UserCheck, visible: !isMilitant },
    { id: 'qualite', label: 'Qualité des données', icon: ShieldAlert, badge: nbAlertes, visible: !isMilitant && currentUser.role !== 'decideur' },
    { id: 'import_export', label: 'Import / Export', icon: FileSpreadsheet, visible: !isMilitant && currentUser.role !== 'decideur' },
    { id: 'audit', label: 'Journal d’audit SHA-256', icon: FileLock2, visible: currentUser.role === 'admin' },
    { id: 'messagerie', label: 'Messagerie interne', icon: MessageSquare, badge: nbMessagesNonLus, visible: !isMilitant },
    { id: 'espace_militant', label: 'Mon Espace Militant', icon: CreditCard, visible: isMilitant || currentUser.role === 'admin' }
  ];

  const handleItemClick = (tabId: TabId) => {
    onSelectTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <>
      {/* En-tête de la barre latérale aux couleurs exactes du parti */}
      <div className="p-4 border-b border-white/20 flex items-center justify-between gap-3 bg-white/10 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl shadow-sm shrink-0">
            <KiiraayLogo size="sm" variant="emblem-only" />
          </div>
          <div className="flex flex-col">
            <div className="text-xs font-black text-white flex items-center gap-1.5 tracking-tight">
              <span>KIIRAAY</span>
              <span className="text-rose-300 font-black">·</span>
              <span className="text-sky-100 font-bold">GDW 2027</span>
            </div>
            <div className="text-[10px] text-sky-100 font-medium">
              Département de Guédiawaye
            </div>
          </div>
        </div>

        {/* Bouton fermer sur mobile */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bouton d'auto-inscription citoyenne */}
      {onOpenInscription && (
        <div className="p-3 pb-1">
          <button
            onClick={() => {
              onOpenInscription();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white text-[#0284c7] hover:bg-sky-50 shadow-md font-bold text-xs transition-all transform hover:scale-[1.02]"
          >
            <UserPlus className="w-4 h-4 text-rose-500" />
            <span>Adhérer / Inscription</span>
          </button>
        </div>
      )}

      {/* Alerte si des inscriptions sont en attente de validation */}
      {nbEnAttente > 0 && !isMilitant && (
        <div className="px-3 pt-2">
          <button
            onClick={() => handleItemClick('militants')}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-amber-400/20 border border-amber-300/40 text-amber-100 hover:bg-amber-400/30 transition-colors text-left"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>Inscriptions en attente</span>
            </div>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
              {nbEnAttente}
            </span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.filter(item => item.visible).map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                isActive
                  ? 'bg-white text-[#0284c7] shadow-md font-black scale-[1.01]'
                  : 'text-white/95 hover:bg-white/15 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0284c7]' : 'text-sky-100'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  item.badgeColor || (isActive ? 'bg-rose-600 text-white' : 'bg-rose-500 text-white shadow-xs')
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Pied de barre latérale */}
      <div className="p-3 border-t border-white/20 bg-black/10 space-y-2 mt-auto">
        {onOpenInstallModal && (
          <button
            onClick={() => {
              onOpenInstallModal();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[11px] font-bold text-white bg-white/20 hover:bg-white/30 rounded-xl transition-colors border border-white/30 shadow-xs"
            title="Installer l'application sur smartphone ou tablette"
          >
            <span>📲 Installer sur Mobile</span>
          </button>
        )}

        {!isMilitant && (
          <button
            onClick={() => {
              onResetData();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-[10px] font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/15 rounded-lg transition-colors border border-white/10"
            title="Réinitialiser la base locale aux valeurs d'usine"
          >
            <RotateCcw className="w-3 h-3 text-sky-200" />
            <span>Réinitialiser les données</span>
          </button>
        )}

        <div className="px-2 pt-1 text-[10px] text-sky-100/90 leading-tight text-center">
          {isMilitant ? 'Espace personnel sécurisé' : 'Loi sénégalaise 2008-12 · Conforme CDP'}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop sidebar (visible sur lg et plus) */}
      <aside className="hidden lg:flex w-64 bg-gradient-to-b from-[#0284c7] via-[#0284c7] to-[#0369a1] text-white flex-col shrink-0 min-h-[calc(100vh-57px)] border-r border-sky-400/40 shadow-lg">
        {sidebarContent}
      </aside>

      {/* 2. Mobile Drawer (visible sur petits écrans lorsque isMobileOpen est vrai) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop sombre */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={onCloseMobile}
          />
          {/* Panneau coulissant */}
          <aside className="relative w-72 max-w-[85vw] bg-gradient-to-b from-[#0284c7] via-[#0284c7] to-[#0369a1] text-white flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
