import axios from "axios";

import type { AxiosResponse } from "axios";

const apiUrl = "/api";

export interface RegisterRequest {
  username: string;
  access_token: string;
}

export interface LoginRequest {
  username: string;
  access_token: string;
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

export const postRegister = async (userParams: RegisterRequest) => {
  const { username, access_token } = userParams;
  await axios
    .post(
      `${apiUrl}/users/register`,
      {},
      {
        params: { username },
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
    )
    .catch((error: unknown) => {
      console.error("Error during registration:", error);
      return unwrapError(error, { message: "Unknown error" });
    });
};

export const postLogin = async (userParams: LoginRequest) => {
  const { username, access_token } = userParams;
  await axios
    .post(
      `${apiUrl}/users/login`,
      {},
      {
        params: { username },
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
    )
    .catch((error: unknown) => {
      console.error("Error during login:", error);
      return unwrapError(error, { message: "Unknown error" });
    });
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
