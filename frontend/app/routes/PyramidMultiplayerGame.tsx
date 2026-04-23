import {
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import {
  checkQuestion,
  forfeitMultiplayerMatch,
  getQuestion,
  getMultiplayerMatch,
  getMultiplayerQueueStatus,
  getMultiplayerWebSocketUrl,
  joinMultiplayerQueue,
  submitMultiplayerTurn,
  type ApiErrorResponse,
  type MatchStateResponse,
  type MultiplayerWebSocketEvent,
} from "api/api";
import type { Route } from "./+types/PyramidMultiplayerGame";
import ConcedeConfirmModal from "components/ConcedeConfirmModal";
import { TimerLine } from "components/General/TimerLine";
import GameOverModal from "components/GameOverModal";
import StandardQuestionModal from "components/StandardQuestionModal";
import SwitchAnswerModal from "components/SwitchAnswerModal";
import YesNoQuestionModal from "components/YesNoQuestionModal";
import { isClaimed, otherPlayer } from "app/game/pyramidRules";
import {
  ANSWER_SECONDS,
  PICK_SECONDS,
  type PyramidGameSnapshot,
  usePyramidGameController,
} from "app/game/usePyramidGameController";
import { PLAYER_META, type Player, type TileCell } from "app/game/pyramidTypes";

function isMatchStateResponse(value: unknown): value is MatchStateResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id: unknown }).id === "number"
  );
}

function isQueueJoinMatched(
  value: unknown,
): value is { matched_match_id: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    (value as { status: unknown }).status === "matched" &&
    "matched_match_id" in value &&
    typeof (value as { matched_match_id: unknown }).matched_match_id ===
      "number"
  );
}

function isQueueStatus(value: unknown): value is {
  in_queue: boolean;
  queue_position: number | null;
  waited_seconds: number;
  matched_match_id?: number | null;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "in_queue" in value &&
    typeof (value as { in_queue: unknown }).in_queue === "boolean" &&
    "waited_seconds" in value &&
    typeof (value as { waited_seconds: unknown }).waited_seconds === "number"
  );
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return typeof value === "object" && value !== null;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "AZ Quizz Multiplayer" },
    {
      name: "description",
      content: "Multiplayer AZ Quizz pyramid game.",
    },
  ];
}

