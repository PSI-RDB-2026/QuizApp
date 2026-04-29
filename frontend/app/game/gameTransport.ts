import {
  checkQuestion,
  getQuestion,
  type CheckQuestionRequest,
  type CheckQuestionResponse,
  type QuestionResponse,
} from "api/api";
import type { QuestionType } from "./pyramidTypes";

export interface GameTransport {
  requestQuestion: (
    questionType: QuestionType,
  ) => Promise<QuestionResponse | null>;
  submitAnswerCheck: (
    payload: CheckQuestionRequest,
  ) => Promise<CheckQuestionResponse | null>;
}

export const localGameTransport: GameTransport = {
  requestQuestion: async (questionType) => getQuestion(questionType),
  submitAnswerCheck: async (payload) => checkQuestion(payload),
};
