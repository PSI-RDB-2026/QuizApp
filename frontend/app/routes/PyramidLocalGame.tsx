import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";

import { checkQuestion, getQuestion, type QuestionResponse } from "api/api";
import { TimerLine } from "components/General/TimerLine";
import StandardQuestionModal from "../../components/StandardQuestionModal";
import YesNoQuestionModal from "../../components/YesNoQuestionModal";
import SwitchAnswerModal from "components/SwitchAnswerModal";
import GameOverModal from "../../components/GameOverModal";
import ConcedeConfirmModal from "../../components/ConcedeConfirmModal";

type Player = "player1" | "player2";
type TileState = "neutral" | "black" | Player;
type QuestionType = "standard" | "yes_no";
type Phase = "idle" | "answering" | "stealing" | "switch" | "revealing";
type GameState = "playing" | "ended";

interface TileCell {
  id: string;
  label: string;
  row: number;
  col: number;
  state: TileState;
}

interface ActiveChallenge {
  row: number;
  col: number;
  ownerPlayer: Player;
  answerPlayer: Player;
  questionType: QuestionType;
  question: QuestionResponse;
}

interface GameResult {
  winner: Player;
  message: string;
}

const BOARD_SIZE = 7;
const PICK_SECONDS = 10;
const ANSWER_SECONDS = 18;
const ANSWER_REVEAL_MS = 2200;

const PLAYER_META: Record<
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

function otherPlayer(player: Player): Player {
  return player === "player1" ? "player2" : "player1";
}

function createBoard(): TileCell[][] {
  return Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: row + 1 }, (_, col) => {
      const index = (row * (row + 1)) / 2 + col;
      return {
        id: `tile-${row}-${col}`,
        label: String(index + 1),
        row,
        col,
        state: "neutral" as TileState,
      };
    }),
  );
}

