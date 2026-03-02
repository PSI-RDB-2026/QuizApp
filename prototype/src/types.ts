export type TileState = 'neutral' | 'player1' | 'player2' | 'failed';

export interface TileData {
  id: string;
  label: string;
  state: TileState;
}

export type GameMode = 'home' | 'classic' | 'pyramid' | 'hexagon' | 'leaderboard';
