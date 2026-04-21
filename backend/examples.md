# Multiplayer + Matchmaking API Examples (JavaScript)

This file shows how frontend JavaScript code can use the backend multiplayer API.

## What this covers

- Login and get JWT token
- Join matchmaking queue
- Poll queue status
- Leave queue
- Get match state
- Submit turn result
- Forfeit match
- Connect to WebSocket for realtime events

## Base URLs

```js
// HTTP base for backend API calls
const API_BASE = "http://localhost:8000/api";

// WS base for realtime events
const WS_BASE = "ws://localhost:8000/api/multiplayer/ws";
```

## 1) Login and keep token

```js
// Use this once user logs in. You need the JWT token for multiplayer endpoints.
async function loginAndGetToken(email, password) {
  const response = await fetch(`${API_BASE}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  // Save this token in memory or secure storage.
  return data.access_token;
}
```

## 2) Small helper for authorized requests

```js
// This helper attaches Bearer token and parses JSON.
async function apiRequest(path, token, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  // Backend usually returns JSON, including error payloads.
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = body?.detail || JSON.stringify(body);
    throw new Error(`API ${path} failed (${response.status}): ${detail}`);
  }

  return body;
}
```

## 3) Join matchmaking queue

```js
// Request: POST /api/multiplayer/queue/join
// Response status: "queued" OR "matched"
async function joinQueue(token, gameMode = "pyramid") {
  return apiRequest("/multiplayer/queue/join", token, {
    method: "POST",
    body: JSON.stringify({ game_mode: gameMode }),
  });
}

// Example use:
// const queueResult = await joinQueue(token);
// if (queueResult.status === "matched") {
//   console.log("Match found:", queueResult.matched_match_id);
// } else {
//   console.log("Queued at position:", queueResult.queue_position);
// }
```

## 4) Check queue status (polling)

```js
// Request: GET /api/multiplayer/queue/status
async function getQueueStatus(token) {
  return apiRequest("/multiplayer/queue/status", token, {
    method: "GET",
  });
}

// Simple polling loop while waiting for a match.
async function waitInQueue(token, intervalMs = 2000, maxChecks = 60) {
  for (let i = 0; i < maxChecks; i += 1) {
    const status = await getQueueStatus(token);
    console.log("Queue status:", status);

    if (!status.in_queue) {
      // This means user is no longer queued (possibly matched elsewhere).
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Queue wait timeout");
}
```

## 5) Leave queue

```js
// Request: POST /api/multiplayer/queue/leave
async function leaveQueue(token) {
  return apiRequest("/multiplayer/queue/leave", token, {
    method: "POST",
  });
}
```

## 6) Get match state

```js
// Request: GET /api/multiplayer/matches/{match_id}
async function getMatchState(token, matchId) {
  return apiRequest(`/multiplayer/matches/${matchId}`, token, {
    method: "GET",
  });
}
```

## 7) Submit turn result

```js
// Request: POST /api/multiplayer/matches/{match_id}/turn
// Backend expects frontend-resolved turn result (authoritative flow).
async function submitTurn(token, matchId, turn) {
  // turn = {
  //   tile_id: number,
  //   question_type: "standard" | "yes_no",
  //   question_id: number,
  //   is_correct: boolean
  // }
  return apiRequest(`/multiplayer/matches/${matchId}/turn`, token, {
    method: "POST",
    body: JSON.stringify(turn),
  });
}

// Example:
// await submitTurn(token, 77, {
//   tile_id: 12,
//   question_type: "standard",
//   question_id: 205,
//   is_correct: true,
// });
```

## 8) Forfeit match

```js
// Request: POST /api/multiplayer/matches/{match_id}/forfeit
async function forfeitMatch(token, matchId) {
  return apiRequest(`/multiplayer/matches/${matchId}/forfeit`, token, {
    method: "POST",
  });
}
```

## 9) WebSocket realtime events

```js
// Connect to WS after you know matchId. Token goes in query param.
function connectMatchSocket(matchId, token, handlers = {}) {
  const ws = new WebSocket(
    `${WS_BASE}/${matchId}?token=${encodeURIComponent(token)}`,
  );

  ws.onopen = () => {
    console.log("WS connected");

    // Optional ping to keep alive / test connection.
    ws.send(JSON.stringify({ type: "ping" }));

    // Optional explicit state refresh.
    ws.send(JSON.stringify({ type: "state_request" }));
  };

  ws.onmessage = (event) => {
    // Backend sends: { event: string, payload: object }
    const message = JSON.parse(event.data);
    const { event: eventType, payload } = message;

    console.log("WS event:", eventType, payload);

    // Common backend events from multiplayer router:
    // - match_snapshot
    // - player_connected
    // - player_disconnected
    // - score_updated
    // - match_finished
    // - error
    // - pong

    // Call custom handler if provided
    if (handlers[eventType]) {
      handlers[eventType](payload, message);
    }
  };

  ws.onclose = (e) => {
    console.log("WS closed", e.code, e.reason);
  };

  ws.onerror = (err) => {
    console.error("WS error", err);
  };

  return ws;
}
```

## 10) End-to-end flow example

```js
async function startMultiplayerFlow(email, password) {
  // 1) Authenticate user
  const token = await loginAndGetToken(email, password);

  // 2) Join queue
  const queueResult = await joinQueue(token);

  // 3) If not matched immediately, keep polling queue
  let matchId = queueResult.matched_match_id;
  if (queueResult.status !== "matched") {
    // Your app may also keep queue screen open and poll periodically.
    const status = await waitInQueue(token);
    // In current backend, queue status does not return match id,
    // so client usually re-triggers join or receives match via app flow.
    // Keep this as an app-specific integration point.
    console.log("Queue ended/changed:", status);
  }

  if (!matchId) {
    // Fallback example: try joining queue again to check if match appears.
    const retry = await joinQueue(token);
    matchId = retry.matched_match_id;
  }

  if (!matchId) {
    throw new Error("No match found yet.");
  }

  // 4) Connect WebSocket for realtime state updates
  const ws = connectMatchSocket(matchId, token, {
    match_snapshot: (payload) => console.log("Snapshot", payload.match),
    score_updated: (payload) => console.log("Scores", payload),
    match_finished: (payload) => console.log("Finished", payload),
  });

  // 5) Query current state via REST (optional but useful on load)
  const state = await getMatchState(token, matchId);
  console.log("Current match state:", state);

  // 6) Submit a sample turn result
  await submitTurn(token, matchId, {
    tile_id: 4,
    question_type: "yes_no",
    question_id: 63,
    is_correct: false,
  });

  // Keep ws reference in your app state to close on unmount/logout.
  return { token, matchId, ws };
}
```

## Notes

- All multiplayer REST endpoints require header: `Authorization: Bearer <token>`.
- WebSocket endpoint requires query param: `?token=<jwt>`.
- If WebSocket disconnects, backend can forfeit after grace timeout.
- Match score is runtime-managed in backend memory for active match updates.
