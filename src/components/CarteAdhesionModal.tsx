import React, { useState } from 'react';
import { Militant } from '../types';
import { COMMUNES_GUEDIAWAYE, QUARTIERS_GUEDIAWAYE } from '../data/referentiel';
import { KiiraayLogo } from './KiiraayLogo';
import { CrispQrCode } from './CrispQrCode';
import { Printer, X, ShieldCheck, QrCode, Maximize2, ExternalLink } from 'lucide-react';

interface CarteAdhesionModalProps {
  militant: Militant;
  onClose: () => void;
  onSimulerScan: (jeton: string, numeroKry: string) => void;
}

export const CarteAdhesionModal: React.FC<CarteAdhesionModalProps> = ({
  militant,
  onClose,
  onSimulerScan
}) => {
  const [zoomQr, setZoomQr] = useState(false);
  const commune = COMMUNES_GUEDIAWAYE.find(c => c.id === militant.communeId);
  const quartier = QUARTIERS_GUEDIAWAYE.find(q => q.id === militant.quartierId);

  const qrUrl = `https://kiiraay.exemple.sn/verifier/${militant.jetonSecurise}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* En-tête modal */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
              Carte Officielle d'Adhésion KIIRAAY
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zone de la carte physique (imprimable) */}
        <div className="p-3 sm:p-6 flex flex-col items-center">
          <div 
            id="print-card-area"
            className="w-full max-w-[440px] aspect-[1.586] rounded-2xl bg-gradient-to-br from-[#0284c7] via-[#0369a1] to-[#0c4a6e] text-white p-5 shadow-2xl border-2 border-sky-300/40 relative overflow-hidden flex flex-col justify-between"
          >
            {/* Filigrane décoratif officiel parapluie */}
            <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full border-8 border-white/10 pointer-events-none" />
            <div className="absolute right-12 top-6 opacity-15 pointer-events-none">
              <KiiraayLogo size="xl" variant="emblem-only" inverted />
            </div>

            {/* En-tête de la carte avec Logo officiel */}
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="bg-white p-1 rounded-xl shadow-md border border-white/80">
                  <KiiraayLogo size="sm" variant="emblem-only" />
                </div>
                <div>
                  <div className="text-xs font-black tracking-wider flex items-baseline">
                    <span className="text-white drop-shadow-xs">KIIRAAY</span>
                  </div>
                  <div className="text-[8px] text-rose-300 font-extrabold tracking-widest uppercase">
                    LES PATRIOTES RÉPUBLICAINS
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-black text-sky-100 uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-xs">
                  Guédiawaye 2027
                </div>
                <div className="text-[8px] text-sky-100/90 mt-0.5">
                  Département 04 · Sénégal
                </div>
              </div>
            </div>

            {/* Corps de la carte avec avatar, coordonnées et QR code net */}
            <div className="flex items-center gap-3.5 my-1.5 relative z-10">
              {/* Photo / Initiales */}
              <div className="w-16 h-20 rounded-xl bg-white/15 backdrop-blur-xs border border-white/30 flex flex-col items-center justify-center text-white font-bold shrink-0 shadow-inner">
                <span className="text-xl font-black">
                  {militant.prenom[0]}{militant.nom[0]}
                </span>
                <span className="text-[8px] uppercase tracking-wider mt-1 text-rose-300 font-black">
                  Militant
                </span>
              </div>

              {/* Informations du militant */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black text-white truncate leading-tight">
                  {militant.prenom} {militant.nom}
                </div>
                <div className="text-[11px] text-sky-100 font-mono font-bold mt-0.5">
                  N° {militant.numeroKry}
                </div>
                <div className="text-[10px] text-sky-50 mt-1 space-y-0.5 font-medium">
                  <p className="truncate">Commune : <b className="text-white font-bold">{commune?.nom}</b></p>
                  <p className="truncate">Quartier : <b className="text-white font-bold">{quartier?.codeQuartier ? `${quartier.codeQuartier} · ` : ''}{quartier?.nom}</b></p>
                  <p>Adhésion : <b className="text-white font-bold">{militant.dateAdhesion}</b></p>
                </div>
              </div>

              {/* QR Code de vérification haute netteté avec zone de contraste */}
              <div 
                className="shrink-0 flex flex-col items-center justify-center cursor-pointer group"
                onClick={() => setZoomQr(true)}
                title="Cliquez pour agrandir le QR Code"
              >
                <div className="bg-white p-1.5 rounded-xl shadow-lg border-2 border-white group-hover:scale-105 transition-transform">
                  <CrispQrCode
                    value={qrUrl}
                    size={80}
                    showBorder={false}
                  />
                </div>
                <span className="text-[8px] text-sky-100 font-bold uppercase tracking-wider mt-1 flex items-center gap-0.5 group-hover:text-white">
                  <Maximize2 className="w-2.5 h-2.5" />
                  Scanner
                </span>
              </div>
            </div>

            {/* Pied de la carte */}
            <div className="flex items-center justify-between text-[8px] text-sky-100/90 border-t border-white/20 pt-1.5 relative z-10">
              <span className="flex items-center gap-1 font-medium">
                <span className="text-rose-400 font-bold">●</span> Signature cryptographique HMAC certifiée
              </span>
              <span className="font-mono text-white font-bold bg-white/15 px-1.5 py-0.2 rounded">Scellé 2027</span>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-600 text-center max-w-sm">
            Ce QR Code haute netteté est scannable par tout smartphone pour vérifier l'authenticité de l'adhésion sans divulguer de données privées sensibles.
          </div>
        </div>

        {/* Modal d'agrandissement du QR Code si cliqué */}
        {zoomQr && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-xs w-full flex flex-col items-center text-center shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between w-full mb-3">
                <span className="text-xs font-bold text-slate-900">QR Code de Certification</span>
                <button 
                  onClick={() => setZoomQr(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-white rounded-xl border-2 border-sky-500 shadow-md">
                <CrispQrCode
                  value={qrUrl}
                  size={190}
                  showBorder={false}
                />
              </div>

              <div className="mt-3 text-xs font-mono font-bold text-sky-800">
                {militant.numeroKry}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {militant.prenom} {militant.nom} · {commune?.nom}
              </div>

              <button
                onClick={() => {
                  setZoomQr(false);
                  onSimulerScan(militant.jetonSecurise, militant.numeroKry);
                }}
                className="mt-4 w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Simuler le scan public
              </button>
            </div>
          </div>
        )}

        {/* Boutons d'actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => onSimulerScan(militant.jetonSecurise, militant.numeroKry)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Tester le scan du QR code</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer la carte</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
