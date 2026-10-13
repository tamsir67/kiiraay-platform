import React from 'react';
import { Militant, Utilisateur } from '../types';
import { COMMUNES_GUEDIAWAYE, QUARTIERS_GUEDIAWAYE } from '../data/referentiel';
import { 
  Users, 
  Target, 
  UserCheck, 
  AlertTriangle, 
  ArrowUpRight, 
  MapPin, 
  CheckCircle2,
  ChevronRight,
  Clock
} from 'lucide-react';

interface DashboardPageProps {
  militants: Militant[];
  currentUser: Utilisateur;
  onNavigateTab: (tab: any) => void;
  onFilterCommune: (communeId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  militants,
  currentUser,
  onNavigateTab,
  onFilterCommune
}) => {
  // Calcul des métriques globales
  const totalMilitants = militants.length;
  const actifs = militants.filter(m => m.statut === 'actif').length;
  const enAttente = militants.filter(m => m.statut === 'en_attente').length;
  const aVerifier = militants.filter(m => m.statut === 'a_verifier').length;
  const desactives = militants.filter(m => m.statut === 'desactive').length;

  const objectifDepartemental = COMMUNES_GUEDIAWAYE.reduce((acc, c) => acc + c.objectifMilitants, 0);
  const tauxCouvertureGlobal = Math.round((actifs / (objectifDepartemental / 100)) * 10) / 10; // échelle adaptée démo

  const femmesCount = militants.filter(m => m.sexe === 'F').length;
  const hommesCount = militants.filter(m => m.sexe === 'M').length;
  const pourcentFemmes = totalMilitants > 0 ? Math.round((femmesCount / totalMilitants) * 100) : 50;

  // Alertes
  const sansGpsCount = militants.filter(m => !m.latitude || m.latitude === 0).length;
  const sansCniCount = militants.filter(m => !m.cni || m.cni.trim() === '').length;
  const nonInformesCount = militants.filter(m => !m.personneInformee).length;
  const quartiersVacants = QUARTIERS_GUEDIAWAYE.filter(q => q.commissaire === 'Non pourvu');

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Alerte si inscriptions citoyennes en attente de contrôle */}
      {enAttente > 0 && currentUser.role !== 'militant' && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 font-bold flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-950">
                {enAttente} demande(s) d'adhésion en ligne en attente de validation administrative
              </h3>
              <p className="text-[11px] text-amber-800">
                Des citoyens se sont inscrits sur la plateforme. Contrôlez leurs dossiers pour valider l'adhésion et émettre leur carte officielle.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('militants')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-xs transition-colors shrink-0"
          >
            <span>Contrôler & Valider</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* En-tête de bienvenue avec contexte territorial */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Tableau de Bord · Guédiawaye 2027
          </h1>
          <p className="text-xs text-slate-700 mt-1">
            Supervision opérationnelle, suivi du parrainage et mobilisation territoriale des 5 communes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('carte')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Ouvrir la cartographie</span>
          </button>
          <button
            onClick={() => onNavigateTab('militants')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Consulter les militants</span>
          </button>
        </div>
      </div>

      {/* 4 Cartes KPI Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 : Militants Actifs */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Militants Actifs</span>
            <span className="p-2 bg-sky-50 text-sky-700 rounded-lg">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {actifs.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-700 mt-1 flex items-center gap-1">
              <span>{totalMilitants} au total</span>
              <span>·</span>
              <span className="text-sky-700 font-semibold">{enAttente} en attente</span>
            </div>
          </div>
        </div>

        {/* KPI 2 : Taux d'atteinte de l'objectif */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Objectif Mobilisation</span>
            <span className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <Target className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {objectifDepartemental.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-700 mt-1">
              Guédiawaye · 5 communes mobilisées
            </div>
          </div>
        </div>

        {/* KPI 3 : Responsables & Encadrement */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Chaîne d'encadrement</span>
            <span className="p-2 bg-sky-50 text-sky-700 rounded-lg">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {QUARTIERS_GUEDIAWAYE.length - quartiersVacants.length} / {QUARTIERS_GUEDIAWAYE.length}
            </div>
            <div className="text-[11px] text-slate-700 mt-1">
              Commissaires de quartiers actifs
            </div>
          </div>
        </div>

        {/* KPI 4 : Alertes & Qualité */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Alertes Qualité</span>
            <span className="p-2 bg-rose-50 text-rose-700 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700 tabular-nums">
              {quartiersVacants.length + aVerifier}
            </div>
            <div className="text-[11px] text-slate-700 mt-1">
              {quartiersVacants.length} postes vacants · {aVerifier} fiches à vérifier
            </div>
          </div>
        </div>
      </div>

      {/* Barres d'objectifs par Commune */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Répartition et Mobilisation par Commune
            </h2>
            <p className="text-xs text-slate-700 mt-0.5">
              Effectifs inscrits par commune de Guédiawaye
            </p>
          </div>
          <span className="text-xs text-slate-700 font-mono">5 Communes</span>
        </div>

        <div className="space-y-4">
          {COMMUNES_GUEDIAWAYE.map(commune => {
            const countCommune = militants.filter(m => m.communeId === commune.id).length;
            const countActifs = militants.filter(m => m.communeId === commune.id && m.statut === 'actif').length;
            const pct = Math.min(100, Math.max(8, Math.round((countCommune / 40) * 100)));

            return (
              <div 
                key={commune.id} 
                className="group cursor-pointer p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                onClick={() => {
                  onFilterCommune(commune.id);
                  onNavigateTab('militants');
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs mb-1.5 gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: commune.couleur }} 
                    />
                    <span className="font-bold text-slate-900">{commune.nom}</span>
                    <span className="text-slate-600 text-[11px]">
                      · Coord : {commune.coordonnateur}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 tabular-nums">
                    <span className="font-semibold text-slate-900">{countCommune} militants</span>
                    <span className="text-slate-600">({countActifs} validés)</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${pct}%`, 
                      backgroundColor: commune.couleur 
                    }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grille 2 colonnes : Démographie & Alertes opérationnelles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne 1 : Données Démographiques */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
          <h2 className="text-sm font-bold text-slate-900">
            Structure Démographique des Militants
          </h2>

          {/* Ratio Femmes / Hommes */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-700">Parité Genre</span>
              <span className="text-slate-900 tabular-nums">
                {femmesCount} Femmes ({pourcentFemmes}%) · {hommesCount} Hommes ({100 - pourcentFemmes}%)
              </span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden">
              <div 
                style={{ width: `${pourcentFemmes}%` }} 
                className="bg-sky-600 transition-all"
                title={`Femmes: ${pourcentFemmes}%`}
              />
              <div 
                style={{ width: `${100 - pourcentFemmes}%` }} 
                className="bg-rose-600 transition-all"
                title={`Hommes: ${100 - pourcentFemmes}%`}
              />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-700 mt-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-600" />
                Femmes ({femmesCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                Hommes ({hommesCount})
              </span>
            </div>
          </div>

          {/* Tranches d'âge */}
          <div>
            <span className="text-xs font-semibold text-slate-700 block mb-2">
              Répartition par Tranche d'Âge
            </span>
            <div className="space-y-2 text-xs">
              {[
                { label: '18 - 25 ans (Jeunesse)', min: 18, max: 25, color: '#059669' },
                { label: '26 - 35 ans (Actifs)', min: 26, max: 35, color: '#0284c7' },
                { label: '36 - 50 ans (Cadres)', min: 36, max: 50, color: '#7c3aed' },
                { label: '51 - 65 ans', min: 51, max: 65, color: '#ea580c' },
                { label: 'Plus de 65 ans (Sages)', min: 66, max: 120, color: '#64748b' }
              ].map(tranche => {
                const count = militants.filter(m => {
                  const y = parseInt(m.dateNaissance.split('-')[0], 10);
                  const age = 2026 - y;
                  return age >= tranche.min && age <= tranche.max;
                }).length;
                const pct = totalMilitants > 0 ? Math.round((count / totalMilitants) * 100) : 0;

                return (
                  <div key={tranche.label} className="flex items-center gap-3">
                    <span className="w-36 text-slate-700 truncate">{tranche.label}</span>
                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full" 
                        style={{ width: `${pct}%`, backgroundColor: tranche.color }} 
                      />
                    </div>
                    <span className="w-12 text-right font-semibold text-slate-900 tabular-nums">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Colonne 2 : Alertes Opérationnelles & Postes Vacants */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Points d'Attention Opérationnels
            </h2>
            <p className="text-xs text-slate-700 mb-4">
              Alertes du réseau de terrain nécessitant une régularisation
            </p>

            <div className="space-y-3">
              {/* Alerte Quartiers sans commissaires */}
              <div 
                onClick={() => onNavigateTab('responsables')}
                className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 hover:bg-amber-100/60 cursor-pointer transition-colors flex items-start gap-3"
              >
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-bold text-amber-900">
                    {quartiersVacants.length} quartier(s) sans commissaire affecté
                  </div>
                  <div className="text-amber-800 mt-0.5">
                    {quartiersVacants.map(q => q.nom).join(', ')}
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-amber-700 shrink-0" />
              </div>

              {/* Fiches à vérifier */}
              <div 
                onClick={() => onNavigateTab('militants')}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors flex items-start gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-semibold text-slate-900">
                    {aVerifier} fiches marquées « À vérifier »
                  </div>
                  <div className="text-slate-700 mt-0.5">
                    Dossiers en attente de vérification par les commissaires de quartier
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              {/* Données GPS & Qualité */}
              <div 
                onClick={() => onNavigateTab('qualite')}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors flex items-start gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-semibold text-slate-900">
                    {sansGpsCount} fiches sans coordonnées GPS précises
                  </div>
                  <div className="text-slate-700 mt-0.5">
                    {sansCniCount} fiches sans n° CNI · {nonInformesCount} fiches sans consentement notifié
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-700">
            <span>Données scellées et conformes CDC 2026</span>
            <span className="font-semibold text-emerald-800">Guédiawaye 2027</span>
          </div>
        </div>
      </div>
    </div>
  );
};
