import { useState, useEffect } from 'react';
import { useMap, CircleMarker, Popup } from 'react-leaflet';
import type { Stop, StopRoute, LocalRouteIndex } from '../types';

export function MapResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

export function useMapZoom() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on('zoomend', onZoom);
    return () => { map.off('zoomend', onZoom); };
  }, [map]);
  return zoom;
}

interface NetworkBoardProps {
  stops: Stop[];
  reachableStops: Set<string>;
  threatenedStops: Set<string>;
  systemStop: Stop | null;
  terminalHub: Stop | null;
  playerPieces: { stop: Stop | null }[];
  makeMove: (s: Stop) => void;
  isUsingLocalData: boolean;
  localStopRoutes: LocalRouteIndex;
}

export function NetworkBoard({
  stops,
  reachableStops,
  threatenedStops,
  systemStop,
  terminalHub,
  playerPieces,
  makeMove,
  isUsingLocalData,
  localStopRoutes
}: NetworkBoardProps) {
  const zoom = useMapZoom();
  const agency = 'sta';
  const [stopRoutes, setStopRoutes] = useState<Record<string, StopRoute[]>>({});

  const fetchStopRoutes = (stopId: string) => {
    if (stopRoutes[stopId]) return;
    if (isUsingLocalData) {
      setStopRoutes(prev => ({ ...prev, [stopId]: localStopRoutes[stopId] ?? [] }));
      return;
    }
    fetch(`http://localhost:3001/api/stop-routes/${agency}/${stopId}`)
      .then(res => res.json())
      .then(data => setStopRoutes(prev => ({ ...prev, [stopId]: data })))
      .catch(e => console.error(e));
  };

  return (
    <>
      {stops.map(stop => {
        const isReachable = reachableStops.has(stop.gtfs_stop_id);
        const isThreatened = threatenedStops.has(stop.gtfs_stop_id);
        const isSystem = systemStop?.gtfs_stop_id === stop.gtfs_stop_id;
        const isHub = terminalHub?.gtfs_stop_id === stop.gtfs_stop_id;
        const playerPieceIndex = playerPieces.findIndex(p => p.stop?.gtfs_stop_id === stop.gtfs_stop_id);
        const isSpecial = isSystem || isHub || playerPieceIndex !== -1 || isReachable || isThreatened;
        if (zoom < 13 && !isSpecial) return null;

        return (
          <CircleMarker
            key={stop.gtfs_stop_id}
            center={[stop.stop_lat, stop.stop_lon]}
            radius={isSystem || isHub || playerPieceIndex !== -1 ? 10 : (isReachable ? 8 : (isThreatened ? 5 : 2))}
            pathOptions={{
              color: isSystem ? '#dc2626' : (isHub ? '#f59e0b' : (playerPieceIndex !== -1 ? '#4f46e5' : (isReachable ? '#6366f1' : (isThreatened ? '#e11d48' : '#334155')))),
              fillColor: isSystem ? '#dc2626' : (isHub ? '#f59e0b' : (playerPieceIndex !== -1 ? '#4f46e5' : (isReachable ? '#6366f1' : (isThreatened ? '#e11d48' : '#1e293b')))),
              fillOpacity: isSystem || isHub || playerPieceIndex !== -1 ? 1 : (isReachable ? 0.6 : (isThreatened ? 0.5 : 0.2)),
              weight: isSystem || isHub || playerPieceIndex !== -1 ? 4 : 1,
              className: isSystem ? 'animate-pulse' : ''
            }}
            eventHandlers={{
              click: () => makeMove(stop),
              mouseover: (e) => {
                e.target.openPopup();
                fetchStopRoutes(stop.gtfs_stop_id);
              }
            }}
          >
            <Popup>
               <div className="text-sm font-bold">{stop.stop_name}</div>
               {stopRoutes[stop.gtfs_stop_id] && (
                 <div className="mt-2 flex flex-wrap gap-1">
                   {stopRoutes[stop.gtfs_stop_id].map((r, i) => (
                     <span key={i} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-black">{r.route_short_name}</span>
                   ))}
                 </div>
               )}
               {isHub && <div className="text-xs font-black text-amber-500 uppercase mt-1">Terminal Hub</div>}
               {isSystem && <div className="text-xs font-black text-red-500 uppercase mt-1">The System (Target)</div>}
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