function isClaimed(tile: TileCell): boolean {
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

function touchesAllSides(board: TileCell[][], player: Player): boolean {
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

function hasPotentialThreeSideConnection(
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

function questionTypeForTile(row: number, col: number): QuestionType {
  return (row + col) % 2 === 0 ? "standard" : "yes_no";
}

export function meta() {
  return [
    { title: "AZ Quizz" },
    {
      name: "description",
      content: "Local AZ Quizz pyramid game with two players.",
    },
  ];
}

export default function PyramidLocalGame() {
  const [board, setBoard] = useState<TileCell[][]>(() => createBoard());
  const [turnPlayer, setTurnPlayer] = useState<Player>(() =>
    Math.random() < 0.5 ? "player1" : "player2",
  );
  const [winner, setWinner] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [pickSeconds, setPickSeconds] = useState<number>(PICK_SECONDS);
  const [questionSeconds, setQuestionSeconds] =
    useState<number>(ANSWER_SECONDS);
  const [switchSeconds, setSwitchSeconds] = useState<number>(ANSWER_SECONDS);
  const [statusPopup, setStatusPopup] = useState<string>("");
  const [showConcedeConfirm, setShowConcedeConfirm] = useState(false);
  const [activeChallenge, setActiveChallenge] =
    useState<ActiveChallenge | null>(null);

  const startNewGame = () => {
    const openingPlayer = Math.random() < 0.5 ? "player1" : "player2";

    setBoard(createBoard());
    setTurnPlayer(openingPlayer);
    setWinner(null);
    setGameState("playing");
    setGameResult(null);
    setPhase("idle");
    setPickSeconds(PICK_SECONDS);
    setQuestionSeconds(ANSWER_SECONDS);
    setSwitchSeconds(ANSWER_SECONDS);
    setStatusPopup("");
    setShowConcedeConfirm(false);
    setActiveChallenge(null);
  };

  useEffect(() => {
    if (!winner || gameState !== "playing") {
      return;
    }

    const timer = window.setTimeout(() => {
      setGameState("ended");
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [winner, gameState]);

  useEffect(() => {
    if (winner || gameState !== "playing" || phase !== "idle") {
      return;
    }

    if (pickSeconds <= 0) {
      const winnerPlayer = otherPlayer(turnPlayer);
      endGame(
        winnerPlayer,
        `${PLAYER_META[turnPlayer].label} did not pick in time. ${PLAYER_META[winnerPlayer].label} wins.`,
      );
      setStatusPopup(
        `${PLAYER_META[turnPlayer].label} did not pick in time. ${PLAYER_META[winnerPlayer].label} wins.`,
      );
      return;
    }

    const timer = window.setTimeout(() => {
      setPickSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [pickSeconds, phase, turnPlayer, winner, gameState]);

  useEffect(() => {
    if (
      gameState !== "playing" ||
      (phase !== "answering" && phase !== "stealing" && phase !== "switch")
    ) {
      return;
    }

    if (phase === "switch") {
      if (switchSeconds <= 0) {
        void revealCorrectAndContinue();
        return;
      }

      const switchTimer = window.setTimeout(() => {
        setSwitchSeconds((current) => Math.max(current - 1, 0));
      }, 1000);

      return () => window.clearTimeout(switchTimer);
    }

    if (questionSeconds <= 0) {
      void handleTimeout();
      return;
    }

    const timer = window.setTimeout(() => {
      setQuestionSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [phase, questionSeconds, switchSeconds, gameState]);

  const startSelection = (row: number, col: number, tile: TileCell) => {
    if (winner || gameState !== "playing" || phase !== "idle") {
      return;
    }

    if (isClaimed(tile)) {
      return;
    }

    setPickSeconds(PICK_SECONDS);
    setStatusPopup("");
    void loadQuestion(row, col, turnPlayer, questionTypeForTile(row, col));
  };

  const updateTile = (row: number, col: number, state: TileState) => {
    setBoard((currentBoard) =>
      currentBoard.map((currentRow, rowIndex) =>
        rowIndex !== row
          ? currentRow
          : currentRow.map((tile, colIndex) =>
              colIndex !== col ? tile : { ...tile, state },
            ),
      ),
    );
  };

  const claimTile = (row: number, col: number, player: Player) => {
    setBoard((currentBoard) => {
      const nextBoard = currentBoard.map((currentRow, rowIndex) =>
        rowIndex !== row
          ? currentRow
          : currentRow.map((tile, colIndex) =>
              colIndex !== col ? tile : { ...tile, state: player },
            ),
      );

      if (touchesAllSides(nextBoard, player)) {
        endGame(
          player,
          `${PLAYER_META[player].label} connected all three sides and wins.`,
        );
        return nextBoard;
      }

      const blockedPlayer = otherPlayer(player);
      if (!hasPotentialThreeSideConnection(nextBoard, blockedPlayer)) {
        endGame(
          player,
          `${PLAYER_META[blockedPlayer].label} can no longer connect all three sides. ${PLAYER_META[player].label} wins.`,
        );
      }

      return nextBoard;
    });
  };

  const endGame = (winnerPlayer: Player, message: string) => {
    setWinner(winnerPlayer);
    setGameResult({ winner: winnerPlayer, message });
    setGameState("ended");
    setPhase("idle");
    setStatusPopup(message);
    setShowConcedeConfirm(false);
    setActiveChallenge(null);
  };

  const endChallenge = (nextTurn: Player) => {
    setTurnPlayer(nextTurn);
    setPhase("idle");
    setPickSeconds(PICK_SECONDS);
    setQuestionSeconds(ANSWER_SECONDS);
    setSwitchSeconds(ANSWER_SECONDS);
    setActiveChallenge(null);
  };

  const loadQuestion = async (
    row: number,
    col: number,
    player: Player,
    questionType: QuestionType,
  ) => {
    if (gameState !== "playing") {
      return;
    }

    const question = await getQuestion(questionType);

    if (!question) {
      updateTile(row, col, "black");
      endChallenge(otherPlayer(player));
      return;
    }

    setActiveChallenge({
      row,
      col,
      ownerPlayer: player,
      answerPlayer: player,
      questionType,
      question,
    });
    setQuestionSeconds(ANSWER_SECONDS);
    setSwitchSeconds(ANSWER_SECONDS);
    setPhase("answering");
  };

  const openStealChallenge = () => {
    if (!activeChallenge || gameState !== "playing") {
      return;
    }

    const stealPlayer = otherPlayer(activeChallenge.answerPlayer);
    setActiveChallenge({
      ...activeChallenge,
      answerPlayer: stealPlayer,
    });
    setTurnPlayer(stealPlayer);
    setQuestionSeconds(switchSeconds);
    setStatusPopup(`${PLAYER_META[stealPlayer].label} accepted steal.`);
    setPhase("stealing");
  };

  const revealAndContinue = (correctAnswer: string | boolean) => {
    if (!activeChallenge || gameState !== "playing") {
      return;
    }

    const { row, col, ownerPlayer } = activeChallenge;
    const nextTurn = otherPlayer(ownerPlayer);

    updateTile(row, col, "black");
    setPhase("revealing");
    setActiveChallenge(null);
    setStatusPopup(`Correct answer: ${String(correctAnswer)}`);

    window.setTimeout(() => {
      setStatusPopup("");
      setTurnPlayer(nextTurn);
      setPhase("idle");
      setPickSeconds(PICK_SECONDS);
      setQuestionSeconds(switchSeconds);
      setSwitchSeconds(switchSeconds);
    }, ANSWER_REVEAL_MS);
  };

  const revealCorrectAndContinue = async () => {
    if (!activeChallenge || gameState !== "playing") {
      return;
    }

    const result = await checkQuestion({
      question_id: activeChallenge.question.id,
      answer: "",
      question_type: activeChallenge.questionType,
    });

    revealAndContinue(result?.correct_answer ?? "n/a");
  };

  const handleAnswer = async (answer: string | boolean) => {
    if (
      !activeChallenge ||
      gameState !== "playing" ||
      (phase !== "answering" && phase !== "stealing")
    ) {
      return;
    }

    const response = await checkQuestion({
      question_id: activeChallenge.question.id,
      answer,
      question_type: activeChallenge.questionType,
    });

    if (response?.is_correct) {
      claimTile(
        activeChallenge.row,
        activeChallenge.col,
        activeChallenge.answerPlayer,
      );
      setStatusPopup("");
      endChallenge(otherPlayer(activeChallenge.answerPlayer));
      return;
    }

    if (activeChallenge.questionType === "yes_no") {
      const winnerPlayer = otherPlayer(activeChallenge.answerPlayer);
      claimTile(activeChallenge.row, activeChallenge.col, winnerPlayer);
      endChallenge(winnerPlayer);
      return;
    }

    if (phase === "answering") {
      setSwitchSeconds(ANSWER_SECONDS);
      setTurnPlayer(otherPlayer(activeChallenge.answerPlayer));
      setPhase("switch");
      return;
    }

    revealAndContinue(response?.correct_answer ?? "n/a");
  };

  const handleTimeout = async () => {
    if (!activeChallenge || gameState !== "playing") {
      return;
    }

    if (phase === "answering" && activeChallenge.questionType === "standard") {
      setSwitchSeconds(ANSWER_SECONDS);
      setTurnPlayer(otherPlayer(activeChallenge.answerPlayer));
      setPhase("switch");
      return;
    }

    if (activeChallenge.questionType === "yes_no") {
      const winnerPlayer = otherPlayer(activeChallenge.answerPlayer);
      claimTile(activeChallenge.row, activeChallenge.col, winnerPlayer);
      endChallenge(winnerPlayer);
      return;
    }

    await revealCorrectAndContinue();
  };

  const pickPopupText =
    phase === "idle"
      ? `${PLAYER_META[turnPlayer].label}: pick a tile`
      : statusPopup;

  const pickProgress = useMemo(() => {
    return Math.max((pickSeconds / PICK_SECONDS) * 100, 0);
  }, [pickSeconds]);

  return (
    <Container maxW="7xl" py={6}>
      <Stack gap={5}>
        <Flex justify="center" align="center" gap={3} flexWrap="wrap">
          <Box
            px={4}
            py={2}
            borderRadius="full"
            bg={turnPlayer === "player1" ? "blue.500" : "gray.800"}
            color="white"
            fontWeight="700"
          >
            Player 1
          </Box>
          <Box
            px={4}
            py={2}
            borderRadius="full"
            bg={turnPlayer === "player2" ? "orange.500" : "gray.800"}
            color="white"
            fontWeight="700"
          >
            Player 2
          </Box>
        </Flex>

        <Box overflowX="hidden" py={2}>
          <Stack align="center" gap={2}>
            {board.map((row, rowIndex) => (
              <Flex
                key={`row-${rowIndex}`}
                justify="center"
                mt={rowIndex === 0 ? 0 : { base: "-10px", md: "-12px" }}
                gap={{ base: 1.5, md: 2.5 }}
                px={2}
              >
                {row.map((tile) => (
                  <HexTile
                    key={tile.id}
                    tile={tile}
                    disabled={winner !== null || phase !== "idle"}
                    onClick={() => startSelection(tile.row, tile.col, tile)}
                  />
                ))}
              </Flex>
            ))}
          </Stack>
        </Box>

        <Box textAlign="center" minH="28px">
          <Text fontSize="sm" color="fg.muted">
            {phase === "idle" ? pickPopupText : statusPopup}
          </Text>
          {phase === "idle" ? <TimerLine progress={pickProgress} /> : null}
        </Box>

        <Flex justify="center" gap={3} wrap="wrap">
          <Button
            variant="surface"
            colorPalette="red"
            onClick={() => setShowConcedeConfirm(true)}
            disabled={gameState !== "playing"}
          >
            Concede
          </Button>
        </Flex>
      </Stack>

      {activeChallenge ? (
        activeChallenge.questionType === "standard" ? (
          <StandardQuestionModal
            key={`${phase}-${activeChallenge.question.id}`}
            open={phase === "answering" || phase === "stealing"}
            playerLabel={PLAYER_META[activeChallenge.answerPlayer].label}
            question={activeChallenge.question}
            remainingSeconds={questionSeconds}
            totalSeconds={ANSWER_SECONDS}
            mode={phase === "stealing" ? "steal" : "answer"}
            onSubmit={handleAnswer}
          />
        ) : (
          <YesNoQuestionModal
            key={`${phase}-${activeChallenge.question.id}`}
            open={phase === "answering" || phase === "stealing"}
            playerLabel={PLAYER_META[activeChallenge.answerPlayer].label}
            question={activeChallenge.question}
            remainingSeconds={questionSeconds}
            totalSeconds={ANSWER_SECONDS}
            mode={phase === "stealing" ? "steal" : "answer"}
            onSubmit={handleAnswer}
          />
        )
      ) : null}

      {activeChallenge && phase === "switch" ? (
        <SwitchAnswerModal
          open={phase === "switch"}
          playerLabel={
            PLAYER_META[otherPlayer(activeChallenge.ownerPlayer)].label
          }
          questionType={activeChallenge.questionType}
          remainingSeconds={switchSeconds}
          totalSeconds={ANSWER_SECONDS}
          onAccept={openStealChallenge}
          onDecline={() => {
            void revealCorrectAndContinue();
          }}
        />
      ) : null}

      <ConcedeConfirmModal
        open={showConcedeConfirm}
        playerLabel={PLAYER_META[turnPlayer].label}
        onCancel={() => setShowConcedeConfirm(false)}
        onConfirm={() => {
          const winnerPlayer = otherPlayer(turnPlayer);
          endGame(
            winnerPlayer,
            `${PLAYER_META[turnPlayer].label} conceded. ${PLAYER_META[winnerPlayer].label} wins.`,
          );
        }}
      />

      <GameOverModal
        open={gameState === "ended" && gameResult !== null}
        winnerLabel={gameResult ? PLAYER_META[gameResult.winner].label : ""}
        message={gameResult?.message ?? ""}
        onHome={() => window.location.assign("/")}
        onNewGame={startNewGame}
      />
    </Container>
  );
}

interface HexTileProps {
  tile: TileCell;
  disabled: boolean;
  onClick: () => void;
}

function HexTile({ tile, disabled, onClick }: HexTileProps) {
  const colors = useMemo(() => {
    if (tile.state === "player1") {
      return {
        background: "linear-gradient(145deg, #60a5fa, #1d4ed8)",
        text: "white",
      };
    }

    if (tile.state === "player2") {
      return {
        background: "linear-gradient(145deg, #fdba74, #f97316)",
        text: "white",
      };
    }

    if (tile.state === "black") {
      return {
        background: "linear-gradient(145deg, #111827, #030712)",
        text: "#9ca3af",
      };
    }

    return {
      background: "linear-gradient(145deg, #f8fafc, #e2e8f0)",
      text: "#0f172a",
    };
  }, [tile.state]);

  const clickable = !disabled && !isClaimed(tile);

  return (
    <Box
      as="button"
      position="relative"
      width={{ base: "44px", sm: "46px", md: "66px" }}
      height={{ base: "50px", sm: "52px", md: "74px" }}
      className="clip-hexagon"
      cursor={clickable ? "pointer" : "not-allowed"}
      opacity={disabled && !isClaimed(tile) ? 0.8 : 1}
      background={colors.background}
      boxShadow={
        tile.state === "black"
          ? "inset 0 0 12px rgba(0,0,0,0.5)"
          : "0 10px 24px rgba(15, 23, 42, 0.18)"
      }
      transition="transform 180ms ease, filter 180ms ease"
      _hover={
        clickable
          ? {
              transform: "translateY(-3px) scale(1.04)",
              filter: "brightness(1.05)",
            }
          : undefined
      }
      _active={clickable ? { transform: "scale(0.98)" } : undefined}
      onClick={onClick}
      padding={0}
    >
      <Box
        position="absolute"
        inset={0}
        className="clip-hexagon"
        display="flex"
        alignItems="center"
        justifyContent="center"
        color={colors.text}
        fontWeight="800"
        fontSize={{ base: "xs", sm: "sm", md: "md", lg: "lg" }}
        letterSpacing="0.08em"
      >
        {tile.label}
      </Box>
    </Box>
  );
}
