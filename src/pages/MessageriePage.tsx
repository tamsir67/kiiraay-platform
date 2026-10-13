import React, { useState } from 'react';
import { MessageDiscussion, Utilisateur } from '../types';
import { DEMO_USERS } from '../data/referentiel';
import { MessageSquare, Send, Mail, User, Clock, AlertCircle, ArrowLeft } from 'lucide-react';

interface MessageriePageProps {
  messages: MessageDiscussion[];
  currentUser: Utilisateur;
  onEnvoyerMessage: (destinataireId: string, objet: string, contenu: string, priorite: 'normale' | 'urgente') => void;
}

export const MessageriePage: React.FC<MessageriePageProps> = ({
  messages,
  currentUser,
  onEnvoyerMessage
}) => {
  const [selectedMessage, setSelectedMessage] = useState<MessageDiscussion | null>(messages[0] || null);
  const [modalNouveau, setModalNouveau] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const [destinataireId, setDestinataireId] = useState(DEMO_USERS[0].id);
  const [objet, setObjet] = useState('');
  const [contenu, setContenu] = useState('');
  const [priorite, setPriorite] = useState<'normale' | 'urgente'>('normale');

  // Destinataires éligibles selon les règles du CDC
  const destinatairesPossibles = DEMO_USERS.filter(u => u.id !== currentUser.id);

  const handleEnvoyer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objet.trim() || !contenu.trim()) return;

    onEnvoyerMessage(destinataireId, objet.trim(), contenu.trim(), priorite);
    setModalNouveau(false);
    setObjet('');
    setContenu('');
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Messagerie Interne Sécurisée
          </h1>
          <p className="text-xs text-slate-700 mt-0.5">
            Échanges directs et confidentiels entre responsables communaux, commissaires et militants
          </p>
        </div>

        <button
          onClick={() => setModalNouveau(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors w-fit"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Nouveau message</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-6 min-h-[500px] md:h-[600px] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {/* Liste des discussions */}
        <div className={`${showMobileDetail ? 'hidden md:block' : 'block'} border-r border-slate-200 overflow-y-auto divide-y divide-slate-100`}>
          <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-700">
            Boîte de réception ({messages.length})
          </div>

          {messages.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Aucun message pour le moment.
            </div>
          ) : (
            messages.map(m => {
              const isSelected = selectedMessage?.id === m.id;

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedMessage(m);
                    setShowMobileDetail(true);
                  }}
                  className={`p-3.5 cursor-pointer transition-colors text-xs space-y-1 ${
                    isSelected ? 'bg-sky-50/70 border-l-4 border-sky-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate">{m.expediteurNom}</span>
                    <span className="text-[10px] text-slate-700 font-mono">{m.dateEnvoi.split(' ')[1]}</span>
                  </div>
                  <div className="font-semibold text-slate-800 truncate">{m.objet}</div>
                  <div className="text-slate-700 truncate text-[11px]">{m.contenu}</div>
                  {m.priorite === 'urgente' && (
                    <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                      URGENT
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Détail du message sélectionné */}
        <div className={`${showMobileDetail ? 'flex' : 'hidden md:flex'} md:col-span-2 p-4 sm:p-6 flex-col justify-between overflow-y-auto`}>
          {showMobileDetail && (
            <button
              onClick={() => setShowMobileDetail(false)}
              className="md:hidden inline-flex items-center gap-1.5 text-xs text-sky-700 font-bold mb-3 pb-2 border-b border-slate-100"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Retour aux discussions</span>
            </button>
          )}
          {selectedMessage ? (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">{selectedMessage.objet}</h2>
                  {selectedMessage.priorite === 'urgente' && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700">
                      Priorité Haute
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-700 mt-2 space-y-0.5">
                  <p>De : <b className="text-slate-900">{selectedMessage.expediteurNom}</b></p>
                  <p>À : <b className="text-slate-900">{selectedMessage.destinataireNom}</b></p>
                  <p className="font-mono text-slate-700 text-[11px]">Date : {selectedMessage.dateEnvoi}</p>
                </div>
              </div>

              <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {selectedMessage.contenu}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Sélectionnez un message dans la liste.
            </div>
          )}

          <div className="mt-6 pt-3 border-t border-slate-100 text-[11px] text-slate-700 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-emerald-800" />
            <span>Chiffrement des échanges · Le contenu des correspondances privées n’est pas journalisé (CDC §5.6).</span>
          </div>
        </div>
      </div>

      {/* Modal Nouveau Message */}
      {modalNouveau && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 mb-1">Composer un nouveau message</h3>
            <p className="text-xs text-slate-700 mb-4">
              Transmettez vos directives ou posez vos questions à l'équipe départementale.
            </p>

            <form onSubmit={handleEnvoyer} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Destinataire</label>
                <select
                  value={destinataireId}
                  onChange={e => setDestinataireId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                >
                  {destinatairesPossibles.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.nomComplet} ({u.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Objet du message</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Point d'étape réunion de cellule..."
                  value={objet}
                  onChange={e => setObjet(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Priorité</label>
                <select
                  value={priorite}
                  onChange={e => setPriorite(e.target.value as 'normale' | 'urgente')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                >
                  <option value="normale">Normale</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Rédigez votre message ici..."
                  value={contenu}
                  onChange={e => setContenu(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalNouveau(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm"
                >
                  Envoyer le message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
