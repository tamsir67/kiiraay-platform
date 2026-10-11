// Client HTTP de l'API KIIRAAY.
// - Jeton d'accès conservé en mémoire uniquement (jamais dans localStorage)
// - Rafraîchissement transparent via cookie httpOnly (/api/auth/refresh)
// - En mode démo (VITE_DEMO), les appels sont servis par un faux backend local
export const DEMO = import.meta.env.VITE_DEMO === 'true';

export class ApiError extends Error {
  status: number; code?: string; details?: any; champs?: { champ: string; message: string }[];
  constructor(status: number, body: any) {
    super(body?.erreur || `Erreur ${status}`);
    this.status = status; this.code = body?.code; this.details = body?.details; this.champs = body?.champs;
  }
}

let accessToken: string | null = null;
let onSessionLost: (() => void) | null = null;
export const setAccessToken = (t: string | null) => { accessToken = t; };
export const setOnSessionLost = (fn: () => void) => { onSessionLost = fn; };

type Params = Record<string, any> | undefined;
export const qs = (p: Params) => {
  if (!p) return '';
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : '';
};

let refreshing: Promise<boolean> | null = null;
async function refresh(): Promise<boolean> {
  if (DEMO) return false;
  if (!refreshing) {
    refreshing = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) return false;
        const d = await r.json();
        accessToken = d.accessToken;
        return true;
      })
      .catch(() => false)
      .finally(() => { setTimeout(() => { refreshing = null; }, 0); });
  }
  return refreshing;
}

async function brut(method: string, path: string, body?: any, params?: Params, retry = true): Promise<Response> {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(`/api${path}${qs(params)}`, {
    method,
    credentials: 'include',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  if (res.status === 401 && retry && !path.startsWith('/auth/login')) {
    if (await refresh()) return brut(method, path, body, params, false);
    onSessionLost?.();
  }
  return res;
}

async function requete<T>(method: string, path: string, body?: any, params?: Params): Promise<T> {
  if (DEMO) {
    const { demoFetch } = await import('../demo/mockApi');
    return demoFetch(method, path, body, params) as Promise<T>;
  }
  const res = await brut(method, path, body, params);
  const txt = await res.text();
  const data = txt ? JSON.parse(txt) : null;
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const api = {
  get: <T = any>(path: string, params?: Params) => requete<T>('GET', path, undefined, params),
  post: <T = any>(path: string, body?: any, params?: Params) => requete<T>('POST', path, body ?? {}, params),
  put: <T = any>(path: string, body?: any, params?: Params) => requete<T>('PUT', path, body, params),
  delete: <T = any>(path: string) => requete<T>('DELETE', path),
  /** Téléchargement d'un fichier (export) : déclenche l'enregistrement côté navigateur. */
  async telecharger(path: string, params?: Params) {
    if (DEMO) throw new ApiError(400, { erreur: "Les téléchargements sont désactivés dans la démo en ligne. Ils fonctionnent dans la plateforme installée (CSV / Excel, journalisés)." });
    const res = await brut('GET', path, undefined, params);
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})));
    const blob = await res.blob();
    const nom = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || 'export';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
  refresh,
};
