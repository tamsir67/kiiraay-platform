import React, { useState } from 'react';
import { AuditEntry } from '../types';
import { store } from '../services/store';
import { 
  FileLock2, 
  ShieldCheck, 
  CheckCircle2, 
  Search, 
  AlertCircle, 
  Hash, 
  RefreshCw 
} from 'lucide-react';

interface AuditPageProps {
  logs: AuditEntry[];
}

export const AuditPage: React.FC<AuditPageProps> = ({ logs }) => {
  const [recherche, setRecherche] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    effectuee: boolean;
    valide: boolean;
    blocs: number;
    details: string;
  } | null>(null);
  const [enCoursVerification, setEnCoursVerification] = useState(false);

  const logsFiltres = logs.filter(l => 
    l.action.toLowerCase().includes(recherche.toLowerCase()) ||
    l.utilisateur.toLowerCase().includes(recherche.toLowerCase()) ||
    l.details.toLowerCase().includes(recherche.toLowerCase()) ||
    l.hash.includes(recherche)
  );

  const handleVerifierIntegrite = async () => {
    setEnCoursVerification(true);
    // Petit délai pour simuler le parcours cryptographique
    setTimeout(async () => {
      const res = await store.verifierIntegriteAudit();
      setVerificationResult({
        effectuee: true,
        valide: res.valide,
        blocs: res.blocsVerifies,
        details: res.details
      });
      setEnCoursVerification(false);
    }, 400);
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Journal d’Audit Cryptographique SHA-256 · CDC §5.6
          </h1>
          <p className="text-xs text-slate-700 mt-0.5">
            Registre inviolable en ajout seul : chaque bloc est scellé au bloc précédent par empreinte SHA-256
          </p>
        </div>

        <button
          onClick={handleVerifierIntegrite}
          disabled={enCoursVerification}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-rose-300" />
          <span>{enCoursVerification ? 'Vérification en cours...' : 'Vérifier l’intégrité de la chaîne'}</span>
        </button>
      </div>

      {/* Résultat de la vérification d'intégrité */}
      {verificationResult && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          verificationResult.valide 
            ? 'bg-sky-50 border-sky-300 text-sky-950' 
            : 'bg-red-50 border-red-300 text-red-900'
        }`}>
          {verificationResult.valide ? (
            <CheckCircle2 className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <div className="font-bold text-sm">
              {verificationResult.valide 
                ? 'Certification d’intégrité confirmée : Aucun bloc altéré' 
                : 'Alerte rupture de chaîne d’audit !'}
            </div>
            <p className="text-slate-800">{verificationResult.details}</p>
            <p className="font-mono text-[11px] text-slate-600">
              Chaîne continue de {verificationResult.blocs} blocs scellés successivement.
            </p>
          </div>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filtrer par action, utilisateur, détails, hash..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-800"
          />
        </div>
        <span className="text-xs text-slate-700 font-mono">
          {logsFiltres.length} blocs enregistrés
        </span>
      </div>

      {/* Liste des blocs cryptographiques */}
      <div className="space-y-3">
        {logsFiltres.slice().reverse().map(l => (
          <div 
            key={l.id} 
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2 hover:border-slate-300 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-900 text-white text-[11px]">
                  Bloc #{l.id}
                </span>
                <span className="font-bold text-emerald-800">{l.action}</span>
                <span className="text-slate-700">·</span>
                <span className="text-slate-700">
                  Par <b>{l.utilisateur}</b> ({l.role.toUpperCase()})
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-mono text-[11px]">
                <span>IP : {l.ip}</span>
                <span>·</span>
                <span>{l.timestamp}</span>
              </div>
            </div>

            <p className="text-xs text-slate-800 pl-1 border-l-2 border-emerald-600">
              {l.details}
            </p>

            {/* Chaînage de hash SHA-256 */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono text-[10px] space-y-1 text-slate-700">
              <div className="truncate">
                <span className="text-slate-700 font-semibold">Precedent Hash : </span>
                <span className="text-slate-700">{l.precedentHash}</span>
              </div>
              <div className="truncate">
                <span className="text-emerald-800 font-bold">Block Hash SHA-256 : </span>
                <span className="font-bold text-slate-900">{l.hash}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