export default function PyramidMultiplayerGame() {
  const navigate = useNavigate();
  const [showConcedeConfirm, setShowConcedeConfirm] = useState(false);
  const [token, setToken] = useState<string>("");
  const [playerEmail, setPlayerEmail] = useState<string>("");
  const [match, setMatch] = useState<MatchStateResponse | null>(null);
  const [queueStatusText, setQueueStatusText] = useState<string>(
    "Preparing matchmaking...",
  );
  const [syncStatusText, setSyncStatusText] = useState<string>("");
  const [errorText, setErrorText] = useState<string>("");
  const [connectedPlayers, setConnectedPlayers] = useState<Set<string>>(
    new Set(),
  );
  const [remoteSnapshot, setRemoteSnapshot] =
    useState<PyramidGameSnapshot | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastBroadcastSnapshotRef = useRef<string>("");

  const {
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
    startSelection,
    handleAnswer,
    openStealChallenge,
    revealCorrectAndContinue,
    concedeCurrentTurn,
  } = usePyramidGameController({
    initialTurnPlayer: "player1",
    externalSnapshot: remoteSnapshot,
    transport: {
      requestQuestion: async (questionType) => getQuestion(questionType),
      submitAnswerCheck: async (payload) => {
        const result = await checkQuestion(payload);

        if (!match || !token || payload.answer === "" || !activeChallenge) {
          return result;
        }

        try {
          await submitMultiplayerTurn(token, match.id, {
            tile_id:
              (activeChallenge.row * (activeChallenge.row + 1)) / 2 +
              activeChallenge.col +
              1,
            question_type: activeChallenge.questionType,
            question_id: payload.question_id,
            is_correct: Boolean(result?.is_correct),
          });
          setSyncStatusText("Turn synced with server.");
        } catch (error: unknown) {
          const payloadError = error as ApiErrorResponse;
          setSyncStatusText(
            payloadError?.detail?.toString() ||
              payloadError?.message?.toString() ||
              "Could not sync turn.",
          );
        }

        return result;
      },
    },
  });

  const mySide: Player | null = useMemo(() => {
    if (!match || !playerEmail) {
      return null;
    }

    if (match.player1.email === playerEmail) {
      return "player1";
    }

    if (match.player2.email === playerEmail) {
      return "player2";
    }

    return null;
  }, [match, playerEmail]);

  const isMyTurn = mySide !== null && turnPlayer === mySide;
  const bothPlayersConnected = useMemo(() => {
    if (!match) {
      return false;
    }

    return (
      connectedPlayers.has(match.player1.email) &&
      connectedPlayers.has(match.player2.email)
    );
  }, [connectedPlayers, match]);

  const pickPopupText =
    phase === "idle"
      ? `${PLAYER_META[turnPlayer].label}: pick a tile`
      : statusPopup;

  const pickProgress = useMemo(() => {
    return Math.max((pickSeconds / PICK_SECONDS) * 100, 0);
  }, [pickSeconds]);

  const currentSnapshot = useMemo<PyramidGameSnapshot>(
    () => ({
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
    }),
    [
      activeChallenge,
      board,
      gameResult,
      gameState,
      pickSeconds,
      phase,
      questionSeconds,
      statusPopup,
      switchSeconds,
      turnPlayer,
      winner,
    ],
  );

  useEffect(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const snapshotString = JSON.stringify(currentSnapshot);
    if (snapshotString === lastBroadcastSnapshotRef.current) {
      return;
    }

    lastBroadcastSnapshotRef.current = snapshotString;
    socketRef.current.send(
      JSON.stringify({
        type: "game_snapshot",
        snapshot: currentSnapshot,
      }),
    );
  }, [currentSnapshot]);

  useEffect(() => {
    const rawUser = localStorage.getItem("user");
    if (!rawUser) {
      setErrorText("You need to be logged in to play multiplayer.");
      return;
    }

    try {
      const user = JSON.parse(rawUser) as {
        email?: string;
        access_token?: string;
      };

      if (!user?.access_token || !user?.email) {
        setErrorText("Missing access token. Please login again.");
        return;
      }

      setToken(user.access_token);
      setPlayerEmail(user.email);
    } catch {
      setErrorText("Invalid user session in local storage.");
    }
  }, []);

  useEffect(() => {
    if (!token || errorText || match) {
      return;
    }

    let disposed = false;

    const loadMatchWithRetry = async (matchId: number, maxAttempts = 6) => {
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const loaded = await getMultiplayerMatch(token, matchId);
        if (isMatchStateResponse(loaded)) {
          return loaded;
        }

        const detail =
          isApiErrorResponse(loaded) && typeof loaded.detail === "string"
            ? loaded.detail
            : "";
        const isNotFound = detail.toLowerCase().includes("match not found");

        if (!isNotFound || attempt === maxAttempts) {
          return null;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 350));
      }

      return null;
    };

    const startQueue = async () => {
      const joined = await joinMultiplayerQueue(token, {
        game_mode: "pyramid",
      });

      if (disposed) {
        return;
      }

      if (isQueueJoinMatched(joined)) {
        const loaded = await loadMatchWithRetry(joined.matched_match_id);
        if (disposed) {
          return;
        }

        if (loaded) {
          setMatch(loaded);
          setQueueStatusText("Match found.");
          return;
        }

        setQueueStatusText("Match is being prepared, retrying...");
      }

      setQueueStatusText("Searching opponent...");

      intervalRef.current = window.setInterval(async () => {
        const status = await getMultiplayerQueueStatus(token);
        if (disposed) {
          return;
        }

        if (isQueueStatus(status) && status.in_queue) {
          const waited = Math.max(0, status.waited_seconds);
          setQueueStatusText(
            `Searching opponent... position ${status.queue_position ?? "-"}, waiting ${waited}s`,
          );
          return;
        }

        if (
          isQueueStatus(status) &&
          typeof status.matched_match_id === "number"
        ) {
          const loaded = await loadMatchWithRetry(status.matched_match_id);
          if (loaded) {
            setMatch(loaded);
            setQueueStatusText("Match found.");
          } else {
            setQueueStatusText("Match is being prepared, retrying...");
          }
          return;
        }

        const tryJoinAgain = await joinMultiplayerQueue(token, {
          game_mode: "pyramid",
        });

        if (isQueueJoinMatched(tryJoinAgain)) {
          const loaded = await loadMatchWithRetry(
            tryJoinAgain.matched_match_id,
          );
          if (loaded) {
            setMatch(loaded);
            setQueueStatusText("Match found.");
          } else {
            setQueueStatusText("Match is being prepared, retrying...");
          }
        }
      }, 2000);
    };

    void startQueue();

    return () => {
      disposed = true;
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [token, match, errorText]);

  useEffect(() => {
    if (!token || !match) {
      return;
    }

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const wsUrl = getMultiplayerWebSocketUrl(match.id, token);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnectedPlayers(new Set(playerEmail ? [playerEmail] : []));
      setSyncStatusText("Realtime connected.");
      lastBroadcastSnapshotRef.current = JSON.stringify(currentSnapshot);
      ws.send(JSON.stringify({ type: "state_request" }));
      ws.send(
        JSON.stringify({
          type: "game_snapshot",
          snapshot: currentSnapshot,
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as MultiplayerWebSocketEvent;

        const refreshMatch = async () => {
          const refreshed = await getMultiplayerMatch(token, match.id);
          if (isMatchStateResponse(refreshed)) {
            setMatch(refreshed);
          }
        };

        if (parsed.event === "match_snapshot") {
          const payloadMatch = parsed.payload.match as
            | MatchStateResponse
            | undefined;
          if (payloadMatch?.id) {
            setMatch(payloadMatch);
          }
          return;
        }

        if (parsed.event === "game_snapshot") {
          const snapshot = parsed.payload.snapshot as
            | PyramidGameSnapshot
            | undefined;
          if (snapshot) {
            lastBroadcastSnapshotRef.current = JSON.stringify(snapshot);
            setRemoteSnapshot(snapshot);
          }
          return;
        }

        if (parsed.event === "player_connected") {
          const connectedEmail =
            typeof parsed.payload.player_email === "string"
              ? parsed.payload.player_email
              : "";

          if (connectedEmail) {
            setConnectedPlayers((current) => {
              const next = new Set(current);
              next.add(connectedEmail);
              return next;
            });
          }
          return;
        }

        if (parsed.event === "player_disconnected") {
          const disconnectedEmail =
            typeof parsed.payload.player_email === "string"
              ? parsed.payload.player_email
              : "";

          if (disconnectedEmail) {
            setConnectedPlayers((current) => {
              const next = new Set(current);
              next.delete(disconnectedEmail);
              return next;
            });
          }
          return;
        }

        if (parsed.event === "score_updated") {
          void refreshMatch();
          return;
        }

        if (parsed.event === "match_finished") {
          void refreshMatch();
        }
      } catch {
        setSyncStatusText("Invalid realtime event payload.");
      }
    };

    ws.onclose = () => {
      setSyncStatusText("Realtime disconnected.");
    };

    return () => {
      ws.close();
      socketRef.current = null;
      setConnectedPlayers(new Set());
    };
  }, [match?.id, token, playerEmail]);

  const handleAnswerIfAllowed = async (answer: string | boolean) => {
    if (!bothPlayersConnected || !isMyTurn) {
      return;
    }

    await handleAnswer(answer);
  };

  const handleForfeit = async () => {
    if (!token || !match) {
      concedeCurrentTurn();
      return;
    }

    const response = await forfeitMultiplayerMatch(token, match.id);
    if ("winner_email" in response) {
      setSyncStatusText("You forfeited the match.");
    } else {
      setSyncStatusText(
        response.detail || response.message || "Forfeit failed.",
      );
    }

    concedeCurrentTurn();
  };

  if (errorText) {
    return (
      <Container maxW="container.lg" py={8}>
        <Stack gap={4}>
          <Button
            onClick={() => navigate("/")}
            variant="surface"
            colorPalette="green"
          >
            &larr; Back to Main Menu
          </Button>
          <Text color="red.500">{errorText}</Text>
        </Stack>
      </Container>
    );
  }

  if (!match) {
    return (
      <Container maxW="container.lg" py={8}>
        <Stack gap={4} align="center">
          <Button
            onClick={() => navigate("/")}
            variant="surface"
            colorPalette="green"
          >
            &larr; Back to Main Menu
          </Button>
          <Spinner size="lg" />
          <Text>{queueStatusText}</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxW="7xl" py={6}>
      <Stack gap={5}>
        <Button
          alignSelf="start"
          onClick={() => navigate("/")}
          variant="surface"
          colorPalette="green"
        >
          &larr; Back to Main Menu
        </Button>

        <Flex justify="center" align="center" gap={3} flexWrap="wrap">
          <Box
            px={4}
            py={2}
            borderRadius="full"
            bg={turnPlayer === "player1" ? "blue.500" : "gray.800"}
            color="white"
            fontWeight="700"
          >
            {match.player1.username} ({match.player1_score})
          </Box>
          <Box
            px={4}
            py={2}
            borderRadius="full"
            bg={turnPlayer === "player2" ? "orange.500" : "gray.800"}
            color="white"
            fontWeight="700"
          >
            {match.player2.username} ({match.player2_score})
          </Box>
        </Flex>

        <HStack justify="center" gap={6}>
          <Text fontSize="sm" color="fg.muted">
            You are: {mySide ? PLAYER_META[mySide].label : "spectator"}
          </Text>
          <Text fontSize="sm" color={isMyTurn ? "green.500" : "fg.muted"}>
            {isMyTurn ? "Your turn" : "Opponent turn"}
          </Text>
        </HStack>

        {!bothPlayersConnected ? (
          <Text textAlign="center" fontSize="sm" color="orange.500">
            Waiting for both players to be connected before the game starts.
          </Text>
        ) : null}

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
                    disabled={
                      winner !== null ||
                      phase !== "idle" ||
                      !isMyTurn ||
                      !bothPlayersConnected
                    }
                    onClick={() => {
                      if (bothPlayersConnected && isMyTurn) {
                        startSelection(tile.row, tile.col, tile);
                      }
                    }}
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
          {syncStatusText ? (
            <Text mt={1} fontSize="xs" color="fg.muted">
              {syncStatusText}
            </Text>
          ) : null}
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
            open={(phase === "answering" || phase === "stealing") && isMyTurn}
            playerLabel={PLAYER_META[activeChallenge.answerPlayer].label}
            question={activeChallenge.question}
            remainingSeconds={questionSeconds}
            totalSeconds={ANSWER_SECONDS}
            mode={phase === "stealing" ? "steal" : "answer"}
            onSubmit={handleAnswerIfAllowed}
          />
        ) : (
          <YesNoQuestionModal
            key={`${phase}-${activeChallenge.question.id}`}
            open={(phase === "answering" || phase === "stealing") && isMyTurn}
            playerLabel={PLAYER_META[activeChallenge.answerPlayer].label}
            question={activeChallenge.question}
            remainingSeconds={questionSeconds}
            totalSeconds={ANSWER_SECONDS}
            mode={phase === "stealing" ? "steal" : "answer"}
            onSubmit={handleAnswerIfAllowed}
          />
        )
      ) : null}

      {activeChallenge && phase === "switch" ? (
        <SwitchAnswerModal
          open={phase === "switch" && isMyTurn}
          playerLabel={
            PLAYER_META[otherPlayer(activeChallenge.ownerPlayer)].label
          }
          questionType={activeChallenge.questionType}
          remainingSeconds={switchSeconds}
          totalSeconds={ANSWER_SECONDS}
          onAccept={() => {
            if (bothPlayersConnected && isMyTurn) {
              openStealChallenge();
            }
          }}
          onDecline={() => {
            if (bothPlayersConnected && isMyTurn) {
              void revealCorrectAndContinue();
            }
          }}
        />
      ) : null}

      <ConcedeConfirmModal
        open={showConcedeConfirm}
        playerLabel={PLAYER_META[turnPlayer].label}
        onCancel={() => setShowConcedeConfirm(false)}
        onConfirm={() => {
          void handleForfeit();
          setShowConcedeConfirm(false);
        }}
      />

      <GameOverModal
        open={
          gameState === "ended" ||
          (match.status !== "ongoing" && Boolean(match.winner_email))
        }
        winnerLabel={
          match.winner_email
            ? match.winner_email === match.player1.email
              ? match.player1.username
              : match.player2.username
            : gameResult
              ? PLAYER_META[gameResult.winner].label
              : ""
        }
        message={
          match.status !== "ongoing"
            ? "Match finished."
            : (gameResult?.message ?? "")
        }
        onHome={() => window.location.assign("/")}
        onNewGame={() => window.location.reload()}
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
