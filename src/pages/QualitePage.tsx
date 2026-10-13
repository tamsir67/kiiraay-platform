import React, { useState } from 'react';
import { Militant, DoublonDetecte, StatutMilitant } from '../types';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, ArrowRight, UserCheck } from 'lucide-react';
import { maskTelephone } from '../services/crypto';

interface QualitePageProps {
  militants: Militant[];
  doublons: DoublonDetecte[];
  onSelectMilitant: (militant: Militant) => void;
  onChangeStatut: (id: string, statut: StatutMilitant, motif?: string) => void;
}

export const QualitePage: React.FC<QualitePageProps> = ({
  militants,
  doublons,
  onSelectMilitant,
  onChangeStatut
}) => {
  const [doublonsTraites, setDoublonsTraites] = useState<Record<string, 'ecarte' | 'fusionne'>>({});

  const total = militants.length;
  const avecGps = militants.filter(m => m.latitude && m.latitude !== 0).length;
  const avecCni = militants.filter(m => m.cni && m.cni.trim() !== '').length;
  const avecConsentement = militants.filter(m => m.personneInformee).length;

  const pctGps = total > 0 ? Math.round((avecGps / total) * 100) : 100;
  const pctCni = total > 0 ? Math.round((avecCni / total) * 100) : 100;
  const pctConsentement = total > 0 ? Math.round((avecConsentement / total) * 100) : 100;

  const doublonsActifs = doublons.filter(d => !doublonsTraites[d.id]);

  const handleEcarter = (id: string) => {
    setDoublonsTraites(prev => ({ ...prev, [id]: 'ecarte' }));
  };

  const handleResoudre = (d: DoublonDetecte) => {
    // Désactiver la seconde fiche en tant que doublon confirmé
    onChangeStatut(d.militant2.id, 'desactive', 'Doublon confirmé et fusionné avec ' + d.militant1.numeroKry);
    setDoublonsTraites(prev => ({ ...prev, [d.id]: 'fusionne' }));
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
          Qualité des Données & Détection des Doublons · CDC §5.5
        </h1>
        <p className="text-xs text-slate-700 mt-0.5">
          Audits d'intégrité, contrôle de complétude et assainissement de la base électorale de Guédiawaye
        </p>
      </div>

      {/* Cartes d'indicateurs de complétude */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* GPS */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Géolocalisation GPS</span>
            <span className="text-xs font-bold text-slate-900 tabular-nums">{pctGps}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
            <div className="bg-emerald-800 h-full rounded-full" style={{ width: `${pctGps}%` }} />
          </div>
          <div className="text-[11px] text-slate-700 mt-2">
            {avecGps} fiches géolocalisées · {total - avecGps} sans coordonnées
          </div>
        </div>

        {/* CNI */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Numéro CNI (13 chiffres)</span>
            <span className="text-xs font-bold text-slate-900 tabular-nums">{pctCni}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
            <div className="bg-sky-600 h-full rounded-full" style={{ width: `${pctCni}%` }} />
          </div>
          <div className="text-[11px] text-slate-700 mt-2">
            {avecCni} CNI enregistrées · {total - avecCni} à compléter
          </div>
        </div>

        {/* Consentement CDP */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Conformité CDP (Loi 2008-12)</span>
            <span className="text-xs font-bold text-slate-900 tabular-nums">{pctConsentement}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
            <div className="bg-emerald-800 h-full rounded-full" style={{ width: `${pctConsentement}%` }} />
          </div>
          <div className="text-[11px] text-slate-700 mt-2">
            {avecConsentement} personnes informées · {total - avecConsentement} alertes
          </div>
        </div>
      </div>

      {/* Détection des doublons */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Doublons Potentiels Détectés ({doublonsActifs.length})
            </h2>
          </div>
          <span className="text-xs text-slate-700">
            Comparaison croisée par index aveugle HMAC (téléphones & CNI chiffrés)
          </span>
        </div>

        {doublonsActifs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-800 mb-2" />
            <p className="font-semibold text-slate-800">Aucun doublon actif dans la base de données !</p>
            <p className="text-slate-700 mt-0.5">Tous les critères d'unicité sont respectés sur l'ensemble des communes.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 p-4 space-y-4">
            {doublonsActifs.map(d => (
              <div key={d.id} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      Score de similarité : {d.scoreCertitude}%
                    </span>
                    <span className="text-xs text-slate-700 font-medium">
                      Critère : {d.motif === 'telephone' ? 'Numéro de téléphone identique' : d.motif === 'cni' ? 'Numéro CNI identique' : 'Identité & Date de naissance'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEcarter(d.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors"
                    >
                      Écarter (faux positif)
                    </button>
                    <button
                      onClick={() => handleResoudre(d)}
                      className="px-2.5 py-1 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded shadow-sm transition-colors"
                    >
                      Résoudre & fusionner
                    </button>
                  </div>
                </div>

                {/* Comparaison côte à côte */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Fiche A */}
                  <div 
                    onClick={() => onSelectMilitant(d.militant1)}
                    className="p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-sky-600 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900">{d.militant1.prenom} {d.militant1.nom}</span>
                      <span className="font-mono text-[11px] text-slate-700">{d.militant1.numeroKry}</span>
                    </div>
                    <div className="text-[11px] text-slate-700 space-y-0.5">
                      <p>Téléphone : <b className="font-mono text-slate-800">{d.militant1.telephone}</b></p>
                      <p>Date naissance : {d.militant1.dateNaissance}</p>
                      <p>Commune : {d.militant1.communeId} · Quartier : {d.militant1.quartierId}</p>
                      <p>Statut : <span className="font-semibold text-sky-700">{d.militant1.statut.toUpperCase()}</span></p>
                    </div>
                  </div>

                  {/* Fiche B */}
                  <div 
                    onClick={() => onSelectMilitant(d.militant2)}
                    className="p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-sky-600 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900">{d.militant2.prenom} {d.militant2.nom}</span>
                      <span className="font-mono text-[11px] text-slate-700">{d.militant2.numeroKry}</span>
                    </div>
                    <div className="text-[11px] text-slate-700 space-y-0.5">
                      <p>Téléphone : <b className="font-mono text-slate-800">{d.militant2.telephone}</b></p>
                      <p>Date naissance : {d.militant2.dateNaissance}</p>
                      <p>Commune : {d.militant2.communeId} · Quartier : {d.militant2.quartierId}</p>
                      <p>Statut : <span className="font-semibold text-sky-700">{d.militant2.statut.toUpperCase()}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
