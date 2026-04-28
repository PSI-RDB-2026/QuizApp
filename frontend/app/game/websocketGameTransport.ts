import type {
  ApiErrorResponse,
  CheckQuestionRequest,
  CheckQuestionResponse,
  QuestionResponse,
  MultiplayerTurnContext,
} from "api/api";
import { checkQuestion, getQuestion, submitMultiplayerTurn } from "api/api";
import type { GameTransport } from "./gameTransport";
import type { QuestionType } from "./pyramidTypes";

interface WebsocketTransportOptions {
  endpoint: string;
  getTurnContext?: () => MultiplayerTurnContext | null;
  onSyncStatusText?: (text: string) => void;
}

export function createWebsocketGameTransport(
  options: WebsocketTransportOptions,
): GameTransport {
  const websocketEndpoint = options.endpoint.trim();

  const reportSyncStatus = (message: string) => {
    options.onSyncStatusText?.(message);
  };

  return {
    requestQuestion: async (
      questionType: QuestionType,
    ): Promise<QuestionResponse | null> => {
      return getQuestion(questionType);
    },
    submitAnswerCheck: async (
      payload: CheckQuestionRequest,
    ): Promise<CheckQuestionResponse | null> => {
      const result = await checkQuestion(payload);

      if (!websocketEndpoint || payload.answer === "") {
        return result;
      }

      const turnContext = options.getTurnContext?.();
      if (!turnContext) {
        return result;
      }

      const syncResult = await submitMultiplayerTurn(
        turnContext.token,
        turnContext.matchId,
        {
          tile_id: turnContext.tileId,
          question_type: turnContext.questionType,
          question_id: payload.question_id,
          is_correct: Boolean(result?.is_correct),
        },
      );

      if (
        typeof syncResult === "object" &&
        syncResult !== null &&
        "match_id" in syncResult
      ) {
        reportSyncStatus("Turn synced with server.");
        return result;
      }

      const errorResult = syncResult as ApiErrorResponse;
      reportSyncStatus(
        errorResult?.detail?.toString() ||
          errorResult?.message?.toString() ||
          "Could not sync turn.",
      );
      return result;
    },
  };
}
