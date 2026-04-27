import {
  Badge,
  Box,
  Button,
  Dialog,
  Heading,
  HStack,
  Portal,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";

import type { QuestionResponse } from "api/api";
import { TimerLine } from "components/General/TimerLine";

type Mode = "answer" | "steal";

interface Props {
  open: boolean;
  playerLabel: string;
  question: QuestionResponse;
  remainingSeconds: number;
  totalSeconds: number;
  mode: Mode;
  interactive?: boolean;
  onSubmit: (answer: boolean) => void | Promise<void>;
}

export default function YesNoQuestionModal({
  open,
  playerLabel,
  question,
  remainingSeconds,
  totalSeconds,
  mode,
  interactive = true,
  onSubmit,
}: Props) {
  const [submitting, setSubmitting] = useState(false);

  const progress = useMemo(() => {
    return Math.max((remainingSeconds / totalSeconds) * 100, 0);
  }, [remainingSeconds, totalSeconds]);

  const banner = mode === "steal" ? "Steal chance" : "Answer now";

  const submit = async (answer: boolean) => {
    if (!interactive) {
      return;
    }

    setSubmitting(true);
    await onSubmit(answer);
  };

  return (
    <Dialog.Root open={open} onOpenChange={() => undefined}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            borderRadius="3xl"
            overflow="hidden"
            borderWidth="1px"
            borderColor="border"
            bg="bg"
            color="fg"
            boxShadow="2xl"
            maxW="2xl"
            w={{ base: "calc(100vw - 1.5rem)", md: "2xl" }}
          >
            <Box
              px={6}
              py={5}
              bgGradient={
                mode === "steal"
                  ? "linear(to-r, orange.500, red.500)"
                  : "linear(to-r, blue.500, teal.500)"
              }
            >
              <HStack justify="space-between" align="start" gap={4}>
                <Stack gap={1}>
                  <Badge
                    colorPalette="whiteAlpha"
                    variant="solid"
                    w="fit-content"
                  >
                    {banner}
                  </Badge>
                  <Heading size="lg">Yes / No question</Heading>
                  <Text color="whiteAlpha.900">
                    {interactive
                      ? `${playerLabel} can answer now.`
                      : "Waiting for the active player."}
                  </Text>
                </Stack>
                <Box w="140px" textAlign="right" flexShrink={0}>
                  <TimerLine progress={progress} />
                  <Text mt={2} fontSize="sm" color="whiteAlpha.900">
                    timer
                  </Text>
                </Box>
              </HStack>
            </Box>

            <Box px={6} py={5}>
              <Stack gap={4}>
                <Box>
                  <Text color="fg.muted" fontSize="sm">
                    Category: {question.category ?? "general"}
                  </Text>
                  <Text color="fg.muted" fontSize="sm">
                    Difficulty: {question.difficulty ?? "n/a"}
                  </Text>
                </Box>

                <Text fontSize="xl" fontWeight="semibold" lineHeight="1.4">
                  {question.question_text}
                </Text>

                <HStack gap={3} flexWrap="wrap" justify="center">
                  <Button
                    size="lg"
                    minW="140px"
                    colorPalette="green"
                    onClick={() => void submit(true)}
                    loading={submitting}
                    disabled={submitting || !interactive}
                  >
                    Yes
                  </Button>
                  <Button
                    size="lg"
                    minW="140px"
                    colorPalette="red"
                    onClick={() => void submit(false)}
                    loading={submitting}
                    disabled={submitting || !interactive}
                  >
                    No
                  </Button>
                </HStack>
              </Stack>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
