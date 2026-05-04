import { describe, expect, it } from "vitest";

import {
  forfeitMultiplayerMatch,
  checkQuestion,
  getDbHealth,
  getQuestion,
  getMultiplayerMatch,
  getMultiplayerQueueStatus,
  getMultiplayerWebSocketUrl,
  getUserInfo,
  joinMultiplayerQueue,
  leaveMultiplayerQueue,
  postLogin,
  postRegister,
  submitMultiplayerTurn,
  syncMultiplayerGameState,
} from "../../api/api";

describe("frontend API integration", () => {
  it("covers the auth and question helpers", async () => {
    await expect(
      postRegister({ username: "new_user", access_token: "register_token" }),
    ).resolves.toBeUndefined();

    const loginResult = await postLogin({
      username: "test_user",
      access_token: "test_password",
    });

    expect(loginResult).toBeUndefined();

    const userInfo = await getUserInfo("mock_token");

    expect(userInfo).toEqual({
      username: "test_user",
      email: "test@example.com",
    });

    const defaultQuestion = await getQuestion();
    const yesNoQuestion = await getQuestion("yes_no");

    expect(defaultQuestion).toEqual({
      id: 1,
      question_type: "standard",
      question_text: "What does HTTP stand for?",
      category: "IT",
      difficulty: 1,
    });
    expect(yesNoQuestion).toEqual({
      id: 1001,
      question_type: "yes_no",
      question_text: "The Earth revolves around the Sun.",
      category: "Science",
    });

    const result = await checkQuestion({
      question_id: defaultQuestion?.id ?? 1,
      answer: "HyperText Transfer Protocol",
      question_type: "standard",
    });

    expect(result).toEqual({
      is_correct: true,
      correct_answer: "HyperText Transfer Protocol",
    });

    const dbHealth = await getDbHealth();

    expect(dbHealth).toEqual({ db: "ok" });
  });

  it("covers the multiplayer client helpers", async () => {
    const joinResult = await joinMultiplayerQueue("queue_token");

    expect(joinResult).toEqual({
      status: "queued",
      queue_position: 1,
      matched_match_id: null,
      opponent_email: null,
      opponent_username: null,
      elo_window: 50,
    });

    await expect(leaveMultiplayerQueue("queue_token")).resolves.toEqual({
      removed: true,
    });

    const queueStatus = await getMultiplayerQueueStatus("queue_token");

    expect(queueStatus).toEqual({
      in_queue: true,
      queue_position: 3,
      waited_seconds: 12,
      elo_window: 50,
      matched_match_id: null,
    });

    const matchState = await getMultiplayerMatch("queue_token", 42);

    expect(matchState).toEqual({
      id: 42,
      status: "ongoing",
      player1: {
        uid: "p1-uid",
        username: "player1",
        elo_rating: 1500,
      },
      player2: {
        uid: "p2-uid",
        username: "player2",
        elo_rating: 1510,
      },
      winner_uid: null,
      player1_score: 2,
      player2_score: 1,
      started_at: "2026-05-01T00:00:00Z",
      finished_at: null,
    });

    const turnResult = await submitMultiplayerTurn("queue_token", 42, {
      tile_id: 7,
      question_type: "standard",
      question_id: 1,
      is_correct: true,
    });

    expect(turnResult).toEqual({
      match_id: 42,
      tile_id: 7,
      question_type: "standard",
      question_id: 1,
      is_correct: true,
      player1_score: 3,
      player2_score: 1,
    });

    const forfeitResult = await forfeitMultiplayerMatch("queue_token", 42);

    expect(forfeitResult).toEqual({
      match_id: 42,
      status: "completed",
      winner_uid: "p2-uid",
      reason: "forfeit",
    });

    const syncResult = await syncMultiplayerGameState("queue_token", 42, {
      board: [1, 2, 3],
    });

    expect(syncResult).toEqual({ status: "synced-42" });

    expect(getMultiplayerWebSocketUrl(42, "queue token")).toBe(
      "ws://localhost:3000/api/multiplayer/ws/42?token=queue%20token",
    );
  });

  it("fetches questions and validates answers through MSW", async () => {
    const question = await getQuestion("standard");

    expect(question).toEqual({
      id: 1,
      question_type: "standard",
      question_text: "What does HTTP stand for?",
      category: "IT",
      difficulty: 1,
    });

    const result = await checkQuestion({
      question_id: question?.id ?? 1,
      answer: "HyperText Transfer Protocol",
      question_type: "standard",
    });

    expect(result).toEqual({
      is_correct: true,
      correct_answer: "HyperText Transfer Protocol",
    });
  });
});
