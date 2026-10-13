import React, { useState } from 'react';
import { Militant, Utilisateur } from '../types';
import { CarteLeaflet } from '../components/CarteLeaflet';
import { COMMUNES_GUEDIAWAYE } from '../data/referentiel';
import { MapPin, Users, Download, Filter } from 'lucide-react';

interface CartePageProps {
  militants: Militant[];
  currentUser: Utilisateur;
  onSelectMilitant: (militant: Militant) => void;
}

export const CartePage: React.FC<CartePageProps> = ({
  militants,
  currentUser,
  onSelectMilitant
}) => {
  const [selectedCommuneId, setSelectedCommuneId] = useState<string>('tous');

  const filteredMilitants = selectedCommuneId === 'tous'
    ? militants
    : militants.filter(m => m.communeId === selectedCommuneId);

  const totalActifs = filteredMilitants.filter(m => m.statut === 'actif').length;

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-3 sm:space-y-4">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Cartographie Stratégique · Département de Guédiawaye
          </h1>
          <p className="text-xs text-slate-700 mt-0.5">
            Projection géographique des effectifs, limites communales et densité de mobilisation
          </p>
        </div>

        {/* Sélecteur de commune */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={selectedCommuneId}
              onChange={e => setSelectedCommuneId(e.target.value)}
              className="bg-transparent text-slate-900 font-semibold focus:outline-none pr-2 py-0.5"
            >
              <option value="tous">Tout le département (5 communes)</option>
              {COMMUNES_GUEDIAWAYE.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
            title="Exporter la carte pour les réunions de section"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Imprimer / Export</span>
          </button>
        </div>
      </div>

      {/* Résumé chiffré au-dessus de la carte */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {COMMUNES_GUEDIAWAYE.map(c => {
          const count = militants.filter(m => m.communeId === c.id).length;
          const isSelected = selectedCommuneId === c.id;

          return (
            <button
              key={c.id}
              onClick={() => setSelectedCommuneId(isSelected ? 'tous' : c.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isSelected 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold truncate">{c.nom}</span>
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                  style={{ backgroundColor: c.couleur }} 
                />
              </div>
              <div className="mt-2 flex items-baseline justify-between text-xs">
                <span className="font-extrabold text-base tabular-nums">{count}</span>
                <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-700'}`}>
                  Obj. {c.objectifMilitants.toLocaleString()}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Carte Leaflet principale avec hauteur adaptée mobile / desktop */}
      <div className="h-[420px] sm:h-[500px] lg:h-[600px] w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200">
        <CarteLeaflet
          militants={filteredMilitants}
          userRole={currentUser.role}
          onSelectMilitant={onSelectMilitant}
          selectedCommuneId={selectedCommuneId}
          onSelectCommune={setSelectedCommuneId}
        />
      </div>
    </div>
  );
};
