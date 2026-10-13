import React, { useState } from 'react';
import { Militant, Sexe } from '../types';
import { COMMUNES_GUEDIAWAYE, QUARTIERS_GUEDIAWAYE } from '../data/referentiel';
import { KiiraayLogo } from './KiiraayLogo';
import { 
  X, 
  CheckCircle2, 
  UserPlus, 
  ShieldCheck, 
  MapPin, 
  Navigation, 
  RotateCcw, 
  ArrowRight,
  Loader2,
  Sparkles
} from 'lucide-react';

interface InscriptionMilitantModalProps {
  quartiers: typeof QUARTIERS_GUEDIAWAYE;
  onInscrire: (data: any) => Militant;
  onClose: () => void;
  onAccessEspace?: (militant: Militant) => void;
}

export const InscriptionMilitantModal: React.FC<InscriptionMilitantModalProps> = ({
  quartiers,
  onInscrire,
  onClose,
  onAccessEspace
}) => {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [sexe, setSexe] = useState<Sexe>('M');
  const [dateNaissance, setDateNaissance] = useState('2000-01-01');
  const [telephone, setTelephone] = useState('+221 77 ');
  const [email, setEmail] = useState('');
  const [cni, setCni] = useState('');
  
  const [communeId, setCommuneId] = useState('golf-sud');
  const [quartierId, setQuartierId] = useState(
    quartiers.find(q => q.communeId === 'golf-sud')?.id || 'gs-01'
  );
  const [adresse, setAdresse] = useState('');
  const [repere, setRepere] = useState('');
  
  // Coordonnées GPS optionnelles utilisant la position de l'appareil
  const [gpsLatitude, setGpsLatitude] = useState<string>('');
  const [gpsLongitude, setGpsLongitude] = useState<string>('');
  const [gpsPrecision, setGpsPrecision] = useState<number | null>(null);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'none' | 'success' | 'error'>('none');
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string>('');
  const [sourceGps, setSourceGps] = useState<'appareil' | 'quartier_referentiel' | 'manuel'>('quartier_referentiel');

  const [consentement, setConsentement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [militantInscrit, setMilitantInscrit] = useState<Militant | null>(null);

  const quartiersDisponibles = quartiers.filter(q => q.communeId === communeId);

  const handleCommuneChange = (nouvelleCommune: string) => {
    setCommuneId(nouvelleCommune);
    const qList = quartiers.filter(q => q.communeId === nouvelleCommune);
    if (qList.length > 0) {
      setQuartierId(qList[0].id);
    }
  };

  // Détection de la position de l'appareil via HTML5 Geolocation API
  const handleDetectDeviceGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsErrorMessage("La géolocalisation n'est pas prise en charge par ce navigateur.");
      return;
    }

    setIsLocatingGps(true);
    setGpsStatus('none');
    setGpsErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);

        setGpsLatitude(lat.toFixed(6));
        setGpsLongitude(lng.toFixed(6));
        setGpsPrecision(accuracy);
        setSourceGps('appareil');
        setGpsStatus('success');
        setIsLocatingGps(false);
      },
      (err) => {
        setIsLocatingGps(false);
        setGpsStatus('error');
        if (err.code === err.PERMISSION_DENIED) {
          setGpsErrorMessage("Autorisation de localisation refusée. Vous pouvez renseigner vos coordonnées manuellement ou laisser vide.");
        } else if (err.code === err.TIMEOUT) {
          setGpsErrorMessage("Délai de localisation dépassé. Veuillez réessayer ou laisser vide.");
        } else {
          setGpsErrorMessage("Impossible de déterminer la position actuelle (" + err.message + ").");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleResetGps = () => {
    setGpsLatitude('');
    setGpsLongitude('');
    setGpsPrecision(null);
    setGpsStatus('none');
    setGpsErrorMessage('');
    setSourceGps('quartier_referentiel');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    if (!prenom.trim() || !nom.trim()) {
      setErreur('Le prénom et le nom sont obligatoires.');
      return;
    }

    if (!telephone.trim() || telephone.length < 9) {
      setErreur('Un numéro de téléphone sénégalais valide est obligatoire.');
      return;
    }

    // Vérification de la majorité électorale (18 ans révolus)
    const anneeNaiss = new Date(dateNaissance).getFullYear();
    const age = 2026 - anneeNaiss;
    if (age < 18) {
      setErreur('L’adhésion à KIIRAAY requiert d’avoir au moins 18 ans révolus.');
      return;
    }

    if (cni && cni.replace(/\s+/g, '').length !== 13) {
      setErreur('Le numéro de Carte Nationale d’Identité (CNI) doit comporter 13 chiffres.');
      return;
    }

    if (!consentement) {
      setErreur('Vous devez accepter le traitement de vos coordonnées conformément à la loi sénégalaise 2008-12.');
      return;
    }

    const q = quartiers.find(item => item.id === quartierId);

    // Détermination de la latitude et longitude finales
    let finalLat: number;
    let finalLng: number;
    let finalSource: 'appareil' | 'quartier_referentiel' | 'manuel' = sourceGps;

    if (gpsLatitude && gpsLongitude && !isNaN(Number(gpsLatitude)) && !isNaN(Number(gpsLongitude))) {
      finalLat = Number(gpsLatitude);
      finalLng = Number(gpsLongitude);
    } else {
      // Coordonnées par défaut du quartier officiel dans le référentiel de Guédiawaye
      finalLat = q ? q.centre[0] : 14.7735;
      finalLng = q ? q.centre[1] : -17.3941;
      finalSource = 'quartier_referentiel';
    }

    const nouveau = onInscrire({
      prenom: prenom.trim(),
      nom: nom.trim(),
      sexe,
      dateNaissance,
      telephone: telephone.trim(),
      email: email.trim() || undefined,
      cni: cni.trim() || undefined,
      communeId,
      quartierId,
      adresse: adresse.trim() || (q ? `Quartier ${q.nom}` : `Quartier ${quartierId}`),
      repere: repere.trim() || 'Domicile principal',
      latitude: finalLat,
      longitude: finalLng,
      precisionGps: gpsPrecision ?? undefined,
      sourceGps: finalSource,
      sourceCollecte: 'Auto-inscription citoyenne en ligne',
      fonctionParti: 'Militant de base',
      personneInformee: true,
      dateAdhesion: new Date().toISOString().split('T')[0]
    });

    setMilitantInscrit(nouveau);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 my-auto text-slate-900">
        {/* Header avec Logo KIIRAAY */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KiiraayLogo size="sm" variant="emblem-only" />
            <div>
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                Adhésion Militante · Guédiawaye 2027
              </h3>
              <p className="text-[11px] text-slate-600">
                Formulaire d'auto-inscription citoyenne
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {militantInscrit ? (
          /* Écran de confirmation de l'adhésion avec accès direct à l'espace militant */
          <div className="p-4 sm:p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto border border-sky-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900">
                Demande d'adhésion enregistrée avec succès !
              </h4>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                Bienvenue dans les rangs des Patriotes Républicains de Guédiawaye. Votre dossier a été créé avec succès.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Numéro de dossier KRY :</span>
                <span className="font-mono font-bold text-sky-700">{militantInscrit.numeroKry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Militant(e) :</span>
                <span className="font-semibold text-slate-900">{militantInscrit.prenom} {militantInscrit.nom}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Rattachement :</span>
                <span className="font-semibold text-slate-900">
                  {COMMUNES_GUEDIAWAYE.find(c => c.id === militantInscrit.communeId)?.nom || militantInscrit.communeId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Quartier :</span>
                <span className="font-semibold text-slate-900">
                  {quartiers.find(q => q.id === militantInscrit.quartierId)?.nom || militantInscrit.quartierId}
                </span>
              </div>
              {/* Coordonnées GPS capturées */}
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" />
                  <span>Coordonnées GPS :</span>
                </span>
                <span className="font-mono text-[11px] font-semibold text-slate-800">
                  {militantInscrit.latitude.toFixed(5)}°, {militantInscrit.longitude.toFixed(5)}°
                  {militantInscrit.sourceGps === 'appareil' && (
                    <span className="ml-1 text-[10px] text-emerald-700 font-sans font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                      GPS Appareil
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Statut initial :</span>
                <span className="font-semibold text-sky-700">En attente de validation</span>
              </div>
            </div>

            <div className="p-3 bg-sky-50/60 rounded-lg border border-sky-200/80 text-[11px] text-sky-900 text-left flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <span>
                <b>Accès réservé et protégé :</b> Sur votre téléphone ou tablette, vous pouvez consulter votre Espace Militant avec votre carte officielle et vos informations personnelles à tout moment.
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {onAccessEspace && (
                <button
                  type="button"
                  onClick={() => {
                    onAccessEspace(militantInscrit);
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 font-bold text-xs text-white bg-sky-700 hover:bg-sky-800 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 transform active:scale-98"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Accéder directement à mon Espace Militant</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 px-4 font-semibold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          /* Formulaire de saisie */
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
            {erreur && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium">
                {erreur}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Prénom *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Babacar"
                  value={prenom}
                  onChange={e => setPrenom(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nom *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ndiaye"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Genre *</label>
                <select
                  value={sexe}
                  onChange={e => setSexe(e.target.value as Sexe)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600"
                >
                  <option value="M">Masculin (H)</option>
                  <option value="F">Féminin (F)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Date de naissance *</label>
                <input
                  type="date"
                  required
                  value={dateNaissance}
                  onChange={e => setDateNaissance(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Téléphone mobile (+221) *</label>
                <input
                  type="tel"
                  required
                  placeholder="+221 77 123 45 67"
                  value={telephone}
                  onChange={e => setTelephone(e.target.value)}
                  className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">CNI (13 chiffres, optionnel)</label>
                <input
                  type="text"
                  maxLength={13}
                  placeholder="Ex: 1752200001234"
                  value={cni}
                  onChange={e => setCni(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Email (optionnel)</label>
              <input
                type="email"
                placeholder="Ex: militant@exemple.sn"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Commune de résidence *</label>
                <select
                  value={communeId}
                  onChange={e => handleCommuneChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-600"
                >
                  {COMMUNES_GUEDIAWAYE.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Quartier *</label>
                <select
                  value={quartierId}
                  onChange={e => setQuartierId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600"
                >
                  {quartiersDisponibles.map(q => (
                    <option key={q.id} value={q.id}>
                      {q.codeQuartier ? `${q.codeQuartier} — ` : ''}{q.nom}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Adresse ou repère de proximité</label>
              <input
                type="text"
                placeholder="Ex: Près du marché, face à la mosquée..."
                value={repere}
                onChange={e => setRepere(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            {/* SECTION COORDONNÉES GPS DE L'APPAREIL (OPTIONNEL) */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sky-700" />
                  <span className="font-bold text-slate-900 text-xs">
                    Coordonnées GPS de l'appareil
                  </span>
                </div>
                <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                  Optionnel (pas obligatoire)
                </span>
              </div>

              <p className="text-[11px] text-slate-600">
                Vous pouvez enregistrer les coordonnées exactes (latitude / longitude) de votre téléphone ou tablette pour situer votre localisation dans votre quartier.
              </p>

              {/* Bouton de capture GPS via l'appareil */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDetectDeviceGps}
                  disabled={isLocatingGps}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 disabled:bg-slate-400 rounded-lg shadow-xs transition-colors"
                >
                  {isLocatingGps ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Capture du signal satellite GPS...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5 text-rose-300" />
                      <span>📍 Utiliser la position de cet appareil</span>
                    </>
                  )}
                </button>

                {(gpsLatitude || gpsStatus !== 'none') && (
                  <button
                    type="button"
                    onClick={handleResetGps}
                    className="inline-flex items-center gap-1 px-2.5 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Réinitialiser</span>
                  </button>
                )}
              </div>

              {/* Message de succès ou d'erreur */}
              {gpsStatus === 'success' && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-[11px] flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Position de l'appareil capturée avec succès !</span>
                    <div className="font-mono text-[10px] mt-0.5 text-emerald-800">
                      Latitude : <b>{gpsLatitude}</b> · Longitude : <b>{gpsLongitude}</b>
                      {gpsPrecision && ` (Précision : ±${gpsPrecision} m)`}
                    </div>
                  </div>
                </div>
              )}

              {gpsStatus === 'error' && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
                  <span>{gpsErrorMessage}</span>
                </div>
              )}

              {/* Champs latitude / longitude éditables */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Latitude (ex: 14.7735)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="14.7735"
                    value={gpsLatitude}
                    onChange={e => {
                      setGpsLatitude(e.target.value);
                      setSourceGps('manuel');
                    }}
                    className="w-full px-2.5 py-1.5 font-mono text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Longitude (ex: -17.4082)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="-17.4082"
                    value={gpsLongitude}
                    onChange={e => {
                      setGpsLongitude(e.target.value);
                      setSourceGps('manuel');
                    }}
                    className="w-full px-2.5 py-1.5 font-mono text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-600 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentement}
                  onChange={e => setConsentement(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
                />
                <span className="text-[11px] text-slate-600">
                  Je confirme mon souhait d'adhérer au parti KIIRAAY — Les Patriotes Républicains pour Guédiawaye 2027 et consens au traitement de mes coordonnées selon la loi sénégalaise 2008-12.
                </span>
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-lg shadow-sm transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-rose-300" />
                <span>Soumettre mon adhésion</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
