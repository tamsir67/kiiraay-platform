import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from './leafletGlobal';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';
import { ChevronLeft, Download, Layers } from 'lucide-react';
import { api } from '../api/client';
import { useFiltres, paramsFiltres } from '../lib/filtres';
import { useAuth } from '../lib/auth';
import { n, pct } from '../lib/format';
import { useToast } from './ui';

type Mode = 'couverture' | 'densite' | 'points';
const SEUILS = [25, 50, 75, 100];
const classe = (taux: number | null) => (taux == null ? -1 : SEUILS.filter((s) => taux >= s).length);
const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/**
 * Carte de couverture de Guédiawaye (CDC §9) : limites communales et
 * quartiers, choroplèthe de couverture, densité (heatmap) et points.
 * Les filtres sont synchronisés : cliquer une commune ou un quartier filtre
 * tout le tableau de bord.
 */
export function Carte({ hauteur = 'normal', modeInitial = 'couverture' }: { hauteur?: 'normal' | 'tall'; modeInitial?: Mode }) {
  const { f, set } = useFiltres();
  const { can } = useAuth();
  const toast = useToast();
  const box = useRef<HTMLDivElement>(null);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const couches = useRef<L.LayerGroup | null>(null);
  const [mode, setMode] = useState<Mode>(modeInitial);
  const [theme, setTheme] = useState(0);
  const pointsOk = can('carte:points');
  const params = paramsFiltres(f, { periode: false });

  const { data: geo } = useQuery({
    queryKey: ['carte-territoires', params.responsable, params.statut],
    queryFn: () => api.get('/carte/territoires', { responsable: params.responsable, statut: params.statut }),
  });
  const { data: pts } = useQuery({
    queryKey: ['carte-points', params],
    queryFn: () => api.get('/carte/points', params),
    enabled: pointsOk && mode !== 'couverture',
  });

  // Ré-applique les couleurs quand le thème change
  useEffect(() => {
    const mo = new MutationObserver(() => setTheme((t) => t + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const h = () => setTheme((t) => t + 1);
    mq?.addEventListener?.('change', h);
    return () => { mo.disconnect(); mq?.removeEventListener?.('change', h); };
  }, []);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, preferCanvas: false, zoomSnap: 0.25, minZoom: 12, maxZoom: 18 });
    m.setView([14.78, -17.39], 13.5);
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    const tuiles = import.meta.env.VITE_TILE_URL;
    if (tuiles) L.tileLayer(tuiles, { attribution: import.meta.env.VITE_TILE_ATTRIBUTION || '', opacity: 0.55, crossOrigin: true }).addTo(m);
    m.attributionControl.setPrefix('Limites indicatives — à valider (ANAT)');
    couches.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, []);

  const features = useMemo(() => (geo?.features || []) as any[], [geo]);
  const communes = features.filter((x) => x.properties.niveau === 'commune');
  const quartiers = features.filter((x) => x.properties.niveau === 'quartier');

  // Rendu des couches
  useEffect(() => {
    const m = map.current, g = couches.current;
    if (!m || !g || !features.length) return;
    g.clearLayers();
    const seq = [0, 1, 2, 3, 4].map((i) => css(`--seq-${i}`));
    const none = css('--seq-none'), ligne = css('--map-line'), ink = css('--fg'), crit = css('--crit'), leaf = css('--leaf');
    const focusCommune = f.commune;

    const qs = quartiers.filter((q) => !focusCommune || q.properties.commune_id === focusCommune);
    const avecTaux = (p: any) => (p.objectif ? (p.actifs / p.objectif) * 100 : null);

    // Quartiers
    L.geoJSON({ type: 'FeatureCollection', features: qs } as any, {
      style: (ft: any) => {
        const p = ft.properties, c = classe(avecTaux(p));
        const sel = f.quartier === p.id;
        return {
          color: p.nb_commissaires ? (sel ? ink : ligne) : crit,
          weight: sel ? 3 : p.nb_commissaires ? 1.2 : 1.6,
          dashArray: p.nb_commissaires ? undefined : '4 3',
          fillColor: mode === 'couverture' ? (c < 0 ? none : seq[c]) : none,
          fillOpacity: mode === 'couverture' ? 0.92 : 0.5,
        };
      },
      onEachFeature: (ft: any, layer) => {
        const p = ft.properties, t = avecTaux(p);
        layer.bindTooltip(
          `<b>${p.nom}</b><br><span style="color:var(--muted)">${p.commune}</span><br>` +
          `<b>${n(p.actifs)}</b> militants · objectif ${n(p.objectif)}<br>Couverture <b>${pct(t == null ? null : Math.round(t))}</b>` +
          (p.nb_commissaires ? `<br>${p.nb_commissaires} commissaire(s)` : `<br><b style="color:var(--crit)">Sans commissaire</b>`),
          { sticky: true, className: 'kry-tip', direction: 'top', offset: [0, -8] });
        layer.on('click', () => set({ commune: p.commune_id, quartier: f.quartier === p.id ? undefined : p.id }));
        if (focusCommune) {
          L.tooltip({ permanent: true, direction: 'center', className: 'map-label q', interactive: false })
            .setLatLng([p.centre[1], p.centre[0]]).setContent(p.nom).addTo(g);
        }
      },
    }).addTo(g);

    // Communes (limites + étiquettes)
    L.geoJSON({ type: 'FeatureCollection', features: communes } as any, {
      style: (ft: any) => ({
        color: ink, weight: focusCommune === ft.properties.id ? 3 : 2, fill: !focusCommune || focusCommune !== ft.properties.id,
        fillOpacity: focusCommune && focusCommune !== ft.properties.id ? 0.35 : 0, fillColor: css('--bg'), opacity: 0.85,
      }),
      interactive: !!focusCommune,
      onEachFeature: (ft: any, layer) => {
        if (focusCommune && focusCommune !== ft.properties.id) layer.on('click', () => set({ commune: ft.properties.id }));
        if (!focusCommune) {
          L.tooltip({ permanent: true, direction: 'center', className: 'map-label', interactive: false })
            .setLatLng([ft.properties.centre[1], ft.properties.centre[0]])
            .setContent(`${ft.properties.nom}<br><span style="font-weight:500;font-size:11px">${n(ft.properties.actifs)} militants</span>`).addTo(g);
        }
      },
    }).addTo(g);

    // Densité
    if (mode === 'densite') {
      const data = pointsOk && pts?.points
        ? pts.points.map((p: any) => [p[1], p[0], 0.6])
        : qs.map((q) => [q.properties.centre[1], q.properties.centre[0], Math.min(1, q.properties.actifs / 300)]);
      (L as any).heatLayer(data, {
        radius: pointsOk ? 14 : 38, blur: pointsOk ? 18 : 30, minOpacity: 0.25, maxZoom: 16,
        gradient: { 0.2: seq[1], 0.45: seq[2], 0.7: seq[3], 1: seq[4] },
      }).addTo(g);
    }
    // Points géolocalisés (canvas pour la performance)
    if (mode === 'points' && pts?.points) {
      const rendu = L.canvas({ padding: 0.3 });
      for (const p of pts.points) {
        L.circleMarker([p[1], p[0]], { renderer: rendu, radius: 2.6, weight: 0.6, color: ligne, fillColor: p[2] === 'ACTIF' ? leaf : css('--warn'), fillOpacity: 0.85 }).addTo(g);
      }
    }

    // Cadrage
    // Cadrage sur les quartiers visibles (périmètre de l'utilisateur, commune sélectionnée)
    const b = L.geoJSON({ type: 'FeatureCollection', features: qs.length ? qs : communes } as any).getBounds();
    if (b.isValid()) m.flyToBounds(b, { padding: [24, 24], duration: 0.5 });
  }, [features, f.commune, f.quartier, mode, pts, theme]); // eslint-disable-line react-hooks/exhaustive-deps

  async function exporter() {
    if (!box.current) return;
    try {
      const { toPng } = await import('html-to-image');
      const url = await toPng(box.current, { backgroundColor: css('--surface'), pixelRatio: 2, filter: (node) => !(node as HTMLElement).classList?.contains('map-tools') });
      if (import.meta.env.VITE_DEMO === 'true') throw new Error("Le téléchargement est bloqué dans la démo en ligne ; il fonctionne dans la plateforme installée.");
      const a = document.createElement('a');
      a.href = url; a.download = `carte_kiiraay_${new Date().toISOString().slice(0, 10)}.png`; a.click();
      toast('Vue cartographique exportée (PNG)');
    } catch (e: any) { toast(e.message || 'Export impossible', true); }
  }

  const nomCommune = communes.find((c) => c.properties.id === f.commune)?.properties.nom;
  const nomQuartier = quartiers.find((q) => q.properties.id === f.quartier)?.properties.nom;

  return (
    <div ref={box} className={`map-box${hauteur === 'tall' ? ' tall' : ''}`}>
      <div ref={el} style={{ position: 'absolute', inset: 0 }} aria-label="Carte de couverture du département de Guédiawaye" />
      <div className="map-crumb">
        {f.commune ? (
          <button className="btn ghost sm" style={{ padding: '2px 4px' }} onClick={() => set({ commune: undefined })} aria-label="Revenir au département"><ChevronLeft size={14} /></button>
        ) : null}
        <span>Guédiawaye{nomCommune && ` › ${nomCommune}`}{nomQuartier && ` › ${nomQuartier}`}</span>
      </div>
      <div className="map-tools">
        <div className="seg" role="group" aria-label="Mode d'affichage">
          <button aria-pressed={mode === 'couverture'} onClick={() => setMode('couverture')}><Layers size={12} style={{ verticalAlign: -2 }} /> Couverture</button>
          <button aria-pressed={mode === 'densite'} onClick={() => setMode('densite')}>Densité</button>
          {pointsOk && <button aria-pressed={mode === 'points'} onClick={() => setMode('points')}>Points</button>}
        </div>
        <button className="btn sm" onClick={exporter} title="Exporter la vue pour une réunion"><Download size={13} /> PNG</button>
      </div>
      <div className="map-legend">
        {mode === 'couverture' ? (
          <>
            <b>Couverture des objectifs</b>
            <div className="steps">{[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ background: `var(--seq-${i})` }} />)}</div>
            <div className="ticks"><span>0</span><span>25</span><span>50</span><span>75</span><span>100 %+</span></div>
          </>
        ) : mode === 'densite' ? (
          <><b>Densité de militants</b><span className="muted">{pointsOk ? 'Positions géolocalisées' : 'Agrégée par quartier'}</span></>
        ) : (
          <>
            <b>{n(pts?.total)} militants géolocalisés</b>
            <span className="legend"><span><i style={{ background: 'var(--leaf)', borderRadius: '50%' }} />Actif</span><span><i style={{ background: 'var(--warn)', borderRadius: '50%' }} />Autre statut</span></span>
          </>
        )}
        <span className="legend"><span><i style={{ border: '1.5px dashed var(--crit)', background: 'transparent' }} />Quartier sans commissaire</span></span>
      </div>
    </div>
  );
}
