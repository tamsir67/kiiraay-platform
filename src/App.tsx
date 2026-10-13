/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, TabId } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { MilitantsPage } from './pages/MilitantsPage';
import { MilitantDetailPage } from './pages/MilitantDetailPage';
import { CartePage } from './pages/CartePage';
import { TerritoiresPage } from './pages/TerritoiresPage';
import { ResponsablesPage } from './pages/ResponsablesPage';
import { QualitePage } from './pages/QualitePage';
import { ImportExportPage } from './pages/ImportExportPage';
import { AuditPage } from './pages/AuditPage';
import { MessageriePage } from './pages/MessageriePage';
import { EspaceMilitantPage } from './pages/EspaceMilitantPage';

import { CarteAdhesionModal } from './components/CarteAdhesionModal';
import { PublicVerifyModal } from './components/PublicVerifyModal';
import { MilitantFormModal } from './components/MilitantFormModal';
import { InscriptionMilitantModal } from './components/InscriptionMilitantModal';
import { InstallAppModal } from './components/InstallAppModal';

import { store } from './services/store';
import { Militant, Utilisateur, StatutMilitant } from './types';
import { COMMUNES_GUEDIAWAYE } from './data/referentiel';
import { maskTelephone } from './services/crypto';
import { LayoutDashboard, Users, Map, MapPin, Menu, CreditCard, MessageSquare, Download, UserPlus } from 'lucide-react';

