import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, X, Check } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '', 
  variant = 'compact' 
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  // If already running in standalone mode on phone/tablet, hide the install button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setInstalledSuccess(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  if (installedSuccess) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
        <Check className="w-4 h-4 text-emerald-600" />
        <span>Application installée avec succès !</span>
      </div>
    );
  }

  return (
    <>
      {variant === 'banner' ? (
        <div className={`bg-gradient-to-r from-sky-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-sky-700/60 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center shrink-0 text-sky-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Installer KIIRAAY sur ce téléphone ou tablette</h4>
              <p className="text-xs text-sky-200/90 mt-0.5 max-w-xl">
                Accès direct sans passer par le navigateur, fonctionne hors-ligne pour la consultation de votre espace militant.
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold bg-[#0284c7] hover:bg-sky-500 text-white rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Installer l'application</span>
          </button>
        </div>
      ) : variant === 'full' ? (
        <button
          onClick={handleInstallClick}
          className={`w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-all cursor-pointer ${className}`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Installer sur cet appareil</span>
        </button>
      ) : (
        <button
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-all cursor-pointer ${className}`}
          title="Installer la plateforme sur votre téléphone ou tablette"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Installer l'App</span>
        </button>
      )}

      {/* Modal guide d'installation mobile (pour iOS Safari ou navigateur sans prompt natif) */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#0284c7]" />
                <h3 className="font-bold text-sm text-slate-900">
                  Installer KIIRAAY sur votre appareil
                </h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">
                  Sur iPhone ou iPad (Safari) :
                </p>
                <ol className="space-y-2 list-decimal list-inside bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <li className="leading-relaxed">
                    Appuyez sur le bouton <b>Partager</b> <Share className="w-3.5 h-3.5 inline mx-1 text-[#0284c7]" /> dans la barre de Safari (en bas ou en haut).
                  </li>
                  <li className="leading-relaxed">
                    Faites défiler le menu vers le bas et sélectionnez <b>Sur l'écran d'accueil</b> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-emerald-600" />.
                  </li>
                  <li className="leading-relaxed">
                    Appuyez sur <b>Ajouter</b> en haut à droite.
                  </li>
                </ol>
                <p className="text-[11px] text-slate-500">
                  L'icône officielle KIIRAAY apparaîtra sur votre écran d'accueil comme une application native.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">
                  Sur Android / Tablette (Chrome ou autre navigateur) :
                </p>
                <ol className="space-y-2 list-decimal list-inside bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <li className="leading-relaxed">
                    Ouvrez le menu du navigateur (les <b>3 points verticaux ⋮</b> en haut à droite).
                  </li>
                  <li className="leading-relaxed">
                    Appuyez sur <b>Installer l'application</b> ou <b>Ajouter à l'écran d'accueil</b>.
                  </li>
                  <li className="leading-relaxed">
                    Validez pour installer l'application sur votre appareil.
                  </li>
                </ol>
                <p className="text-[11px] text-slate-500">
                  Une fois installée, l'application s'ouvrira en plein écran sans barre d'adresse navigateur.
                </p>
              </div>
            )}

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
};
