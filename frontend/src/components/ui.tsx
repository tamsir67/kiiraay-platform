import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { STATUTS } from '@shared/referentiel.js';
import { ApiError } from '../api/client';

// ------------------------------------------------------------------ Toasts
type Toast = { id: number; msg: string; err?: boolean };
const ToastCtx = createContext<(msg: string, err?: boolean) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((msg: string, err = false) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, msg, err }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), err ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-zone" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast${t.err ? ' err' : ''}`}>
            {t.err ? <XCircle size={16} /> : <CheckCircle2 size={16} />} {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
export const messageErreur = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : 'Erreur inattendue');

// ------------------------------------------------------------------ Overlays
function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
}

export function Drawer({ titre, sousTitre, onClose, children, pied, etroit, entete }: {
  titre: ReactNode; sousTitre?: ReactNode; onClose: () => void; children: ReactNode; pied?: ReactNode; etroit?: boolean; entete?: ReactNode;
}) {
  useEscape(onClose);
  return (
    <div className="drawer-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className={`drawer${etroit ? ' narrow' : ''}`} role="dialog" aria-modal="true">
        <div className="drawer-h">
          <div>
            <h2 style={{ fontSize: 'var(--fs-xl)' }}>{titre}</h2>
            {sousTitre && <div className="muted" style={{ fontSize: 'var(--fs-sm)', marginTop: 2 }}>{sousTitre}</div>}
            {entete}
          </div>
          <button className="btn ghost sm" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="drawer-b">{children}</div>
        {pied && <div className="drawer-f">{pied}</div>}
      </aside>
    </div>
  );
}

export function Modal({ titre, onClose, children, pied }: { titre: ReactNode; onClose: () => void; children: ReactNode; pied?: ReactNode }) {
  useEscape(onClose);
  return (
    <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-h"><h2>{titre}</h2></div>
        <div className="modal-b">{children}</div>
        {pied && <div className="modal-f">{pied}</div>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Petits composants
export const StatutPill = ({ statut }: { statut: string }) => (
  <span className={`pill ${statut}`}>{(STATUTS as any)[statut]?.libelle || statut}</span>
);

export function Notice({ type = 'info', children }: { type?: 'info' | 'warn' | 'crit' | 'ok'; children: ReactNode }) {
  const Ico = { info: Info, warn: AlertTriangle, crit: XCircle, ok: CheckCircle2 }[type];
  return <div className={`notice ${type}`}><Ico size={16} /><div>{children}</div></div>;
}

export function Field({ label, requis, aide, erreur, children, className }: {
  label: string; requis?: boolean; aide?: ReactNode; erreur?: string; children: ReactNode; className?: string;
}) {
  return (
    <label className={`field ${className || ''}`}>
      <span>{label}{requis && <em> *</em>}</span>
      {children}
      {erreur ? <span className="err">{erreur}</span> : aide ? <small>{aide}</small> : null}
    </label>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => <div className="empty">{children}</div>;
export const Chargement = ({ h = 120 }: { h?: number }) => <div className="skeleton" style={{ height: h }} aria-label="Chargement" />;

export function Panel({ titre, hint, actions, children, flush, id }: { titre?: ReactNode; hint?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; id?: string }) {
  return (
    <section className="panel" id={id}>
      {(titre || actions) && (
        <div className="panel-h">
          {titre && <h2>{titre}</h2>}
          {hint && <span className="hint">{hint}</span>}
          {actions}
        </div>
      )}
      {flush ? children : <div className="panel-b">{children}</div>}
    </section>
  );
}

/** Confirmation intégrée (les dialogues natifs ne sont pas utilisés). */
export function Confirmer({ titre, message, libelle = 'Confirmer', danger, onOk, onClose, children }: {
  titre: string; message?: ReactNode; libelle?: string; danger?: boolean; onOk: () => Promise<void> | void; onClose: () => void; children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal titre={titre} onClose={onClose} pied={<>
      <button className="btn" onClick={onClose}>Annuler</button>
      <button className={`btn ${danger ? 'danger' : 'primary'}`} disabled={busy} onClick={async () => { setBusy(true); try { await onOk(); } finally { setBusy(false); } }}>{libelle}</button>
    </>}>
      {message && <p>{message}</p>}
      {children}
    </Modal>
  );
}
