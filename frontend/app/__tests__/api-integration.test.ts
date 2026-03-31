/**
 * Integration test example showing how to test API interactions with MSW mocks.
 * This demonstrates testing a quiz flow: fetch question → display → submit answer.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";

/**
 * Example: Testing API interaction flow
 * This demonstrates the pattern for testing components that fetch data from the backend.
 */
describe("Quiz API Integration Flow", () => {
  it("fetches and displays a question correctly", async () => {
    // This test uses MSW to mock the API call
    // The mocked /api/questions endpoint is defined in vitest.setup.ts
    
    const response = await axios.get("/api/questions", {
      params: { question_type: "standard" },
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("id");
    expect(response.data).toHaveProperty("question_text");
    expect(response.data).toHaveProperty("question_type", "standard");
  });

  it("submits answer and receives correctness feedback", async () => {
    // Mock the answer submission via POST
    const answerPayload = {
      question_id: 1,
      answer: "HyperText Transfer Protocol",
      question_type: "standard",
    };

    const response = await axios.post("/api/questions/check", answerPayload);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("is_correct");
    expect(response.data).toHaveProperty("correct_answer");
    expect(response.data.is_correct).toBe(true);
  });

  it("returns False for incorrect answer", async () => {
    const answerPayload = {
      question_id: 1,
      answer: "Wrong Answer",
      question_type: "standard",
    };

    const response = await axios.post("/api/questions/check", answerPayload);

    expect(response.status).toBe(200);
    expect(response.data.is_correct).toBe(false);
    expect(response.data.correct_answer).toBe("HyperText Transfer Protocol");
  });

  it("handles user login via API", async () => {
    const loginPayload = {
      username: "test_user",
      password: "test_password",
    };

    const response = await axios.post("/users/login", loginPayload);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("access_token");
    expect(response.data.token_type).toBe("bearer");
  });

  it("returns 401 for invalid credentials", async () => {
    const loginPayload = {
      username: "test_user",
      password: "wrong_password",
    };

    try {
      await axios.post("/users/login", loginPayload);
      // Should not reach here
      expect(false).toBe(true);
    } catch (error: any) {
      expect(error.response.status).toBe(401);
      expect(error.response.data).toHaveProperty("detail");
    }
  });

  it("fetches user info with valid token", async () => {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0X3VzZXIiLCJleHAiOjk5OTk5OTk5OTl9.mock_token";

    const response = await axios.get("/users/info", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("username");
    expect(response.data).toHaveProperty("email");
  });

  it("returns 401 without authentication token", async () => {
    try {
      await axios.get("/users/info");
      // Should not reach here
      expect(false).toBe(true);
    } catch (error: any) {
      expect(error.response.status).toBe(401);
    }
  });

  /**
   * Pattern for testing React components with API interactions:
   *
   * 1. Use MSW (Mock Service Worker) to intercept API calls
   *    - Define mock handlers in vitest.setup.ts
   *    - Handlers match real API endpoints and return mock data
   *
   * 2. Render component and simulate user actions
   *    - Use render() from @testing-library/react
   *    - Use userEvent for user interactions
   *
   * 3. Verify component updates based on mocked responses
   *    - Wait for element to appear using waitFor()
   *    - Verify state updates and rendered output
   *
   * 4. Test error cases with MSW handlers that return errors
   *    - Add handlers for error scenarios (4xx, 5xx)
   *    - Verify error handling in component
   */
});

/**
 * Template for testing a component that fetches data:
 *
 * it("displays question from API", async () => {
 *   render(<QuizComponent />);
 *   
 *   // MSW automatically intercepts the fetch call
 *   // Component should load the mocked question data
 *   
 *   await waitFor(() => {
 *     expect(screen.getByText(/question text/i)).toBeInTheDocument();
 *   });
 * });
 */
