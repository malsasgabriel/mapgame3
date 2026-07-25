'use client';

import { useEffect, useRef, useState } from 'react';
import { clampWorldPoint, latLngToXy, xyToLatLng, type WorldPoint } from '@/lib/geo';

type Player = { id: string; name: string; status: string; x: number; y: number; color?: string; moving?: boolean };
type Landmark = WorldPoint & { id: string; name: string; emoji: string; lat: number; lng: number };
type Collectible = WorldPoint & { id: string; icon: string; collected: boolean };
type Props = {
  players: Player[]; currentPlayerId?: string; landmarks: readonly Landmark[]; collectibles: readonly Collectible[];
  path: readonly WorldPoint[]; nightMode: boolean; tileFailureLabel: string;
  focus?: WorldPoint & { nonce: number }; zoomRequest: number;
  onNavigate: (x: number, y: number) => void; onSelectPlayer: (id: string) => void; onLandmarkClick: (id: string) => void;
};

const tileUrl = process.env.NEXT_PUBLIC_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const attribution = process.env.NEXT_PUBLIC_TILE_ATTRIBUTION || '© OpenStreetMap contributors';
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));

export function RealOsloMap({ players, currentPlayerId, landmarks, collectibles, path, nightMode, tileFailureLabel, focus, zoomRequest, onNavigate, onSelectPlayer, onLandmarkClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const markersRef = useRef(new Map<string, import('leaflet').Marker>());
  const markerSignaturesRef = useRef(new Map<string, string>());
  const pathRef = useRef<import('leaflet').Polyline | null>(null);
  const callbacks = useRef({ onNavigate, onSelectPlayer, onLandmarkClick });
  const lastZoomRequest = useRef(0);
  const [ready, setReady] = useState(false);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);

  useEffect(() => { callbacks.current = { onNavigate, onSelectPlayer, onLandmarkClick }; }, [onNavigate, onSelectPlayer, onLandmarkClick]);
  useEffect(() => {
    let cancelled = false;
    let map: import('leaflet').Map | null = null;
    void import('leaflet').then(L => {
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;
      map = L.map(containerRef.current, { center: [59.9139, 10.7522], zoom: 13, minZoom: 11, maxZoom: 18, zoomControl: false, preferCanvas: true, maxBounds: [[59.87, 10.62], [60, 10.88]], maxBoundsViscosity: .85 });
      L.tileLayer(tileUrl, { attribution, maxZoom: 19, updateWhenIdle: true, keepBuffer: 2, crossOrigin: true })
        .on('tileerror', () => setTilesUnavailable(true)).on('tileload', () => setTilesUnavailable(false)).addTo(map);
      map.createPane('game');
      const pane = map.getPane('game'); if (pane) pane.style.zIndex = '650';
      map.on('click', event => { const point = clampWorldPoint(latLngToXy(event.latlng.lat, event.latlng.lng)); callbacks.current.onNavigate(point.x, point.y); });
      mapRef.current = map; setReady(true);
    });
    return () => { cancelled = true; markersRef.current.clear(); markerSignaturesRef.current.clear(); map?.remove(); mapRef.current = null; leafletRef.current = null; };
  }, []);
  useEffect(() => { mapRef.current?.getContainer().classList.toggle('oslo-real-map--night', nightMode); }, [nightMode]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus || focus.nonce === 0) return;
    const point = xyToLatLng(focus.x, focus.y);
    map.flyTo([point.lat, point.lng], Math.max(14, map.getZoom()), { animate: true, duration: 0.35 });
  }, [focus, ready]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || zoomRequest === lastZoomRequest.current) return;
    const delta = zoomRequest - lastZoomRequest.current;
    lastZoomRequest.current = zoomRequest;
    if (delta > 0) map.zoomIn(Math.min(delta, 2));
    if (delta < 0) map.zoomOut(Math.min(-delta, 2));
  }, [zoomRequest, ready]);
  useEffect(() => {
    const map = mapRef.current; const L = leafletRef.current; if (!ready || !map || !L) return;
    const active = new Set<string>();
    const add = (key: string, lat: number, lng: number, html: string, click: () => void) => {
      active.add(key); let marker = markersRef.current.get(key);
      if (!marker) {
        marker = L.marker([lat, lng], { pane: 'game', keyboard: false, icon: L.divIcon({ className: 'oslo-marker-shell', html, iconSize: [1, 1] }) }).addTo(map);
        markersRef.current.set(key, marker);
        markerSignaturesRef.current.set(key, html);
      } else if (markerSignaturesRef.current.get(key) !== html) {
        marker.setIcon(L.divIcon({ className: 'oslo-marker-shell', html, iconSize: [1, 1] }));
        markerSignaturesRef.current.set(key, html);
      }
      marker.setLatLng([lat, lng]); marker.off('click').on('click', click);
    };
    landmarks.forEach(item => add(`landmark:${item.id}`, item.lat, item.lng, `<button class="oslo-landmark" aria-label="${escape(item.name)}"><span>${escape(item.emoji)}</span><small>${escape(item.name)}</small></button>`, () => callbacks.current.onLandmarkClick(item.id)));
    collectibles.filter(item => !item.collected).forEach(item => { const point = xyToLatLng(item.x, item.y); add(`collectible:${item.id}`, point.lat, point.lng, `<button class="oslo-collectible" aria-label="Collect">${escape(item.icon)}</button>`, () => callbacks.current.onNavigate(item.x, item.y)); });
    players.forEach(item => { const point = xyToLatLng(item.x, item.y); const me = item.id === currentPlayerId; add(`player:${item.id}`, point.lat, point.lng, `<button class="oslo-pin ${me ? 'oslo-pin--me' : ''}"><b>${escape(item.name.split(' ')[0])}</b><span>${escape(item.status || '')}</span></button>`, () => callbacks.current.onSelectPlayer(item.id)); });
    for (const [key, marker] of markersRef.current) if (!active.has(key)) { marker.remove(); markersRef.current.delete(key); markerSignaturesRef.current.delete(key); }
    const points = path.map(point => { const latLng = xyToLatLng(point.x, point.y); return [latLng.lat, latLng.lng] as [number, number]; });
    if (points.length > 1) { if (!pathRef.current) pathRef.current = L.polyline(points, { pane: 'game', color: '#264653', weight: 4, dashArray: '10 8' }).addTo(map); else pathRef.current.setLatLngs(points); } else { pathRef.current?.remove(); pathRef.current = null; }
  }, [ready, players, currentPlayerId, landmarks, collectibles, path]);
  return <><div ref={containerRef} className="oslo-real-map" aria-label="Real Oslo street map" />{tilesUnavailable && <div className="oslo-map-tile-warning" role="status">{tileFailureLabel}</div>}</>;
}
