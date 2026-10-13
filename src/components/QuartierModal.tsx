import React, { useState } from 'react';
import { Quartier } from '../types';
import { COMMUNES_GUEDIAWAYE } from '../data/referentiel';
import { X, Save, MapPin } from 'lucide-react';

interface QuartierModalProps {
  quartierInitial?: Quartier | null;
  communeDefaut?: string;
  onSave: (data: Omit<Quartier, 'id'>) => void;
  onClose: () => void;
}

export const QuartierModal: React.FC<QuartierModalProps> = ({
  quartierInitial,
  communeDefaut = 'golf-sud',
  onSave,
  onClose
}) => {
  const isEdit = !!quartierInitial;

  const [communeId, setCommuneId] = useState(quartierInitial?.communeId || communeDefaut);
  const [nom, setNom] = useState(quartierInitial?.nom || '');
  const [commissaire, setCommissaire] = useState(quartierInitial?.commissaire || '');
  const [telephoneCommissaire, setTelephoneCommissaire] = useState(quartierInitial?.telephoneCommissaire || '');
  const [superviseur, setSuperviseur] = useState(quartierInitial?.superviseur || 'Coordination Communale');
  const [objectif, setObjectif] = useState<number>(quartierInitial?.objectif || 1500);
  const [lat, setLat] = useState<number>(quartierInitial?.centre[0] || 14.7735);
  const [lng, setLng] = useState<number>(quartierInitial?.centre[1] || -17.3941);

  const [erreur, setErreur] = useState<string | null>(null);

  const handleCommuneChange = (nouvelleCommune: string) => {
    setCommuneId(nouvelleCommune);
    const c = COMMUNES_GUEDIAWAYE.find(item => item.id === nouvelleCommune);
    if (c) {
      setLat(c.centre[0]);
      setLng(c.centre[1]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    if (!nom.trim()) {
      setErreur('Le nom du quartier est obligatoire.');
      return;
    }

    if (objectif <= 0) {
      setErreur("L'objectif de mobilisation doit être supérieur à zéro.");
      return;
    }

    onSave({
      communeId,
      nom: nom.trim(),
      commissaire: commissaire.trim() || 'Non pourvu',
      telephoneCommissaire: telephoneCommissaire.trim(),
      superviseur: superviseur.trim() || 'Coordination Communale',
      centre: [Number(lat), Number(lng)],
      objectif: Number(objectif)
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 my-auto">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
              {isEdit ? `Modifier le quartier "${quartierInitial.nom}"` : 'Créer un nouveau quartier'}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-600">
              Département de Guédiawaye · Gestion administrative territoriale
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {erreur && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium">
              {erreur}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Commune de rattachement *</label>
            <select
              value={communeId}
              onChange={e => handleCommuneChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-600"
            >
              {COMMUNES_GUEDIAWAYE.map(c => (
                <option key={c.id} value={c.id}>{c.nom} ({c.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Nom du quartier *</label>
            <input
              type="text"
              required
              placeholder="Ex: Hamo 7 Extension, Cité APIX 2, ..."
              value={nom}
              onChange={e => setNom(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Commissaire de quartier</label>
              <input
                type="text"
                placeholder="Laisser vide si non pourvu"
                value={commissaire}
                onChange={e => setCommissaire(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Téléphone commissaire</label>
              <input
                type="text"
                placeholder="+221 77 000 00 00"
                value={telephoneCommissaire}
                onChange={e => setTelephoneCommissaire(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Superviseur de zone</label>
              <input
                type="text"
                value={superviseur}
                onChange={e => setSuperviseur(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Objectif de mobilisation (militants) *</label>
              <input
                type="number"
                required
                min={100}
                max={20000}
                value={objectif}
                onChange={e => setObjectif(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
          </div>

          {/* Coordonnées géographiques */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-600" />
              <span>Coordonnées GPS du quartier (Centrage cartographique)</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-600 block">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={e => setLat(parseFloat(e.target.value))}
                  className="w-full px-2 py-1 font-mono rounded border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={e => setLng(parseFloat(e.target.value))}
                  className="w-full px-2 py-1 font-mono rounded border border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isEdit ? 'Enregistrer les modifications' : 'Créer le quartier'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
