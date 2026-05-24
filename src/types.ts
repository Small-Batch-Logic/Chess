export interface Stop {
  gtfs_stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}

export interface StopRoute {
  route_short_name: string;
  route_long_name: string;
}

export type LocalRouteIndex = Record<string, StopRoute[]>;

export type PieceType = 'local' | 'rapid' | 'express';

export type PlayerPiece = {
  id: number;
  type: PieceType;
  stop: Stop | null;
  routes: StopRoute[];
};

export type Turn = 'player' | 'system';

export type GameState = 'playing' | 'won' | 'lost';
