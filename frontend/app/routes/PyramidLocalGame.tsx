import {
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";

import { TimerLine } from "components/General/TimerLine";
import YesNoQuestionModal from "../../components/YesNoQuestionModal";
import SwitchAnswerModal from "components/SwitchAnswerModal";
import GameOverModal from "../../components/GameOverModal";
import ConcedeConfirmModal from "../../components/ConcedeConfirmModal";
import { PLAYER_META, type TileCell } from "app/game/pyramidTypes";
import { isClaimed, otherPlayer } from "app/game/pyramidRules";
import {
  ANSWER_SECONDS,
  PICK_SECONDS,
  usePyramidGameController,
} from "app/game/usePyramidGameController";

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
  const [showConcedeConfirm, setShowConcedeConfirm] = useState(false);
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
    startNewGame,
    startSelection,
    handleAnswer,
    openStealChallenge,
    revealCorrectAndContinue,
    concedeCurrentTurn,
  } = usePyramidGameController();

  const pickPopupText =
    phase === "idle"
      ? `${PLAYER_META[turnPlayer].label}: pick a tile`
      : statusPopup;

  const pickProgress = useMemo(() => {
    return Math.max((pickSeconds / PICK_SECONDS) * 100, 0);
  }, [pickSeconds]);

  return (
    <Container maxW="8xl" px={{ base: 3, md: 6 }} py={6}>
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

        <Box overflowX="clip" py={2}>
          <Stack align="center" gap={2}>
            {board.map((row, rowIndex) => (
              <Flex
                key={`row-${rowIndex}`}
                justify="center"
                mt={rowIndex === 0 ? 0 : { base: "-10px", md: "-12px" }}
                gap={{ base: 1, sm: 1.25, md: 2.5 }}
                px={0}
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
          <SwitchAnswerModal
            key={`${phase}-${activeChallenge.question.id}`}
            open={phase === "answering" || phase === "stealing"}
            playerLabel={PLAYER_META[activeChallenge.answerPlayer].label}
            questionType="standard"
            remainingSeconds={questionSeconds}
            totalSeconds={ANSWER_SECONDS}
            onAccept={() => handleAnswer("accept")}
            onDecline={() => handleAnswer("decline")}
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
          concedeCurrentTurn();
          setShowConcedeConfirm(false);
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
      width={{ base: "38px", sm: "42px", md: "66px" }}
      height={{ base: "44px", sm: "48px", md: "74px" }}
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
