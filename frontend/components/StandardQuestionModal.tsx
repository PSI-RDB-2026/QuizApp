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

export { default } from "./SwitchAnswerModal";