export default function App() {
  // Synchronisation réactive avec le store local
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setVersion(v => v + 1);
    });
    return unsubscribe;
  }, []);

  const currentUser = store.getCurrentUser();
  const militants = store.getMilitants();
  const auditLogs = store.getAuditLogs();
  const messages = store.getMessages();
  const doublons = store.detecterDoublons();
  const tousQuartiers = store.getQuartiers();

  const [activeTab, setActiveTab] = useState<TabId>(
    currentUser.role === 'militant' ? 'espace_militant' : 'dashboard'
  );

  // Filtre initial de commune (depuis clic sur dashboard)
  const [initialCommuneFilter, setInitialCommuneFilter] = useState<string>('tous');

  // Fiche militant sélectionnée pour affichage détaillé
  const [selectedMilitantId, setSelectedMilitantId] = useState<string | null>(null);

  // Modals
  const [cardModalMilitant, setCardModalMilitant] = useState<Militant | null>(null);
  const [verifyModalState, setVerifyModalState] = useState<{ open: boolean; jeton: string; militant?: Militant }>({
    open: false,
    jeton: ''
  });
  const [formModalState, setFormModalState] = useState<{ open: boolean; militant?: Militant | null }>({
    open: false,
    militant: null
  });
  const [inscriptionModalOpen, setInscriptionModalOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Verrouillage de sécurité : le rôle militant ne peut STRICTEMENT accéder qu'à son propre espace
  useEffect(() => {
    if (currentUser.role === 'militant') {
      if (activeTab !== 'espace_militant') {
        setActiveTab('espace_militant');
      }
      if (selectedMilitantId !== null) {
        setSelectedMilitantId(null);
      }
    }
  }, [currentUser.role, activeTab, selectedMilitantId]);

  // Sélecteur d'onglet sécurisé avec contrôle strict des rôles
  const handleSelectTab = (tab: TabId) => {
    if (currentUser.role === 'militant' && tab !== 'espace_militant') {
      return; // Bloqué pour le militant (accès interdit aux autres espaces)
    }
    setActiveTab(tab);
    setSelectedMilitantId(null);
    setMobileMenuOpen(false);
  };

  // Basculer d'utilisateur
  const handleSwitchUser = (user: Utilisateur) => {
    store.setCurrentUser(user);
    if (user.role === 'militant') {
      setActiveTab('espace_militant');
      setSelectedMilitantId(null);
    } else if (activeTab === 'espace_militant') {
      setActiveTab('dashboard');
    }
  };

  // Connexion automatique à l'Espace Militant après auto-inscription
  const handleAccessEspaceMilitant = (newMil: Militant) => {
    const userMil: Utilisateur = {
      id: `user-${newMil.id}`,
      identifiant: newMil.numeroKry.toLowerCase(),
      nomComplet: `${newMil.prenom} ${newMil.nom}`,
      role: 'militant',
      email: newMil.email || `${newMil.prenom.toLowerCase()}.${newMil.nom.toLowerCase()}@kiiraay.sn`,
      telephone: newMil.telephone,
      communeId: newMil.communeId,
      quartierIds: [newMil.quartierId],
      militantId: newMil.id,
      actif: true
    };
    store.setCurrentUser(userMil);
    setActiveTab('espace_militant');
    setSelectedMilitantId(null);
    setInscriptionModalOpen(false);
  };

  const handleSelectMilitant = (m: Militant) => {
    setSelectedMilitantId(m.id);
  };

  const handleChangeStatut = (id: string, statut: StatutMilitant, motif?: string) => {
    store.changerStatut(id, statut, motif);
  };

  const handleSaveMilitant = (data: any) => {
    if (formModalState.militant) {
      store.updateMilitant(formModalState.militant.id, data);
    } else {
      const created = store.createMilitant(data);
      setSelectedMilitantId(created.id);
    }
    setFormModalState({ open: false, militant: null });
  };

  const handleDeleteMilitant = (id: string) => {
    store.deleteMilitant(id);
    if (selectedMilitantId === id) {
      setSelectedMilitantId(null);
    }
  };

  const handleSimulerScan = (jeton: string, numeroKry: string) => {
    const found = militants.find(m => m.numeroKry === numeroKry);
    setVerifyModalState({
      open: true,
      jeton,
      militant: found
    });
  };

  const handleExportCsv = () => {
    const isDecideur = currentUser.role === 'decideur';
    const headers = [
      'N° Militant',
      'Nom',
      'Prénom',
      'Genre',
      'Date Naissance',
      'Téléphone',
      'CNI',
      'Commune',
      'Quartier',
      'Adresse',
      'Statut',
      'Date Adhésion'
    ];

    const rows = militants.map(m => {
      const c = COMMUNES_GUEDIAWAYE.find(com => com.id === m.communeId)?.nom || m.communeId;
      const q = tousQuartiers.find(qua => qua.id === m.quartierId)?.nom || m.quartierId;
      const tel = isDecideur ? maskTelephone(m.telephone) : m.telephone;
      const cni = isDecideur ? '••••••••' : (m.cni || '');

      return [
        m.numeroKry,
        m.nom,
        m.prenom,
        m.sexe,
        m.dateNaissance,
        tel,
        cni,
        c,
        q,
        `"${m.adresse.replace(/"/g, '""')}"`,
        m.statut,
        m.dateAdhesion
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `kiiraay_militants_guediawaye_${currentUser.role}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    store.logAudit('EXPORT_CSV', `Export de ${militants.length} fiches militantes par ${currentUser.nomComplet}`, 'export');
  };

  const handleImportMilitants = (nouveaux: any[]) => {
    nouveaux.forEach(data => {
      store.createMilitant(data);
    });
    store.logAudit('IMPORT_LOT', `Import réussi de ${nouveaux.length} fiches militantes`, 'import');
  };

  const handleResetData = () => {
    if (window.confirm('Voulez-vous réinitialiser toutes les données de démonstration de Guédiawaye ?')) {
      store.resetToFactory();
      setSelectedMilitantId(null);
    }
  };

  // Trouver le militant courant si sélectionné
  const currentSelectedMilitant = selectedMilitantId ? store.getMilitantById(selectedMilitantId) : null;
  const myMilitant = currentUser.militantId ? store.getMilitantById(currentUser.militantId) : militants[0];

  const getTabTitle = (tab: TabId) => {
    switch (tab) {
      case 'dashboard': return 'Tableau de bord';
      case 'militants': return 'Militants & Adhérents';
      case 'carte': return 'Cartographie territoriale';
      case 'territoires': return 'Territoires & Quartiers';
      case 'responsables': return 'Chaîne de responsabilité';
      case 'qualite': return 'Qualité des données & Doublons';
      case 'import_export': return 'Import / Export';
      case 'audit': return 'Journal d’audit SHA-256';
      case 'messagerie': return 'Messagerie interne';
      case 'espace_militant': return 'Espace Militant';
    }
  };

  const nbEnAttente = militants.filter(m => m.statut === 'en_attente').length;
  const nbAlertes = doublons.length + tousQuartiers.filter(q => !q.commissaire || q.commissaire === 'Non pourvu').length;
  const nbMessagesNonLus = messages.filter(m => !m.lu && m.destinataireId === currentUser.id).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Barre supérieure avec logo KIIRAAY, hamburger mobile et profil */}
      <Header
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        activeTabTitle={selectedMilitantId ? 'Fiche Militant' : getTabTitle(activeTab)}
        onOpenInscription={() => setInscriptionModalOpen(true)}
        onOpenInstallModal={() => setInstallModalOpen(true)}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen(v => !v)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Barre latérale responsive (desktop + drawer mobile) */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          currentUser={currentUser}
          nbAlertes={nbAlertes}
          nbMessagesNonLus={nbMessagesNonLus}
          nbEnAttente={nbEnAttente}
          onResetData={handleResetData}
          onOpenInscription={() => setInscriptionModalOpen(true)}
          onOpenInstallModal={() => setInstallModalOpen(true)}
          isMobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Zone de contenu principale avec marge basse sur mobile pour la barre de navigation */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {/* Si une fiche individuelle est sélectionnée */}
          {selectedMilitantId && currentSelectedMilitant ? (
            <MilitantDetailPage
              militant={currentSelectedMilitant}
              currentUser={currentUser}
              onBack={() => setSelectedMilitantId(null)}
              onEdit={(m) => setFormModalState({ open: true, militant: m })}
              onOpenCardModal={(m) => setCardModalMilitant(m)}
              onChangeStatut={handleChangeStatut}
              onDelivrerCarte={(id) => store.delivrerCarte(id)}
              onDelete={handleDeleteMilitant}
              historique={store.getHistorique(currentSelectedMilitant.id)}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardPage
                  militants={militants}
                  currentUser={currentUser}
                  onNavigateTab={(tab) => {
                    setActiveTab(tab);
                    setSelectedMilitantId(null);
                  }}
                  onFilterCommune={(cId) => {
                    setInitialCommuneFilter(cId);
                  }}
                />
              )}

              {activeTab === 'militants' && (
                <MilitantsPage
                  militants={militants}
                  currentUser={currentUser}
                  onSelectMilitant={handleSelectMilitant}
                  onOpenCreateModal={() => setFormModalState({ open: true, militant: null })}
                  onOpenCardModal={(m) => setCardModalMilitant(m)}
                  onChangeStatut={handleChangeStatut}
                  onEditMilitant={(m) => setFormModalState({ open: true, militant: m })}
                  onDeleteMilitant={handleDeleteMilitant}
                  onDelivrerCarte={(id) => store.delivrerCarte(id)}
                  initialCommuneId={initialCommuneFilter}
                  onExportCsv={handleExportCsv}
                />
              )}

              {activeTab === 'carte' && (
                <CartePage
                  militants={militants}
                  currentUser={currentUser}
                  onSelectMilitant={handleSelectMilitant}
                />
              )}

              {activeTab === 'territoires' && (
                <TerritoiresPage
                  militants={militants}
                  currentUser={currentUser}
                  onSelectCommuneFilter={(cId) => {
                    setInitialCommuneFilter(cId);
                    setActiveTab('militants');
                  }}
                />
              )}

              {activeTab === 'responsables' && (
                <ResponsablesPage currentUser={currentUser} />
              )}

              {activeTab === 'qualite' && (
                <QualitePage
                  militants={militants}
                  doublons={doublons}
                  onSelectMilitant={handleSelectMilitant}
                  onChangeStatut={handleChangeStatut}
                />
              )}

              {activeTab === 'import_export' && (
                <ImportExportPage
                  militants={militants}
                  currentUser={currentUser}
                  onImportMilitants={handleImportMilitants}
                  onExportCsv={handleExportCsv}
                />
              )}

              {activeTab === 'audit' && (
                <AuditPage logs={auditLogs} />
              )}

              {activeTab === 'messagerie' && (
                <MessageriePage
                  messages={messages}
                  currentUser={currentUser}
                  onEnvoyerMessage={(destId, obj, cont, prio) => store.envoyerMessage(destId, obj, cont, prio)}
                />
              )}

              {activeTab === 'espace_militant' && myMilitant && (
                <EspaceMilitantPage
                  militant={myMilitant}
                  currentUser={currentUser}
                  onOpenCardModal={(m) => setCardModalMilitant(m)}
                  onNavigateTab={(tab) => {
                    handleSelectTab(tab);
                  }}
                  onOpenInscription={() => setInscriptionModalOpen(true)}
                  onOpenInstallModal={() => setInstallModalOpen(true)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Barre de navigation mobile inférieure (visible sur smartphone et tablette < lg) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 flex items-center justify-around shadow-lg">
        {currentUser.role === 'militant' ? (
          <>
            <button
              onClick={() => handleSelectTab('espace_militant')}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                activeTab === 'espace_militant' ? 'text-[#0284c7] font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-5 h-5 mb-0.5" />
              <span>Mon Espace</span>
            </button>
            <button
              onClick={() => setInscriptionModalOpen(true)}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <UserPlus className="w-5 h-5 mb-0.5 text-rose-500" />
              <span>Adhésion</span>
            </button>
            <button
              onClick={() => setInstallModalOpen(true)}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Download className="w-5 h-5 mb-0.5 text-sky-600" />
              <span>Installer</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => { setActiveTab('dashboard'); setSelectedMilitantId(null); }}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                activeTab === 'dashboard' ? 'text-[#0284c7] font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 mb-0.5" />
              <span>Tableau</span>
            </button>
            <button
              onClick={() => { setActiveTab('militants'); setSelectedMilitantId(null); }}
              className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                activeTab === 'militants' ? 'text-[#0284c7] font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-5 h-5 mb-0.5" />
              <span>Militants</span>
              {nbEnAttente > 0 && (
                <span className="absolute top-1 right-1 px-1 py-0.2 rounded-full text-[9px] font-bold bg-amber-400 text-slate-950">
                  {nbEnAttente}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('carte'); setSelectedMilitantId(null); }}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                activeTab === 'carte' ? 'text-[#0284c7] font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Map className="w-5 h-5 mb-0.5" />
              <span>Carte</span>
            </button>
            <button
              onClick={() => { setActiveTab('territoires'); setSelectedMilitantId(null); }}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                activeTab === 'territoires' ? 'text-[#0284c7] font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-5 h-5 mb-0.5" />
              <span>Quartiers</span>
            </button>
          </>
        )}
        <button
          onClick={() => setMobileMenuOpen(v => !v)}
          className="flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>

      {/* Modal Carte d'adhésion officielle */}
      {cardModalMilitant && (
        <CarteAdhesionModal
          militant={cardModalMilitant}
          onClose={() => setCardModalMilitant(null)}
          onSimulerScan={handleSimulerScan}
        />
      )}

      {/* Modal de vérification publique simulée */}
      {verifyModalState.open && (
        <PublicVerifyModal
          militant={verifyModalState.militant}
          jeton={verifyModalState.jeton}
          onClose={() => setVerifyModalState({ open: false, jeton: '' })}
        />
      )}

      {/* Modal Formulaire d'édition / création de militant */}
      {formModalState.open && (
        <MilitantFormModal
          militantInitial={formModalState.militant}
          onSave={handleSaveMilitant}
          onClose={() => setFormModalState({ open: false, militant: null })}
        />
      )}

      {/* Modal d'auto-inscription citoyenne en ligne */}
      {inscriptionModalOpen && (
        <InscriptionMilitantModal
          quartiers={tousQuartiers}
          onInscrire={(data) => {
            const created = store.inscrireMilitant(data);
            return created;
          }}
          onAccessEspace={handleAccessEspaceMilitant}
          onClose={() => setInscriptionModalOpen(false)}
        />
      )}

      {/* Modal d'installation PWA sur mobile et tablette */}
      {installModalOpen && (
        <InstallAppModal onClose={() => setInstallModalOpen(false)} />
      )}
    </div>
  );
}
