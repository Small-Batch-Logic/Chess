import type { LucideIcon } from 'lucide-react';
import { Bus, Train, FastForward } from 'lucide-react';

import type { GameState, LocalRouteIndex, PieceType, PlayerPiece, Stop } from '../types';

type PieceConfig = {
  label: string;
  icon: LucideIcon;
  range: number;
  description: string;
  color: string;
};

export const PIECES: Record<PieceType, PieceConfig> = {
  local: {
    label: 'Local Bus',
    icon: Bus,
    range: 0.015,
    description: 'Short range precision.',
    color: '#4f46e5'
  },
  express: {
    label: 'Express',
    icon: FastForward,
    range: 0.05,
    description: 'Medium range jump.',
    color: '#059669'
  },
  rapid: {
    label: 'Subway/LRT',
    icon: Train,
    range: 0.15,
    description: 'Long corridor control.',
    color: '#d97706'
  }
};

export const SYSTEM_RANGE = 0.07;

export const INITIAL_PIECES: PlayerPiece[] = [
  { id: 1, type: 'local', stop: null, routes: [] },
  { id: 2, type: 'local', stop: null, routes: [] },
  { id: 3, type: 'express', stop: null, routes: [] }
];

export function getStartingStops(stops: Stop[]) {
  if (stops.length === 0) return [null, null, null];

  return [
    stops[0] ?? null,
    stops[Math.floor(stops.length / 4)] ?? stops[0] ?? null,
    stops[Math.floor(stops.length / 2)] ?? stops[0] ?? null
  ];
}

export function buildPlayerPieces(stops: Stop[], routeIndex: LocalRouteIndex = {}): PlayerPiece[] {
  const [firstStop, secondStop, thirdStop] = getStartingStops(stops);

  return INITIAL_PIECES.map((piece, index) => {
    const stop = [firstStop, secondStop, thirdStop][index];
    return {
      ...piece,
      stop,
      routes: stop ? routeIndex[stop.gtfs_stop_id] ?? [] : []
    };
  });
}

export function calculateDistance(s1: Stop, s2: Stop) {
  return Math.sqrt(Math.pow(s1.stop_lat - s2.stop_lat, 2) + Math.pow(s1.stop_lon - s2.stop_lon, 2));
}

export function chooseTerminalHub(stops: Stop[], systemStart: Stop) {
  const possibleHubs = stops.filter(stop => Math.abs(stop.stop_lat - systemStart.stop_lat) > 0.05);
  return possibleHubs[Math.floor(Math.random() * possibleHubs.length)] || stops[stops.length - 1] || null;
}

export function chooseRandomStop(stops: Stop[]) {
  return stops[Math.floor(Math.random() * stops.length)] || null;
}

export function getSystemMove(params: {
  stops: Stop[];
  systemConnectedStopIds: Set<string>;
  systemStop: Stop;
  terminalHub: Stop;
  playerPieces: PlayerPiece[];
}) {
  const candidates = params.stops.filter(
    stop =>
      params.systemConnectedStopIds.has(stop.gtfs_stop_id) &&
      calculateDistance(params.systemStop, stop) <= SYSTEM_RANGE &&
      stop.gtfs_stop_id !== params.systemStop.gtfs_stop_id
  );

  if (candidates.length === 0) return null;

  const playerStopIds = params.playerPieces.map(piece => piece.stop?.gtfs_stop_id);
  
  // Calculate "safety" for each candidate
  // A candidate is "threatened" if a player piece can reach it in one turn
  const safeCandidates = candidates.filter(candidate => {
    // Check if any player piece can capture this candidate in their next turn
    const isThreatened = params.playerPieces.some(piece => {
      if (!piece.stop) return false;
      const range = PIECES[piece.type].range;
      const dist = calculateDistance(piece.stop, candidate);
      // For now, we assume if it's in range, it's a threat (simple AI)
      return dist <= range;
    });
    return !isThreatened && !playerStopIds.includes(candidate.gtfs_stop_id);
  });

  const targetCandidates = safeCandidates.length > 0 ? safeCandidates : candidates;

  const sorted = [...targetCandidates].sort(
    (a, b) => calculateDistance(a, params.terminalHub) - calculateDistance(b, params.terminalHub)
  );

  return sorted[0];
}

export function getReachableStopIds(params: {
  selectedPieceIndex: number | null;
  gameState: GameState;
  playerPieces: PlayerPiece[];
  stops: Stop[];
  connectedStopIds: Set<string>;
}) {
  if (params.selectedPieceIndex === null || params.gameState !== 'playing') return new Set<string>();

  const piece = params.playerPieces[params.selectedPieceIndex];
  if (!piece.stop) return new Set<string>();

  const pieceConfig = PIECES[piece.type];

  return new Set(
    params.stops
      .filter(stop => {
        const dist = calculateDistance(piece.stop as Stop, stop);
        if (dist > pieceConfig.range) return false;

        // Specialized Ability: Local Bus can "walk" (ignore connections) within a very short range
        if (piece.type === 'local' && dist <= 0.005) return true;

        // Standard: Must be connected via the transit network
        return params.connectedStopIds.has(stop.gtfs_stop_id);
      })
      .map(stop => stop.gtfs_stop_id)
  );
}

export function getThreatenedStopIds(params: {
  selectedPieceIndex: number | null;
  gameState: GameState;
  stops: Stop[];
  systemConnectedStopIds: Set<string>;
  systemStop: Stop | null;
}) {
  if (params.selectedPieceIndex === null || params.gameState !== 'playing' || !params.systemStop) {
    return new Set<string>();
  }

  return new Set(
    params.stops
      .filter(
        stop =>
          params.systemConnectedStopIds.has(stop.gtfs_stop_id) &&
          calculateDistance(params.systemStop as Stop, stop) <= SYSTEM_RANGE
      )
      .map(stop => stop.gtfs_stop_id)
  );
}

export function getActivePoints(systemStop: Stop | null, terminalHub: Stop | null, playerPieces: PlayerPiece[]) {
  const points: Stop[] = [];
  if (systemStop) points.push(systemStop);
  if (terminalHub) points.push(terminalHub);
  playerPieces.forEach(piece => {
    if (piece.stop) points.push(piece.stop);
  });
  return points;
}
