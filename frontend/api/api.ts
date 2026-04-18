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
