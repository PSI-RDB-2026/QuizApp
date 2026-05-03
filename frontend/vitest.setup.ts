/**
 * Vitest setup file for global test configuration.
 * Configures Mock Service Worker (MSW) to intercept API calls during tests.
 */
import { expect, afterAll, afterEach, beforeAll, vi } from "vitest";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";
import "@testing-library/jest-dom";

/**
 * Mock Service Worker server for intercepting API calls.
 * Add handlers here for API endpoints used in components.
 */
const server = setupServer(
  // Mock GET /api root endpoint
  http.get("/api", () => {
    return HttpResponse.json({
      message: "Hello World, V2",
    });
  }),

  // Mock GET /api/questions endpoint
  http.get("/api/questions", ({ request }) => {
    const url = new URL(request.url);
    const questionType = url.searchParams.get("question_type");

    if (questionType === "standard") {
      return HttpResponse.json({
        id: 1,
        question_type: "standard",
        question_text: "What does HTTP stand for?",
        category: "IT",
        difficulty: 1,
      });
    }

    if (questionType === "yes_no") {
      return HttpResponse.json({
        id: 1001,
        question_type: "yes_no",
        question_text: "The Earth revolves around the Sun.",
        category: "Science",
      });
    }

    // Default: return mixed type
    return HttpResponse.json({
      id: 1,
      question_type: "standard",
      question_text: "What does HTTP stand for?",
      category: "IT",
      difficulty: 1,
    });
  }),

  // Mock POST /api/questions/check endpoint
  http.post("/api/questions/check", async ({ request }) => {
    const body = (await request.json()) as {
      question_id: number;
      answer: string;
      question_type?: string;
    };

    // Simulate correct answer for question_id = 1 with expected answer "HyperText Transfer Protocol"
    const isCorrect =
      body.answer.toLowerCase() === "hypertext transfer protocol";

    return HttpResponse.json({
      is_correct: isCorrect,
      correct_answer: "HyperText Transfer Protocol",
    });
  }),

  // Mock POST /users/login endpoint
  http.post("/users/login", async ({ request }) => {
    const url = new URL(request.url);
    const body = (await request.json()) as {
      username?: string;
      email?: string;
      password?: string;
    };

    const loginName =
      url.searchParams.get("username") ?? body.username ?? body.email;
    const token = request.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/, "");

    // Simulate successful login for test_user/test_password
    if (loginName === "test_user" && token === "test_password") {
      return HttpResponse.json(
        {
          access_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0X3VzZXIiLCJleHAiOjk5OTk5OTk5OTl9.mock_token",
          token_type: "bearer",
        },
        { status: 200 },
      );
    }

    // Simulate failed login
    return HttpResponse.json(
      {
        detail: "Invalid username or password",
      },
      { status: 401 },
    );
  }),

  http.post("/api/users/login", async ({ request }) => {
    const url = new URL(request.url);
    const body = (await request.json()) as {
      username?: string;
      email?: string;
      password?: string;
    };

    const loginName =
      url.searchParams.get("username") ?? body.username ?? body.email;
    const token = request.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/, "");

    if (loginName === "test_user" && token === "test_password") {
      return HttpResponse.json(
        {
          access_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0X3VzZXIiLCJleHAiOjk5OTk5OTk5OTl9.mock_token",
          token_type: "bearer",
        },
        { status: 200 },
      );
    }

    return HttpResponse.json(
      {
        detail: "Invalid username or password",
      },
      { status: 401 },
    );
  }),

  http.post("/api/users/register", async ({ request }) => {
    const url = new URL(request.url);
    const username = url.searchParams.get("username");
    const token = request.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/, "");

    if (username === "new_user" && token === "register_token") {
      return HttpResponse.json({ status: "registered" });
    }

    return HttpResponse.json(
      { detail: "Registration failed" },
      { status: 400 },
    );
  }),

  // Mock GET /users/info endpoint
  http.get("/users/info", ({ request }) => {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return HttpResponse.json(
        { detail: "Not authenticated" },
        { status: 401 },
      );
    }

    // Simulate authenticated user info
    return HttpResponse.json(
      {
        username: "test_user",
        email: "test@example.com",
      },
      { status: 200 },
    );
  }),

  http.get("/api/users/info", ({ request }) => {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return HttpResponse.json(
        { detail: "Not authenticated" },
        { status: 401 },
      );
    }

    return HttpResponse.json(
      {
        username: "test_user",
        email: "test@example.com",
      },
      { status: 200 },
    );
  }),

  http.get("/api/health/db", () => {
    return HttpResponse.json({ db: "ok" });
  }),

  // Mock GET /api/users/leaderboard endpoint with 30 mock entries
  http.get("/api/users/leaderboard", ({ request }) => {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.min(Number(limitParam), 100) : 30;

    const baseUsers = Array.from({ length: 30 }).map((_, i) => ({
      username:
        i === 0 ? "ProGamer2024" : i === 10 ? "GreenGenius" : `Player${i + 1}`,
      elo_rating: 1600 - i * 5,
      win_rate: Math.max(0, 100 - i * 2),
      matches: 50 + i,
    }));

    return HttpResponse.json({ leaderboard: baseUsers.slice(0, limit) });
  }),

  http.post("/api/multiplayer/queue/join", async ({ request }) => {
    const body = (await request.json()) as { game_mode?: string };
    const token = request.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/, "");

    if (token !== "queue_token") {
      return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    return HttpResponse.json({
      status: "queued",
      queue_position: 1,
      matched_match_id: null,
      opponent_email: null,
      opponent_username: null,
      elo_window: body.game_mode === "pyramid" ? 50 : 25,
    });
  }),

  http.post("/api/multiplayer/queue/leave", ({ request }) => {
    const token = request.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/, "");

    if (token !== "queue_token") {
      return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    return HttpResponse.json({ removed: true });
  }),

  http.get("/api/multiplayer/queue/status", ({ request }) => {
    const token = request.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/, "");

    if (token !== "queue_token") {
      return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    return HttpResponse.json({
      in_queue: true,
      queue_position: 3,
      waited_seconds: 12,
      elo_window: 50,
      matched_match_id: null,
    });
  }),

  http.get("/api/multiplayer/matches/:matchId", ({ params, request }) => {
    const token = request.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/, "");

    if (token !== "queue_token") {
      return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    return HttpResponse.json({
      id: Number(params.matchId),
      status: "ongoing",
      player1: {
        email: "p1@example.com",
        username: "player1",
        elo_rating: 1500,
      },
      player2: {
        email: "p2@example.com",
        username: "player2",
        elo_rating: 1510,
      },
      winner_email: null,
      player1_score: 2,
      player2_score: 1,
      started_at: "2026-05-01T00:00:00Z",
      finished_at: null,
    });
  }),

  http.post(
    "/api/multiplayer/matches/:matchId/turn",
    async ({ params, request }) => {
      const token = request.headers
        .get("Authorization")
        ?.replace(/^Bearer\s+/, "");
      const body = (await request.json()) as {
        tile_id: number;
        question_type: string;
        question_id: number;
        is_correct: boolean;
      };

      if (token !== "queue_token") {
        return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
      }

      return HttpResponse.json({
        match_id: Number(params.matchId),
        tile_id: body.tile_id,
        question_type: body.question_type,
        question_id: body.question_id,
        is_correct: body.is_correct,
        player1_score: 3,
        player2_score: 1,
      });
    },
  ),

  http.post(
    "/api/multiplayer/matches/:matchId/forfeit",
    ({ params, request }) => {
      const token = request.headers
        .get("Authorization")
        ?.replace(/^Bearer\s+/, "");

      if (token !== "queue_token") {
        return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
      }

      return HttpResponse.json({
        match_id: Number(params.matchId),
        status: "completed",
        winner_email: "p2@example.com",
        reason: "forfeit",
      });
    },
  ),

  http.post(
    "/api/multiplayer/matches/:matchId/sync-game-state",
    async ({ params, request }) => {
      const token = request.headers
        .get("Authorization")
        ?.replace(/^Bearer\s+/, "");
      const body = (await request.json()) as {
        game_state: Record<string, unknown>;
      };

      if (token !== "queue_token") {
        return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
      }

      return HttpResponse.json({
        status: body.game_state ? `synced-${params.matchId}` : "synced",
      });
    },
  ),
);

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());

// Optional: Setup global test utilities
global.matchMedia =
  global.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };
  };
