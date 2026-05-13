import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Trophy, RefreshCcw, MapPin, Zap, Cpu, Bus, Train, FastForward, Target, Skull, AlertCircle } from 'lucide-react';

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
    description: 'Moves up to 1.5km.',
    color: '#4f46e5' 
  },
  express: { 
    label: 'Express', 
    icon: FastForward, 
    range: 0.05, // Approx 5km
    description: 'Jumps up to 5km.',
    color: '#059669' 
  },
  rapid: { 
    label: 'Subway/LRT', 
    icon: Train, 
    range: 0.15, // Approx 15km
    description: 'Covers up to 15km.',
    color: '#d97706' 
  }
};

function intersects(p1: [number, number], p2: [number, number], p3: [number, number], p4: [number, number]) {
  const det = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (det === 0) return false;
  const lambda = ((p4[1] - p3[1]) * (p4[0] - p1[0]) + (p3[0] - p4[0]) * (p4[1] - p1[1])) / det;
  const gamma = ((p1[1] - p2[1]) * (p4[0] - p1[0]) + (p2[0] - p1[0]) * (p4[1] - p1[1])) / det;
  return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

export default function App() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [playerChain, setPlayerChain] = useState<Stop[]>([]);
  const [aiChain, setAiChain] = useState<Stop[]>([]);
  const [connectedStopIds, setConnectedStopIds] = useState<Set<string>>(new Set());
  const [systemConnectedStopIds, setSystemConnectedStopIds] = useState<Set<string>>(new Set());
  const [selectedPiece, setSelectedPiece] = useState<PieceType>('local');
  const [turn, setTurn] = useState<'player' | 'system'>('player');
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [showRules, setShowRules] = useState(true);
  const [status, setStatus] = useState<string>('Select an origin stop to begin');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const agency = 'sta';

  useEffect(() => {
    fetch(`http://localhost:3001/api/stops/${agency}`)
      .then(res => res.json())
      .then(data => {
        setStops(data);
        if (data.length > 0) {
          const startStop = data[Math.floor(Math.random() * data.length)];
          setAiChain([startStop]);
          fetchConnections(startStop.gtfs_stop_id, 'system');
        }
      })
      .catch(err => console.error('Failed to load stops', err));

    fetch(`http://localhost:3001/api/shapes/${agency}`)
      .then(res => res.json())
      .then(data => {
        setGeoJsonData(data);
        setIsLoading(false);
      })
      .catch(err => console.error('Failed to load shapes', err));
  }, []);

  const fetchConnections = (stopId: string, target: 'player' | 'system') => {
    fetch(`http://localhost:3001/api/connections/${agency}/${stopId}`)
      .then(res => res.json())
      .then(data => {
        if (target === 'player') setConnectedStopIds(new Set(data));
        else setSystemConnectedStopIds(new Set(data));
      })
      .catch(err => console.error('Failed to load connections', err));
  };

  const calculateDistance = (s1: Stop, s2: Stop) => {
    return Math.sqrt(Math.pow(s1.stop_lat - s2.stop_lat, 2) + Math.pow(s1.stop_lon - s2.stop_lon, 2));
  };

  const isIntersection = (start: Stop, end: Stop, targetChain: Stop[]) => {
    for (let i = 0; i < targetChain.length - 1; i++) {
      if (intersects(
        [start.stop_lat, start.stop_lon], [end.stop_lat, end.stop_lon],
        [targetChain[i].stop_lat, targetChain[i].stop_lon], [targetChain[i+1].stop_lat, targetChain[i+1].stop_lon]
      )) return true;
    }
    return false;
  };

  const makeMove = (stop: Stop) => {
    if (turn !== 'player' || gameState !== 'playing') return;
    
    if (playerChain.length > 0) {
      // Rule 1: Transit Connection
      if (!connectedStopIds.has(stop.gtfs_stop_id)) {
        setError("NO ROUTE: Select a stop on your connected lines.");
        return;
      }

      // Rule 2: Piece Range
      const lastStop = playerChain[playerChain.length - 1];
      const dist = calculateDistance(lastStop, stop);
      if (dist > PIECES[selectedPiece].range) {
        setError(`Out of range for ${PIECES[selectedPiece].label}`);
        return;
      }

      if (isIntersection(lastStop, stop, aiChain)) {
        setGameState('won');
        setStatus('Checkmate! You intercepted the system.');
        setPlayerChain(prev => [...prev, stop]);
        return;
      }
    }

    setError(null);
    setStatus(`You moved to ${stop.stop_name}`);
    setPlayerChain(prev => [...prev, stop]);
    fetchConnections(stop.gtfs_stop_id, 'player');
    setTurn('system');
  };

  useEffect(() => {
    if (turn === 'system' && stops.length > 0 && gameState === 'playing' && aiChain.length > 0) {
      const timer = setTimeout(() => {
        const lastAiStop = aiChain[aiChain.length - 1];
        const pieceTypes: PieceType[] = ['rapid', 'express', 'local'];
        let moveMade = false;

        for (const type of pieceTypes) {
          const range = PIECES[type].range;
          const candidates = stops.filter(s => 
            systemConnectedStopIds.has(s.gtfs_stop_id) && 
            calculateDistance(lastAiStop, s) <= range &&
            s.gtfs_stop_id !== lastAiStop.gtfs_stop_id
          );

          if (candidates.length > 0) {
            const move = candidates[Math.floor(Math.random() * Math.min(candidates.length, 10))];
            if (playerChain.length > 1 && isIntersection(lastAiStop, move, playerChain)) {
              setGameState('lost');
              setStatus('Ghosted! The system cut your line.');
            } else {
              setStatus(`System moved to ${move.stop_name}`);
            }
            setAiChain(prev => [...prev, move]);
            fetchConnections(move.gtfs_stop_id, 'system');
            moveMade = true;
            break;
          }
        }
        setTurn('player');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, stops, gameState, playerChain, aiChain, systemConnectedStopIds]);

  const resetGame = () => {
    setPlayerChain([]);
    setConnectedStopIds(new Set());
    if (stops.length > 0) {
      const startStop = stops[Math.floor(Math.random() * stops.length)];
      setAiChain([startStop]);
      fetchConnections(startStop.gtfs_stop_id, 'system');
    }
    setTurn('player');
    setGameState('playing');
    setStatus('New match started. Select an origin.');
    setError(null);
  };

  const reachableStops = useMemo(() => {
    if (playerChain.length === 0) return new Set(stops.map(s => s.gtfs_stop_id));
    if (gameState !== 'playing') return new Set<string>();
    const lastStop = playerChain[playerChain.length - 1];
    const range = PIECES[selectedPiece].range;
    return new Set(
      stops
        .filter(s => connectedStopIds.has(s.gtfs_stop_id) && calculateDistance(lastStop, s) <= range)
        .map(s => s.gtfs_stop_id)
    );
  }, [playerChain, selectedPiece, stops, gameState, connectedStopIds]);

  return (
    <div className="flex h-screen w-screen bg-[#f8fafc] text-[#0f172a] overflow-hidden font-sans">
      <div className="w-80 h-full bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 italic">Transit Chess</span>
            <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${turn === 'player' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
              {gameState === 'playing' ? (turn === 'player' ? 'Your Move' : 'System Turn') : 'Match Over'}
            </div>
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter leading-none mb-1 text-slate-900">Board Control</h1>
          <p className="text-xs text-slate-500 font-bold mb-4 italic">Intercept the System's path to win.</p>
          <button onClick={() => setShowRules(true)} className="w-full mb-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all">How to Play</button>
          {error && <div className="mb-4 p-2 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-[10px] font-bold text-red-600 animate-pulse"><AlertCircle className="w-3 h-3" />{error}</div>}
          <div className="space-y-2">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 px-1 text-center">Fleet Selection</div>
            {(Object.entries(PIECES) as [PieceType, typeof PIECES['local']][]).map(([type, data]) => {
              const Icon = data.icon;
              const isActive = selectedPiece === type;
              return (
                <button key={type} onClick={() => setSelectedPiece(type)} className={`w-full flex items-center gap-4 p-3 rounded-2xl border transition-all ${isActive ? 'bg-slate-50 border-slate-200 shadow-sm scale-[1.02]' : 'bg-transparent border-transparent opacity-50 hover:opacity-100'}`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${data.color}15`, border: `1px solid ${data.color}30` }}><Icon className="w-4 h-4" style={{ color: data.color }} /></div>
                  <div className="text-left">
                    <div className="text-xs font-black italic tracking-tight text-slate-800">{data.label}</div>
                    <div className="text-[9px] font-bold text-slate-400 leading-tight uppercase tracking-tighter">Connected Lines Only</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center opacity-10"><MapPin className="w-12 h-12 mb-2 text-slate-900" /><span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Spokane Board</span></div>
        <div className="p-4 border-t border-slate-100 bg-slate-50/50"><button onClick={resetGame} className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-slate-500 hover:text-slate-900 shadow-sm"><RefreshCcw className="w-3.5 h-3.5" />Reset Board</button></div>
      </div>
      <div className="flex-1 relative">
        <MapContainer center={[47.6588, -117.426]} zoom={13} style={{ height: '100%', width: '100%', background: '#f1f5f9' }} zoomControl={false}>
          <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          {geoJsonData && <GeoJSON data={geoJsonData} style={{ color: '#cbd5e1', weight: 1.5, opacity: 0.3 }} />}
          {stops.map(stop => {
            const isReachable = reachableStops.has(stop.gtfs_stop_id);
            const isPlayerLast = playerChain.length > 0 && playerChain[playerChain.length - 1].gtfs_stop_id === stop.gtfs_stop_id;
            const isAiLast = aiChain.length > 0 && aiChain[aiChain.length - 1].gtfs_stop_id === stop.gtfs_stop_id;
            return <CircleMarker key={stop.gtfs_stop_id} center={[stop.stop_lat, stop.stop_lon]} radius={isPlayerLast || isAiLast ? 8 : (isReachable ? 6 : 3)} pathOptions={{ color: isPlayerLast ? '#4f46e5' : (isAiLast ? '#dc2626' : (isReachable ? '#6366f1' : '#cbd5e1')), fillColor: isPlayerLast ? '#4f46e5' : (isAiLast ? '#dc2626' : (isReachable ? '#6366f1' : '#f1f5f9')), fillOpacity: isPlayerLast || isAiLast ? 1 : (isReachable ? 0.6 : 0.3), weight: isPlayerLast || isAiLast ? 3 : 1 }} eventHandlers={{ click: () => makeMove(stop) }}><Popup><div className="font-bold text-xs">{stop.stop_name}</div></Popup></CircleMarker>;
          })}
          <Polyline positions={playerChain.map(s => [s.stop_lat, s.stop_lon])} pathOptions={{ color: '#4f46e5', weight: 6, opacity: 0.8 }} />
          <Polyline positions={aiChain.map(s => [s.stop_lat, s.stop_lon])} pathOptions={{ color: '#dc2626', weight: 6, opacity: 0.8, dashArray: '12, 12' }} />
          <MapResizer />
        </MapContainer>
        {gameState !== 'playing' && (<div className="absolute inset-0 z-[2000] bg-white/60 backdrop-blur-md flex items-center justify-center p-8"><div className={`max-w-md w-full p-12 rounded-[3rem] border-2 text-center shadow-2xl ${gameState === 'won' ? 'bg-white border-indigo-100' : 'bg-white border-red-100'}`}><div className="flex justify-center mb-6">{gameState === 'won' ? (<div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center rotate-12 shadow-2xl shadow-indigo-200"><Trophy className="w-10 h-10 text-white" /></div>) : (<div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center -rotate-12 shadow-2xl shadow-red-200"><Skull className="w-10 h-10 text-white" /></div>)}</div><h2 className="text-5xl font-black italic tracking-tighter mb-2 text-slate-900">{gameState === 'won' ? 'CHECKMATE' : 'GHOSTED'}</h2><p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">{gameState === 'won' ? 'You intercepted the system.' : 'The system cut your line.'}</p><button onClick={resetGame} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-lg">Play Again</button></div></div>)}
        <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-3">
          <div className="bg-white/90 backdrop-blur-md border border-slate-200 p-5 rounded-3xl shadow-xl">
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Match Status</div>
             <div className="grid grid-cols-2 gap-6 text-center mb-4">
                <div><div className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter mb-1">Your Network</div><div className="text-4xl font-black italic leading-none text-slate-900">{Math.max(0, playerChain.length - 1)}</div></div>
                <div className="border-l border-slate-100 pl-6"><div className="text-[9px] font-black text-red-600 uppercase tracking-tighter mb-1">System Network</div><div className="text-4xl font-black italic leading-none text-slate-900">{Math.max(0, aiChain.length - 1)}</div></div>
             </div>
             <div className="bg-slate-50 rounded-xl p-3 border border-slate-100"><div className="text-[8px] font-black text-slate-400 uppercase mb-1">Last Update</div><div className="text-[10px] font-bold text-slate-600 leading-tight italic">"{status}"</div></div>
          </div>
        </div>
        {showRules && (<div className="absolute inset-0 z-[3000] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-8"><div className="max-w-lg w-full bg-white rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden text-center"><div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100%] -mr-8 -mt-8 opacity-50" /><div className="relative"><div className="flex flex-col items-center mb-6"><div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-4"><Trophy className="w-8 h-8 text-white" /></div><h2 className="text-3xl font-black italic tracking-tighter text-slate-900 leading-none mb-1">Transit Chess</h2><p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.3em]">Rulebook v1.0</p></div><div className="space-y-6 mb-10 text-left"><div className="flex gap-4"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-xs font-black text-slate-400">1</div><div><p className="text-sm font-black text-slate-800 mb-1 italic">Objective: Interception</p><p className="text-xs text-slate-500 leading-relaxed font-medium">You win by angling your blue path to cross <span className="text-red-500 font-bold uppercase">The System's</span> red path. Catch them to win.</p></div></div><div className="flex gap-4"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-xs font-black text-slate-400">2</div><div><p className="text-sm font-black text-slate-800 mb-1 italic">Movement: The Fleet</p><p className="text-xs text-slate-500 leading-relaxed font-medium">Each vehicle has a range. Select <span className="font-bold text-indigo-600">Subways</span> for long jumps or <span className="font-bold text-indigo-600">Buses</span> for tight corners. Click a <span className="text-indigo-400 font-bold italic">Glowing</span> stop to move.</p></div></div><div className="flex gap-4"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-xs font-black text-slate-400">3</div><div><p className="text-sm font-black text-slate-800 mb-1 italic">The Risk</p><p className="text-xs text-slate-500 leading-relaxed font-medium">If the System intercepts your path first, you are <span className="text-red-500 font-bold italic">Ghosted</span> and lose. Watch your flank.</p></div></div></div><button onClick={() => setShowRules(false)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">Enter the Arena</button></div></div></div>)}
      </div>
    </div>
  );
}
