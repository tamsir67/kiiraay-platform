import React from 'react';
import { Militant } from '../types';
import { COMMUNES_GUEDIAWAYE } from '../data/referentiel';
import { KiiraayLogo } from './KiiraayLogo';
import { CheckCircle2, ShieldCheck, X, AlertTriangle } from 'lucide-react';

interface PublicVerifyModalProps {
  militant?: Militant;
  jeton: string;
  onClose: () => void;
}

export const PublicVerifyModal: React.FC<PublicVerifyModalProps> = ({
  militant,
  jeton,
  onClose
}) => {
  const commune = militant ? COMMUNES_GUEDIAWAYE.find(c => c.id === militant.communeId) : null;
  const isActif = militant && militant.statut === 'actif';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 my-auto">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="bg-white p-1 rounded-md">
              <KiiraayLogo size="sm" variant="emblem-only" />
            </div>
            <div>
              <div className="text-xs font-black tracking-wide flex items-baseline">
                <span className="text-sky-400">K</span>
                <span className="text-rose-500">II</span>
                <span className="text-sky-400">RAAY</span>
              </div>
              <div className="text-[8px] text-slate-300 font-extrabold tracking-widest uppercase">
                VÉRIFICATION OFFICIELLE
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sky-50 text-sky-700 mb-3 border border-sky-200 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              Carte d'adhésion Authentique & Validée
            </h4>
            <p className="text-xs text-slate-700 mt-1 font-mono">
              Serveur officiel : /verifier/{jeton.slice(0, 10)}•••
            </p>
          </div>

          {militant ? (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-700">Numéro de militant :</span>
                <span className="font-mono font-bold text-slate-900">{militant.numeroKry}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-700">Identité (anonymisée) :</span>
                <span className="font-semibold text-slate-900">
                  {militant.prenom} {militant.nom.charAt(0)}.
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-700">Commune de rattachement :</span>
                <span className="font-semibold text-slate-900">{commune?.nom || 'Guédiawaye'}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-700">Statut statutaire :</span>
                <span className="inline-flex items-center gap-1 font-bold text-sky-700">
                  <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                  Adhérent En Règle (Actif)
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-700">Échéance électorale :</span>
                <span className="font-semibold text-rose-700 font-bold">Guédiawaye 2027</span>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-xs flex items-start gap-2 border border-red-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Jeton invalide ou carte révoquée par l'administration centrale.</span>
            </div>
          )}

          <div className="mt-5 text-[11px] text-slate-700 text-center leading-relaxed">
            Conformément à la loi sénégalaise n° 2008-12 sur la protection des données personnelles, 
            les coordonnées directes, l'adresse et le numéro CNI ne sont jamais exposés publiquement.
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Fermer la vérification
          </button>
        </div>
      </div>
    </div>
  );
};
