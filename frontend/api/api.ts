import type { QuestionType } from "app/game/pyramidTypes";
import axios from "axios";

import type { AxiosResponse } from "axios";

const apiUrl = "/api";

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserInfoResponse {
  username: string;
  email: string;
}
export interface MultiplayerTurnContext {
  token: string;
  matchId: number;
  tileId: number;
  questionType: QuestionType;
}
export interface QuestionResponse {
  id: number;
  question_type: "standard" | "yes_no";
  question_text: string;
  initials?: string | null;
  category?: string | null;
  difficulty?: number | null;
}

export interface CheckQuestionRequest {
  question_id: number;
  answer: string | boolean;
  question_type?: "standard" | "yes_no";
}

export interface CheckQuestionResponse {
  is_correct: boolean;
  correct_answer: string | boolean;
}

export interface ApiErrorResponse {
  message?: string;
  detail?: string;
  [key: string]: unknown;
}

export type MultiplayerQuestionType = "standard" | "yes_no";
export type MultiplayerMatchStatus = "ongoing" | "completed" | "aborted";

export interface QueueJoinRequest {
  game_mode?: string;
}

export interface QueueJoinResponse {
  status: "queued" | "matched";
  queue_position: number | null;
  matched_match_id: number | null;
  opponent_email: string | null;
  opponent_username: string | null;
  elo_window: number;
}

export interface QueueLeaveResponse {
  removed: boolean;
}

export interface QueueStatusResponse {
  in_queue: boolean;
  queue_position: number | null;
  waited_seconds: number;
  elo_window: number | null;
  matched_match_id?: number | null;
}

export interface MatchParticipant {
  email: string;
  username: string;
  elo_rating: number;
}

export interface MatchStateResponse {
  id: number;
  status: MultiplayerMatchStatus;
  player1: MatchParticipant;
  player2: MatchParticipant;
  winner_email: string | null;
  player1_score: number;
  player2_score: number;
  started_at: string | null;
  finished_at: string | null;
}

export interface SubmitTurnRequest {
  tile_id: number;
  question_type: MultiplayerQuestionType;
  question_id: number;
  is_correct: boolean;
  game_state?: Record<string, unknown>;
}

export interface SubmitTurnResponse {
  match_id: number;
  tile_id: number;
  question_type: MultiplayerQuestionType;
  question_id: number;
  is_correct: boolean;
  player1_score: number;
  player2_score: number;
}

export interface ForfeitResponse {
  match_id: number;
  status: MultiplayerMatchStatus;
  winner_email: string;
  reason: string;
}

export interface MultiplayerWebSocketEvent {
  event: string;
  payload: Record<string, unknown>;
}

const unwrapError = <T extends ApiErrorResponse>(
  error: unknown,
  fallback: T,
): T => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data;

    if (payload && typeof payload === "object") {
      return payload as T;
    }

    if (typeof payload === "string" && payload.trim()) {
      return { ...fallback, message: payload };
    }

    return fallback;
  }

  return fallback;
};

export const postRegister = async (
  userParams: RegisterRequest,
): Promise<AxiosResponse<TokenResponse> | ApiErrorResponse> => {
  const { username, email, password } = userParams;
  try {
    return await axios.post(`${apiUrl}/users/register`, {
      username,
      email,
      password,
    });
  } catch (error: unknown) {
    console.error("Error during register:", error);
    return unwrapError(error, { message: "Unknown error" });
  }
};

export const getLogin = async (
  userParams: LoginRequest,
): Promise<AxiosResponse<TokenResponse> | ApiErrorResponse> => {
  const { email, password } = userParams;
  try {
    return await axios.post(`${apiUrl}/users/login`, {
      email,
      password,
    });
  } catch (error: unknown) {
    console.error("Error during login:", error);
    return unwrapError(error, { message: "Unknown error" });
  }
};

