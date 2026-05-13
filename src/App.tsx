import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Trophy, RefreshCcw, MapPin, Zap, Cpu, Bus, Train, FastForward, Target, Skull, AlertCircle, Info } from 'lucide-react';

// Fix for default marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [20, 32],
  iconAnchor: [10, 32],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Stop {
  gtfs_stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}

type PieceType = 'local' | 'rapid' | 'express';

const PIECES: Record<PieceType, { label: string; icon: any; range: number; description: string; color: string }> = {
  local: { 
    label: 'Local Bus', 
    icon: Bus, 
    range: 0.015, // Approx 1.5km
    description: 'Short range precision.',
    color: '#4f46e5' 
  },
  express: { 
    label: 'Express', 
    icon: FastForward, 
    range: 0.05, // Approx 5km
    description: 'Medium range jump.',
    color: '#059669' 
  },
  rapid: { 
    label: 'Subway/LRT', 
    icon: Train, 
    range: 0.15, // Approx 15km
    description: 'Long corridor control.',
    color: '#d97706' 
  }
};

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

function useMapZoom() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on('zoomend', onZoom);
    return () => { map.off('zoomend', onZoom); };
  }, [map]);
  return zoom;
}

function ViewAutoFitter({ points }: { points: Stop[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.stop_lat, p.stop_lon]));
      map.fitBounds(bounds, { padding: [100, 100], maxZoom: 14 });
    }
  }, [points, map]);
  return null;
}

