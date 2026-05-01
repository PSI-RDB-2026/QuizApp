import { describe, expect, it } from "vitest";

import {
  createBoard,
  hasPotentialThreeSideConnection,
  isClaimed,
  otherPlayer,
  questionTypeForTile,
  touchesAllSides,
} from "../pyramidRules";

function cloneBoard(board: ReturnType<typeof createBoard>) {
  return board.map((row) => row.map((tile) => ({ ...tile })));
}

describe("pyramidRules", () => {
  it("creates the triangular board and maps tile helpers", () => {
    const board = createBoard();

    expect(board).toHaveLength(7);
    expect(board.map((row) => row.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(board[6][6].label).toBe("28");
    expect(otherPlayer("player1")).toBe("player2");
    expect(isClaimed({ ...board[0][0], state: "player1" })).toBe(true);
    expect(questionTypeForTile({ ...board[0][0], state: "black" })).toBe(
      "yes_no",
    );
  });

  it("detects a connected player path that touches all sides", () => {
    const board = cloneBoard(createBoard());
    for (let col = 0; col < board[6].length; col += 1) {
      board[6][col].state = "player1";
    }

    expect(touchesAllSides(board, "player1")).toBe(true);
  });

  it("explores connected tiles without reaching all sides", () => {
    const board = cloneBoard(createBoard());
    for (const row of board) {
      for (const tile of row) {
        tile.state = "player2";
      }
    }

    board[0][0].state = "player1";
    board[1][0].state = "player1";
    board[1][1].state = "player1";

    expect(touchesAllSides(board, "player1")).toBe(false);
    expect(hasPotentialThreeSideConnection(board, "player1")).toBe(false);
  });

  it("rejects an incomplete connection and detects blocked connections", () => {
    const board = cloneBoard(createBoard());
    board[0][0].state = "player1";
    for (const row of board) {
      for (const tile of row) {
        tile.state = "player2";
      }
    }

    expect(touchesAllSides(board, "player1")).toBe(false);
    expect(hasPotentialThreeSideConnection(board, "player1")).toBe(false);
  });
});
