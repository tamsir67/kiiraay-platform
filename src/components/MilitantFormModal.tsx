import React, { useState } from 'react';
import { Militant, Sexe, StatutMilitant } from '../types';
import { COMMUNES_GUEDIAWAYE, SOURCES_COLLECTE, FONCTIONS_PARTI } from '../data/referentiel';
import { store } from '../services/store';
import { X, Save, MapPin } from 'lucide-react';

interface MilitantFormModalProps {
  militantInitial?: Militant | null;
  onSave: (data: any) => void;
  onClose: () => void;
}

export const MilitantFormModal: React.FC<MilitantFormModalProps> = ({
  militantInitial,
  onSave,
  onClose
}) => {
  const isEdit = !!militantInitial;

  const [prenom, setPrenom] = useState(militantInitial?.prenom || '');
  const [nom, setNom] = useState(militantInitial?.nom || '');
  const [sexe, setSexe] = useState<Sexe>(militantInitial?.sexe || 'M');
  const [dateNaissance, setDateNaissance] = useState(militantInitial?.dateNaissance || '1995-01-01');
  const [telephone, setTelephone] = useState(militantInitial?.telephone || '+221 77 ');
  const [email, setEmail] = useState(militantInitial?.email || '');
  const [cni, setCni] = useState(militantInitial?.cni || '');
  
  const [communeId, setCommuneId] = useState(militantInitial?.communeId || 'golf-sud');
  const [quartierId, setQuartierId] = useState(militantInitial?.quartierId || 'glf-hamo-1');
  const [adresse, setAdresse] = useState(militantInitial?.adresse || '');
  const [repere, setRepere] = useState(militantInitial?.repere || '');
  const [latitude, setLatitude] = useState<number>(militantInitial?.latitude || 14.7785);
  const [longitude, setLongitude] = useState<number>(militantInitial?.longitude || -17.4082);
  const [precisionGps, setPrecisionGps] = useState<number | undefined>(militantInitial?.precisionGps);
  const [sourceGps, setSourceGps] = useState<'appareil' | 'quartier_referentiel' | 'manuel'>(militantInitial?.sourceGps || 'quartier_referentiel');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);

  const [statut, setStatut] = useState<StatutMilitant>(militantInitial?.statut || 'actif');
  const [sourceCollecte, setSourceCollecte] = useState(militantInitial?.sourceCollecte || SOURCES_COLLECTE[0]);
  const [fonctionParti, setFonctionParti] = useState(militantInitial?.fonctionParti || FONCTIONS_PARTI[0]);
  const [personneInformee, setPersonneInformee] = useState(militantInitial ? militantInitial.personneInformee : true);

  const [erreur, setErreur] = useState<string | null>(null);

  // Mettre à jour le quartier par défaut lors du changement de commune
  const handleCommuneChange = (nouvelleCommuneId: string) => {
    setCommuneId(nouvelleCommuneId);
    const quartiersFiltres = store.getQuartiers(nouvelleCommuneId);
    if (quartiersFiltres.length > 0) {
      setQuartierId(quartiersFiltres[0].id);
      setLatitude(quartiersFiltres[0].centre[0]);
      setLongitude(quartiersFiltres[0].centre[1]);
    }
  };

  const handleQuartierChange = (nouveauQuartierId: string) => {
    setQuartierId(nouveauQuartierId);
    const q = store.getQuartierById(nouveauQuartierId);
    if (q) {
      setLatitude(q.centre[0]);
      setLongitude(q.centre[1]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    if (!prenom.trim() || !nom.trim()) {
      setErreur('Le prénom et le nom sont obligatoires.');
      return;
    }

    if (!telephone.trim() || telephone.length < 9) {
      setErreur('Un numéro de téléphone valide est obligatoire.');
      return;
    }

    if (cni && cni.trim() !== '' && cni.replace(/\s+/g, '').length !== 13) {
      setErreur('Le numéro de carte d’identité (CNI) doit comporter exactement 13 chiffres.');
      return;
    }

    const payload = {
      prenom: prenom.trim(),
      nom: nom.trim(),
      sexe,
      dateNaissance,
      telephone: telephone.trim(),
      email: email.trim() || undefined,
      cni: cni.trim() || undefined,
      communeId,
      quartierId,
      adresse: adresse.trim() || `Quartier ${quartierId}`,
      repere: repere.trim() || 'À proximité de la grande rue',
      latitude: Number(latitude) || 0,
      longitude: Number(longitude) || 0,
      precisionGps: precisionGps ?? undefined,
      sourceGps,
      statut,
      sourceCollecte,
      fonctionParti,
      personneInformee,
      dateAdhesion: militantInitial?.dateAdhesion || new Date().toISOString().split('T')[0]
    };

    onSave(payload);
  };

  const quartiersDisponibles = store.getQuartiers(communeId);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
              {isEdit ? `Modifier la fiche ${militantInitial.numeroKry}` : 'Nouveau Militant KIIRAAY'}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-700">
              Département de Guédiawaye · Fiche individuelle sécurisée
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {erreur && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
              {erreur}
            </div>
          )}

          {/* Section 1 : État civil */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b border-slate-100 pb-1">
              1. Identité & État Civil
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Prénom(s) *</label>
                <input
                  type="text"
                  required
                  value={prenom}
                  onChange={e => setPrenom(e.target.value)}
                  placeholder="Ex: Ibrahima"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom de famille *</label>
                <input
                  type="text"
                  required
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  placeholder="Ex: Ndiaye"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Genre *</label>
                <select
                  value={sexe}
                  onChange={e => setSexe(e.target.value as Sexe)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                >
                  <option value="M">Masculin (H)</option>
                  <option value="F">Féminin (F)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date de naissance *</label>
                <input
                  type="date"
                  required
                  value={dateNaissance}
                  onChange={e => setDateNaissance(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  N° de Carte Nationale d'Identité (CNI - 13 chiffres)
                </label>
                <input
                  type="text"
                  maxLength={13}
                  value={cni}
                  onChange={e => setCni(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 1752199804128"
                  className="w-full text-xs px-3 py-2 font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                />
                <span className="text-[10px] text-slate-700 mt-1 block">
                  Chiffré en base de données AES-256 conformément aux exigences du CDC.
                </span>
              </div>
            </div>
          </div>

          {/* Section 2 : Contact & Localisation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b border-slate-100 pb-1">
              2. Coordonnées & Rattachement Territorial
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Téléphone *</label>
                <input
                  type="text"
                  required
                  value={telephone}
                  onChange={e => setTelephone(e.target.value)}
                  placeholder="+221 77 000 00 00"
                  className="w-full text-xs px-3 py-2 font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email (facultatif)</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contact@exemple.sn"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Commune *</label>
                <select
                  value={communeId}
                  onChange={e => handleCommuneChange(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800 font-semibold"
                >
                  {COMMUNES_GUEDIAWAYE.map(c => (
                    <option key={c.id} value={c.id}>{c.nom} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Quartier *</label>
                <select
                  value={quartierId}
                  onChange={e => handleQuartierChange(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                >
                  {quartiersDisponibles.map(q => (
                    <option key={q.id} value={q.id}>{q.nom}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Adresse précise</label>
                <input
                  type="text"
                  value={adresse}
                  onChange={e => setAdresse(e.target.value)}
                  placeholder="Ex: Villa N° 45, Rue 12"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Repère visuel de proximité</label>
                <input
                  type="text"
                  value={repere}
                  onChange={e => setRepere(e.target.value)}
                  placeholder="Ex: En face Mosquée Thierno, près du terrain de basket"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                />
              </div>

              <div className="md:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-700" />
                    Coordonnées GPS géographiques
                  </span>
                  <span className="text-[10px] text-slate-600 font-medium">Optionnel</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-700 mb-0.5">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={latitude}
                      onChange={e => {
                        setLatitude(parseFloat(e.target.value) || 0);
                        setSourceGps('manuel');
                      }}
                      className="w-full text-xs px-3 py-1.5 font-mono rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-700 mb-0.5">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={longitude}
                      onChange={e => {
                        setLongitude(parseFloat(e.target.value) || 0);
                        setSourceGps('manuel');
                      }}
                      className="w-full text-xs px-3 py-1.5 font-mono rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>

                {gpsMsg && (
                  <p className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    {gpsMsg}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isLocating}
                    onClick={() => {
                      if (!navigator.geolocation) {
                        setGpsMsg("La géolocalisation n'est pas disponible sur ce navigateur.");
                        return;
                      }
                      setIsLocating(true);
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setIsLocating(false);
                          setLatitude(Number(pos.coords.latitude.toFixed(6)));
                          setLongitude(Number(pos.coords.longitude.toFixed(6)));
                          setPrecisionGps(Math.round(pos.coords.accuracy));
                          setSourceGps('appareil');
                          setGpsMsg(`Position de l'appareil capturée : ±${Math.round(pos.coords.accuracy)}m de précision`);
                        },
                        (err) => {
                          setIsLocating(false);
                          setGpsMsg(`Erreur GPS : ${err.message}`);
                        },
                        { enableHighAccuracy: true, timeout: 10000 }
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 disabled:bg-slate-400 rounded-lg shadow-2xs transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-300" />
                    <span>{isLocating ? 'Capture GPS...' : '📍 Capturer la position de cet appareil'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const q = store.getQuartierById(quartierId);
                      if (q) {
                        setLatitude(q.centre[0]);
                        setLongitude(q.centre[1]);
                        setSourceGps('quartier_referentiel');
                        setPrecisionGps(undefined);
                        setGpsMsg(`Coordonnées réinitialisées au centre du quartier ${q.nom}`);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                  >
                    <span>Centrer sur quartier</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 : Rôle & Consentement */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b border-slate-100 pb-1">
              3. Mobilisation & Consentement
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Source de collecte</label>
                <select
                  value={sourceCollecte}
                  onChange={e => setSourceCollecte(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                >
                  {SOURCES_COLLECTE.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Fonction au sein du parti</label>
                <select
                  value={fonctionParti}
                  onChange={e => setFonctionParti(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                >
                  {FONCTIONS_PARTI.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Statut initial de la fiche</label>
                <select
                  value={statut}
                  onChange={e => setStatut(e.target.value as StatutMilitant)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                >
                  <option value="actif">Actif (Dossier complet)</option>
                  <option value="en_attente">En attente de validation</option>
                  <option value="a_verifier">À vérifier</option>
                  <option value="desactive">Désactivé</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={personneInformee}
                    onChange={e => setPersonneInformee(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
                  />
                  <span className="text-xs text-slate-800 font-medium">
                    Personne informée de l’enregistrement (Loi 2008-12)
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isEdit ? 'Enregistrer les modifications' : 'Créer le militant'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