function NetworkBoard({ stops, reachableStops, systemStop, terminalHub, playerPieces, makeMove }: { 
  stops: Stop[], 
  reachableStops: Set<string>, 
  systemStop: Stop | null, 
  terminalHub: Stop | null, 
  playerPieces: { stop: Stop | null }[],
  makeMove: (s: Stop) => void
}) {
  const zoom = useMapZoom();
  return (
    <>
      {stops.map(stop => {
        const isReachable = reachableStops.has(stop.gtfs_stop_id);
        const isSystem = systemStop?.gtfs_stop_id === stop.gtfs_stop_id;
        const isHub = terminalHub?.gtfs_stop_id === stop.gtfs_stop_id;
        const playerPieceIndex = playerPieces.findIndex(p => p.stop?.gtfs_stop_id === stop.gtfs_stop_id);
        const isSpecial = isSystem || isHub || playerPieceIndex !== -1 || isReachable;
        if (zoom < 13 && !isSpecial) return null;

        return (
          <CircleMarker 
            key={stop.gtfs_stop_id} 
            center={[stop.stop_lat, stop.stop_lon]}
            radius={isSystem || isHub || playerPieceIndex !== -1 ? 10 : (isReachable ? 6 : 2)}
            pathOptions={{ 
              color: isSystem ? '#dc2626' : (isHub ? '#f59e0b' : (playerPieceIndex !== -1 ? '#4f46e5' : (isReachable ? '#6366f1' : '#cbd5e1'))),
              fillColor: isSystem ? '#dc2626' : (isHub ? '#f59e0b' : (playerPieceIndex !== -1 ? '#4f46e5' : (isReachable ? '#6366f1' : '#f1f5f9'))),
              fillOpacity: isSystem || isHub || playerPieceIndex !== -1 ? 1 : (isReachable ? 0.6 : 0.3),
              weight: isSystem || isHub || playerPieceIndex !== -1 ? 4 : 1,
              className: isSystem ? 'animate-pulse' : ''
            }}
            eventHandlers={{ click: () => makeMove(stop) }}
          >
            <Popup>
               <div className="text-sm font-bold">{stop.stop_name}</div>
               {isHub && <div className="text-xs font-black text-amber-600 uppercase mt-1">Terminal Hub</div>}
               {isSystem && <div className="text-xs font-black text-red-600 uppercase mt-1">The System (Target)</div>}
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

export default function App() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [playerPieces, setPlayerPieces] = useState<{ id: number, type: PieceType, stop: Stop | null }[]>([
    { id: 1, type: 'local', stop: null },
    { id: 2, type: 'local', stop: null },
    { id: 3, type: 'express', stop: null }
  ]);
  const [selectedPieceIndex, setSelectedPieceIndex] = useState<number | null>(null);
  const [systemStop, setSystemStop] = useState<Stop | null>(null);
  const [systemHistory, setSystemHistory] = useState<Stop[]>([]);
  const [terminalHub, setTerminalHub] = useState<Stop | null>(null);
  const [connectedStopIds, setConnectedStopIds] = useState<Set<string>>(new Set());
  const [systemConnectedStopIds, setSystemConnectedStopIds] = useState<Set<string>>(new Set());
  const [turn, setTurn] = useState<'player' | 'system'>('player');
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [showRules, setShowRules] = useState(true);
  const [status, setStatus] = useState<string>('Arena loaded. Select a bus to move.');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const agency = 'sta';

  useEffect(() => {
    fetch(`http://localhost:3001/api/stops/${agency}`)
      .then(res => res.json())
      .then(data => {
        setStops(data);
        if (data.length > 100) {
          const sysStart = data[Math.floor(Math.random() * data.length)];
          setSystemStop(sysStart);
          setSystemHistory([sysStart]);
          const newPieces = [...playerPieces];
          newPieces[0].stop = data[0];
          newPieces[1].stop = data[Math.floor(data.length / 4)];
          newPieces[2].stop = data[Math.floor(data.length / 2)];
          setPlayerPieces(newPieces);
          const possibleHubs = data.filter((s: Stop) => Math.abs(s.stop_lat - sysStart.stop_lat) > 0.05);
          setTerminalHub(possibleHubs[Math.floor(Math.random() * possibleHubs.length)] || data[data.length - 1]);
          fetchConnections(sysStart.gtfs_stop_id, 'system');
        }
      })
      .catch(err => console.error('Failed to load stops', err));

    fetch(`http://localhost:3001/api/shapes/${agency}`).then(res => res.json()).then(data => { setGeoJsonData(data); setIsLoading(false); });
  }, []);

  const fetchConnections = (stopId: string, target: 'player' | 'system') => {
    fetch(`http://localhost:3001/api/connections/${agency}/${stopId}`).then(res => res.json()).then(data => {
      if (target === 'player') setConnectedStopIds(new Set(data));
      else setSystemConnectedStopIds(new Set(data));
    });
  };

  const calculateDistance = (s1: Stop, s2: Stop) => Math.sqrt(Math.pow(s1.stop_lat - s2.stop_lat, 2) + Math.pow(s1.stop_lon - s2.stop_lon, 2));

  const makeMove = (stop: Stop) => {
    if (turn !== 'player' || gameState !== 'playing' || selectedPieceIndex === null) return;
    const currentPiece = playerPieces[selectedPieceIndex];
    if (!connectedStopIds.has(stop.gtfs_stop_id)) { setError("NO ROUTE"); return; }
    if (calculateDistance(currentPiece.stop!, stop) > PIECES[currentPiece.type].range) { setError("OUT OF RANGE"); return; }
    if (systemStop && stop.gtfs_stop_id === systemStop.gtfs_stop_id) { setGameState('won'); return; }
    setError(null);
    setStatus(`Bus ${selectedPieceIndex + 1} moved to ${stop.stop_name}`);
    const newPieces = [...playerPieces];
    newPieces[selectedPieceIndex].stop = stop;
    setPlayerPieces(newPieces);
    fetchConnections(stop.gtfs_stop_id, 'player');
    setSelectedPieceIndex(null);
    setTurn('system');
  };

  useEffect(() => {
    if (turn === 'system' && systemStop && terminalHub && gameState === 'playing') {
      const timer = setTimeout(() => {
        const range = 0.05;
        const candidates = stops.filter(s => systemConnectedStopIds.has(s.gtfs_stop_id) && calculateDistance(systemStop, s) <= range && s.gtfs_stop_id !== systemStop.gtfs_stop_id);
        if (candidates.length > 0) {
          const sorted = candidates.sort((a, b) => calculateDistance(a, terminalHub!) - calculateDistance(b, terminalHub!));
          const move = sorted[0];
          if (move.gtfs_stop_id === terminalHub.gtfs_stop_id) setGameState('lost');
          else setStatus(`System moved to ${move.stop_name}`);
          setSystemStop(move);
          setSystemHistory(prev => [...prev, move].slice(-3));
          fetchConnections(move.gtfs_stop_id, 'system');
        }
        setTurn('player');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, systemStop, terminalHub, gameState, systemConnectedStopIds]);

  const selectPiece = (index: number) => {
    if (turn !== 'player' || gameState !== 'playing') return;
    setSelectedPieceIndex(index);
    if (playerPieces[index].stop) fetchConnections(playerPieces[index].stop!.gtfs_stop_id, 'player');
  };

  const reachableStops = useMemo(() => {
    if (selectedPieceIndex === null || gameState !== 'playing') return new Set<string>();
    const piece = playerPieces[selectedPieceIndex];
    return new Set(stops.filter(s => connectedStopIds.has(s.gtfs_stop_id) && calculateDistance(piece.stop!, s) <= PIECES[piece.type].range).map(s => s.gtfs_stop_id));
  }, [selectedPieceIndex, playerPieces, stops, gameState, connectedStopIds]);

  const activePoints = useMemo(() => {
    const pts = [];
    if (systemStop) pts.push(systemStop);
    if (terminalHub) pts.push(terminalHub);
    playerPieces.forEach(p => { if (p.stop) pts.push(p.stop); });
    return pts;
  }, [systemStop, terminalHub, playerPieces]);

  return (
    <div className="flex h-screen w-screen bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      <div className="w-80 h-full bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm z-10">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-indigo-600 italic">Transit Chess v2.3</span>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${turn === 'player' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-red-50 border-red-200 text-red-600 animate-pulse'}`}>
              {gameState === 'playing' ? (turn === 'player' ? 'Your Turn' : 'System Turn') : 'Match Over'}
            </div>
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter leading-none mb-1 text-slate-900">Operations Control</h1>
          <p className="text-sm text-slate-500 font-bold mb-6 italic">Intercept the red bus before the terminal.</p>
          <div className="space-y-3">
            {playerPieces.map((p, idx) => (
              <button key={idx} onClick={() => selectPiece(idx)} disabled={p.stop === null || turn !== 'player'} className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${selectedPieceIndex === idx ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/10' : 'bg-transparent border-slate-100'}`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: `${PIECES[p.type].color}15`, border: `1px solid ${PIECES[p.type].color}30` }}><Bus className="w-5 h-5" style={{ color: PIECES[p.type].color }} /></div>
                <div className="text-left min-w-0">
                  <div className="text-sm font-black italic tracking-tight text-slate-800">Bus {idx + 1}</div>
                  <div className="text-xs font-bold text-slate-400 truncate">{p.stop?.stop_name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
           {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-xs font-bold text-red-600 animate-pulse"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
           <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
             <div className="flex items-center gap-2 mb-3"><Info className="w-4 h-4 text-slate-400" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Feed</span></div>
             <p className="text-sm font-bold text-slate-600 leading-snug italic">"{status}"</p>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50/50"><button onClick={() => window.location.reload()} className="w-full flex items-center justify-center gap-2 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all text-slate-500 hover:text-slate-900 shadow-sm"><RefreshCcw className="w-4 h-4" />Restart Match</button></div>
      </div>
      <div className="flex-1 relative">
        <MapContainer center={[47.6588, -117.426]} zoom={13} style={{ height: '100%', width: '100%', background: '#f1f5f9' }} zoomControl={false}>
          <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          {geoJsonData && <GeoJSON data={geoJsonData} style={{ color: '#cbd5e1', weight: 1.5, opacity: 0.3 }} />}
          {systemHistory.length > 1 && <Polyline positions={systemHistory.map(s => [s.stop_lat, s.stop_lon])} pathOptions={{ color: '#dc2626', weight: 4, opacity: 0.4, dashArray: '5, 10' }} />}
          <NetworkBoard stops={stops} reachableStops={reachableStops} systemStop={systemStop} terminalHub={terminalHub} playerPieces={playerPieces} makeMove={makeMove} />
          <MapResizer /><ViewAutoFitter points={activePoints} />
        </MapContainer>
        {(gameState === 'won' || gameState === 'lost') && (<div className="absolute inset-0 z-[2000] bg-white/60 backdrop-blur-md flex items-center justify-center p-8"><div className={`max-w-md w-full p-12 rounded-[3rem] border-2 text-center shadow-2xl ${gameState === 'won' ? 'bg-white border-indigo-100' : 'bg-white border-red-100'}`}><div className="flex justify-center mb-6">{gameState === 'won' ? (<div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center rotate-12 shadow-2xl shadow-indigo-200"><Trophy className="w-10 h-10 text-white" /></div>) : (<div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center -rotate-12 shadow-2xl shadow-red-200"><Skull className="w-10 h-10 text-white" /></div>)}</div><h2 className="text-5xl font-black italic tracking-tighter mb-2 text-slate-900">{gameState === 'won' ? 'SUCCESS' : 'FAIL'}</h2><p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">{gameState === 'won' ? 'System intercepted.' : 'System escaped.'}</p><button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-lg">Play Again</button></div></div>)}
        {showRules && (<div className="absolute inset-0 z-[3000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-8"><div className="max-w-lg w-full bg-white rounded-[3rem] shadow-2xl p-12 relative overflow-hidden text-center"><div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100%] -mr-8 -mt-8 opacity-50" /><div className="relative"><div className="flex flex-col items-center mb-8"><div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-4"><Trophy className="w-8 h-8 text-white" /></div><h2 className="text-3xl font-black italic tracking-tighter text-slate-900 leading-none mb-1 text-center">Transit Chess</h2><p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.3em]">Operations Manual v2.3</p></div><div className="space-y-6 mb-10 text-left"><div className="flex gap-4"><div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 text-xs font-black text-indigo-600">1</div><div><p className="text-sm font-black text-slate-800 mb-1 italic">The Mission</p><p className="text-xs text-slate-500 leading-relaxed font-medium">Catch the <span className="text-red-500 font-bold uppercase">Red Bus</span> before it reaches the <span className="text-amber-500 font-bold uppercase">Yellow Hub</span>.</p></div></div><div className="flex gap-4"><div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 text-xs font-black text-indigo-600">2</div><div><p className="text-sm font-black text-slate-800 mb-1 italic">Movement</p><p className="text-xs text-slate-500 leading-relaxed font-medium">Pick a Blue Bus, then click a <span className="text-indigo-600 font-bold italic">Glowing Stop</span> to move.</p></div></div><div className="flex gap-4"><div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 text-xs font-black text-indigo-600">3</div><div><p className="text-sm font-black text-slate-800 mb-1 italic">Win Condition</p><p className="text-xs text-slate-500 leading-relaxed font-medium">Land <span className="font-bold text-slate-900">Exactly</span> on the Red Bus stop to win.</p></div></div></div><button onClick={() => setShowRules(false)} className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-2xl">Open Network</button></div></div></div>)}
      </div>
    </div>
  );
}