export const renewToken = async (
  token: string,
): Promise<AxiosResponse<TokenResponse> | ApiErrorResponse> => {
  try {
    return await axios.post(
      `${apiUrl}/users/token-renew`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  } catch (error: unknown) {
    console.error("Error during token renewal:", error);
    return unwrapError(error, { message: "Unknown error" });
  }
};

export const getUserInfo = async (
  token: string,
): Promise<UserInfoResponse | null> => {
  try {
    const response = await axios.get(`${apiUrl}/users/info`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data as UserInfoResponse;
  } catch (error: unknown) {
    console.error("Error fetching user info:", error);
    return null;
  }
};

export const deleteUser = async (
  token: string,
): Promise<AxiosResponse<unknown> | ApiErrorResponse> => {
  try {
    return await axios.delete(`${apiUrl}/users/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error: unknown) {
    console.error("Error deleting user:", error);
    return unwrapError(error, { message: "Unknown error" });
  }
};

export const getQuestion = async (
  questionType: "standard" | "yes_no" = "standard",
): Promise<QuestionResponse | null> => {
  try {
    const response = await axios.get(`${apiUrl}/questions`, {
      params: {
        question_type: questionType,
      },
    });
    return response.data as QuestionResponse;
  } catch (error: unknown) {
    console.error("Error fetching question:", error);
    return null;
  }
};

export const getQuestions = getQuestion;

export const checkQuestion = async (
  payload: CheckQuestionRequest,
): Promise<CheckQuestionResponse | null> => {
  try {
    const response = await axios.post(`${apiUrl}/questions/check`, payload);
    return response.data as CheckQuestionResponse;
  } catch (error: unknown) {
    console.error("Error checking question:", error);
    return null;
  }
};

export const getDbHealth = async (): Promise<{ db: string } | null> => {
  try {
    const response = await axios.get(`${apiUrl}/health/db`);
    return response.data as { db: string };
  } catch (error: unknown) {
    console.error("Error fetching DB health:", error);
    return null;
  }
};

// Multiplayer methods

const authHeaders = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export const joinMultiplayerQueue = async (
  token: string,
  payload: QueueJoinRequest = { game_mode: "pyramid" },
): Promise<QueueJoinResponse | ApiErrorResponse> => {
  try {
    const response = await axios.post(
      `${apiUrl}/multiplayer/queue/join`,
      payload,
      authHeaders(token),
    );
    return response.data as QueueJoinResponse;
  } catch (error: unknown) {
    console.error("Error joining multiplayer queue:", error);
    return unwrapError(error, { message: "Unknown error" });
  }
};

export const leaveMultiplayerQueue = async (
  token: string,
): Promise<QueueLeaveResponse | ApiErrorResponse> => {
  try {
    const response = await axios.post(
      `${apiUrl}/multiplayer/queue/leave`,
      {},
      authHeaders(token),
    );
    return response.data as QueueLeaveResponse;
  } catch (error: unknown) {
    console.error("Error leaving multiplayer queue:", error);
    return unwrapError(error, { message: "Unknown error" });
  }
};

export const getMultiplayerQueueStatus = async (
  token: string,
): Promise<QueueStatusResponse | ApiErrorResponse> => {
  try {
    const response = await axios.get(
      `${apiUrl}/multiplayer/queue/status`,
      authHeaders(token),
    );
    return response.data as QueueStatusResponse;
  } catch (error: unknown) {
    console.error("Error fetching multiplayer queue status:", error);
    return unwrapError(error, { message: "Unknown error" });
  }
};

export const getMultiplayerMatch = async (
  token: string,
  matchId: number,
): Promise<MatchStateResponse | ApiErrorResponse> => {
  try {
    const response = await axios.get(
      `${apiUrl}/multiplayer/matches/${matchId}`,
      authHeaders(token),
    );
    return response.data as MatchStateResponse;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status !== 404) {
      console.error("Error fetching multiplayer match:", error);
    }
    return unwrapError(error, { message: "Unknown error" });
  }
};

export const submitMultiplayerTurn = async (
  token: string,
  matchId: number,
  payload: SubmitTurnRequest,
): Promise<SubmitTurnResponse | ApiErrorResponse> => {
  try {
    const response = await axios.post(
      `${apiUrl}/multiplayer/matches/${matchId}/turn`,
      payload,
      authHeaders(token),
    );
    return response.data as SubmitTurnResponse;
  } catch (error: unknown) {
    console.error("Error submitting multiplayer turn:", error);
    return unwrapError(error, { message: "Unknown error" });
  }
};

export const forfeitMultiplayerMatch = async (
  token: string,
  matchId: number,
): Promise<ForfeitResponse | ApiErrorResponse> => {
  try {
    const response = await axios.post(
      `${apiUrl}/multiplayer/matches/${matchId}/forfeit`,
      {},
      authHeaders(token),
    );
    return response.data as ForfeitResponse;
  } catch (error: unknown) {
    console.error("Error forfeiting multiplayer match:", error);
    return unwrapError(error, { message: "Unknown error" });
  }
};

export const syncMultiplayerGameState = async (
  token: string,
  matchId: number,
  gameState: Record<string, unknown>,
): Promise<{ status: string } | ApiErrorResponse> => {
  try {
    const response = await axios.post(
      `${apiUrl}/multiplayer/matches/${matchId}/sync-game-state`,
      { game_state: gameState },
      authHeaders(token),
    );
    return response.data as { status: string };
  } catch (error: unknown) {
    console.error("Error syncing multiplayer game state:", error);
    return unwrapError(error, { message: "Unknown error" });
  }
};

export const getMultiplayerWebSocketUrl = (
  matchId: number,
  token: string,
): string => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}${apiUrl}/multiplayer/ws/${matchId}?token=${encodeURIComponent(token)}`;
};
