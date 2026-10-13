import React from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { KiiraayLogo } from './KiiraayLogo';
import { 
  X, 
  Download, 
  Smartphone, 
  Tablet, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  WifiOff, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface InstallAppModalProps {
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 my-auto text-slate-900">
        {/* En-tête */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-xl shadow-sm shrink-0">
              <KiiraayLogo size="sm" variant="emblem-only" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Installer l'App KIIRAAY
                </h3>
                <span className="text-[10px] bg-rose-600 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                  PWA Mobile
                </span>
              </div>
              <p className="text-[11px] text-sky-200 mt-0.5">
                Sur smartphone Android, iPhone, iPad et tablette
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-5 sm:p-6 space-y-5 text-xs">
          {/* État : Déjà installée */}
          {isInstalled && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">Application déjà installée sur cet appareil !</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Vous profitez déjà du mode application autonome en plein écran.
                </p>
              </div>
            </div>
          )}

          {/* Avantages pour les militants sur le terrain */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <Smartphone className="w-5 h-5 text-sky-700 mx-auto mb-1" />
              <p className="font-bold text-slate-800 text-[11px]">100% Mobile</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Écran d'accueil dédié</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <WifiOff className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <p className="font-bold text-slate-800 text-[11px]">Hors-ligne</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Fonctionne sans réseau</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <ShieldCheck className="w-5 h-5 text-rose-600 mx-auto mb-1" />
              <p className="font-bold text-slate-800 text-[11px]">Sécurisé</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Espace cloisonné</p>
            </div>
          </div>

          {/* Guide spécifique Android / Navigateur compatible */}
          {isInstallable && (
            <div className="space-y-3 p-4 bg-sky-50/80 rounded-xl border border-sky-200 text-sky-950">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-700" />
                <h4 className="font-bold text-xs">Installation en 1 Clic disponible :</h4>
              </div>
              <p className="text-[11px] text-slate-600">
                Votre navigateur prend en charge l'installation native immédiate. Cliquez ci-dessous pour ajouter l'icône officielle KIIRAAY sur votre écran d'accueil.
              </p>
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-2.5 px-4 font-bold text-xs text-white bg-sky-700 hover:bg-sky-800 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 transform active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Installer maintenant sur cet appareil</span>
              </button>
            </div>
          )}

          {/* Guide spécifique iOS (iPhone / iPad) */}
          {isIOS ? (
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <Tablet className="w-4 h-4 text-slate-700" />
                <h4 className="font-bold text-xs text-slate-900">Procédure sur iPhone & iPad (Safari) :</h4>
              </div>
              <ol className="space-y-2 text-[11px] text-slate-700 list-decimal list-inside pl-1">
                <li className="leading-relaxed">
                  Dans Safari, appuyez sur le bouton de <b>Partage</b> en bas de l'écran{' '}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[10px]">
                    <Share className="w-3 h-3 inline mr-1" /> Partager
                  </span>.
                </li>
                <li className="leading-relaxed">
                  Faites défiler la liste vers le bas et appuyez sur{' '}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[10px]">
                    <PlusSquare className="w-3 h-3 inline mr-1" /> Sur l'écran d'accueil
                  </span>.
                </li>
                <li className="leading-relaxed">
                  Confirmez en appuyant sur <b>« Ajouter »</b> en haut à droite. L'icône KIIRAAY apparaîtra instantanément avec vos applications.
                </li>
              </ol>
            </div>
          ) : !isInstallable && !isInstalled ? (
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-700" />
                <h4 className="font-bold text-xs text-slate-900">Installation manuelle (Android / Chrome / Edge) :</h4>
              </div>
              <ol className="space-y-2 text-[11px] text-slate-700 list-decimal list-inside pl-1">
                <li className="leading-relaxed">
                  Appuyez sur le menu du navigateur (<b>les 3 petits points ⋮</b> en haut à droite).
                </li>
                <li className="leading-relaxed">
                  Sélectionnez <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b>.
                </li>
                <li className="leading-relaxed">
                  Validez pour installer l'application mobile KIIRAAY sur votre appareil.
                </li>
              </ol>
            </div>
          ) : null}

          {/* Note sur l'espace militant et la confidentialité */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <span>🔒 Mode Test Militant Cloisonné :</span>
            </p>
            <p className="text-amber-800">
              Lorsque vous installez cette plateforme sur les téléphones ou tablettes des militants, 
              ceux-ci ne peuvent <b>que s'inscrire et consulter leur propre espace</b> (carte officielle, coordonnées, statut), 
              sans jamais pouvoir accéder au tableau de bord, à la liste des autres adhérents ou aux fonctions d'administration.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 font-semibold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
