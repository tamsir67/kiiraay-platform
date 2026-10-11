import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send } from 'lucide-react';
import { api } from '../api/client';
import { Page } from '../components/Layout';
import { Chargement, Empty, Field, Notice, Panel, messageErreur, useToast } from '../components/ui';
import { useAuth } from '../lib/auth';
import { dateHeure } from '../lib/format';

export function Messagerie() {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [active, setActive] = useState('');
  const [destinataire, setDestinataire] = useState('');
  const [texte, setTexte] = useState('');
  const [busy, setBusy] = useState(false);
  const { data: contacts = [], isLoading: contactsLoading, error: contactsError } = useQuery({
    queryKey: ['messagerie-contacts'], queryFn: () => api.get('/messagerie/contacts'),
  });
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'], queryFn: () => api.get('/messagerie/conversations'), refetchInterval: 8000,
  });
  const { data: messages = [], isLoading: messagesLoading, error: messagesError } = useQuery({
    queryKey: ['messages', active], queryFn: () => api.get(`/messagerie/conversations/${active}/messages`), enabled: !!active, refetchInterval: 5000,
  });

  useEffect(() => {
    if (!active && conversations.length) setActive(conversations[0].id);
  }, [active, conversations]);

  async function ouvrirConversation(e: FormEvent) {
    e.preventDefault();
    if (!destinataire) return;
    try {
      const conversation = await api.post('/messagerie/conversations', { utilisateur_id: Number(destinataire) });
      setActive(conversation.id);
      setDestinataire('');
      qc.invalidateQueries({ queryKey: ['conversations'] });
    } catch (e) { toast(messageErreur(e), true); }
  }

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    if (!active || !texte.trim()) return;
    setBusy(true);
    try {
      await api.post(`/messagerie/conversations/${active}/messages`, { contenu: texte });
      setTexte('');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['messages', active] }),
        qc.invalidateQueries({ queryKey: ['conversations'] }),
      ]);
    } catch (e) { toast(messageErreur(e), true); } finally { setBusy(false); }
  }

  const selection = conversations.find((c: any) => c.id === active);
  return (
    <Page eyebrow="Communication" titre="Messagerie">
      {contactsError && <Notice type="crit">{messageErreur(contactsError)}</Notice>}
      <div className="messagerie-layout">
        <Panel titre="Conversations" flush>
          <form className="messagerie-new" onSubmit={ouvrirConversation}>
            <Field label="Nouvelle conversation">
              <select className="input" value={destinataire} onChange={(e) => setDestinataire(e.target.value)}>
                <option value="">Choisir un utilisateur…</option>
                {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.prenoms} {c.nom} · {c.role}</option>)}
              </select>
            </Field>
            <button className="btn primary" disabled={!destinataire}><MessageCircle size={14} /> Ouvrir</button>
          </form>
          <div className="messagerie-list">
            {conversationsLoading || contactsLoading ? <Chargement h={100} /> : conversations.length ? conversations.map((c: any) => (
              <button key={c.id} type="button" className={`messagerie-item${active === c.id ? ' active' : ''}`} onClick={() => setActive(c.id)}>
                <span className="messagerie-avatar">{c.prenoms?.[0]}{c.nom?.[0]}</span>
                <span className="messagerie-summary"><b>{c.prenoms} {c.nom}</b><small>{c.dernier_message || c.role}</small></span>
                {c.non_lus > 0 && <span className="messagerie-unread">{c.non_lus}</span>}
              </button>
            )) : <Empty>Choisissez un utilisateur pour commencer.</Empty>}
          </div>
        </Panel>
        <section className="panel messagerie-chat" aria-label="Conversation">
          {selection ? <>
            <header className="messagerie-chat-head">
              <div><h2>{selection.prenoms} {selection.nom}</h2><span className="muted">{selection.role}</span></div>
            </header>
            {messagesError && <Notice type="crit">{messageErreur(messagesError)}</Notice>}
            <div className="messagerie-messages" aria-live="polite">
              {messagesLoading ? <Chargement h={130} /> : messages.length ? messages.map((m: any) => (
                <article key={m.id} className={`message-bulle${m.auteur_id === user?.id ? ' own' : ''}`}>
                  <p>{m.contenu}</p><time>{dateHeure(m.created_at)}</time>
                </article>
              )) : <Empty>Aucun message dans cette conversation.</Empty>}
            </div>
            <form className="messagerie-compose" onSubmit={envoyer}>
              <textarea className="input" aria-label="Votre message" placeholder="Écrire un message…" value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={4000} rows={2} />
              <button className="btn primary" disabled={busy || !texte.trim()} aria-label="Envoyer"><Send size={16} /></button>
            </form>
          </> : <div className="messagerie-empty"><MessageCircle size={28} /><p>Sélectionnez une conversation ou écrivez à un utilisateur.</p></div>}
        </section>
      </div>
    </Page>
  );
}