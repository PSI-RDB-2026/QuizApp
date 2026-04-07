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
import { useMemo } from "react";

import { TimerLine } from "components/General/TimerLine";

interface Props {
  open: boolean;
  playerLabel: string;
  questionType: "standard" | "yes_no";
  remainingSeconds: number;
  totalSeconds: number;
  onAccept: () => void;
  onDecline: () => void;
}

export default function SwitchAnswerModal({
  open,
  playerLabel,
  questionType,
  remainingSeconds,
  totalSeconds,
  onAccept,
  onDecline,
}: Props) {
  const progress = useMemo(() => {
    return Math.max((remainingSeconds / totalSeconds) * 100, 0);
  }, [remainingSeconds, totalSeconds]);

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
            maxW="lg"
          >
            <Box px={6} py={5} bgGradient="linear(to-r, purple.600, pink.500)">
              <HStack justify="space-between" align="start">
                <Stack gap={2}>
                  <Badge
                    colorPalette="whiteAlpha"
                    variant="solid"
                    w="fit-content"
                  >
                    Switch answer
                  </Badge>
                  <Heading size="lg">Do you want to answer?</Heading>
                  <Text color="whiteAlpha.900">
                    {playerLabel} can steal this{" "}
                    {questionType === "yes_no" ? "yes / no" : "standard"}{" "}
                    question.
                  </Text>
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

            <Box px={6} py={6}>
              <Stack gap={5}>
                <Text color="fg.muted">
                  If you accept, the timer moves to the answering modal. If you
                  decline, the tile turns black.
                </Text>

                <HStack gap={3} justify="end">
                  <Button
                    variant="ghost"
                    colorPalette="gray"
                    onClick={onDecline}
                  >
                    No, pass
                  </Button>
                  <Button colorPalette="purple" onClick={onAccept}>
                    Yes, answer
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
