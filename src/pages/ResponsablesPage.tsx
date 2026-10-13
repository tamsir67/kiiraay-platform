import React, { useState } from 'react';
import { COMMUNES_GUEDIAWAYE, QUARTIERS_GUEDIAWAYE } from '../data/referentiel';
import { Utilisateur } from '../types';
import { KiiraayLogo } from '../components/KiiraayLogo';
import { UserCheck, AlertTriangle, ShieldCheck, UserPlus, Phone, Check } from 'lucide-react';

interface ResponsablesPageProps {
  currentUser: Utilisateur;
}

export const ResponsablesPage: React.FC<ResponsablesPageProps> = ({ currentUser }) => {
  const [selectedCommuneId, setSelectedCommuneId] = useState<string>('golf-sud');
  const [quartiersState, setQuartiersState] = useState(QUARTIERS_GUEDIAWAYE);
  
  // Reassignment modal
  const [modalReaffectation, setModalReaffectation] = useState<{
    quartierId: string;
    quartierNom: string;
    commissaireActuel: string;
  } | null>(null);

  const [nouveauCommissaire, setNouveauCommissaire] = useState('');
  const [nouveauTelephone, setNouveauTelephone] = useState('+221 77 ');

  const activeCommune = COMMUNES_GUEDIAWAYE.find(c => c.id === selectedCommuneId) || COMMUNES_GUEDIAWAYE[0];
  const quartiers = quartiersState.filter(q => q.communeId === selectedCommuneId);
  const vacants = quartiersState.filter(q => q.commissaire === 'Non pourvu');

  const handleAffecter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalReaffectation || !nouveauCommissaire.trim()) return;

    setQuartiersState(prev => prev.map(q => {
      if (q.id === modalReaffectation.quartierId) {
        return {
          ...q,
          commissaire: nouveauCommissaire.trim(),
          telephoneCommissaire: nouveauTelephone.trim()
        };
      }
      return q;
    }));

    setModalReaffectation(null);
    setNouveauCommissaire('');
    setNouveauTelephone('+221 77 ');
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Chaîne de Responsabilité & Encadrement · CDC §5.4
          </h1>
          <p className="text-xs text-slate-700 mt-0.5">
            Architecture hiérarchique : Coordonnateur communal → Superviseurs → Commissaires de quartier
          </p>
        </div>

        {vacants.length > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>{vacants.length} quartier(s) sans commissaire au département</span>
          </div>
        )}
      </div>

      {/* Onglets des communes */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {COMMUNES_GUEDIAWAYE.map(c => {
          const isSelected = selectedCommuneId === c.id;
          const nbVacantsCommune = quartiersState.filter(q => q.communeId === c.id && q.commissaire === 'Non pourvu').length;

          return (
            <button
              key={c.id}
              onClick={() => setSelectedCommuneId(c.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.couleur }} />
              <span>{c.nom}</span>
              {nbVacantsCommune > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                  {nbVacantsCommune}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Coordonnateur communal */}
      <div className="bg-gradient-to-r from-slate-950 via-sky-950 to-slate-900 text-white rounded-xl p-5 shadow-sm border border-sky-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-xl shadow shrink-0">
            <KiiraayLogo size="sm" variant="emblem-only" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Coordonnateur de la Commune de {activeCommune.nom}</span>
            </div>
            <div className="text-base font-bold text-white">
              {activeCommune.coordonnateur}
            </div>
            <div className="text-xs text-sky-200 font-mono mt-0.5">
              Contact direct : {activeCommune.telephoneCoordonnateur}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-200 bg-sky-900/40 p-3 rounded-lg border border-sky-700/50">
          Supervise l'ensemble des superviseurs et commissaires de {activeCommune.nom}.
        </div>
      </div>

      {/* Tableau des commissaires de quartier */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900">
            Affectations des Commissaires de Quartier ({activeCommune.nom})
          </h2>
          <span className="text-xs text-slate-700 font-mono">
            {quartiers.length} Quartiers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-3 px-4">Quartier</th>
                <th className="py-3 px-4">Superviseur de Zone</th>
                <th className="py-3 px-4">Commissaire de Quartier</th>
                <th className="py-3 px-4">Téléphone</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quartiers.map(q => {
                const isVacant = q.commissaire === 'Non pourvu';

                return (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {q.codeQuartier && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {q.codeQuartier}
                          </span>
                        )}
                        <span>{q.nom}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{q.superviseur}</td>
                    <td className="py-3 px-4">
                      {isVacant ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Poste vacant à pourvoir
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-900">{q.commissaire}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {q.telephoneCommissaire || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setModalReaffectation({
                            quartierId: q.id,
                            quartierNom: q.nom,
                            commissaireActuel: q.commissaire
                          });
                          setNouveauCommissaire(isVacant ? '' : q.commissaire);
                          setNouveauTelephone(q.telephoneCommissaire || '+221 77 ');
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                      >
                        {isVacant ? 'Affecter' : 'Réaffecter'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal affectation / réaffectation */}
      {modalReaffectation && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 mb-1">
              Affecter le commissaire de {modalReaffectation.quartierNom}
            </h3>
            <p className="text-xs text-slate-700 mb-4">
              Désignez le commissaire responsable de la collecte et de la vérification locale.
            </p>

            <form onSubmit={handleAffecter} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom complet du commissaire</label>
                <input
                  type="text"
                  required
                  value={nouveauCommissaire}
                  onChange={e => setNouveauCommissaire(e.target.value)}
                  placeholder="Ex: Cheikh Oumar Tall"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Numéro de téléphone direct</label>
                <input
                  type="text"
                  required
                  value={nouveauTelephone}
                  onChange={e => setNouveauTelephone(e.target.value)}
                  placeholder="+221 77 000 00 00"
                  className="w-full text-xs px-3 py-2 font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalReaffectation(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm"
                >
                  Enregistrer l'affectation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
