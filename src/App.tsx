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

export default function App() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  
  // Game State v2
  const [playerPieces, setPlayerPieces] = useState<{ id: number, type: PieceType, stop: Stop | null }[]>([
    { id: 1, type: 'local', stop: null },
    { id: 2, type: 'local', stop: null },
    { id: 3, type: 'express', stop: null }
  ]);
  const [selectedPieceIndex, setSelectedPieceIndex] = useState<number | null>(null);
  
  const [systemStop, setSystemStop] = useState<Stop | null>(null);
  const [terminalHub, setTerminalHub] = useState<Stop | null>(null);
  
  const [connectedStopIds, setConnectedStopIds] = useState<Set<string>>(new Set());
  const [turn, setTurn] = useState<'player' | 'system'>('player');
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [showRules, setShowRules] = useState(true);
  const [status, setStatus] = useState<string>('Arena loaded. Select a vehicle to move.');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const agency = 'sta';

  useEffect(() => {
    fetch(`http://localhost:3001/api/stops/${agency}`)
      .then(res => res.json())
      .then(data => {
        setStops(data);
        if (data.length > 100) {
          // System starts at a random stop
          const sysStart = data[Math.floor(Math.random() * data.length)];
          setSystemStop(sysStart);
          
          // Player pieces start at diverse hubs (automatically assigned)
          const newPieces = [...playerPieces];
          newPieces[0].stop = data[0];
          newPieces[1].stop = data[Math.floor(data.length / 4)];
          newPieces[2].stop = data[Math.floor(data.length / 2)];
          setPlayerPieces(newPieces);

          // Terminal Hub is randomly selected far away from System
          const possibleHubs = data.filter((s: Stop) => 
            Math.abs(s.stop_lat - sysStart.stop_lat) > 0.05 && 
            Math.abs(s.stop_lon - sysStart.stop_lon) > 0.05
          );
          setTerminalHub(possibleHubs[Math.floor(Math.random() * possibleHubs.length)] || data[data.length - 1]);
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

  const fetchConnections = (stopId: string) => {
    fetch(`http://localhost:3001/api/connections/${agency}/${stopId}`)
      .then(res => res.json())
      .then(data => setConnectedStopIds(new Set(data)))
      .catch(err => console.error('Failed to load connections', err));
  };

  const calculateDistance = (s1: Stop, s2: Stop) => {
    return Math.sqrt(Math.pow(s1.stop_lat - s2.stop_lat, 2) + Math.pow(s1.stop_lon - s2.stop_lon, 2));
  };

  const makeMove = (stop: Stop) => {
    if (turn !== 'player' || gameState !== 'playing') return;
    
    // PLAYING PHASE: Moving pieces
    if (selectedPieceIndex === null) {
      setError("Select a vehicle first");
      return;
    }

    const currentPiece = playerPieces[selectedPieceIndex];
    const lastStop = currentPiece.stop!;

    // Rule 1: Transit Connection
    if (!connectedStopIds.has(stop.gtfs_stop_id)) {
      setError("NO ROUTE: Select a stop on connected lines.");
      return;
    }

    // Rule 2: Piece Range
    if (calculateDistance(lastStop, stop) > PIECES[currentPiece.type].range) {
      setError(`Out of range for ${PIECES[currentPiece.type].label}`);
      return;
    }

    // Capture Check!
    if (systemStop && stop.gtfs_stop_id === systemStop.gtfs_stop_id) {
      setGameState('won');
      setStatus('CHECKMATE: System captured!');
      const newPieces = [...playerPieces];
      newPieces[selectedPieceIndex].stop = stop;
      setPlayerPieces(newPieces);
      return;
    }

    setError(null);
    setStatus(`${PIECES[currentPiece.type].label} moved to ${stop.stop_name}`);
    const newPieces = [...playerPieces];
    newPieces[selectedPieceIndex].stop = stop;
    setPlayerPieces(newPieces);
    setSelectedPieceIndex(null); // Deselect after move
    setTurn('system');
  };

  // System turn logic (v2 Smart System)
  useEffect(() => {
    if (turn === 'system' && systemStop && terminalHub && gameState === 'playing') {
      const timer = setTimeout(() => {
        fetch(`http://localhost:3001/api/connections/${agency}/${systemStop.gtfs_stop_id}`)
          .then(res => res.json())
          .then(connections => {
            const range = 0.05; // System constant range
            const candidates = stops.filter(s => 
              connections.includes(s.gtfs_stop_id) && 
              calculateDistance(systemStop, s) <= range
            );

            if (candidates.length > 0) {
              // Priority 1: Move towards Terminal Hub
              // Priority 2: Avoid player pieces
              const playerStopIds = playerPieces.map(p => p.stop?.gtfs_stop_id);
              const sorted = candidates.sort((a, b) => {
                const distA = calculateDistance(a, terminalHub);
                const distB = calculateDistance(b, terminalHub);
                return distA - distB;
              });

              const move = sorted.find(s => !playerStopIds.includes(s.gtfs_stop_id)) || sorted[0];
              
              if (move.gtfs_stop_id === terminalHub.gtfs_stop_id) {
                setGameState('lost');
                setStatus('GHOSTED: System reached the terminal hub.');
              } else {
                setStatus(`System moved to ${move.stop_name}`);
              }
              setSystemStop(move);
            }
            setTurn('player');
          });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, systemStop, terminalHub, gameState]);

  const selectPiece = (index: number) => {
    if (turn !== 'player' || gameState !== 'playing') return;
    setSelectedPieceIndex(index);
    setError(null);
    if (playerPieces[index].stop) {
      fetchConnections(playerPieces[index].stop!.gtfs_stop_id);
    }
  };

  const reachableStops = useMemo(() => {
    if (selectedPieceIndex === null || gameState !== 'playing') return new Set<string>();
    const piece = playerPieces[selectedPieceIndex];
    if (!piece.stop) return new Set<string>();
    const range = PIECES[piece.type].range;
    return new Set(
      stops
        .filter(s => connectedStopIds.has(s.gtfs_stop_id) && calculateDistance(piece.stop!, s) <= range)
        .map(s => s.gtfs_stop_id)
    );
  }, [selectedPieceIndex, playerPieces, stops, gameState, connectedStopIds]);

  const resetGame = () => {
    window.location.reload(); // Hard reset for v2 overhaul
  };

  return (
    <div className="flex h-screen w-screen bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-80 h-full bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm z-10">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-indigo-600 italic">Transit Chess v2</span>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${turn === 'player' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-red-50 border-red-200 text-red-600 animate-pulse'}`}>
              {turn === 'player' ? 'Your Turn' : 'System Turn'}
            </div>
          </div>
          
          <h1 className="text-2xl font-black italic tracking-tighter leading-none mb-1 text-slate-900">Fleet Command</h1>
          <p className="text-sm text-slate-500 font-bold mb-6">Trap the System before it reaches the hub.</p>

          <div className="space-y-3">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 px-1">Your Fleet</div>
            {playerPieces.map((p, idx) => {
              const data = PIECES[p.type];
              const Icon = data.icon;
              const isSelected = selectedPieceIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => selectPiece(idx)}
                  disabled={p.stop === null || turn !== 'player'}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/10' : 'bg-transparent border-slate-100 hover:border-slate-200'} ${p.stop === null ? 'opacity-30' : 'opacity-100'}`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: `${data.color}15`, border: `1px solid ${data.color}30` }}>
                    <Icon className="w-5 h-5" style={{ color: data.color }} />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-sm font-black italic tracking-tight text-slate-800">Piece {idx + 1}</div>
                    <div className="text-xs font-bold text-slate-400 truncate">{p.stop ? p.stop.stop_name : 'Deploying...'}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
           {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-xs font-bold text-red-600 animate-pulse">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
             <div className="flex items-center gap-2 mb-3">
               <Info className="w-4 h-4 text-slate-400" />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Feed</span>
             </div>
             <p className="text-sm font-bold text-slate-600 leading-snug italic">"{status}"</p>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button onClick={resetGame} className="w-full flex items-center justify-center gap-2 py-4 bg-white hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all text-slate-500 hover:text-slate-900 shadow-sm">
            <RefreshCcw className="w-4 h-4" />
            Restart Match
          </button>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        <MapContainer
          center={[47.6588, -117.426]}
          zoom={13}
          style={{ height: '100%', width: '100%', background: '#f1f5f9' }}
          zoomControl={false}
        >
          <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          
          {geoJsonData && (
            <GeoJSON data={geoJsonData} style={{ color: '#cbd5e1', weight: 1.5, opacity: 0.3 }} />
          )}

          {stops.map(stop => {
            const isReachable = reachableStops.has(stop.gtfs_stop_id);
            const isSystem = systemStop?.gtfs_stop_id === stop.gtfs_stop_id;
            const isHub = terminalHub?.gtfs_stop_id === stop.gtfs_stop_id;
            const playerPieceIndex = playerPieces.findIndex(p => p.stop?.gtfs_stop_id === stop.gtfs_stop_id);

            return (
              <CircleMarker 
                key={stop.gtfs_stop_id} 
                center={[stop.stop_lat, stop.stop_lon]}
                radius={isSystem || isHub || playerPieceIndex !== -1 ? 10 : (isReachable ? 6 : 2)}
                pathOptions={{ 
                  color: isSystem ? '#dc2626' : (isHub ? '#f59e0b' : (playerPieceIndex !== -1 ? '#4f46e5' : (isReachable ? '#6366f1' : '#cbd5e1'))),
                  fillColor: isSystem ? '#dc2626' : (isHub ? '#f59e0b' : (playerPieceIndex !== -1 ? '#4f46e5' : (isReachable ? '#6366f1' : '#f1f5f9'))),
                  fillOpacity: isSystem || isHub || playerPieceIndex !== -1 ? 1 : (isReachable ? 0.6 : 0.3),
                  weight: isSystem || isHub || playerPieceIndex !== -1 ? 4 : 1
                }}
                eventHandlers={{ click: () => makeMove(stop) }}
              >
                <Popup>
                   <div className="text-sm font-bold">{stop.stop_name}</div>
                   {isHub && <div className="text-xs font-black text-amber-600 uppercase mt-1">Terminal Hub (The Goal)</div>}
                   {isSystem && <div className="text-xs font-black text-red-600 uppercase mt-1">The System (Capture Target)</div>}
                </Popup>
              </CircleMarker>
            );
          })}

          <MapResizer />
        </MapContainer>

        {/* Win/Loss Overlays */}
        {gameState === 'won' || gameState === 'lost' ? (
          <div className="absolute inset-0 z-[2000] bg-white/60 backdrop-blur-md flex items-center justify-center p-8">
            <div className={`max-w-md w-full p-12 rounded-[3rem] border-2 text-center shadow-2xl ${gameState === 'won' ? 'bg-white border-indigo-100' : 'bg-white border-red-100'}`}>
               <div className="flex justify-center mb-6">
                  {gameState === 'won' ? (
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center rotate-12 shadow-2xl shadow-indigo-200">
                      <Trophy className="w-10 h-10 text-white" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-red-500 rounded-3xl flex items-center justify-center -rotate-12 shadow-2xl shadow-red-200">
                      <Skull className="w-10 h-10 text-white" />
                    </div>
                  )}
               </div>
               <h2 className="text-5xl font-black italic tracking-tighter mb-2 text-slate-900">
                 {gameState === 'won' ? 'CHECKMATE' : 'GHOSTED'}
               </h2>
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">
                 {gameState === 'won' ? 'You captured the System.' : 'The System escaped to the hub.'}
               </p>
               <button onClick={resetGame} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-lg">
                 Play Again
               </button>
            </div>
          </div>
        ) : null}

        {/* HUD Overlay (Tutorial) */}
        {showRules && (
          <div className="absolute inset-0 z-[3000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-8">
            <div className="max-w-lg w-full bg-white rounded-[3rem] shadow-2xl p-12 relative overflow-hidden text-center">
               <div className="relative">
                 <div className="flex flex-col items-center mb-8">
                    <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-200 mb-6">
                       <Zap className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-4xl font-black italic tracking-tighter text-slate-900 leading-none mb-2">Transit Chess v2</h2>
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-[0.4em]">The Strategic Overhaul</p>
                 </div>

                 <div className="space-y-8 mb-12 text-left">
                    <div className="flex gap-5">
                       <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 text-sm font-black text-slate-400">1</div>
                       <div>
                         <p className="text-base font-black text-slate-800 mb-1 italic">Objective: Interception</p>
                         <p className="text-sm text-slate-500 leading-relaxed">Your fleet is automatically stationed at major hubs. You win by landing <span className="font-bold text-indigo-600 underline">Exactly</span> on the System's red marker.</p>
                       </div>
                    </div>
                    <div className="flex gap-5">
                       <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 text-sm font-black text-slate-400">2</div>
                       <div>
                         <p className="text-base font-black text-slate-800 mb-1 italic">Movement: Tactical Fleet</p>
                         <p className="text-sm text-slate-500 leading-relaxed">Select a vehicle from your sidebar and click a <span className="text-indigo-400 font-bold italic">Glowing</span> stop to move. Use range and lines to corner the system.</p>
                       </div>
                    </div>
                    <div className="flex gap-5">
                       <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 text-sm font-black text-slate-400">3</div>
                       <div>
                         <p className="text-base font-black text-slate-800 mb-1 italic">The Danger</p>
                         <p className="text-sm text-slate-500 leading-relaxed">The System is trying to reach the <span className="text-amber-500 font-bold uppercase">Yellow Hub</span>. If it reaches the hub before you catch it, you lose.</p>
                       </div>
                    </div>
                 </div>

                 <button 
                  onClick={() => setShowRules(false)}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-sm hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100"
                 >
                   Launch Operations
                 </button>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
