import type {
  CheckQuestionRequest,
  CheckQuestionResponse,
  QuestionResponse,
} from "api/api";
import type { GameTransport } from "./gameTransport";
import type { QuestionType } from "./pyramidTypes";

interface WebsocketTransportOptions {
  endpoint: string;
}

export function createWebsocketGameTransport(
  _options: WebsocketTransportOptions,
): GameTransport {
  return {
    requestQuestion: async (_questionType: QuestionType): Promise<QuestionResponse | null> => {
      throw new Error(
        "WebSocket transport is not implemented yet. Use local transport for now.",
      );
    },
    submitAnswerCheck: async (
      _payload: CheckQuestionRequest,
    ): Promise<CheckQuestionResponse | null> => {
      throw new Error(
        "WebSocket transport is not implemented yet. Use local transport for now.",
      );
    },
  };
}
