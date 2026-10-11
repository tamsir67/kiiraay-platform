export const nf = new Intl.NumberFormat('fr-FR');
export const n = (v: number | null | undefined) => (v == null ? '—' : nf.format(v));
export const pct = (v: number | null | undefined, d = 0) => (v == null ? '—' : `${v.toLocaleString('fr-FR', { maximumFractionDigits: d })} %`);
export const date = (v?: string | null) => (v ? new Date(v.length === 10 ? `${v}T12:00:00` : v).toLocaleDateString('fr-FR') : '—');
export const dateHeure = (v?: string | null) => (v ? new Date(v).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
export const tel = (e164?: string | null) => {
  if (!e164) return '—';
  const l = e164.replace(/^\+221/, '');
  return l.length === 9 ? `${l.slice(0, 2)} ${l.slice(2, 5)} ${l.slice(5, 7)} ${l.slice(7)}` : e164;
};
export const initiales = (p?: string, nom?: string) => `${(p || '?')[0]}${(nom || '')[0] || ''}`.toUpperCase();
export const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const moisCourt = (ym: string) => { const [y, m] = ym.split('-'); return `${MOIS[Number(m) - 1]} ${y.slice(2)}`; };
export const relatif = (v?: string | null) => {
  if (!v) return '—';
  const j = Math.round((Date.now() - new Date(v).getTime()) / 86400000);
  if (j <= 0) return "aujourd'hui"; if (j === 1) return 'hier'; if (j < 31) return `il y a ${j} j`;
  if (j < 365) return `il y a ${Math.round(j / 30)} mois`; return `il y a ${(j / 365).toFixed(1).replace('.', ',')} an(s)`;
};
