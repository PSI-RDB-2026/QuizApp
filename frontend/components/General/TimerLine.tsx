import { Box } from "@chakra-ui/react";
import { memo } from "react";
import type { FC } from "react";

interface Props {
  progress: number;
}

export const TimerLine: FC<Props> = ({ progress }) => {
  return (
    <Box mt={4} h="3px" bg="bg.muted" borderRadius="full">
      <Box
        h="3px"
        bg="green.500"
        borderRadius="full"
        width={`${progress}%`}
        transition="width 300ms linear"
      />
    </Box>
  );
};
