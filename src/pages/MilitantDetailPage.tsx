import React, { useState } from 'react';
import { Militant, Utilisateur, StatutMilitant } from '../types';
import { COMMUNES_GUEDIAWAYE, QUARTIERS_GUEDIAWAYE, PERMISSIONS_PAR_ROLE, MOTIFS_DESACTIVATION } from '../data/referentiel';
import { maskTelephone, maskCni } from '../services/crypto';
import { 
  ArrowLeft, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  RotateCcw, 
  AlertCircle,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Shield,
  Clock,
  History,
  FileText,
  Trash2
} from 'lucide-react';

interface MilitantDetailPageProps {
  militant: Militant;
  currentUser: Utilisateur;
  onBack: () => void;
  onEdit: (militant: Militant) => void;
  onOpenCardModal: (militant: Militant) => void;
  onChangeStatut: (id: string, statut: StatutMilitant, motif?: string) => void;
  onDelivrerCarte: (id: string) => void;
  onDelete?: (id: string) => void;
  historique: any[];
}

export const MilitantDetailPage: React.FC<MilitantDetailPageProps> = ({
  militant,
  currentUser,
  onBack,
  onEdit,
  onOpenCardModal,
  onChangeStatut,
  onDelivrerCarte,
  onDelete,
  historique
}) => {
  const [modalDesactivation, setModalDesactivation] = useState(false);
  const [motifDesactivation, setMotifDesactivation] = useState(MOTIFS_DESACTIVATION[0]);
  const [motifAutre, setMotifAutre] = useState('');
  const [modalSuppression, setModalSuppression] = useState(false);

  const permissions = PERMISSIONS_PAR_ROLE[currentUser.role];
  const isDecideur = currentUser.role === 'decideur';
  const isAdmin = currentUser.role === 'admin';

  const commune = COMMUNES_GUEDIAWAYE.find(c => c.id === militant.communeId);
  const quartier = QUARTIERS_GUEDIAWAYE.find(q => q.id === militant.quartierId);

  const handleConfirmerDesactivation = () => {
    const motifFinal = motifDesactivation === 'Autre (préciser)' ? motifAutre : motifDesactivation;
    onChangeStatut(militant.id, 'desactive', motifFinal);
    setModalDesactivation(false);
  };

  const handleConfirmerSuppression = () => {
    if (onDelete) {
      onDelete(militant.id);
      onBack();
    }
  };

  const telephoneAfficher = isDecideur ? maskTelephone(militant.telephone) : militant.telephone;
  const cniAfficher = isDecideur ? '••••••••' : (militant.cni ? maskCni(militant.cni) : 'Non renseigné');

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Bouton retour et barre d'actions principales */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la liste des militants</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {militant.statut === 'actif' && (
            <button
              onClick={() => onOpenCardModal(militant)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0284c7] bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5 text-rose-500" />
              <span>{militant.carteDelivree ? 'Voir la carte officielle' : 'Émettre la carte officielle'}</span>
            </button>
          )}

          {permissions.peutValider && militant.statut !== 'actif' && (
            <button
              onClick={() => {
                onChangeStatut(militant.id, 'actif');
                onDelivrerCarte(militant.id);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Valider le dossier</span>
            </button>
          )}

          {permissions.peutValider && militant.statut !== 'a_verifier' && (
            <button
              onClick={() => onChangeStatut(militant.id, 'a_verifier')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Marquer à vérifier</span>
            </button>
          )}

          {permissions.peutDesactiver && militant.statut !== 'desactive' && (
            <button
              onClick={() => setModalDesactivation(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Désactiver la fiche</span>
            </button>
          )}

          {permissions.peutDesactiver && militant.statut === 'desactive' && (
            <button
              onClick={() => onChangeStatut(militant.id, 'actif')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réactiver la fiche</span>
            </button>
          )}

          {permissions.peutEcrire && (
            <button
              onClick={() => onEdit(militant)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-2xs transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>Modifier</span>
            </button>
          )}

          {isAdmin && onDelete && (
            <button
              onClick={() => setModalSuppression(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 shadow-2xs transition-colors"
              title="Suppression définitive de la fiche (correction erreur saisie)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Supprimer</span>
            </button>
          )}
        </div>
      </div>

      {/* Bannière de contrôle pour les inscriptions en attente */}
      {militant.statut === 'en_attente' && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">Demande d'adhésion en ligne en attente de validation</h4>
              <p className="text-[11px] text-amber-800">
                Ce militant s'est inscrit via le formulaire citoyen. Vérifiez les informations ci-dessous (identité, téléphone, quartier) et validez pour émettre sa carte officielle KIIRAAY.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                onChangeStatut(militant.id, 'actif');
                onDelivrerCarte(militant.id);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all"
            >
              Valider & Délivrer la carte
            </button>
          </div>
        </div>
      )}

      {/* Carte d'identité principale */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0284c7] to-[#0369a1] text-white flex items-center justify-center font-black text-xl shrink-0 shadow-md">
              {militant.prenom[0]}{militant.nom[0]}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {militant.prenom} {militant.nom}
                </h1>
                {militant.statut === 'actif' && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Actif
                  </span>
                )}
                {militant.statut === 'en_attente' && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                    En attente de validation
                  </span>
                )}
                {militant.statut === 'a_verifier' && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    À vérifier
                  </span>
                )}
                {militant.statut === 'desactive' && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Désactivé
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600">
                <span className="font-mono font-bold text-[#0284c7]">
                  {militant.numeroKry}
                </span>
                <span>·</span>
                <span>{militant.fonctionParti}</span>
                <span>·</span>
                <span>{militant.sexe === 'F' ? 'Femme' : 'Homme'} ({militant.dateNaissance})</span>
              </div>
            </div>
          </div>

          <div className="text-right flex flex-col items-end">
            <div className="text-xs text-slate-500">Adhésion enregistrée le</div>
            <div className="text-sm font-semibold text-slate-900">{militant.dateAdhesion}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Source : {militant.sourceCollecte}</div>
          </div>
        </div>

        {/* Grille d'informations détaillées */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          {/* Bloc 1 : Coordonnées */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>Contact & Identité</span>
            </h3>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2.5 text-xs border border-slate-100">
              <div>
                <span className="text-slate-500 block text-[11px]">Téléphone</span>
                <span className="font-mono font-semibold text-slate-900">{telephoneAfficher}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Email</span>
                <span className="text-slate-900">{militant.email || 'Non renseigné'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">N° Carte Nationale d'Identité (CNI)</span>
                <span className="font-mono text-slate-900">{cniAfficher}</span>
              </div>
            </div>
          </div>

          {/* Bloc 2 : Territoire */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>Ancrage Territorial</span>
            </h3>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2.5 text-xs border border-slate-100">
              <div>
                <span className="text-slate-500 block text-[11px]">Commune</span>
                <span className="font-semibold text-slate-900">{commune?.nom}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Quartier</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-900">
                    {quartier?.codeQuartier ? `[${quartier.codeQuartier}] ` : ''}{quartier?.nom}
                  </span>
                  {quartier?.typeHabitat && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-50 text-[#0284c7] border border-sky-100">
                      {quartier.typeHabitat}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Adresse</span>
                <span className="text-slate-900">{militant.adresse}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Repère visuel</span>
                <span className="text-slate-900">{militant.repere}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Coordonnées GPS</span>
                <span className="font-mono text-slate-800 font-semibold flex items-center gap-1.5 flex-wrap">
                  {militant.latitude && militant.longitude ? (
                    <>
                      <span>{militant.latitude.toFixed(6)}, {militant.longitude.toFixed(6)}</span>
                      {militant.sourceGps === 'appareil' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-sans">
                          GPS Appareil {militant.precisionGps ? `(±${militant.precisionGps}m)` : ''}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400 italic">Non géolocalisé</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Bloc 3 : Sécurité & Traçabilité */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>Sécurité & Conformité</span>
            </h3>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2.5 text-xs border border-slate-100">
              <div>
                <span className="text-slate-500 block text-[11px]">Consentement (Loi 2008-12)</span>
                <span className="font-semibold text-emerald-700">
                  {militant.personneInformee ? 'Consentement recueilli' : 'À régulariser'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Carte d'adhésion officielle</span>
                <span className={militant.carteDelivree ? 'font-semibold text-emerald-700' : 'text-slate-500 italic'}>
                  {militant.carteDelivree ? `Délivrée (${militant.dateDelivranceCarte})` : 'Non délivrée'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Dernière modification</span>
                <span className="font-mono text-slate-900">{militant.derniereModification}</span>
                <span className="text-[10px] text-slate-500 block">Par : {militant.modifiePar} (v{militant.version})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historique des modifications */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <History className="w-4 h-4 text-[#0284c7]" />
          <span>Historique des modifications de la fiche (Traçabilité inviolable)</span>
        </h3>

        {historique.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Aucune modification enregistrée depuis la création.</p>
        ) : (
          <div className="space-y-2">
            {historique.map(h => (
              <div key={h.id} className="p-3 bg-slate-50 rounded-xl text-xs flex items-center justify-between border border-slate-100">
                <div>
                  <span className="font-semibold text-slate-900">{h.auteur}</span>
                  <span className="text-slate-500"> a modifié </span>
                  <span className="font-mono font-bold text-[#0284c7]">{h.champModifie}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">{h.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de désactivation */}
      {modalDesactivation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Désactiver la fiche militante</h3>
            <p className="text-xs text-slate-600">
              Veuillez sélectionner le motif officiel de désactivation conformément au CDC §5.3 :
            </p>

            <select
              value={motifDesactivation}
              onChange={e => setMotifDesactivation(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
            >
              {MOTIFS_DESACTIVATION.map((m, idx) => (
                <option key={idx} value={m}>{m}</option>
              ))}
            </select>

            {motifDesactivation === 'Autre (préciser)' && (
              <textarea
                value={motifAutre}
                onChange={e => setMotifAutre(e.target.value)}
                placeholder="Préciser le motif de désactivation..."
                className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                rows={3}
              />
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setModalDesactivation(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmerDesactivation}
                className="px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
              >
                Confirmer la désactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression définitive pour l'Admin */}
      {modalSuppression && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Supprimer la fiche {militant.numeroKry} ?
                </h3>
                <p className="text-xs text-slate-500">
                  {militant.prenom} {militant.nom} · {commune?.nom}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Cette action supprimera définitivement la fiche de la base active (utile en cas d'erreur de saisie ou de doublon irrémédiable). Cette action sera consignée dans le journal d'audit SHA-256.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setModalSuppression(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmerSuppression}
                className="px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
