import React, { useState, useMemo } from 'react';
import { Militant, Utilisateur, StatutMilitant } from '../types';
import { COMMUNES_GUEDIAWAYE, PERMISSIONS_PAR_ROLE } from '../data/referentiel';
import { maskTelephone, maskCni } from '../services/crypto';
import { store } from '../services/store';
import { 
  Search, 
  Filter, 
  Plus, 
  FileSpreadsheet, 
  CreditCard, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  Edit3,
  Trash2,
  Clock,
  AlertTriangle,
  UserCheck
} from 'lucide-react';

interface MilitantsPageProps {
  militants: Militant[];
  currentUser: Utilisateur;
  onSelectMilitant: (militant: Militant) => void;
  onOpenCreateModal: () => void;
  onOpenCardModal: (militant: Militant) => void;
  onChangeStatut: (id: string, statut: StatutMilitant, motif?: string) => void;
  onEditMilitant?: (militant: Militant) => void;
  onDeleteMilitant?: (id: string) => void;
  onDelivrerCarte?: (id: string) => void;
  initialCommuneId?: string;
  onExportCsv: () => void;
}

export const MilitantsPage: React.FC<MilitantsPageProps> = ({
  militants,
  currentUser,
  onSelectMilitant,
  onOpenCreateModal,
  onOpenCardModal,
  onChangeStatut,
  onEditMilitant,
  onDeleteMilitant,
  onDelivrerCarte,
  initialCommuneId = 'tous',
  onExportCsv
}) => {
  const permissions = PERMISSIONS_PAR_ROLE[currentUser.role];
  const isDecideur = currentUser.role === 'decideur';
  const isAdmin = currentUser.role === 'admin';

  // États des filtres
  const [recherche, setRecherche] = useState('');
  const [communeFiltre, setCommuneFiltre] = useState<string>(initialCommuneId);
  const [quartierFiltre, setQuartierFiltre] = useState<string>('tous');
  const [statutFiltre, setStatutFiltre] = useState<string>('tous');
  const [sexeFiltre, setSexeFiltre] = useState<string>('tous');
  const [qualiteFiltre, setQualiteFiltre] = useState<string>('tous');
  const [trancheAgeFiltre, setTrancheAgeFiltre] = useState<string>('tous');

  // Modal confirmation de suppression
  const [militantASupprimer, setMilitantASupprimer] = useState<Militant | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Calcul des compteurs par statut
  const nbEnAttente = militants.filter(m => m.statut === 'en_attente').length;
  const nbActifs = militants.filter(m => m.statut === 'actif').length;
  const nbAVerifier = militants.filter(m => m.statut === 'a_verifier').length;
  const nbDesactives = militants.filter(m => m.statut === 'desactive').length;

  // Liste dynamique des quartiers depuis le store
  const quartiersDisponibles = useMemo(() => {
    return store.getQuartiers(communeFiltre === 'tous' ? undefined : communeFiltre);
  }, [communeFiltre]);

  // Filtrage combiné multi-critères
  const filteredMilitants = useMemo(() => {
    return militants.filter(m => {
      if (recherche.trim() !== '') {
        const q = recherche.toLowerCase().trim();
        const match = 
          m.nom.toLowerCase().includes(q) ||
          m.prenom.toLowerCase().includes(q) ||
          m.numeroKry.toLowerCase().includes(q) ||
          m.telephone.includes(q) ||
          (m.cni && m.cni.includes(q)) ||
          m.adresse.toLowerCase().includes(q) ||
          m.repere.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (communeFiltre !== 'tous' && m.communeId !== communeFiltre) return false;
      if (quartierFiltre !== 'tous' && m.quartierId !== quartierFiltre) return false;
      if (statutFiltre !== 'tous' && m.statut !== statutFiltre) return false;
      if (sexeFiltre !== 'tous' && m.sexe !== sexeFiltre) return false;

      if (qualiteFiltre === 'sans_gps' && (m.latitude && m.latitude !== 0)) return false;
      if (qualiteFiltre === 'sans_cni' && (m.cni && m.cni.trim() !== '')) return false;
      if (qualiteFiltre === 'non_informe' && m.personneInformee) return false;

      if (trancheAgeFiltre !== 'tous') {
        const y = parseInt(m.dateNaissance.split('-')[0], 10);
        const age = 2026 - y;
        if (trancheAgeFiltre === '18-25' && (age < 18 || age > 25)) return false;
        if (trancheAgeFiltre === '26-35' && (age < 26 || age > 35)) return false;
        if (trancheAgeFiltre === '36-50' && (age < 36 || age > 50)) return false;
        if (trancheAgeFiltre === '51-65' && (age < 51 || age > 65)) return false;
        if (trancheAgeFiltre === '65+' && age <= 65) return false;
      }

      return true;
    });
  }, [militants, recherche, communeFiltre, quartierFiltre, statutFiltre, sexeFiltre, qualiteFiltre, trancheAgeFiltre]);

  const totalPages = Math.ceil(filteredMilitants.length / pageSize) || 1;
  const paginatedMilitants = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMilitants.slice(start, start + pageSize);
  }, [filteredMilitants, page, pageSize]);

  const handleConfirmerSuppression = () => {
    if (militantASupprimer && onDeleteMilitant) {
      onDeleteMilitant(militantASupprimer.id);
      setMilitantASupprimer(null);
    }
  };

  const handleValiderAdhesion = (m: Militant) => {
    onChangeStatut(m.id, 'actif');
    if (onDelivrerCarte) {
      onDelivrerCarte(m.id);
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-5">
      {/* Barre de titre */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Annuaire des Militants · Guédiawaye</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-[#0284c7] font-bold">
              {filteredMilitants.length} / {militants.length}
            </span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Gestion, recherche avancée, contrôle et validation administrative des adhérents
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {permissions.peutExporter && (
            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>Exporter CSV</span>
            </button>
          )}

          {permissions.peutEcrire && (
            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0284c7] hover:bg-[#0369a1] rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau militant</span>
            </button>
          )}
        </div>
      </div>

      {/* Onglets rapides par statut (avec badge en attente, défilement horizontal fluide sur mobile) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => { setStatutFiltre('tous'); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            statutFiltre === 'tous'
              ? 'bg-[#0284c7] text-white shadow-sm font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Toutes les fiches ({militants.length})
        </button>

        <button
          onClick={() => { setStatutFiltre('en_attente'); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            statutFiltre === 'en_attente'
              ? 'bg-amber-500 text-white shadow-sm font-bold'
              : nbEnAttente > 0
                ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 font-bold'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>En attente de validation ({nbEnAttente})</span>
        </button>

        <button
          onClick={() => { setStatutFiltre('actif'); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            statutFiltre === 'actif'
              ? 'bg-emerald-600 text-white shadow-sm font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Actifs ({nbActifs})
        </button>

        <button
          onClick={() => { setStatutFiltre('a_verifier'); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            statutFiltre === 'a_verifier'
              ? 'bg-amber-600 text-white shadow-sm font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          À vérifier ({nbAVerifier})
        </button>

        <button
          onClick={() => { setStatutFiltre('desactive'); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            statutFiltre === 'desactive'
              ? 'bg-slate-800 text-white shadow-sm font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Désactivés ({nbDesactives})
        </button>
      </div>

      {/* Bannière explicative si filtre "en_attente" sélectionné */}
      {statutFiltre === 'en_attente' && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <b>Inscriptions citoyennes en attente :</b> Vérifiez la conformité des données ci-dessous. En tant qu'administrateur, vous pouvez corriger les informations ou cliquer sur <b>Valider</b> pour émettre la carte officielle.
            </span>
          </div>
        </div>
      )}

      {/* Barre de Filtres Multi-critères */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Recherche texte */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher par nom, prénom, N° KRY, tél, CNI, repère..."
              value={recherche}
              onChange={e => { setRecherche(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
            />
          </div>

          {/* Commune */}
          <div>
            <select
              value={communeFiltre}
              onChange={e => { setCommuneFiltre(e.target.value); setQuartierFiltre('tous'); setPage(1); }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0284c7] font-medium"
            >
              <option value="tous">Toutes les communes (5)</option>
              {COMMUNES_GUEDIAWAYE.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          {/* Quartier dynamique */}
          <div>
            <select
              value={quartierFiltre}
              onChange={e => { setQuartierFiltre(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
            >
              <option value="tous">Tous les quartiers ({quartiersDisponibles.length})</option>
              {quartiersDisponibles.map(q => (
                <option key={q.id} value={q.id}>
                  {q.codeQuartier ? `${q.codeQuartier} — ` : ''}{q.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Deuxième rangée de filtres */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>Filtres avancés :</span>
          </div>

          <select
            value={sexeFiltre}
            onChange={e => { setSexeFiltre(e.target.value); setPage(1); }}
            className="px-2.5 py-1 rounded-md border border-slate-200 text-xs bg-slate-50"
          >
            <option value="tous">Tous genres</option>
            <option value="F">Femmes (F)</option>
            <option value="M">Hommes (H)</option>
          </select>

          <select
            value={trancheAgeFiltre}
            onChange={e => { setTrancheAgeFiltre(e.target.value); setPage(1); }}
            className="px-2.5 py-1 rounded-md border border-slate-200 text-xs bg-slate-50"
          >
            <option value="tous">Toutes tranches d'âge</option>
            <option value="18-25">Jeunes (18-25 ans)</option>
            <option value="26-35">Actifs (26-35 ans)</option>
            <option value="36-50">36-50 ans</option>
            <option value="51-65">51-65 ans</option>
            <option value="65+">Séniors (65+ ans)</option>
          </select>

          <select
            value={qualiteFiltre}
            onChange={e => { setQualiteFiltre(e.target.value); setPage(1); }}
            className="px-2.5 py-1 rounded-md border border-slate-200 text-xs bg-slate-50"
          >
            <option value="tous">Qualité : Tous les profils</option>
            <option value="sans_gps">Sans localisation GPS</option>
            <option value="sans_cni">Sans CNI renseignée</option>
            <option value="non_informe">Sans consentement validé</option>
          </select>

          {(recherche || communeFiltre !== 'tous' || quartierFiltre !== 'tous' || statutFiltre !== 'tous' || sexeFiltre !== 'tous' || qualiteFiltre !== 'tous' || trancheAgeFiltre !== 'tous') && (
            <button
              onClick={() => {
                setRecherche('');
                setCommuneFiltre('tous');
                setQuartierFiltre('tous');
                setStatutFiltre('tous');
                setSexeFiltre('tous');
                setQualiteFiltre('tous');
                setTrancheAgeFiltre('tous');
                setPage(1);
              }}
              className="text-xs text-rose-600 hover:underline ml-auto font-medium"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* Tableau des Militants avec CRUD Admin */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Identifiant & Militant</th>
                <th className="py-3 px-4">Territoire (Commune / Quartier)</th>
                <th className="py-3 px-4">Contact & CNI</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Carte QR</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedMilitants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    Aucun militant ne correspond à vos critères de recherche.
                  </td>
                </tr>
              ) : (
                paginatedMilitants.map((m) => {
                  const commune = COMMUNES_GUEDIAWAYE.find(c => c.id === m.communeId);
                  const quartier = store.getQuartiers().find(q => q.id === m.quartierId);
                  const telephoneAfficher = isDecideur ? maskTelephone(m.telephone) : m.telephone;
                  const cniAfficher = isDecideur ? '••••••••' : (m.cni ? maskCni(m.cni) : 'Non renseigné');

                  return (
                    <tr
                      key={m.id}
                      onClick={() => onSelectMilitant(m)}
                      className={`hover:bg-sky-50/50 cursor-pointer transition-colors ${
                        m.statut === 'en_attente' ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Identifiant & Nom */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-[#0284c7] font-bold flex items-center justify-center shrink-0 border border-slate-200">
                            {m.prenom[0]}{m.nom[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {m.prenom} {m.nom}
                            </div>
                            <div className="text-[11px] font-mono text-[#0284c7]">
                              {m.numeroKry}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Territoire */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {quartier?.nom || m.quartierId}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                          {commune?.nom} · {m.repere}
                        </div>
                      </td>

                      {/* Téléphone & CNI */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="text-slate-900">{telephoneAfficher}</div>
                        <div className="text-slate-400">{cniAfficher}</div>
                      </td>

                      {/* Statut */}
                      <td className="py-3 px-4">
                        {m.statut === 'actif' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Actif
                          </span>
                        )}
                        {m.statut === 'en_attente' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            En attente
                          </span>
                        )}
                        {m.statut === 'a_verifier' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            À vérifier
                          </span>
                        )}
                        {m.statut === 'desactive' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Désactivé
                          </span>
                        )}
                      </td>

                      {/* Carte QR */}
                      <td className="py-3 px-4">
                        {m.carteDelivree ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCardModal(m);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#0284c7] bg-sky-50 hover:bg-sky-100 rounded-md border border-sky-200 transition-colors"
                          >
                            <CreditCard className="w-3 h-3 text-rose-500" />
                            <span>Carte émise</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Non délivrée</span>
                        )}
                      </td>

                      {/* Actions CRUD pour l'Admin */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          {/* Bouton de validation rapide pour inscription citoyenne */}
                          {permissions.peutValider && m.statut === 'en_attente' && (
                            <button
                              onClick={() => handleValiderAdhesion(m)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-xs text-[11px] transition-all"
                              title="Valider l'adhésion et émettre la carte officielle"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Valider</span>
                            </button>
                          )}

                          {/* Consulter */}
                          <button
                            onClick={() => onSelectMilitant(m)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                            title="Consulter la fiche complète"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Modifier (CRUD) */}
                          {permissions.peutEcrire && onEditMilitant && (
                            <button
                              onClick={() => onEditMilitant(m)}
                              className="p-1.5 text-slate-400 hover:text-[#0284c7] hover:bg-sky-50 rounded-md transition-colors"
                              title="Corriger ou modifier la fiche"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Supprimer (CRUD Admin) */}
                          {isAdmin && onDeleteMilitant && (
                            <button
                              onClick={() => setMilitantASupprimer(m)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Supprimer la fiche pour correction"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Affichage de {paginatedMilitants.length} sur {filteredMilitants.length} militants
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-medium text-slate-700">
              Page {page} sur {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmation de suppression militant */}
      {militantASupprimer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Supprimer la fiche {militantASupprimer.numeroKry} ?
                </h3>
                <p className="text-xs text-slate-500">
                  {militantASupprimer.prenom} {militantASupprimer.nom}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Êtes-vous certain de vouloir supprimer cette fiche militante ? Cette opération est utile pour corriger les erreurs de saisie ou les doublons et sera enregistrée dans le journal d'audit SHA-256.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setMilitantASupprimer(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmerSuppression}
                className="px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
