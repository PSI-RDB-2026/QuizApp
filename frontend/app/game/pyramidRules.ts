import {
  BOARD_SIZE,
  type Player,
  type QuestionType,
  type TileCell,
} from "./pyramidTypes";

export function otherPlayer(player: Player): Player {
  return player === "player1" ? "player2" : "player1";
}

export function createBoard(): TileCell[][] {
  return Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: row + 1 }, (_, col) => {
      const index = (row * (row + 1)) / 2 + col;
      return {
        id: `tile-${row}-${col}`,
        label: String(index + 1),
        row,
        col,
        state: "neutral",
      };
    }),
  );
}

export function isClaimed(tile: TileCell): boolean {
  return tile.state === "player1" || tile.state === "player2";
}

function isOnSide(
  row: number,
  col: number,
  side: "left" | "right" | "bottom",
): boolean {
  if (side === "bottom") {
    return row === BOARD_SIZE - 1;
  }

  if (side === "left") {
    return col === 0;
  }

  return col === row;
}

function getNeighbors(row: number, col: number): Array<[number, number]> {
  return [
    [row, col - 1],
    [row, col + 1],
    [row - 1, col - 1],
    [row - 1, col],
    [row + 1, col],
    [row + 1, col + 1],
  ];
}

export function touchesAllSides(board: TileCell[][], player: Player): boolean {
  const visited = new Set<string>();

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const startTile = board[row][col];
      const startKey = `${row}-${col}`;

      if (startTile.state !== player || visited.has(startKey)) {
        continue;
      }

      const stack: Array<[number, number]> = [[row, col]];
      let touchesLeft = false;
      let touchesRight = false;
      let touchesBottom = false;

      while (stack.length > 0) {
        const [currentRow, currentCol] = stack.pop() as [number, number];
        const key = `${currentRow}-${currentCol}`;

        if (visited.has(key)) {
          continue;
        }

        const tile = board[currentRow]?.[currentCol];
        if (!tile || tile.state !== player) {
          continue;
        }

        visited.add(key);

        touchesLeft = touchesLeft || isOnSide(currentRow, currentCol, "left");
        touchesRight =
          touchesRight || isOnSide(currentRow, currentCol, "right");
        touchesBottom =
          touchesBottom || isOnSide(currentRow, currentCol, "bottom");

        if (touchesLeft && touchesRight && touchesBottom) {
          return true;
        }

        for (const [nextRow, nextCol] of getNeighbors(currentRow, currentCol)) {
          const nextTile = board[nextRow]?.[nextCol];
          if (!nextTile || nextTile.state !== player) {
            continue;
          }

          const nextKey = `${nextRow}-${nextCol}`;
          if (!visited.has(nextKey)) {
            stack.push([nextRow, nextCol]);
          }
        }
      }
    }
  }

  return false;
}

export function hasPotentialThreeSideConnection(
  board: TileCell[][],
  player: Player,
): boolean {
  const blockedBy = otherPlayer(player);
  const visited = new Set<string>();

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const startTile = board[row][col];
      const startKey = `${row}-${col}`;

      if (startTile.state === blockedBy || visited.has(startKey)) {
        continue;
      }

      const stack: Array<[number, number]> = [[row, col]];
      let touchesLeft = false;
      let touchesRight = false;
      let touchesBottom = false;

      while (stack.length > 0) {
        const [currentRow, currentCol] = stack.pop() as [number, number];
        const key = `${currentRow}-${currentCol}`;

        if (visited.has(key)) {
          continue;
        }

        const tile = board[currentRow]?.[currentCol];
        if (!tile || tile.state === blockedBy) {
          continue;
        }

        visited.add(key);
        touchesLeft = touchesLeft || isOnSide(currentRow, currentCol, "left");
        touchesRight =
          touchesRight || isOnSide(currentRow, currentCol, "right");
        touchesBottom =
          touchesBottom || isOnSide(currentRow, currentCol, "bottom");

        if (touchesLeft && touchesRight && touchesBottom) {
          return true;
        }

        for (const [nextRow, nextCol] of getNeighbors(currentRow, currentCol)) {
          const nextTile = board[nextRow]?.[nextCol];
          if (!nextTile || nextTile.state === blockedBy) {
            continue;
          }

          const nextKey = `${nextRow}-${nextCol}`;
          if (!visited.has(nextKey)) {
            stack.push([nextRow, nextCol]);
          }
        }
      }
    }
  }

  return false;
}

export function questionTypeForTile(tile: TileCell): QuestionType {
  return tile.state === "black" ? "yes_no" : "standard";
}
