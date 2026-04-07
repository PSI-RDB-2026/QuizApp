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
  playerLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConcedeConfirmModal({
  open,
  playerLabel,
  onCancel,
  onConfirm,
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
            <Box px={6} py={5} bgGradient="linear(to-r, red.600, orange.500)">
              <Stack gap={2}>
                <Badge
                  colorPalette="whiteAlpha"
                  variant="solid"
                  w="fit-content"
                >
                  Concede game
                </Badge>
                <Heading size="lg">Are you sure?</Heading>
                <Text color="fg">
                  {playerLabel} will concede and the opponent will win.
                </Text>
              </Stack>
            </Box>

            <Box px={6} py={6}>
              <Stack gap={5}>
                <Text color="fg.muted">
                  This will end the current game immediately.
                </Text>

                <HStack gap={3} justify="end" flexWrap="wrap">
                  <Button
                    variant="ghost"
                    colorPalette="gray"
                    onClick={onCancel}
                  >
                    Cancel
                  </Button>
                  <Button colorPalette="red" onClick={onConfirm}>
                    Concede
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
