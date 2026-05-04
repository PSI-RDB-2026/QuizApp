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
  forfeitMultiplayerMatch,
  getMultiplayerMatch,
  getMultiplayerQueueStatus,
  getMultiplayerWebSocketUrl,
  joinMultiplayerQueue,
  postLogin,
  type ApiErrorResponse,
  type MatchStateResponse,
  type MultiplayerWebSocketEvent,
} from "api/api";
import { useAuth } from "app/providers/AuthProvider";
import type { Route } from "./+types/PyramidMultiplayerGame";
import ConcedeConfirmModal from "components/ConcedeConfirmModal";
import { TimerLine } from "components/General/TimerLine";
import GameOverModal from "components/GameOverModal";
import { createWebsocketGameTransport } from "app/game/websocketGameTransport";
import StandardQuestionModal from "components/StandardQuestionModal";
import SwitchAnswerModal from "components/SwitchAnswerModal";
import YesNoQuestionModal from "components/YesNoQuestionModal";
import { isClaimed, otherPlayer } from "app/game/pyramidRulesMultiplayer";
import {
  ANSWER_SECONDS,
  PICK_SECONDS,
  type PyramidGameSnapshot,
  usePyramidGameController,
} from "app/game/usePyramidGameController";
import {
  PLAYER_META,
  type Player,
  type TileCell,
} from "app/game/pyramidTypesMultiplayer";

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
  const { user, isLoading } = useAuth();
  const [showConcedeConfirm, setShowConcedeConfirm] = useState(false);
  const [token, setToken] = useState<string>("");
  const [playerUid, setPlayerUid] = useState<string>("");
  const [match, setMatch] = useState<MatchStateResponse | null>(null);
  const [queueStatusText, setQueueStatusText] = useState<string>(
    "Preparing matchmaking...",
  );
  const [syncStatusText, setSyncStatusText] = useState<string>("");
  const [matchEndMessage, setMatchEndMessage] = useState<string>("");
  const [errorText, setErrorText] = useState<string>("");
  const [matchReady, setMatchReady] = useState(false);
  const [connectedPlayers, setConnectedPlayers] = useState<Set<string>>(
    new Set(),
  );
  const [remoteSnapshot, setRemoteSnapshot] =
    useState<PyramidGameSnapshot | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastBroadcastSnapshotRef = useRef<string>("");
  const leaveForfeitSentRef = useRef(false);
  const [timersEnabled, setTimersEnabled] = useState(false);
  const websocketUrl =
    match && token ? getMultiplayerWebSocketUrl(match.id, token) : "";

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
    timersEnabled,
    debugLogging: true,
    transport: createWebsocketGameTransport({
      endpoint: websocketUrl,
      getTurnContext: () => {
        if (!match || !token || !activeChallenge) {
          return null;
        }

        return {
          token,
          matchId: match.id,
          tileId:
            (activeChallenge.row * (activeChallenge.row + 1)) / 2 +
            activeChallenge.col +
            1,
          questionType: activeChallenge.questionType,
        };
      },
      onSyncStatusText: setSyncStatusText,
    }),
  });

  const hasClaimedTiles = useMemo(
    () => board.some((row) => row.some((tile) => isClaimed(tile))),
    [board],
  );

  const mySide: Player | null = useMemo(() => {
    if (!match || !playerUid) {
      return null;
    }

    if (match.player1.uid === playerUid) {
      return "player1";
    }

    if (match.player2.uid === playerUid) {
      return "player2";
    }

    return null;
  }, [match, playerUid]);

  const isMyTurn = mySide !== null && turnPlayer === mySide;
  const bothPlayersConnected = useMemo(() => {
    if (!match) {
      return false;
    }

    return (
      connectedPlayers.has(match.player1.uid) &&
      connectedPlayers.has(match.player2.uid)
    );
  }, [connectedPlayers, match]);

  const hasGameplayEvidence = useMemo(() => {
    if (!match) {
      return false;
    }

    return (
      phase !== "idle" ||
      hasClaimedTiles ||
      match.player1_score > 0 ||
      match.player2_score > 0 ||
      remoteSnapshot !== null
    );
  }, [hasClaimedTiles, match, phase, remoteSnapshot]);

  const multiplayerReady =
    matchReady || bothPlayersConnected || hasGameplayEvidence;
  const canControlCurrentTurn =
    mySide !== null && isMyTurn && gameState === "playing";

  useEffect(() => {
    if (match?.id) {
      setMatchEndMessage("");
      setMatchReady(false);
    }
  }, [match?.id]);

  useEffect(() => {
    leaveForfeitSentRef.current = false;
  }, [match?.id]);

  useEffect(() => {
    setTimersEnabled(canControlCurrentTurn);
  }, [canControlCurrentTurn]);

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

  const currentSnapshotRef = useRef<PyramidGameSnapshot>(currentSnapshot);
  useEffect(() => {
    currentSnapshotRef.current = currentSnapshot;
  }, [currentSnapshot]);

  const lastServerTimerTsRef = useRef<number>(0);
  const lastRemoteTimerRef = useRef<{
    pickSeconds: number;
    questionSeconds: number;
    switchSeconds: number;
    clientTs: number;
  } | null>(null);

  const broadcastSnapshotKey = useMemo(() => {
    return JSON.stringify({
      board,
      turnPlayer,
      winner,
      gameState,
      gameResult,
      phase,
      statusPopup,
      activeChallenge,
    });
  }, [
    activeChallenge,
    board,
    gameResult,
    gameState,
    phase,
    statusPopup,
    turnPlayer,
    winner,
  ]);

  useEffect(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!timersEnabled || !canControlCurrentTurn) {
      return;
    }

    const tick = window.setInterval(() => {
      const ws = socketRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }

      try {
        ws.send(
          JSON.stringify({
            type: "timer_update",
            payload: {
              sender_uid: playerUid,
              phase,
              turnPlayer,
              pickSeconds,
              questionSeconds,
              switchSeconds,
              client_ts: Date.now(),
            },
          }),
        );
      } catch {
        // ignore send errors silently
      }
    }, 500);

    return () => window.clearInterval(tick);
  }, [
    canControlCurrentTurn,
    pickSeconds,
    phase,
    playerUid,
    questionSeconds,
    switchSeconds,
    timersEnabled,
    turnPlayer,
  ]);

  useEffect(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    if (broadcastSnapshotKey === lastBroadcastSnapshotRef.current) {
      return;
    }

    lastBroadcastSnapshotRef.current = broadcastSnapshotKey;
    socketRef.current.send(
      JSON.stringify({
        type: "game_snapshot",
        snapshot: currentSnapshot,
      }),
    );
  }, [broadcastSnapshotKey, currentSnapshot]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      setErrorText("You need to be logged in to play multiplayer.");
      return;
    }

    try {
      const uid = user.firebaseUser.uid;
      if (!uid) {
        setErrorText("Unable to get user ID. Please login again.");
        return;
      }

      setPlayerUid(uid);
      setErrorText("");

      // Get access token for API calls
      void (async () => {
        try {
          const idToken = await user.getAccessToken();
          setToken(idToken);
        } catch (err) {
          setErrorText("Failed to get authentication token.");
        }
      })();
    } catch {
      setErrorText("Invalid user session.");
    }
  }, [user, isLoading]);

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
      if (user) {
        await postLogin({
          username: user.getDisplayName(),
          access_token: token,
        });
      }

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
  }, [token, match, errorText, user]);

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
      setConnectedPlayers(new Set(playerUid ? [playerUid] : []));
      setSyncStatusText("Realtime connected.");
      lastBroadcastSnapshotRef.current = "";
      ws.send(JSON.stringify({ type: "state_request" }));
      ws.send(
        JSON.stringify({
          type: "game_snapshot",
          snapshot: currentSnapshotRef.current,
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
            lastBroadcastSnapshotRef.current = JSON.stringify({
              board: snapshot.board,
              turnPlayer: snapshot.turnPlayer,
              winner: snapshot.winner,
              gameState: snapshot.gameState,
              gameResult: snapshot.gameResult,
              phase: snapshot.phase,
              statusPopup: snapshot.statusPopup,
              activeChallenge: snapshot.activeChallenge,
            });
            setRemoteSnapshot(snapshot);
          }
          return;
        }

        if (
          parsed.event === "timer_update" ||
          (parsed as any).type === "timer_update"
        ) {
          const payload = parsed.payload ?? (parsed as any).payload ?? parsed;

          if (
            typeof payload.sender_uid === "string" &&
            payload.sender_uid === playerUid
          ) {
            return;
          }

          // Reject stale timer updates using server-provided timestamp
          const serverTs =
            typeof (payload as any).server_ts === "number"
              ? (payload as any).server_ts
              : null;
          if (serverTs !== null) {
            if (serverTs <= lastServerTimerTsRef.current) {
              return;
            }
            lastServerTimerTsRef.current = serverTs;
          }

          setRemoteSnapshot((prev) => {
            const base = prev ?? currentSnapshotRef.current;
            const clientTs =
              typeof (payload as any).client_ts === "number"
                ? (payload as any).client_ts
                : null;
            const elapsedMs = clientTs ? Date.now() - clientTs : 0;

            // Calculate interpolated timer values accounting for network delay
            const pickSecondsRemote =
              typeof payload.pickSeconds === "number"
                ? Math.max(
                    0,
                    payload.pickSeconds - Math.floor(elapsedMs / 1000),
                  )
                : base.pickSeconds;
            const questionSecondsRemote =
              typeof payload.questionSeconds === "number"
                ? Math.max(
                    0,
                    payload.questionSeconds - Math.floor(elapsedMs / 1000),
                  )
                : base.questionSeconds;
            const switchSecondsRemote =
              typeof payload.switchSeconds === "number"
                ? Math.max(
                    0,
                    payload.switchSeconds - Math.floor(elapsedMs / 1000),
                  )
                : base.switchSeconds;

            lastRemoteTimerRef.current = {
              pickSeconds: pickSecondsRemote,
              questionSeconds: questionSecondsRemote,
              switchSeconds: switchSecondsRemote,
              clientTs: clientTs ?? Date.now(),
            };

            const next = {
              ...base,
              phase:
                typeof payload.phase === "string" ? payload.phase : base.phase,
              turnPlayer:
                typeof payload.turnPlayer === "string"
                  ? (payload.turnPlayer as Player)
                  : base.turnPlayer,
              pickSeconds: pickSecondsRemote,
              questionSeconds: questionSecondsRemote,
              switchSeconds: switchSecondsRemote,
            } as PyramidGameSnapshot;

            lastBroadcastSnapshotRef.current = JSON.stringify({
              board: next.board,
              turnPlayer: next.turnPlayer,
              winner: next.winner,
              gameState: next.gameState,
              gameResult: next.gameResult,
              phase: next.phase,
              statusPopup: next.statusPopup,
              activeChallenge: next.activeChallenge,
            });

            return next;
          });

          return;
        }

        if (parsed.event === "player_connected") {
          const connectedUid =
            typeof parsed.payload.player_uid === "string"
              ? parsed.payload.player_uid
              : "";

          if (connectedUid) {
            setConnectedPlayers((current) => {
              const next = new Set(current);
              next.add(connectedUid);
              return next;
            });
          }
          return;
        }

        if (parsed.event === "both_players_connected") {
          const playerUids = Array.isArray(parsed.payload.player_uids)
            ? parsed.payload.player_uids.filter(
                (item): item is string => typeof item === "string",
              )
            : [];

          if (playerUids.length > 0) {
            setConnectedPlayers(new Set(playerUids));
          }
          setMatchReady(true);
          return;
        }

        if (parsed.event === "player_disconnected") {
          const disconnectedUid =
            typeof parsed.payload.player_uid === "string"
              ? parsed.payload.player_uid
              : "";

          if (disconnectedUid) {
            setConnectedPlayers((current) => {
              const next = new Set(current);
              next.delete(disconnectedUid);
              return next;
            });
          }
          setMatchReady(false);
          return;
        }

        if (parsed.event === "score_updated") {
          void refreshMatch();
          return;
        }

        if (parsed.event === "match_finished") {
          const finishedReason =
            typeof parsed.payload.reason === "string"
              ? parsed.payload.reason
              : "";
          const winnerUid =
            typeof parsed.payload.winner_uid === "string"
              ? parsed.payload.winner_uid
              : "";

          if (
            finishedReason === "forfeit" ||
            finishedReason === "disconnect_timeout"
          ) {
            const winnerMatchesPlayer1 = !!(
              match &&
              winnerUid &&
              winnerUid === match.player1.uid
            );
            const forfeitedLabel = match
              ? winnerMatchesPlayer1
                ? match.player2.username
                : match.player1.username
              : "The other player";

            setMatchEndMessage(
              finishedReason === "forfeit"
                ? `${forfeitedLabel} forfeited the match.`
                : `${forfeitedLabel} disconnected and lost the match.`,
            );
          }

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
      setMatchReady(false);
    };
  }, [match?.id, token, playerUid]);

  const handleAnswerIfAllowed = async (answer: string | boolean) => {
    await handleAnswer(answer);
  };

  const handleForfeit = async () => {
    if (!token || !match) {
      concedeCurrentTurn();
      return;
    }

    leaveForfeitSentRef.current = true;

    const response = await forfeitMultiplayerMatch(token, match.id);
    if ("winner_uid" in response) {
      setSyncStatusText("You forfeited the match.");
      setMatchEndMessage(
        `${
          response.winner_uid === match.player1.uid
            ? match.player1.username
            : match.player2.username
        } wins because the other player forfeited.`,
      );
    } else {
      setSyncStatusText(
        response.detail || response.message || "Forfeit failed.",
      );
    }

    concedeCurrentTurn();
  };

  useEffect(() => {
    if (!token || !match) {
      return;
    }

    const sendLeaveForfeit = () => {
      if (leaveForfeitSentRef.current || gameState !== "playing") {
        return;
      }

      leaveForfeitSentRef.current = true;

      void fetch(`/api/multiplayer/matches/${match.id}/forfeit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        keepalive: true,
      });
    };

    const handlePageHide = () => {
      sendLeaveForfeit();
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [gameState, match, token]);

  if (errorText) {
    return (
      <Container maxW="container.lg" py={8}>
        <Stack gap={4}>
          <Text color="red.500">{errorText}</Text>
        </Stack>
      </Container>
    );
  }

  if (!match) {
    return (
      <Container maxW="container.lg" py={8}>
        <Stack gap={4} align="center">
          <Spinner size="lg" />
          <Text>{queueStatusText}</Text>
        </Stack>
      </Container>
    );
  }

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

        {!multiplayerReady ? (
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
                      gameState !== "playing"
                    }
                    onClick={() => {
                      if (
                        isMyTurn &&
                        phase === "idle" &&
                        gameState === "playing"
                      ) {
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
            open={phase === "answering" || phase === "stealing"}
            playerLabel={PLAYER_META[activeChallenge.answerPlayer].label}
            playerSide={activeChallenge.answerPlayer}
            question={activeChallenge.question}
            remainingSeconds={questionSeconds}
            totalSeconds={ANSWER_SECONDS}
            mode={phase === "stealing" ? "steal" : "answer"}
            interactive={isMyTurn}
            onSubmit={handleAnswerIfAllowed}
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
            interactive={isMyTurn}
            onSubmit={handleAnswerIfAllowed}
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
          interactive={isMyTurn}
          onAccept={() => {
            openStealChallenge();
          }}
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
          void handleForfeit();
          setShowConcedeConfirm(false);
        }}
      />

      <GameOverModal
        open={
          gameState === "ended" ||
          (match.status !== "ongoing" && Boolean(match.winner_uid))
        }
        winnerLabel={
          match.winner_uid
            ? match.winner_uid === match.player1.uid
              ? match.player1.username
              : match.player2.username
            : gameResult
              ? PLAYER_META[gameResult.winner].label
              : ""
        }
        message={
          match.status !== "ongoing"
            ? matchEndMessage || "Match finished."
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
