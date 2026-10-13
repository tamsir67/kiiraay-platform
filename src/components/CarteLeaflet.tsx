import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Militant, Commune, Quartier, Role } from '../types';
import { COMMUNES_GUEDIAWAYE, QUARTIERS_GUEDIAWAYE } from '../data/referentiel';
import { COMMUNES_POLYGONS } from '../data/geo';
import { Layers, Eye, Users } from 'lucide-react';

interface CarteLeafletProps {
  militants: Militant[];
  communes?: Commune[];
  quartiers?: Quartier[];
  userRole: Role;
  onSelectMilitant?: (militant: Militant) => void;
  selectedCommuneId?: string;
  onSelectCommune?: (communeId: string) => void;
}

export const CarteLeaflet: React.FC<CarteLeafletProps> = ({
  militants,
  userRole,
  onSelectMilitant,
  selectedCommuneId,
  onSelectCommune
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    polygons: L.LayerGroup;
    quartiers: L.LayerGroup;
    points: L.LayerGroup;
  }>({
    polygons: L.layerGroup(),
    quartiers: L.layerGroup(),
    points: L.layerGroup()
  });

  const [afficherPolygones, setAfficherPolygones] = useState(true);
  const [afficherQuartiers, setAfficherQuartiers] = useState(true);
  const [afficherPoints, setAfficherPoints] = useState(userRole !== 'decideur');

  // Initialisation unique de la carte
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Centrage sur le département de Guédiawaye
    const map = L.map(mapContainerRef.current, {
      center: [14.7735, -17.3941],
      zoom: 13,
      minZoom: 12,
      maxZoom: 18,
      zoomControl: true
    });

    // Fond de carte OpenStreetMap clair
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | KIIRAAY Guédiawaye 2027',
      maxZoom: 19
    }).addTo(map);

    layersRef.current.polygons.addTo(map);
    layersRef.current.quartiers.addTo(map);
    layersRef.current.points.addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Mise à jour des polygones communaux
  useEffect(() => {
    const group = layersRef.current.polygons;
    group.clearLayers();

    if (!afficherPolygones) return;

    COMMUNES_POLYGONS.forEach(geo => {
      const communeData = COMMUNES_GUEDIAWAYE.find(c => c.id === geo.id);
      const isSelected = selectedCommuneId === geo.id;
      const count = militants.filter(m => m.communeId === geo.id).length;
      const objectif = communeData?.objectifMilitants || 10000;
      const taux = Math.round((count / objectif) * 100);

      const polygon = L.polygon(geo.coordonnees, {
        color: geo.couleur,
        weight: isSelected ? 3 : 2,
        opacity: 0.9,
        fillColor: geo.couleur,
        fillOpacity: isSelected ? 0.35 : 0.18
      });

      polygon.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <strong style="font-size: 13px; color: ${geo.couleur};">${geo.nom}</strong><br/>
          <span>Coordonnateur : <b>${communeData?.coordonnateur || '—'}</b></span><br/>
          <span>Militants enregistrés : <b>${count}</b></span><br/>
          <span>Objectif de mobilisation : <b>${objectif.toLocaleString()}</b></span><br/>
          <span style="font-weight: 600; color: #047857;">Taux de mobilisation : ${taux}%</span>
        </div>
      `);

      polygon.on('click', () => {
        if (onSelectCommune) {
          onSelectCommune(geo.id === selectedCommuneId ? 'tous' : geo.id);
        }
      });

      group.addLayer(polygon);
    });
  }, [afficherPolygones, militants, selectedCommuneId, onSelectCommune]);

  // Mise à jour des marqueurs de quartiers
  useEffect(() => {
    const group = layersRef.current.quartiers;
    group.clearLayers();

    if (!afficherQuartiers) return;

    QUARTIERS_GUEDIAWAYE.forEach(q => {
      if (selectedCommuneId && selectedCommuneId !== 'tous' && q.communeId !== selectedCommuneId) {
        return;
      }

      const qMilitants = militants.filter(m => m.quartierId === q.id);
      const count = qMilitants.length;

      // Créer une icône HTML customisée
      const htmlIcon = L.divIcon({
        className: 'custom-quartier-pin',
        html: `
          <div style="
            background: #0f172a; 
            color: #ffffff; 
            border: 2px solid #38bdf8; 
            border-radius: 6px; 
            padding: 2px 5px; 
            font-size: 10px; 
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            text-align: center;
          ">
            ${q.nom} (${count})
          </div>
        `,
        iconSize: [80, 24],
        iconAnchor: [40, 12]
      });

      const marker = L.marker(q.centre, { icon: htmlIcon });
      marker.bindPopup(`
        <div style="font-size: 12px; font-family: sans-serif; line-height: 1.4;">
          <div style="font-weight: bold; font-size: 13px; color: #0f172a; margin-bottom: 3px;">
            ${q.codeQuartier ? `[${q.codeQuartier}] ` : ''}${q.nom}
          </div>
          ${q.typeHabitat ? `<div style="font-size: 11px; color: #0284c7; margin-bottom: 4px;">${q.typeHabitat}</div>` : ''}
          <div>Commissaire : <b>${q.commissaire || 'Non pourvu'}</b></div>
          <div>Superviseur : <b>${q.superviseur || 'Coordination'}</b></div>
          <div>Contact : <span style="font-family: monospace;">${q.telephoneCommissaire || '—'}</span></div>
          <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #e2e8f0; color: #059669; font-weight: 600;">
            Militants enregistrés : ${count} / Objectif ${q.objectif}
          </div>
        </div>
      `);

      group.addLayer(marker);
    });
  }, [afficherQuartiers, militants, selectedCommuneId]);

  // Mise à jour des points de militants individuels
  useEffect(() => {
    const group = layersRef.current.points;
    group.clearLayers();

    // Règle de sécurité CDC §4: le profil Décideur n'a pas accès aux points individuels
    if (!afficherPoints || userRole === 'decideur') return;

    militants.forEach(m => {
      if (!m.latitude || !m.longitude || m.latitude === 0) return;
      if (selectedCommuneId && selectedCommuneId !== 'tous' && m.communeId !== selectedCommuneId) return;

      let color = '#059669'; // Actif
      if (m.statut === 'en_attente') color = '#0284c7';
      else if (m.statut === 'a_verifier') color = '#d97706';
      else if (m.statut === 'desactive') color = '#94a3b8';

      const circle = L.circleMarker([m.latitude, m.longitude], {
        radius: 5,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.9
      });

      const nomAffiche = `${m.prenom} ${m.nom}`;
      const telAffiche = m.telephone;

      circle.bindPopup(`
        <div style="font-size: 11px; line-height: 1.35;">
          <strong>${nomAffiche}</strong> (${m.numeroKry})<br/>
          <span>Statut : <b style="color: ${color};">${m.statut.toUpperCase()}</b></span><br/>
          <span>Téléphone : ${telAffiche}</span><br/>
          <span>Repère : <em>${m.repere}</em></span>
        </div>
      `);

      circle.on('click', () => {
        if (onSelectMilitant) {
          onSelectMilitant(m);
        }
      });

      group.addLayer(circle);
    });
  }, [afficherPoints, militants, selectedCommuneId, userRole, onSelectMilitant]);

  return (
    <div className="relative w-full h-full min-h-[540px] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex flex-col">
      {/* Panneau de contrôle des couches cartographiques */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-md p-2.5 text-xs flex flex-col gap-2 max-w-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 border-b border-slate-100 pb-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-800" />
          <span>Couches cartographiques</span>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900">
          <input
            type="checkbox"
            checked={afficherPolygones}
            onChange={(e) => setAfficherPolygones(e.target.checked)}
            className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
          />
          <span>Limites des 5 communes</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900">
          <input
            type="checkbox"
            checked={afficherQuartiers}
            onChange={(e) => setAfficherQuartiers(e.target.checked)}
            className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
          />
          <span>Étiquettes des 46 quartiers</span>
        </label>

        {userRole !== 'decideur' ? (
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900">
            <input
              type="checkbox"
              checked={afficherPoints}
              onChange={(e) => setAfficherPoints(e.target.checked)}
              className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
            />
            <span>Points individuels des militants</span>
          </label>
        ) : (
          <div className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200">
            Points individuels masqués pour le profil Décideur (CDC §4).
          </div>
        )}

        <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-700 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-800 shrink-0"></span>
            <span>Actif ({militants.filter(m => m.statut === 'actif').length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600 shrink-0"></span>
            <span>En attente ({militants.filter(m => m.statut === 'en_attente').length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0"></span>
            <span>À vérifier ({militants.filter(m => m.statut === 'a_verifier').length})</span>
          </div>
        </div>
      </div>

      {/* Carte Leaflet */}
      <div ref={mapContainerRef} className="flex-1 w-full h-full min-h-[500px]" />
    </div>
  );
};
