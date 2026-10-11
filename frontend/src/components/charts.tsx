// Graphiques SVG légers, accessibles, conformes au thème (clair / sombre).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/** Largeur réelle du conteneur : le SVG est dessiné à l'échelle 1 (textes lisibles). */
function useLargeur(defaut = 560) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(defaut);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(220, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}
import { n, pct } from '../lib/format';

/** Barres horizontales avec repère d'objectif (une seule série, étiquettes directes). */
export function BarList({ items, onSelect, max }: {
  items: { id?: number; label: string; value: number; objectif?: number | null; sub?: ReactNode }[];
  onSelect?: (id: number) => void; max?: number;
}) {
  const m = max ?? Math.max(1, ...items.map((i) => Math.max(i.value, i.objectif || 0)));
  return (
    <div className="bars">
      {items.map((it) => {
        const contenu = (
          <>
            <span className="lbl" title={it.label}>{it.label}</span>
            <span className="track">
              <span className="fill" style={{ width: `${(it.value / m) * 100}%` }} />
              {it.objectif ? <span className="goal" style={{ left: `calc(${(it.objectif / m) * 100}% - 1px)` }} title={`Objectif : ${n(it.objectif)}`} /> : null}
            </span>
            <span className="val">{n(it.value)}{it.sub && <small>{it.sub}</small>}</span>
          </>
        );
        return onSelect && it.id != null
          ? <button key={it.label} className="bar-row" onClick={() => onSelect(it.id!)} aria-label={`${it.label} : ${n(it.value)}`}>{contenu}</button>
          : <div key={it.label} className="bar-row">{contenu}</div>;
      })}
    </div>
  );
}

/** Barre de proportion à deux segments (ex. femmes / hommes). */
export function SplitBar({ a, b }: { a: { label: string; value: number }; b: { label: string; value: number } }) {
  const t = a.value + b.value || 1;
  const pa = (a.value / t) * 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 2, height: 22 }} role="img" aria-label={`${a.label} ${pct(pa, 1)}, ${b.label} ${pct(100 - pa, 1)}`}>
        <div style={{ width: `${pa}%`, background: 'var(--series-1)', borderRadius: '4px 0 0 4px' }} />
        <div style={{ flex: 1, background: 'var(--series-2)', borderRadius: '0 4px 4px 0' }} />
      </div>
      <div className="legend" style={{ justifyContent: 'space-between' }}>
        <span><i style={{ background: 'var(--series-1)' }} />{a.label} <b className="num">{n(a.value)}</b> · {pct(pa, 1)}</span>
        <span><i style={{ background: 'var(--series-2)' }} />{b.label} <b className="num">{n(b.value)}</b> · {pct(100 - pa, 1)}</span>
      </div>
    </div>
  );
}

function ticks(max: number, count = 4) {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw) || raw;
  const out: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) out.push(Math.round(v));
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}

/** Histogramme vertical (une série) avec infobulle au survol. */
export function Columns({ data, height = 180, couleur = 'var(--leaf)', format = n }: {
  data: { label: string; value: number; detail?: string }[]; height?: number; couleur?: string; format?: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [box, W] = useLargeur();
  const H = height, padL = 40, padB = 24, padT = 8;
  const t = ticks(Math.max(...data.map((d) => d.value), 1));
  const max = t[t.length - 1];
  const bw = (W - padL) / data.length;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  return (
    <div className="chart" ref={box} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ height: H }} role="img" aria-label={data.map((d) => `${d.label} : ${format(d.value)}`).join(', ')}>
        {t.map((v) => (
          <g key={v}>
            <line className="gridline" x1={padL} x2={W} y1={y(v)} y2={y(v)} />
            <text x={padL - 6} y={y(v) + 4} textAnchor="end">{n(v)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + i * bw + bw * 0.18, w = bw * 0.64, h = Math.max(0, y(0) - y(d.value));
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)}>
              <rect x={padL + i * bw} y={padT} width={bw} height={H - padT - padB} fill="transparent" />
              <path d={`M${x},${y(0)} v${-Math.max(0, h - 4)} q0,-4 4,-4 h${w - 8} q4,0 4,4 v${Math.max(0, h - 4)} z`}
                fill={couleur} opacity={hover == null || hover === i ? 1 : 0.55} />
              {(bw >= 34 || (data.length - 1 - i) % 2 === 0) && <text x={x + w / 2} y={H - 7} textAnchor="middle">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="tooltip" style={{ left: `${((padL + hover * bw + bw / 2) / W) * 100}%`, top: `${(y(data[hover].value) / H) * 100}%` }}>
          <div className="muted">{data[hover].label}</div>
          <b>{format(data[hover].value)}</b>{data[hover].detail && <div className="muted">{data[hover].detail}</div>}
        </div>
      )}
    </div>
  );
}

/** Courbe (aire) cumulée avec réticule et infobulle. */
export function AreaLine({ data, height = 190, objectif }: { data: { label: string; value: number; extra?: string }[]; height?: number; objectif?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [box, W] = useLargeur();
  const H = height, padL = 46, padB = 24, padT = 10;
  const t = useMemo(() => ticks(Math.max(...data.map((d) => d.value), objectif || 0, 1)), [data, objectif]);
  const max = t[t.length - 1];
  const x = (i: number) => padL + (i * (W - padL - 8)) / Math.max(1, data.length - 1);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - padL) / (W - padL - 8)) * (data.length - 1)))));
  };
  const last = data.length - 1;
  return (
    <div className="chart" ref={box} onMouseLeave={() => setHover(null)}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} style={{ height: H }} onMouseMove={onMove} role="img" aria-label={`Évolution : ${data.map((d) => `${d.label} ${n(d.value)}`).join(', ')}`}>
        <defs>
          <linearGradient id="kry-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--leaf)" stopOpacity=".28" />
            <stop offset="1" stopColor="var(--leaf)" stopOpacity=".02" />
          </linearGradient>
        </defs>
        {t.map((v) => (
          <g key={v}>
            <line className="gridline" x1={padL} x2={W} y1={y(v)} y2={y(v)} />
            <text x={padL - 6} y={y(v) + 4} textAnchor="end">{v >= 1000 ? `${n(v / 1000)} k` : n(v)}</text>
          </g>
        ))}
        {objectif ? (
          <g>
            <line x1={padL} x2={W} y1={y(objectif)} y2={y(objectif)} stroke="var(--fg-2)" strokeDasharray="4 4" strokeWidth={1.5} />
            <text x={W - 4} y={y(objectif) - 5} textAnchor="end" style={{ fill: 'var(--fg-2)', fontWeight: 600 }}>Objectif {n(objectif)}</text>
          </g>
        ) : null}
        <path d={area} fill="url(#kry-area)" />
        <path d={line} fill="none" stroke="var(--leaf)" strokeWidth={2} strokeLinejoin="round" />
        {data.map((d, i) => ((last - i) % (W < 420 ? 3 : 2) === 0 ? <text key={d.label} x={x(i)} y={H - 7} textAnchor="middle">{d.label}</text> : null))}
        <circle cx={x(last)} cy={y(data[last]?.value || 0)} r={4.5} fill="var(--leaf)" stroke="var(--surface)" strokeWidth={2} />
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={y(0)} stroke="var(--line-strong)" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r={5} fill="var(--leaf)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover != null && (
        <div className="tooltip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(data[hover].value) / H) * 100}%` }}>
          <div className="muted">{data[hover].label}</div>
          <b>{n(data[hover].value)}</b> militants{data[hover].extra && <div className="muted">{data[hover].extra}</div>}
        </div>
      )}
    </div>
  );
}
