import React, { useState, useEffect } from 'react';
import { Militant, Utilisateur } from '../types';
import { COMMUNES_GUEDIAWAYE, QUARTIERS_GUEDIAWAYE } from '../data/referentiel';
import { KiiraayLogo } from '../components/KiiraayLogo';
import { store } from '../services/store';
import { 
  CreditCard, 
  ShieldCheck, 
  MapPin, 
  Navigation, 
  Smartphone, 
  UserPlus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Lock,
  Download,
  Share2,
  Calendar,
  Phone,
  Compass,
  Loader2
} from 'lucide-react';
import L from 'leaflet';

interface EspaceMilitantPageProps {
  militant: Militant;
  currentUser: Utilisateur;
  onOpenCardModal: (militant: Militant) => void;
  onNavigateTab?: (tab: any) => void;
  onOpenInscription?: () => void;
  onOpenInstallModal?: () => void;
}

export const EspaceMilitantPage: React.FC<EspaceMilitantPageProps> = ({
  militant,
  currentUser,
  onOpenCardModal,
  onOpenInscription,
  onOpenInstallModal
}) => {
  const commune = COMMUNES_GUEDIAWAYE.find(c => c.id === militant.communeId);
  const quartier = QUARTIERS_GUEDIAWAYE.find(q => q.id === militant.quartierId);

  // État local de localisation GPS
  const [currentMilitant, setCurrentMilitant] = useState<Militant>(militant);
  const [isUpdatingGps, setIsUpdatingGps] = useState(false);
  const [gpsUpdateMsg, setGpsUpdateMsg] = useState<string | null>(null);

  useEffect(() => {
    setCurrentMilitant(militant);
  }, [militant]);

  // Initialisation de la mini-carte de localisation
  useEffect(() => {
    const mapContainer = document.getElementById('militant-mini-map');
    if (!mapContainer || !currentMilitant.latitude || !currentMilitant.longitude) return;

    // Éviter de réinitialiser Leaflet sur un conteneur déjà initialisé
    if ((mapContainer as any)._leaflet_id) {
      return;
    }

    const map = L.map('militant-mini-map', {
      center: [currentMilitant.latitude, currentMilitant.longitude],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    const customIcon = L.divIcon({
      className: 'custom-militant-marker',
      html: `
        <div style="background-color: #0284c7; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; items-center; justify-content: center; color: white;">
          <svg style="width: 14px; height: 14px; margin: auto;" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    L.marker([currentMilitant.latitude, currentMilitant.longitude], { icon: customIcon })
      .addTo(map)
      .bindPopup(`<b>${currentMilitant.prenom} ${currentMilitant.nom}</b><br/>${quartier?.nom || ''}`)
      .openPopup();

    return () => {
      map.remove();
    };
  }, [currentMilitant.latitude, currentMilitant.longitude, quartier?.nom]);

  const handleUpdateCurrentGps = () => {
    if (!navigator.geolocation) {
      setGpsUpdateMsg("La géolocalisation n'est pas disponible sur votre navigateur.");
      return;
    }

    setIsUpdatingGps(true);
    setGpsUpdateMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy);

        const updated = store.updateMilitant(currentMilitant.id, {
          latitude: lat,
          longitude: lng,
          precisionGps: accuracy,
          sourceGps: 'appareil'
        });

        setIsUpdatingGps(false);
        if (updated) {
          setCurrentMilitant(updated);
          setGpsUpdateMsg(`✅ Position GPS de votre appareil enregistrée avec succès (Précision : ±${accuracy}m).`);
        }
      },
      (err) => {
        setIsUpdatingGps(false);
        setGpsUpdateMsg(`⚠️ Impossible d'obtenir la position GPS (${err.message}). Vérifiez les autorisations de votre appareil.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const getStatutBadge = () => {
    switch (currentMilitant.statut) {
      case 'actif':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Adhésion Validée & Active</span>
          </span>
        );
      case 'en_attente':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="w-3.5 h-3.5" />
            <span>En attente de validation administrative</span>
          </span>
        );
      case 'a_verifier':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Dossier en cours d'instruction</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span>Statut : {currentMilitant.statut}</span>
          </span>
        );
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* 1. Bannière de Bienvenue avec Logo Officiel */}
      <div className="bg-gradient-to-r from-slate-950 via-sky-950 to-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-sky-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 rounded-xl shadow-md shrink-0">
            <KiiraayLogo size="md" variant="emblem-only" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-black tracking-wider">
              <span className="text-sky-400">KIIRAAY</span>
              <span className="text-rose-500 font-black">·</span>
              <span className="text-rose-400">LES PATRIOTES RÉPUBLICAINS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold mt-1">
              Bienvenue, {currentMilitant.prenom} {currentMilitant.nom}
            </h1>
            <p className="text-xs text-sky-200 mt-0.5 font-mono">
              Matricule officiel : <b className="text-white">{currentMilitant.numeroKry}</b> · {commune?.nom} ({quartier?.codeQuartier ? `${quartier.codeQuartier} · ` : ''}{quartier?.nom})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => onOpenCardModal(currentMilitant)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-colors"
          >
            <CreditCard className="w-4 h-4 text-rose-300" />
            <span>Afficher ma Carte Numérique</span>
          </button>
        </div>
      </div>

      {/* 2. Bandeau d'isolation et sécurité de l'espace militant */}
      <div className="p-3.5 bg-sky-50/80 border border-sky-200/90 rounded-xl text-sky-950 text-xs flex items-start gap-3">
        <Lock className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Espace personnel strictement sécurisé et isolé</p>
          <p className="text-[11px] text-sky-900 mt-0.5">
            Sur cet appareil, vous ne pouvez consulter que <b>votre propre espace</b> (carte, coordonnées GPS, statut) et <b>inscrire des adhérents</b>. 
            Toutes les données des autres militants et les outils de gestion départementale demeurent confidentiels et inaccessibles.
          </p>
        </div>
      </div>

      {/* 3. Carte d'adhésion & Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Colonne gauche : Statut et informations */}
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Fiche d'Adhérent Républicain
              </h2>
            </div>
            {getStatutBadge()}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">État Civil</span>
              <p className="text-slate-900">Nom : <b>{currentMilitant.prenom} {currentMilitant.nom}</b></p>
              <p className="text-slate-700">Genre : <b>{currentMilitant.sexe === 'F' ? 'Féminin' : 'Masculin'}</b></p>
              <p className="text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Né(e) le : <b>{currentMilitant.dateNaissance}</b></span>
              </p>
              {currentMilitant.cni && (
                <p className="text-slate-700 font-mono">CNI : <b>{currentMilitant.cni}</b></p>
              )}
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Contact & Rôle</span>
              <p className="text-slate-900 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-sky-700" />
                <span className="font-mono font-bold">{currentMilitant.telephone}</span>
              </p>
              <p className="text-slate-700">Date adhésion : <b>{currentMilitant.dateAdhesion}</b></p>
              <p className="text-slate-700">Rôle : <b className="text-sky-800">{currentMilitant.fonctionParti || 'Militant de base'}</b></p>
              <p className="text-slate-700">Mode collecte : <b>{currentMilitant.sourceCollecte}</b></p>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Rattachement Territorial Guédiawaye</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <p className="text-slate-700">Commune : <b className="text-slate-900">{commune?.nom}</b></p>
                <p className="text-slate-700">Coordonnateur communal : <b>{commune?.coordonnateur}</b></p>
              </div>
              <div>
                <p className="text-slate-700">Quartier : <b className="text-slate-900">{quartier?.codeQuartier ? `[${quartier.codeQuartier}] ` : ''}{quartier?.nom}</b></p>
                <p className="text-slate-700">Commissaire de quartier : <b>{quartier?.commissaire || 'Non pourvu'}</b></p>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite : Actions de l'application sur smartphone/tablette */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-sky-700" />
              <span>Actions Mobiles</span>
            </h3>

            {onOpenInscription && (
              <button
                type="button"
                onClick={onOpenInscription}
                className="w-full py-2.5 px-3 font-bold text-xs text-white bg-sky-700 hover:bg-sky-800 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4 text-rose-300" />
                <span>Inscrire un militant (Cellule)</span>
              </button>
            )}

            {onOpenInstallModal && (
              <button
                type="button"
                onClick={onOpenInstallModal}
                className="w-full py-2.5 px-3 font-bold text-xs text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-sky-700" />
                <span>Installer sur Téléphone / Tablette</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenCardModal(currentMilitant)}
              className="w-full py-2.5 px-3 font-bold text-xs text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4 text-sky-700" />
              <span>Partager ma carte d'adhérent</span>
            </button>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-4 shadow-2xs space-y-2 text-xs">
            <p className="font-bold text-sky-300 flex items-center gap-1.5">
              <span>Permanence KIIRAAY Guédiawaye</span>
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Pour toute question sur votre carte ou votre inscription électorale, contactez le coordonnateur de {commune?.nom || 'Guédiawaye'}.
            </p>
            <div className="pt-1 text-[11px] font-mono text-white">
              Tél : {commune?.telephoneCoordonnateur || '+221 77 123 45 67'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Section Géolocalisation GPS & Carte interactive */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Coordonnées GPS de Mobilisation
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUpdatingGps}
              onClick={handleUpdateCurrentGps}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 disabled:bg-slate-400 rounded-lg shadow-2xs transition-colors"
            >
              {isUpdatingGps ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Capture satellite en cours...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5 text-rose-300" />
                  <span>📍 Mettre à jour avec la position actuelle</span>
                </>
              )}
            </button>
          </div>
        </div>

        {gpsUpdateMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-medium">
            {gpsUpdateMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Latitude GPS :</span>
                <span className="font-mono font-bold text-slate-900">
                  {currentMilitant.latitude ? currentMilitant.latitude.toFixed(6) : 'Non renseignée'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Longitude GPS :</span>
                <span className="font-mono font-bold text-slate-900">
                  {currentMilitant.longitude ? currentMilitant.longitude.toFixed(6) : 'Non renseignée'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Source :</span>
                <span className="font-semibold text-sky-700">
                  {currentMilitant.sourceGps === 'appareil' ? 'GPS de l’appareil' : 'Centre du quartier'}
                </span>
              </div>
              {currentMilitant.precisionGps && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Précision du capteur :</span>
                  <span className="font-semibold text-emerald-700">±{currentMilitant.precisionGps} mètres</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              La géolocalisation GPS est optionnelle. Elle permet au parti d'organiser au plus près les cellules de proximité et les équipes de porte-à-porte au sein de votre quartier.
            </p>
          </div>

          {/* Mini-carte Leaflet de la position */}
          <div className="overflow-hidden rounded-xl border border-slate-200 h-48 sm:h-56 relative bg-slate-100">
            {currentMilitant.latitude && currentMilitant.longitude ? (
              <div id="militant-mini-map" className="w-full h-full z-10" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center text-slate-500 text-xs">
                <MapPin className="w-8 h-8 text-slate-300 mb-2" />
                <span>Aucune coordonnée GPS enregistrée. Cliquez sur « Mettre à jour avec la position actuelle » pour vous localiser.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
