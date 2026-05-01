import { describe, expect, it } from "vitest";

import {
  createBoard,
  hasPotentialThreeSideConnection,
  otherPlayer,
  questionTypeForTile,
  touchesAllSides,
} from "../pyramidRulesMultiplayer";

function cloneBoard(board: ReturnType<typeof createBoard>) {
  return board.map((row) => row.map((tile) => ({ ...tile })));
}

describe("pyramidRulesMultiplayer", () => {
  it("creates the larger triangular board and maps helpers", () => {
    const board = createBoard();

    expect(board).toHaveLength(8);
    expect(board.map((row) => row.length)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(board[7][7].label).toBe("36");
    expect(otherPlayer("player2")).toBe("player1");
    expect(questionTypeForTile({ ...board[0][0], state: "black" })).toBe(
      "yes_no",
    );
  });

  it("detects a connected player path that touches all sides", () => {
    const board = cloneBoard(createBoard());
    for (let col = 0; col < board[7].length; col += 1) {
      board[7][col].state = "player2";
    }

    expect(touchesAllSides(board, "player2")).toBe(true);
  });

  it("explores connected tiles without reaching all sides", () => {
    const board = cloneBoard(createBoard());
    for (const row of board) {
      for (const tile of row) {
        tile.state = "player1";
      }
    }

    board[0][0].state = "player2";
    board[1][0].state = "player2";
    board[1][1].state = "player2";

    expect(touchesAllSides(board, "player2")).toBe(false);
    expect(hasPotentialThreeSideConnection(board, "player2")).toBe(false);
  });

  it("rejects a blocked opponent path", () => {
    const board = cloneBoard(createBoard());
    board[0][0].state = "player1";
    for (const row of board) {
      for (const tile of row) {
        tile.state = "player1";
      }
    }

    expect(hasPotentialThreeSideConnection(board, "player2")).toBe(false);
  });
});
