export type Player = "player1" | "player2";
export type TileState = "neutral" | "black" | Player;
export type QuestionType = "standard" | "yes_no";
export type Phase = "idle" | "answering" | "stealing" | "switch" | "revealing";
export type GameState = "playing" | "ended";

export interface TileCell {
  id: string;
  label: string;
  row: number;
  col: number;
  state: TileState;
}

export const BOARD_SIZE = 7;

export const PLAYER_META: Record<
  Player,
  { label: string; color: string; softColor: string; sideGoal: string }
> = {
  player1: {
    label: "Player 1",
    color: "blue.500",
    softColor: "blue.50",
    sideGoal: "Connect left, right, and bottom",
  },
  player2: {
    label: "Player 2",
    color: "orange.500",
    softColor: "orange.50",
    sideGoal: "Connect left, right, and bottom",
  },
};
