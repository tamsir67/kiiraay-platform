import React, { useState } from 'react';
import { Militant, Quartier, Utilisateur } from '../types';
import { COMMUNES_GUEDIAWAYE } from '../data/referentiel';
import { store } from '../services/store';
import { QuartierModal } from '../components/QuartierModal';
import { 
  MapPin, 
  Search, 
  UserCheck, 
  AlertTriangle, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Info,
  ShieldAlert
} from 'lucide-react';

interface TerritoiresPageProps {
  militants: Militant[];
  currentUser: Utilisateur;
  onSelectCommuneFilter: (communeId: string) => void;
}

export const TerritoiresPage: React.FC<TerritoiresPageProps> = ({
  militants,
  currentUser,
  onSelectCommuneFilter
}) => {
  const [activeCommuneId, setActiveCommuneId] = useState<string>('golf-sud');
  const [rechercheQuartier, setRechercheQuartier] = useState('');
  
  // Modal de gestion des quartiers
  const [modalQuartierState, setModalQuartierState] = useState<{
    open: boolean;
    quartier?: Quartier | null;
  }>({
    open: false,
    quartier: null
  });

  // Modal de confirmation de suppression
  const [quartierASupprimer, setQuartierASupprimer] = useState<Quartier | null>(null);
  const [messageAlerte, setMessageAlerte] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'admin';
  const activeCommune = COMMUNES_GUEDIAWAYE.find(c => c.id === activeCommuneId) || COMMUNES_GUEDIAWAYE[0];
  
  // Récupérer les quartiers en temps réel depuis le store
  const tousQuartiersCommune = store.getQuartiers(activeCommuneId);

  const quartiersFiltres = tousQuartiersCommune.filter(q => 
    q.nom.toLowerCase().includes(rechercheQuartier.toLowerCase()) ||
    q.commissaire.toLowerCase().includes(rechercheQuartier.toLowerCase()) ||
    q.superviseur.toLowerCase().includes(rechercheQuartier.toLowerCase())
  );

  const handleSaveQuartier = (data: Omit<Quartier, 'id'>) => {
    if (modalQuartierState.quartier) {
      store.updateQuartier(modalQuartierState.quartier.id, data);
    } else {
      store.createQuartier(data);
    }
    setModalQuartierState({ open: false, quartier: null });
  };

  const handleConfirmerSuppression = () => {
    if (!quartierASupprimer) return;
    const res = store.deleteQuartier(quartierASupprimer.id);
    if (!res.success) {
      setMessageAlerte(res.message);
    } else {
      setQuartierASupprimer(null);
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Territoires & Découpage des Quartiers</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-[#0284c7] font-bold">
              {store.getQuartiers().length} Quartiers
            </span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Administration des 5 communes et quartiers du Département de Guédiawaye (Élections 2027)
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setModalQuartierState({ open: true, quartier: null })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0284c7] hover:bg-[#0369a1] rounded-lg shadow-sm transition-all w-fit"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau quartier</span>
          </button>
        )}
      </div>

      {/* Onglets des 5 communes (défilement horizontal sur mobile) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto whitespace-nowrap">
        {COMMUNES_GUEDIAWAYE.map(c => {
          const isSelected = activeCommuneId === c.id;
          const count = militants.filter(m => m.communeId === c.id).length;
          const nbQuartiers = store.getQuartiers(c.id).length;

          return (
            <button
              key={c.id}
              onClick={() => {
                setActiveCommuneId(c.id);
                setRechercheQuartier('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-[#0284c7] text-white shadow-md font-bold'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span 
                className="w-2.5 h-2.5 rounded-full shrink-0" 
                style={{ backgroundColor: isSelected ? '#ffffff' : c.couleur }} 
              />
              <span>{c.nom}</span>
              <span className="text-[11px] opacity-80 tabular-nums">({nbQuartiers} q. · {count} mil.)</span>
            </button>
          );
        })}
      </div>

      {/* Fiche récapitulative de la commune sélectionnée */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{activeCommune.nom}</h2>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-sky-50 text-[#0284c7] border border-sky-200">
                Code : {activeCommune.code}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-xl">
              {activeCommune.description}
            </p>
          </div>

          <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div>Coordonnateur communal : <b className="text-slate-900">{activeCommune.coordonnateur}</b></div>
            <div>Téléphone : <b className="text-slate-900 font-mono">{activeCommune.telephoneCoordonnateur}</b></div>
            <div>Arrondissement : <b className="text-slate-900">{activeCommune.arrondissement || 'Guédiawaye'}</b></div>
            <div>Population (RGPH 2023) : <b className="text-slate-900">{activeCommune.populationRgph2023 ? `${activeCommune.populationRgph2023.toLocaleString()} hab.` : 'N/C'}</b></div>
            <div>Objectif officiel : <b className="text-emerald-700 font-bold">{activeCommune.objectifMilitants.toLocaleString()} militants</b></div>
          </div>
        </div>
      </div>

      {/* Barre de recherche dans les quartiers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher un quartier, code, commissaire..."
            value={rechercheQuartier}
            onChange={e => setRechercheQuartier(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-medium">
            {quartiersFiltres.length} quartier(s) affiché(s) sur {tousQuartiersCommune.length}
          </span>
          <button
            onClick={() => onSelectCommuneFilter(activeCommuneId)}
            className="text-xs font-semibold text-[#0284c7] hover:underline ml-2"
          >
            Voir les militants de cette commune →
          </button>
        </div>
      </div>

      {/* Grille des quartiers avec CRUD complet pour l'Admin */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quartiersFiltres.map(q => {
          const countMilitants = militants.filter(m => m.quartierId === q.id).length;
          const isVacant = !q.commissaire || q.commissaire === 'Non pourvu';
          const tauxMobilisation = Math.min(100, Math.round((countMilitants / (q.objectif || 1000)) * 100));

          return (
            <div 
              key={q.id}
              className={`bg-white rounded-2xl border p-4 shadow-2xs space-y-3 transition-all hover:shadow-md ${
                isVacant ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {q.codeQuartier && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {q.codeQuartier}
                      </span>
                    )}
                    <h3 className="font-bold text-sm text-slate-900">{q.nom}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    <span className="text-[11px] text-slate-500">Superviseur : {q.superviseur || 'Coordination'}</span>
                    {q.typeHabitat && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-50 text-[#0284c7] border border-sky-100">
                        {q.typeHabitat}
                      </span>
                    )}
                    {q.niveau && q.niveau !== 'quartier' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-100 uppercase font-semibold">
                        {q.niveau}
                      </span>
                    )}
                  </div>
                  {q.remarque && (
                    <p className="text-[10px] text-amber-700 italic mt-0.5 line-clamp-1" title={q.remarque}>
                      ⚠️ {q.remarque}
                    </p>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-[#0284c7] border border-sky-100 font-mono shrink-0">
                  {countMilitants} milit.
                </span>
              </div>

              {/* Barre de progression de mobilisation */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Progression objectif ({q.objectif} pers.)</span>
                  <span className="font-bold text-slate-700">{tauxMobilisation}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-[#0284c7] h-1.5 rounded-full transition-all"
                    style={{ width: `${tauxMobilisation}%` }}
                  />
                </div>
              </div>

              <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Commissaire :</span>
                  {isVacant ? (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                      <AlertTriangle className="w-3 h-3" />
                      Poste Vacant
                    </span>
                  ) : (
                    <span className="font-bold text-slate-900">{q.commissaire}</span>
                  )}
                </div>
                {!isVacant && q.telephoneCommissaire && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Contact :</span>
                    <span className="font-mono text-slate-900 font-semibold">{q.telephoneCommissaire}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-500 text-[10px]">
                  <span>Coordonnées GPS :</span>
                  <span className="font-mono">{q.centre[0].toFixed(4)}, {q.centre[1].toFixed(4)}</span>
                </div>
              </div>

              {/* Actions CRUD réservées à l'Admin */}
              {isAdmin && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setModalQuartierState({ open: true, quartier: q })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-[#0284c7] hover:bg-sky-50 rounded-lg transition-colors border border-slate-200"
                    title="Modifier les informations ou corriger les fautes de saisie"
                  >
                    <Edit3 className="w-3 h-3 text-[#0284c7]" />
                    <span>Modifier</span>
                  </button>

                  <button
                    onClick={() => {
                      setMessageAlerte(null);
                      setQuartierASupprimer(q);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                    title="Supprimer ce quartier"
                  >
                    <Trash2 className="w-3 h-3 text-rose-600" />
                    <span>Supprimer</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal d'édition / création de quartier */}
      {modalQuartierState.open && (
        <QuartierModal
          quartierInitial={modalQuartierState.quartier}
          communeDefaut={activeCommuneId}
          onSave={handleSaveQuartier}
          onClose={() => setModalQuartierState({ open: false, quartier: null })}
        />
      )}

      {/* Modal de confirmation de suppression */}
      {quartierASupprimer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Supprimer le quartier "{quartierASupprimer.nom}" ?
                </h3>
                <p className="text-xs text-slate-500">
                  Cette action est soumise à la vérification des militants rattachés.
                </p>
              </div>
            </div>

            {messageAlerte ? (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>{messageAlerte}</div>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Êtes-vous certain de vouloir retirer définitivement ce quartier du référentiel territorial de {activeCommune.nom} ?
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setQuartierASupprimer(null);
                  setMessageAlerte(null);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Fermer
              </button>
              {!messageAlerte && (
                <button
                  onClick={handleConfirmerSuppression}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
                >
                  Confirmer la suppression
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
