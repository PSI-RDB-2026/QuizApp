import { useEffect, useState } from "react";

import type { QuestionResponse } from "api/api";
import { localGameTransport, type GameTransport } from "./gameTransport";
import {
  PLAYER_META,
  type GameState,
  type Phase,
  type Player,
  type QuestionType,
  type TileCell,
  type TileState,
} from "./pyramidTypes";
import {
  createBoard,
  hasPotentialThreeSideConnection,
  otherPlayer,
  questionTypeForTile,
  touchesAllSides,
} from "./pyramidRules";

export interface ActiveChallenge {
  row: number;
  col: number;
  ownerPlayer: Player;
  answerPlayer: Player;
  questionType: QuestionType;
  question: QuestionResponse;
}

export interface GameResult {
  winner: Player;
  message: string;
}

export interface PyramidGameSnapshot {
  board: TileCell[][];
  turnPlayer: Player;
  winner: Player | null;
  gameState: GameState;
  gameResult: GameResult | null;
  phase: Phase;
  pickSeconds: number;
  questionSeconds: number;
  switchSeconds: number;
  statusPopup: string;
  activeChallenge: ActiveChallenge | null;
}

export const PICK_SECONDS = 10;
export const ANSWER_SECONDS = 18;
const ANSWER_REVEAL_MS = 2200;

interface UsePyramidGameControllerOptions {
  transport?: GameTransport;
  initialTurnPlayer?: Player;
  externalSnapshot?: PyramidGameSnapshot | null;
  timersEnabled?: boolean;
}

export function usePyramidGameController(
  options?: UsePyramidGameControllerOptions,
) {
  const transport = options?.transport ?? localGameTransport;
  const openingPlayer = options?.initialTurnPlayer;
  const timersEnabled = options?.timersEnabled ?? true;
  const [board, setBoard] = useState<TileCell[][]>(() => createBoard());
  const [turnPlayer, setTurnPlayer] = useState<Player>(
    () => openingPlayer ?? (Math.random() < 0.5 ? "player1" : "player2"),
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
  const [activeChallenge, setActiveChallenge] =
    useState<ActiveChallenge | null>(null);

  useEffect(() => {
    const snapshot = options?.externalSnapshot;
    if (!snapshot) {
      return;
    }

    setBoard(snapshot.board);
    setTurnPlayer(snapshot.turnPlayer);
    setWinner(snapshot.winner);
    setGameState(snapshot.gameState);
    setGameResult(snapshot.gameResult);
    setPhase(snapshot.phase);
    setPickSeconds(snapshot.pickSeconds);
    setQuestionSeconds(snapshot.questionSeconds);
    setSwitchSeconds(snapshot.switchSeconds);
    setStatusPopup(snapshot.statusPopup);
    setActiveChallenge(snapshot.activeChallenge);
  }, [options?.externalSnapshot]);

  const startNewGame = () => {
    const nextOpeningPlayer =
      openingPlayer ?? (Math.random() < 0.5 ? "player1" : "player2");

    setBoard(createBoard());
    setTurnPlayer(nextOpeningPlayer);
    setWinner(null);
    setGameState("playing");
    setGameResult(null);
    setPhase("idle");
    setPickSeconds(PICK_SECONDS);
    setQuestionSeconds(ANSWER_SECONDS);
    setSwitchSeconds(ANSWER_SECONDS);
    setStatusPopup("");
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

  const endGame = (winnerPlayer: Player, message: string) => {
    setWinner(winnerPlayer);
    setGameResult({ winner: winnerPlayer, message });
    setGameState("ended");
    setPhase("idle");
    setStatusPopup(message);
    setActiveChallenge(null);
  };

  useEffect(() => {
    if (!timersEnabled) {
      return;
    }

    if (winner || gameState !== "playing" || phase !== "idle") {
      return;
    }

    if (pickSeconds <= 0) {
      const nextPlayer = otherPlayer(turnPlayer);
      const timeoutMessage = `${PLAYER_META[turnPlayer].label} did not pick in time. ${PLAYER_META[nextPlayer].label}'s turn.`;
      setTurnPlayer(nextPlayer);
      setPickSeconds(PICK_SECONDS);
      setStatusPopup(timeoutMessage);
      return;
    }

    const timer = window.setTimeout(() => {
      setPickSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [pickSeconds, phase, turnPlayer, winner, gameState, timersEnabled]);

  const endChallenge = (nextTurn: Player) => {
    setTurnPlayer(nextTurn);
    setPhase("idle");
    setPickSeconds(PICK_SECONDS);
    setQuestionSeconds(ANSWER_SECONDS);
    setSwitchSeconds(ANSWER_SECONDS);
    setActiveChallenge(null);
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

  const loadQuestion = async (
    row: number,
    col: number,
    player: Player,
    questionType: QuestionType,
  ) => {
    if (gameState !== "playing") {
      return;
    }

    const question = await transport.requestQuestion(questionType);

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

  const startSelection = (row: number, col: number, tile: TileCell) => {
    if (winner || gameState !== "playing" || phase !== "idle") {
      return;
    }

    if (tile.state === "player1" || tile.state === "player2") {
      return;
    }

    setPickSeconds(PICK_SECONDS);
    setStatusPopup("");
    void loadQuestion(row, col, turnPlayer, questionTypeForTile(tile));
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

    const result = await transport.submitAnswerCheck({
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

    const response = await transport.submitAnswerCheck({
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

  useEffect(() => {
    if (!timersEnabled) {
      return;
    }

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
  }, [phase, questionSeconds, switchSeconds, gameState, timersEnabled]);

  const concedeCurrentTurn = () => {
    const winnerPlayer = otherPlayer(turnPlayer);
    endGame(
      winnerPlayer,
      `${PLAYER_META[turnPlayer].label} conceded. ${PLAYER_META[winnerPlayer].label} wins.`,
    );
  };

  return {
    board,
    turnPlayer,
    winner,
    gameState,
    gameResult,
    phase,
    pickSeconds,
    questionSeconds,
    switchSeconds,
    statusPopup,
    activeChallenge,
    startNewGame,
    startSelection,
    handleAnswer,
    openStealChallenge,
    revealCorrectAndContinue,
    concedeCurrentTurn,
  };
}
