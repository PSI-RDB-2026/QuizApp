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

interface Props {
  open: boolean;
  winnerLabel: string;
  message: string;
  onHome: () => void;
  onNewGame: () => void;
}

export default function GameOverModal({
  open,
  winnerLabel,
  message,
  onHome,
  onNewGame,
}: Props) {
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
            <Box px={6} py={5} bgGradient="linear(to-r, green.600, teal.500)">
              <Stack gap={2}>
                <Badge
                  colorPalette="whiteAlpha"
                  variant="solid"
                  w="fit-content"
                >
                  Game over
                </Badge>
                <Heading size="lg">{winnerLabel} wins</Heading>
                <Text color="fg">{message}</Text>
              </Stack>
            </Box>

            <Box px={6} py={6}>
              <Stack gap={5}>
                <Text color="fg.muted">
                  Start a new match or return to the main menu.
                </Text>

                <HStack gap={3} justify="end" flexWrap="wrap">
                  <Button variant="ghost" colorPalette="gray" onClick={onHome}>
                    Back to home
                  </Button>
                  <Button colorPalette="green" onClick={onNewGame}>
                    New game
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
