import { useState, useEffect, useMemo, useCallback } from 'react';
import type { GeoJsonObject } from 'geojson';
import { parseGtfsZip } from '../lib/gtfs';
import {
  buildPlayerPieces,
  calculateDistance,
  chooseRandomStop,
  chooseTerminalHub,
  getActivePoints,
  getReachableStopIds,
  getSystemMove,
  getThreatenedStopIds,
  INITIAL_PIECES,
  PIECES,
  VISIBILITY_RANGE
} from '../lib/game';
import type { GameState, LocalRouteIndex, PlayerPiece, Stop, StopRoute, Turn } from '../types';
import { DEMO_STOPS, DEMO_CONNECTIONS, DEMO_ROUTES } from '../data/demoData';

export function useTransitGame() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonObject | null>(null);
  const [playerPieces, setPlayerPieces] = useState<PlayerPiece[]>(INITIAL_PIECES);
  const [selectedPieceIndex, setSelectedPieceIndex] = useState<number | null>(null);
  const [systemStop, setSystemStop] = useState<Stop | null>(null);
  const [lastKnownSystemStop, setLastKnownSystemStop] = useState<Stop | null>(null);
  const [systemHistory, setSystemHistory] = useState<Stop[]>([]);
  const [terminalHub, setTerminalHub] = useState<Stop | null>(null);
  const [connectedStopIds, setConnectedStopIds] = useState<Set<string>>(new Set());
  const [systemConnectedStopIds, setSystemConnectedStopIds] = useState<Set<string>>(new Set());
  const [turn, setTurn] = useState<Turn>('player');
  const [gameState, setGameState] = useState<GameState>('playing');
  const [status, setStatus] = useState<string>('Operations online. Select a bus to move.');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agency = 'sta';
  const [isUsingLocalData, setIsUsingLocalData] = useState(false);
  const [localConnections, setLocalConnections] = useState<Record<string, string[]>>({});
  const [localStopRoutes, setLocalStopRoutes] = useState<LocalRouteIndex>({});

  const loadGameData = useCallback((params: {
    stops: Stop[],
    connections: Record<string, string[]>,
    stopRoutes: LocalRouteIndex,
    isLocal: boolean
  }) => {
    setStops(params.stops);
    setLocalConnections(params.connections);
    setLocalStopRoutes(params.stopRoutes);
    setIsUsingLocalData(params.isLocal);

    const sysStart = chooseRandomStop(params.stops);
    if (!sysStart) return;

    setSystemStop(sysStart);
    setSystemHistory([sysStart]);
    setPlayerPieces(buildPlayerPieces(params.stops, params.stopRoutes));
    setTerminalHub(chooseTerminalHub(params.stops, sysStart));
    
    const initialConnections = params.connections[sysStart.gtfs_stop_id] || [];
    setSystemConnectedStopIds(new Set(initialConnections));
  }, []);

  const fetchConnections = useCallback((stopId: string, target: 'player' | 'system') => {
    if (isUsingLocalData) {
      const data = localConnections[stopId] || [];
      if (target === 'player') setConnectedStopIds(new Set(data));
      else setSystemConnectedStopIds(new Set(data));
      return;
    }
    fetch(`http://localhost:3001/api/connections/${agency}/${stopId}`).then(res => res.json()).then(data => {
      if (target === 'player') setConnectedStopIds(new Set(data));
      else setSystemConnectedStopIds(new Set(data));
    }).catch(() => {
      const data = localConnections[stopId] || [];
      if (target === 'player') setConnectedStopIds(new Set(data));
      else setSystemConnectedStopIds(new Set(data));
    });
  }, [agency, isUsingLocalData, localConnections]);

  const handleGtfsUpload = async (file: File) => {
    setIsLoading(true);
    setStatus('Parsing GTFS bundle...');
    
    try {
      setStatus('Building connection network...');
      const parsedGtfs = await parseGtfsZip(file);
      loadGameData({
        stops: parsedGtfs.stops,
        connections: parsedGtfs.connections,
        stopRoutes: parsedGtfs.stopRoutes,
        isLocal: true
      });
      setStatus('Custom GTFS loaded. Match ready.');
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Invalid GTFS file. Ensure it contains stops.txt and stop_times.txt');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isUsingLocalData) return;
    
    const abortController = new AbortController();

    fetch(`http://localhost:3001/api/stops/${agency}`, { signal: abortController.signal })
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) {
          setStops(data);
          const sysStart = chooseRandomStop(data);
          if (!sysStart) return;
          setSystemStop(sysStart);
          setSystemHistory([sysStart]);
          const newPieces = buildPlayerPieces(data);
          setPlayerPieces(newPieces);

          newPieces.forEach((p, i) => {
            if (!p.stop) return;
            fetch(`http://localhost:3001/api/stop-routes/${agency}/${p.stop.gtfs_stop_id}`)
              .then(res => res.json())
              .then(routes => {
                setPlayerPieces(prev => {
                  const updated = [...prev];
                  updated[i].routes = routes;
                  return updated;
                });
              });
          });

          setTerminalHub(chooseTerminalHub(data, sysStart));
          fetchConnections(sysStart.gtfs_stop_id, 'system');
        } else {
          throw new Error('No stops from backend');
        }
      })
      .catch(() => {
        console.log('Backend unavailable. Loading demo network...');
        loadGameData({
          stops: DEMO_STOPS,
          connections: DEMO_CONNECTIONS,
          stopRoutes: DEMO_ROUTES,
          isLocal: true
        });
        setStatus('Operations online. Demo network active.');
      });

    fetch(`http://localhost:3001/api/shapes/${agency}`).then(res => res.json()).then(data => { setGeoJsonData(data); }).catch(() => {});
    
    return () => abortController.abort();
  }, [agency, fetchConnections, isUsingLocalData, loadGameData]);

  const makeMove = (stop: Stop) => {
    if (turn !== 'player' || gameState !== 'playing' || selectedPieceIndex === null) return;
    const currentPiece = playerPieces[selectedPieceIndex];
    if (!currentPiece.stop) return;
    if (!connectedStopIds.has(stop.gtfs_stop_id)) { setError("NO ROUTE"); return; }
    if (calculateDistance(currentPiece.stop, stop) > PIECES[currentPiece.type].range) { setError("OUT OF RANGE"); return; }
    if (systemStop && stop.gtfs_stop_id === systemStop.gtfs_stop_id) { setGameState('won'); return; }
    setError(null);
    setStatus(`Bus ${selectedPieceIndex + 1} moved to ${stop.stop_name}`);

    const applyMove = (routes: StopRoute[]) => {
      setPlayerPieces(prev => {
        const updated = [...prev];
        updated[selectedPieceIndex] = {
          ...updated[selectedPieceIndex],
          stop,
          routes
        };
        return updated;
      });
    };

    if (isUsingLocalData) applyMove(localStopRoutes[stop.gtfs_stop_id] ?? []);
    else {
      fetch(`http://localhost:3001/api/stop-routes/${agency}/${stop.gtfs_stop_id}`)
        .then(res => res.json())
        .then(routes => applyMove(routes))
        .catch(() => applyMove(currentPiece.routes));
    }

    fetchConnections(stop.gtfs_stop_id, 'player');
    setSelectedPieceIndex(null);
    setTurn('system');
  };

  useEffect(() => {
    if (turn === 'system' && systemStop && terminalHub && gameState === 'playing') {
      const timer = setTimeout(() => {
        const move = getSystemMove({
          stops,
          systemConnectedStopIds,
          systemStop,
          terminalHub,
          playerPieces
        });

        if (move) {
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
  }, [turn, systemStop, terminalHub, gameState, systemConnectedStopIds, playerPieces, fetchConnections, stops]);

  const selectPiece = (index: number) => {
    if (turn !== 'player' || gameState !== 'playing') return;
    setSelectedPieceIndex(index);
    if (playerPieces[index].stop) fetchConnections(playerPieces[index].stop!.gtfs_stop_id, 'player');
  };

  const reachableStops = useMemo(() => {
    return getReachableStopIds({
      selectedPieceIndex,
      gameState,
      playerPieces,
      stops,
      connectedStopIds
    });
  }, [selectedPieceIndex, playerPieces, stops, gameState, connectedStopIds]);

  const threatenedStops = useMemo(() => {
    return getThreatenedStopIds({
      selectedPieceIndex,
      gameState,
      stops,
      systemConnectedStopIds,
      systemStop
    });
  }, [selectedPieceIndex, stops, gameState, systemConnectedStopIds, systemStop]);

  const activePoints = useMemo(() => {
    return getActivePoints(systemStop, terminalHub, playerPieces);
  }, [systemStop, terminalHub, playerPieces]);

  const isSystemVisible = useMemo(() => {
    if (!systemStop) return false;
    return playerPieces.some(piece => {
      if (!piece.stop) return false;
      return calculateDistance(piece.stop, systemStop) <= VISIBILITY_RANGE;
    });
  }, [systemStop, playerPieces]);

  useEffect(() => {
    if (isSystemVisible && systemStop) {
      setLastKnownSystemStop(systemStop);
    }
  }, [isSystemVisible, systemStop]);

  return {
    stops,
    geoJsonData,
    playerPieces,
    selectedPieceIndex,
    systemStop,
    isSystemVisible,
    lastKnownSystemStop,
    systemHistory,
    terminalHub,
    turn,
    gameState,
    status,
    isLoading,
    error,
    isUsingLocalData,
    localStopRoutes,
    handleGtfsUpload,
    makeMove,
    selectPiece,
    reachableStops,
    threatenedStops,
    activePoints
  };
}
