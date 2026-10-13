import React, { useState } from 'react';
import { Militant, Utilisateur } from '../types';
import { COMMUNES_GUEDIAWAYE, QUARTIERS_GUEDIAWAYE, PERMISSIONS_PAR_ROLE } from '../data/referentiel';
import { maskTelephone } from '../services/crypto';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Play, 
  ShieldCheck 
} from 'lucide-react';

interface ImportExportPageProps {
  militants: Militant[];
  currentUser: Utilisateur;
  onImportMilitants: (nouveaux: any[]) => void;
  onExportCsv: () => void;
}

export const ImportExportPage: React.FC<ImportExportPageProps> = ({
  militants,
  currentUser,
  onImportMilitants,
  onExportCsv
}) => {
  const permissions = PERMISSIONS_PAR_ROLE[currentUser.role];

  // Simulation d'import
  const [simulationLancee, setSimulationLancee] = useState(false);
  const [lignesSimulation, setLignesSimulation] = useState<any[]>([]);
  const [importReussi, setImportReussi] = useState(false);

  // Exemple de fiches à tester pour la simulation
  const lignesTest = [
    {
      ligne: 1,
      prenom: 'Fatoumata',
      nom: 'Diallo',
      sexe: 'F',
      dateNaissance: '1999-07-22',
      telephone: '+221 77 910 20 30',
      cni: '2752199907221',
      communeId: 'golf-sud',
      quartierId: 'gs-01',
      adresse: 'Villa 112, Cité Fadia',
      repere: 'Face Clinique du Golf',
      statutSimulation: 'valide',
      message: 'Ligne valide, aucun doublon détecté'
    },
    {
      ligne: 2,
      prenom: 'Mamadou',
      nom: 'Sarr',
      sexe: 'M',
      dateNaissance: '1992-03-10',
      telephone: militants[0]?.telephone || '+221 77 345 88 12', // Provoque détection doublon
      cni: '1752199203102',
      communeId: 'sam-notaire',
      quartierId: 'sn-01',
      adresse: 'Rue 10, Notaire Est',
      repere: 'Près de la station',
      statutSimulation: 'doublon',
      message: 'Doublon détecté : numéro de téléphone déjà existant dans la base'
    },
    {
      ligne: 3,
      prenom: 'Abdou',
      nom: 'Diouf',
      sexe: 'X', // Erreur format
      dateNaissance: '2015-01-01', // Mineur
      telephone: '12345', // Invalide
      cni: '123',
      communeId: 'golf-sud',
      quartierId: 'inconnu',
      adresse: '',
      repere: '',
      statutSimulation: 'erreur',
      message: 'Erreur format : Âge < 18 ans, téléphone sénégalais invalide, quartier inconnu'
    },
    {
      ligne: 4,
      prenom: 'Cheikh Tidiane',
      nom: 'Gueye',
      sexe: 'M',
      dateNaissance: '1987-11-04',
      telephone: '+221 76 800 12 34',
      cni: '1752198711049',
      communeId: 'wakhinane-nimzatt',
      quartierId: 'wn-z09',
      adresse: 'Rue 3, Zone Nimzatt',
      repere: 'Derrière marché Nimzatt',
      statutSimulation: 'valide',
      message: 'Ligne valide, parrainage prêt pour enregistrement'
    }
  ];

  const handleLancerSimulation = () => {
    setSimulationLancee(true);
    setLignesSimulation(lignesTest);
    setImportReussi(false);
  };

  const handleConfirmerImport = () => {
    const valides = lignesSimulation
      .filter(l => l.statutSimulation === 'valide')
      .map(l => ({
        prenom: l.prenom,
        nom: l.nom,
        sexe: l.sexe,
        dateNaissance: l.dateNaissance,
        telephone: l.telephone,
        cni: l.cni,
        communeId: l.communeId,
        quartierId: l.quartierId,
        adresse: l.adresse,
        repere: l.repere,
        latitude: 14.7785,
        longitude: -17.4082,
        statut: 'en_attente',
        sourceCollecte: 'Import CSV de terrain',
        fonctionParti: 'Militant de base',
        personneInformee: true,
        dateAdhesion: '2026-10-11'
      }));

    onImportMilitants(valides);
    setImportReussi(true);
  };

  const handleTelechargerModele = () => {
    const headers = "prenom,nom,sexe,dateNaissance,telephone,cni,commune_id,quartier_id,adresse,repere,source";
    const example = "Ousmane,Sall,M,1990-05-14,+221 77 123 45 67,1752199005141,golf-sud,glf-hamo-1,Rue 12 Villa 4,Pres grande mosquee,Porte-a-porte";
    const content = `${headers}\n${example}\n`;
    
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modele_import_militants_kiiraay_guediawaye.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
          Import & Export Sécurisé des Militants · CDC §5.5
        </h1>
        <p className="text-xs text-slate-700 mt-0.5">
          Processus d’importation contrôlé avec bac à sable de simulation et export traçable nominatif
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module Export */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-800" />
              <h2 className="text-sm font-bold text-slate-900">Export Sécurisé des Données</h2>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Téléchargez l'état consolidé des fiches militantes de votre périmètre territorial. 
              Chaque export est borné à vos droits, horodaté et <b>scellé dans le journal d'audit</b>.
            </p>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
              <div>Périmètre actif : <b className="text-slate-900">{currentUser.role.toUpperCase()} ({militants.length} fiches)</b></div>
              <div>Protection téléphones : <b className="text-emerald-800">{currentUser.role === 'decideur' ? 'Masquage strict actif' : 'Format complet'}</b></div>
              <div>Format produit : <b className="font-mono text-slate-900">UTF-8 CSV (Excel compatible)</b></div>
            </div>
          </div>

          <button
            onClick={onExportCsv}
            disabled={!permissions.peutExporter}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Télécharger l'export ({militants.length} militants)</span>
          </button>
        </div>

        {/* Module Modèle officiel */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-700" />
              <h2 className="text-sm font-bold text-slate-900">Modèle Officiel d'Import CSV</h2>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Utilisez impérativement la structure de colonnes normalisée comprenant les identifiants officiels 
              des 5 communes et 46 quartiers de Guédiawaye pour éviter les rejets lors du traitement.
            </p>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
              <div>Colonnes obligatoires : <span className="font-mono text-slate-700">nom, prenom, sexe, dateNaissance, telephone, commune_id, quartier_id</span></div>
              <div>Règles : <span className="text-slate-700">Vérification de majorité (≥ 18 ans) et 13 chiffres CNI</span></div>
            </div>
          </div>

          <button
            onClick={handleTelechargerModele}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4 text-sky-700" />
            <span>Télécharger la trame officielle (.CSV)</span>
          </button>
        </div>
      </div>

      {/* Banc de test et simulateur d'import (CDC §5.5) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-800" />
              <span>Simulateur d'Importation & Contrôle Qualité Ligne par Ligne</span>
            </h2>
            <p className="text-xs text-slate-700 mt-0.5">
              Simulez la détection des doublons et des erreurs avant d'engager toute écriture en base
            </p>
          </div>

          <button
            onClick={handleLancerSimulation}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-amber-400" />
            <span>Charger & Simuler un fichier de test</span>
          </button>
        </div>

        {simulationLancee && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Ligne</th>
                    <th className="py-2.5 px-3">Identité</th>
                    <th className="py-2.5 px-3">Téléphone & CNI</th>
                    <th className="py-2.5 px-3">Quartier</th>
                    <th className="py-2.5 px-3">Statut Simulation</th>
                    <th className="py-2.5 px-3">Diagnostic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lignesSimulation.map(l => (
                    <tr key={l.ligne} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">#{l.ligne}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{l.prenom} {l.nom}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">{l.telephone}</td>
                      <td className="py-2.5 px-3">{l.quartierId}</td>
                      <td className="py-2.5 px-3">
                        {l.statutSimulation === 'valide' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            ✓ Conforme
                          </span>
                        )}
                        {l.statutSimulation === 'doublon' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            ⚠ Doublon
                          </span>
                        )}
                        {l.statutSimulation === 'erreur' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
                            ✗ Rejeté
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-700">{l.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-700">
                Résultat simulation : <b>2 fiches conformes</b>, 1 doublon écarté, 1 rejet de format.
              </div>

              {!importReussi ? (
                <button
                  onClick={handleConfirmerImport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirmer et injecter les 2 fiches conformes</span>
                </button>
              ) : (
                <div className="text-xs font-bold text-sky-700 flex items-center gap-1.5 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>2 nouveaux militants enregistrés avec succès dans l'annuaire !</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
