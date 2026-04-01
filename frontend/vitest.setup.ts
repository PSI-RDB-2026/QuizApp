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
    const body = (await request.json()) as {
      username: string;
      password: string;
    };

    // Simulate successful login for test_user/test_password
    if (body.username === "test_user" && body.password === "test_password") {
      return HttpResponse.json(
        {
          access_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0X3VzZXIiLCJleHAiOjk5OTk5OTk5OTl9.mock_token",
          token_type: "bearer",
        },
        { status: 200 }
      );
    }

    // Simulate failed login
    return HttpResponse.json(
      {
        detail: "Invalid username or password",
      },
      { status: 401 }
    );
  }),

  // Mock GET /users/info endpoint
  http.get("/users/info", ({ request }) => {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return HttpResponse.json(
        { detail: "Not authenticated" },
        { status: 401 }
      );
    }

    // Simulate authenticated user info
    return HttpResponse.json(
      {
        username: "test_user",
        email: "test@example.com",
      },
      { status: 200 }
    );
  })
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
