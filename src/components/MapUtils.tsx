import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Stop } from '../types';

export function ViewAutoFitter({ points }: { points: Stop[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.stop_lat, p.stop_lon]));
      map.flyToBounds(bounds, { padding: [100, 100], maxZoom: 14, duration: 1.5 });
    }
  }, [points, map]);
  return null;
}
