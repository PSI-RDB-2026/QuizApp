import {
  Badge,
  Box,
  Button,
  Dialog,
  Heading,
  HStack,
  Input,
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
  onSubmit: (answer: string) => void | Promise<void>;
}

export default function StandardQuestion({
  open,
  playerLabel,
  question,
  remainingSeconds,
  totalSeconds,
  mode,
  onSubmit,
}: Props) {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const progress = useMemo(() => {
    return Math.max((remainingSeconds / totalSeconds) * 100, 0);
  }, [remainingSeconds, totalSeconds]);

  const accent = mode === "steal" ? "orange.500" : "blue.500";
  const banner = mode === "steal" ? "Steal chance" : "Answer now";

  const submit = async () => {
    if (!answer.trim()) {
      return;
    }

    setSubmitting(true);
    await onSubmit(answer.trim());
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
              <HStack justify="space-between" align="start">
                <Stack gap={1}>
                  <Badge
                    colorPalette="whiteAlpha"
                    variant="solid"
                    w="fit-content"
                  >
                    {banner}
                  </Badge>
                  <Heading size="lg">Standard question</Heading>
                  <Text color="fg">{playerLabel} is on the move.</Text>
                </Stack>
                <Box textAlign="right">
                  <Text fontSize="2xl" fontWeight="bold">
                    {remainingSeconds}s
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    timer
                  </Text>
                </Box>
              </HStack>

              <TimerLine progress={progress} />
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
                  {question.initials ? (
                    <Text color="fg.muted" fontSize="sm">
                      Hint initials: {question.initials}
                    </Text>
                  ) : null}
                </Box>

                <Text fontSize="xl" fontWeight="semibold" lineHeight="1.4">
                  {question.question_text}
                </Text>

                <Input
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Type your answer"
                  bg="bg.subtle"
                  borderColor="border"
                  color="fg"
                  _placeholder={{ color: "fg.muted" }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void submit();
                    }
                  }}
                />

                <HStack justify="end">
                  <Button
                    onClick={submit}
                    colorPalette={mode === "steal" ? "orange" : "blue"}
                    loading={submitting}
                    disabled={submitting || !answer.trim()}
                  >
                    Submit answer
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
