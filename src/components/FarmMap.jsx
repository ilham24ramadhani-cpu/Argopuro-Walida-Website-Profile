import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  farmId,
  farmPolygons,
  isSoldOut,
  polygonColor,
} from '../utils/polygon';

export default function FarmMap({ items, selectedId, onSelect }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layersRef = useRef([]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return undefined;
    const map = L.map(mapRef.current).setView([-7.85, 113.46], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    mapInstance.current = map;
    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    layersRef.current.forEach((layer) => map.removeLayer(layer));
    layersRef.current = [];

    const allPts = [];
    const selectedPts = [];

    (items || []).forEach((item) => {
      const id = farmId(item);
      const active = selectedId === id;
      const color = polygonColor(item, active);
      const soldOut = isSoldOut(item);

      farmPolygons(item).forEach((poly) => {
        const layer = L.polygon(poly.latlngs, {
          color: active ? '#004d47' : color,
          weight: active ? 3.5 : 2,
          fillColor: color,
          fillOpacity: active ? 0.55 : soldOut ? 0.4 : 0.28,
        }).addTo(map);
        layer.on('click', () => onSelect?.(id));
        layersRef.current.push(layer);
        poly.latlngs.forEach((ll) => {
          allPts.push(ll);
          if (active) selectedPts.push(ll);
        });
      });
    });

    const pts = selectedPts.length ? selectedPts : allPts;
    if (pts.length) {
      map.fitBounds(pts, { padding: [36, 36], maxZoom: 16 });
    }
    setTimeout(() => map.invalidateSize(), 80);
  }, [items, selectedId, onSelect]);

  return <div ref={mapRef} className="map-root" />;
}
