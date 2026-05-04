# Design documentation: QuizApp

This document presents the technical plan for implementing QuizApp project.

## Architecture

### Scope

- Browser clients talk to the backend over HTTP for regular API calls.
- Multiplayer uses WebSocket for live state changes and HTTP for match actions.
- PostgreSQL stores users, questions, matches, and turns.
- Azure hosts the deployed stack, with GitHub Actions driving CI/CD.

```mermaid
flowchart LR
    Browser[Browser]
    Backend[Backend]
    DB[(Database)]

    Browser -->|HTTP| Backend
    Browser -.->|WebSocket<br/>multiplayer only| Backend
    Backend --> DB
```

**Principles:** Stateless API with token/session auth, explicit API contracts, input validation, environment-driven config.

### Frontend

- Vite
- React, TypeScript
- HTTP client (REST API), Chakra v3

### Backend

- Python, FastAPI
- ASGI server (Uvicorn)
- python modul for PostgreSQL

### Database

- SQL relational database (PostgreSQL)

### Infrastructure

- Testing: currently using Vitest for unit tests; pytest for backend
- Deployment: Azure Cloud, GitHub Actions (CI/CD)
- Local development: Docker, Docker-compose

## Data Model

```mermaid
erDiagram
    USERS {
        varchar firebase_uid PK
        varchar username UK
        int elo_rating "Leaderboard rank"
    }

    STANDARD_QUESTIONS {
        int id PK
        varchar initials
        text question_text UK
        varchar correct_answer
        varchar category
        int difficulty "1 to 5"
    }

    YES_NO_QUESTIONS {
        int id PK
        text question_text UK
        boolean correct_answer
        varchar category
    }

    MATCHES {
        bigint id PK
        varchar player1_id FK
        varchar player2_id FK
        varchar winner_id FK
        int player1_elo_change
        int player2_elo_change
        varchar status "ongoing|completed|aborted"
        timestamp started_at
        timestamp finished_at
    }

    MATCH_TURNS {
        bigint id PK
        bigint match_id FK
        varchar player_id FK
        int tile_id "1-28"
        int standard_question_id FK
        int yes_no_question_id FK
        boolean is_correct
        timestamp turn_timestamp
    }

    USERS ||--o{ MATCHES : plays_as_player1
    USERS ||--o{ MATCHES : plays_as_player2
    USERS o|--o{ MATCHES : wins
    MATCHES ||--o{ MATCH_TURNS : has
    USERS ||--o{ MATCH_TURNS : makes
    STANDARD_QUESTIONS o|--o{ MATCH_TURNS : appears_in
    YES_NO_QUESTIONS o|--o{ MATCH_TURNS : appears_in
```

**Key Constraints:**

- Each turn references exactly one question type: `standard_question_id` XOR `yes_no_question_id` (enforced via CHECK constraint).
- Match status is restricted to `ongoing`, `completed`, or `aborted`.
- **Leaderboard**: Derived from the `users` table ordered by `elo_rating` DESC. No separate leaderboard table is needed; the API endpoint `GET /api/users/leaderboard` queries and ranks users directly.

Original DB diagram is in [/diagrams/DB-diagram.md](../diagrams/DB-diagram.png)

## Interaction Design

### Single-Player Flow

```mermaid
sequenceDiagram
    actor Player as Player
    participant Frontend as Frontend
    participant Backend as Backend
    participant DB as Database

    Player->>Frontend: Opens app / logs in
    Frontend->>Backend: GET /api/questions?question_type=standard
    Backend->>DB: SELECT random question
    DB-->>Backend: Question row
    Backend-->>Frontend: 200 + Question JSON
    Frontend-->>Player: Display question

    Player->>Frontend: Submit answer (local)
    Frontend->>Backend: POST /api/questions/check
    Backend->>DB: Query correct answer
    DB-->>Backend: Answer + metadata
    Backend-->>Frontend: 200 + is_correct, correct_answer
    Frontend-->>Player: Display result

    Player->>Frontend: Submit all answers
    Frontend-->>Player: Show score & summary
```

**Communication:** HTTP/REST only. Answers are evaluated locally or checked one-at-a-time. The client may submit collected results after quiz completion.

### Multiplayer Matchmaking

```mermaid
sequenceDiagram
    actor P1 as Player 1
    actor P2 as Player 2
    participant Frontend1 as Frontend P1
    participant Frontend2 as Frontend P2
    participant Backend as Backend
    participant Matchmaker as Matchmaking<br/>Service
    participant DB as Database

    P1->>Frontend1: Join queue
    Frontend1->>Backend: POST /api/multiplayer/queue/join
    Backend->>Matchmaker: Add to queue (game_mode, elo_window)
    Matchmaker->>DB: Lookup ranked players
    Matchmaker-->>Backend: status: "queued"
    Backend-->>Frontend1: 200 + queue_position, elo_window

    P2->>Frontend2: Join queue
    Frontend2->>Backend: POST /api/multiplayer/queue/join
    Backend->>Matchmaker: Add to queue
    Matchmaker->>DB: Match found (Elo within window)
    Matchmaker->>DB: INSERT match row → match_id
    Matchmaker-->>Backend: status: "matched", match_id, opponent info
    Backend-->>Frontend2: 200 + matched_match_id, opponent

    Frontend1->>Backend: Poll GET /api/multiplayer/queue/status
    Backend->>Matchmaker: Check queue status
    Matchmaker-->>Backend: Match exists for player
    Backend-->>Frontend1: 200 + matched_match_id, opponent

    Frontend1->>Backend: GET /api/multiplayer/matches/{match_id}
    Backend->>DB: SELECT match state
    DB-->>Backend: Match + participants
    Backend-->>Frontend1: 200 + MatchStateResponse
    Frontend1-->>P1: Display opponent, ready to play
```

### Multiplayer WebSocket Flow

```mermaid
sequenceDiagram
    actor P1 as Player 1
    actor P2 as Player 2
    participant FE1 as Frontend P1
    participant FE2 as Frontend P2
    participant Backend as Backend
    participant WS1 as WebSocket<br/>P1 connection
    participant WS2 as WebSocket<br/>P2 connection
    participant Realtime as Realtime<br/>Service
    participant DB as Database

    FE1->>WS1: ws://.../multiplayer/ws/{match_id}?token=<jwt>
    WS1->>Backend: [WebSocket Handshake]
    Backend->>Backend: Verify token → resolve user
    Backend->>DB: Verify participant in match
    Backend->>Realtime: Register P1 connection
    Backend->>WS1: Accept ✓

    FE2->>WS2: ws://.../multiplayer/ws/{match_id}?token=<jwt>
    WS2->>Backend: [WebSocket Handshake]
    Backend->>Realtime: Register P2 connection
    Realtime->>WS1: Broadcast "player_connected" (P2)
    Realtime->>WS2: Broadcast "player_connected" (P1)
    WS1-->>FE1: player_connected event
    WS2-->>FE2: player_connected event

    FE1->>FE1: Fetch question, present to player
    P1->>FE1: Select answer & submit
    FE1->>Backend: POST /api/multiplayer/matches/{match_id}/turn
    activate Backend
    Backend->>DB: INSERT match_turn record
    Backend->>Backend: Recalculate scores
    Backend->>Realtime: Broadcast score_updated + game_snapshot
    deactivate Backend
    Realtime->>WS1: score_updated (P1's own result)
    Realtime->>WS2: score_updated (opponent's result)
    WS1-->>FE1: Update P1 score
    WS2-->>FE2: Update P2 score

    par Player 2 Turn
        P2->>FE2: Submit answer
        FE2->>Backend: POST /api/multiplayer/matches/{match_id}/turn
        activate Backend
        Backend->>DB: INSERT match_turn record
        Backend->>Realtime: Broadcast score_updated
        deactivate Backend
        Realtime->>WS1: score_updated
        Realtime->>WS2: score_updated
    end

    rect rgb(200, 150, 255)
    note over FE1,FE2: Match Completion
    Backend->>DB: Check if both players completed 28 turns
    DB-->>Backend: Match finished (28 turns per player)
    Backend->>DB: UPDATE matches SET status='completed', winner_id, finished_at
    Backend->>Realtime: Broadcast match_finished + final scores + Elo changes
    Realtime->>WS1: match_finished event
    Realtime->>WS2: match_finished event
    WS1-->>FE1: Show match summary & opponent stats
    WS2-->>FE2: Show match summary & opponent stats
    end

    FE1->>WS1: Close WebSocket
    FE2->>WS2: Close WebSocket
    WS1->>Realtime: Unregister connection
    WS2->>Realtime: Unregister connection
```

**WebSocket Features:**

- **Token validation**: Token passed via `?token=<jwt>` or `Authorization: Bearer <jwt>` header; invalid tokens close the connection with code `1008`.
- **Inbound messages**: `ping`, `state_request`, `game_snapshot`, `timer_update`.
- **Outbound events**: `match_snapshot`, `game_snapshot`, `player_connected`, `player_disconnected`, `score_updated`, `match_finished`, `error`.
- **Real-time sync**: Score updates and game snapshots are broadcast instantly to both players.

**Communication:** HTTP/REST for setup and turn submission; WebSocket for real-time events. Turn results are submitted via HTTP, but the WebSocket notifies both players immediately.

## API & Interface Specification

All endpoints are prefixed with `/api`.

### Authentication & Routing

The backend uses Firebase Authentication for identity. HTTP endpoints validate an incoming Firebase ID token via the `get_firebase_id` dependency and map the verified UID to a local user record.

Key backend mechanics:

- HTTP authentication: clients must include `Authorization: Bearer <firebase_id_token>` for protected endpoints. The FastAPI dependency `get_firebase_id` extracts and verifies the token, returning the Firebase UID.
- Local user mapping: after verification the backend looks up the user in the local DB (via `UserServices.get_user(uid)`) and will create a local user record when requested by endpoints like `/api/users/register` or lazily on first use.
- WebSocket authentication: the multiplayer WebSocket (`/api/multiplayer/ws/{match_id}`) accepts a token either via `?token=<token>` query parameter or an `Authorization: Bearer <token>` header. For WebSocket connections the code may use `UserServices.get_user_from_token(token)` (legacy token support) to resolve a user row.

### Users API

User-related endpoints (as implemented in `backend/routers/Users.py`):

- `POST /api/users/register` — Registers a Firebase-authenticated user in the local DB. Requires a `username` parameter and the Firebase token (via `get_firebase_id`). Returns `201` on success.
- `POST /api/users/login` — Login endpoint that accepts `username` plus Firebase token (via `get_firebase_id`). If the local user does not exist it will be created. Returns `200`.
- `GET /api/users/info` — Returns the authenticated user's `uid`, `username`, and `elo_rating`. Requires Firebase token.
- `GET /api/users/leaderboard?limit=30` — Returns the top users ranked by Elo. Public read; implemented in backend and returns `leaderboard` array.

### Questions API

Questions endpoints (as implemented in `backend/routers/questions.py`):

- `GET /api/questions?question_type=standard|yes_no` — Returns a single random question filtered by `question_type`. Public.
- `POST /api/questions/check` — Accepts `question_id`, `answer`, and `question_type` and returns `{ is_correct, correct_answer }`. Public.

### Multiplayer API

Multiplayer endpoints and WebSocket (as implemented in `backend/routers/multiplayer.py`):

- `POST /api/multiplayer/queue/join` — Body: `QueueJoinRequest` (includes `game_mode`); requires authenticated user (internal helper `_get_authenticated_user` uses `get_firebase_id` and local DB lookup). Returns queued status or matched opponent info.
- `POST /api/multiplayer/queue/leave` — Leaves matchmaking queue for the authenticated user.
- `GET /api/multiplayer/queue/status` — Returns queue status and, if already matched, the active match id.
- `GET /api/multiplayer/matches/{match_id}` — Returns match state for a given `match_id`; requires participant authentication.
- `POST /api/multiplayer/matches/{match_id}/turn` — Submit a turn; body: `SubmitTurnRequest` (tile_id, question_type, question_id, is_correct, optional game_state). Broadcasts score updates via realtime service.
- `POST /api/multiplayer/matches/{match_id}/forfeit` — Forfeit an ongoing match; clears snapshots and broadcasts match finish.
- `WebSocket /api/multiplayer/ws/{match_id}` — Real-time channel. Client must provide a token via `?token=` or `Authorization` header. Server verifies the token (supports legacy token lookup via `UserServices.get_user_from_token`) and then connects the player to realtime service. The socket accepts messages (`ping`, `state_request`, `game_snapshot`, `timer_update`) and broadcasts `player_connected`, `player_disconnected`, `score_updated`, `game_snapshot`, `match_snapshot`, `match_finished`, etc.

### Authentication Notes

- HTTP endpoints use `get_firebase_id` (FastAPI dependency) to extract and validate Firebase ID tokens. The dependency returns the Firebase `uid` that service layers use to map to local users.
- In multiplayer routes a higher-level helper `_get_authenticated_user` attempts a DB lookup for the UID, but falls back to an in-memory cache (`deps._user_token_cache`) when the DB is unavailable or the user is not yet persisted.
- WebSocket connections support legacy token-based lookup via `UserServices.get_user_from_token(token)`; this is used for compatibility with older clients or non-Firebase tokens.

### Examples

```json
// Typical authenticated HTTP request (protected endpoint)
{
  "method": "GET",
  "path": "/api/users/info",
  "headers": {
    "Authorization": "Bearer <firebase_id_token>"
  }
}
```

```json
// Preferred WebSocket connection
{
  "websocket_url": "ws://<host>/api/multiplayer/ws/123?token=<firebase_id_token>",
  "fallback_headers": {
    "Authorization": "Bearer <firebase_id_token>"
  },
  "on_invalid_token": {
    "close_code": 1008,
    "detail": "Token is missing or invalid"
  }
}
```

### Authentication & WebSocket Flow

```mermaid
flowchart LR
        Browser[Browser / Frontend]
        FirebaseAuth[Firebase Authentication]
        Backend["Backend (FastAPI)"]
        DB[(Database)]

        Browser -->|Sign-in via Firebase SDK| FirebaseAuth
        FirebaseAuth -->|"ID token (JWT)"| Browser

        subgraph HTTP
            Browser -->|Authorization: Bearer <id_token>| Backend
            Backend -->|get_firebase_id -> UID| FirebaseAuth
            Backend -->|map UID -> local user| DB
            DB -->|user row| Backend
        end

        subgraph WebSocket
            Browser -->|ws connect with ?token or Authorization header| Backend
            Backend -->|"UserServices.get_user_from_token(token) or verify via Firebase"| DB
            Backend -->|ensure participant| DB
        end

        Backend -->|200 / realtime events| Browser

        classDef external fill:#f9f,stroke:#333,stroke-width:1px;
        class FirebaseAuth external;
```

The questions router is implemented in `backend/routers/questions.py` and is fully public.

#### Endpoint Overview

| Method | Path                   | Auth | Description                            |
| ------ | ---------------------- | ---- | -------------------------------------- |
| `GET`  | `/api/questions`       | NO   | Returns one random question.           |
| `POST` | `/api/questions/check` | NO   | Validates an answer for a question id. |

#### GET `/api/questions`

Query parameter:

- `question_type`: `standard` or `yes_no`, default `standard`

Response model: `GetQuestionResponse`

| Field           | Type                   | Notes                          |
| --------------- | ---------------------- | ------------------------------ |
| `id`            | `int`                  | Question id                    |
| `question_type` | `standard` or `yes_no` | Selected question type         |
| `question_text` | `string`               | The question text              |
| `initials`      | `string` or `null`     | Present for standard questions |
| `category`      | `string` or `null`     | Category label                 |
| `difficulty`    | `int` or `null`        | Present for standard questions |

Behavior:

- Returns `404` with `{ "detail": "No questions found" }` if no question exists for the requested type.
- FastAPI returns `422` for invalid `question_type` values.

Example responses:

```json
// GET /api/questions?question_type=standard
// 200 Response
{
  "id": 12,
  "question_type": "standard",
  "question_text": "What is the tallest mountain on Earth?",
  "initials": "ME",
  "category": "Geography",
  "difficulty": 1
}
```

```json
// GET /api/questions?question_type=yes_no
// 200 Response
{
  "id": 8,
  "question_type": "yes_no",
  "question_text": "Is the hummingbird the smallest bird?",
  "initials": null,
  "category": "Nature",
  "difficulty": null
}
```

#### POST `/api/questions/check`

Request model: `CheckQuestionRequest`

| Field           | Type                             | Notes                                                 |
| --------------- | -------------------------------- | ----------------------------------------------------- |
| `question_id`   | `int`                            | Required                                              |
| `answer`        | `string` or `bool`               | Standard questions use `string`, yes/no use `bool`    |
| `question_type` | `standard` or `yes_no` or `null` | Optional; defaults to `standard` in the service layer |

Response model: `CheckQuestionResponse`

| Field            | Type               | Notes                                   |
| ---------------- | ------------------ | --------------------------------------- |
| `is_correct`     | `bool`             | Whether the answer matches              |
| `correct_answer` | `string` or `bool` | Expected answer returned by the service |

Behavior:

- Returns `404` with `{ "detail": "No questions found" }` if the question cannot be resolved.
- FastAPI returns `422` for invalid payloads.

Example requests:

```json
// POST /api/questions/check
// Request body - Standard Question
{
  "question_id": 12,
  "answer": "Mount Everest",
  "question_type": "standard"
}

// 200 Response
{
  "is_correct": true,
  "correct_answer": "Mount Everest"
}
```

```json
// POST /api/questions/check
// Request body - Yes/No Question
{
  "question_id": 8,
  "answer": true,
  "question_type": "yes_no"
}

// 200 Response
{
  "is_correct": true,
  "correct_answer": true
}
```

The multiplayer router is implemented in `backend/routers/multiplayer.py`. HTTP endpoints require authenticated Firebase users via `get_firebase_id`; the WebSocket endpoint accepts a token in the query string or Authorization header.

#### Endpoints

| Method      | Path                                          | Auth | Description                                       |
| ----------- | --------------------------------------------- | ---- | ------------------------------------------------- |
| `POST`      | `/api/multiplayer/queue/join`                 | YES  | Join matchmaking or get matched immediately.      |
| `POST`      | `/api/multiplayer/queue/leave`                | YES  | Leave the matchmaking queue.                      |
| `GET`       | `/api/multiplayer/queue/status`               | YES  | Get queue status and active match info.           |
| `GET`       | `/api/multiplayer/matches/{match_id}`         | YES  | Fetch current match state.                        |
| `POST`      | `/api/multiplayer/matches/{match_id}/turn`    | YES  | Submit a turn result and broadcast score updates. |
| `POST`      | `/api/multiplayer/matches/{match_id}/forfeit` | YES  | Forfeit the match.                                |
| `WebSocket` | `/api/multiplayer/ws/{match_id}`              | YES  | Real-time game connection.                        |

#### Queue join

Request model: `QueueJoinRequest`

| Field       | Type     | Notes             |
| ----------- | -------- | ----------------- |
| `game_mode` | `string` | Default `pyramid` |

Response model: `QueueJoinResponse`

| Field               | Type                  | Notes                     |
| ------------------- | --------------------- | ------------------------- |
| `status`            | `queued` or `matched` | Current matchmaking state |
| `queue_position`    | `int` or `null`       | Present when queued       |
| `matched_match_id`  | `int` or `null`       | Present when matched      |
| `opponent_uid`      | `string` or `null`    | Present when matched      |
| `opponent_username` | `string` or `null`    | Present when matched      |
| `elo_window`        | `int`                 | Matchmaking window size   |

Example request and responses:

```json
// POST /api/multiplayer/queue/join
// Request body
{
  "game_mode": "pyramid"
}

// 200 Response (queued)
{
  "status": "queued",
  "queue_position": 3,
  "matched_match_id": null,
  "opponent_uid": null,
  "opponent_username": null,
  "elo_window": 100
}

// 200 Response (matched immediately)
{
  "status": "matched",
  "queue_position": null,
  "matched_match_id": 456,
  "opponent_uid": "opponent-uuid",
  "opponent_username": "OpponentName",
  "elo_window": 100
}
```

#### Queue status

Response model: `QueueStatusResponse`

| Field              | Type            | Notes                                |
| ------------------ | --------------- | ------------------------------------ |
| `in_queue`         | `bool`          | Whether the user is currently queued |
| `queue_position`   | `int` or `null` | Queue position when queued           |
| `waited_seconds`   | `int`           | Seconds spent waiting                |
| `elo_window`       | `int` or `null` | Active Elo search window             |
| `matched_match_id` | `int` or `null` | Set when a match already exists      |

Example response:

```json
// GET /api/multiplayer/queue/status
// 200 Response (still in queue)
{
  "in_queue": true,
  "queue_position": 2,
  "waited_seconds": 45,
  "elo_window": 150,
  "matched_match_id": null
}

// 200 Response (match found)
{
  "in_queue": false,
  "queue_position": null,
  "waited_seconds": 62,
  "elo_window": 150,
  "matched_match_id": 456
}
```

#### Match state

Response model: `MatchStateResponse`

| Field                             | Type                                 | Notes                       |
| --------------------------------- | ------------------------------------ | --------------------------- |
| `id`                              | `int`                                | Match id                    |
| `status`                          | `ongoing`, `completed`, or `aborted` | Match status                |
| `player1` / `player2`             | `MatchParticipant`                   | Player metadata             |
| `winner_uid`                      | `string` or `null`                   | Winner UID when match ended |
| `player1_score` / `player2_score` | `int`                                | Current score               |
| `started_at` / `finished_at`      | `datetime` or `null`                 | Timestamps                  |

Example response:

```json
// GET /api/multiplayer/matches/123
// 200 Response
{
  "id": 123,
  "status": "ongoing",
  "player1": {
    "uid": "player-1-uuid",
    "username": "Player1",
    "elo_rating": 1200,
    "elo_change": null
  },
  "player2": {
    "uid": "player-2-uuid",
    "username": "Player2",
    "elo_rating": 1250,
    "elo_change": null
  },
  "winner_uid": null,
  "player1_score": 5,
  "player2_score": 3,
  "started_at": "2026-05-04T10:15:30Z",
  "finished_at": null
}
```

#### Turn submission

Request model: `SubmitTurnRequest`

| Field           | Type                   | Notes                                |
| --------------- | ---------------------- | ------------------------------------ |
| `tile_id`       | `int`                  | Must be greater than 0               |
| `question_type` | `standard` or `yes_no` | Required                             |
| `question_id`   | `int`                  | Must be greater than 0               |
| `is_correct`    | `bool`                 | Evaluated result                     |
| `game_state`    | `dict` or `null`       | Optional snapshot broadcast to peers |

Response model: `SubmitTurnResponse`

| Field           | Type                   |
| --------------- | ---------------------- |
| `match_id`      | `int`                  |
| `tile_id`       | `int`                  |
| `question_type` | `standard` or `yes_no` |
| `question_id`   | `int`                  |
| `is_correct`    | `bool`                 |
| `player1_score` | `int`                  |
| `player2_score` | `int`                  |

Example request and response:

```json
// POST /api/multiplayer/matches/123/turn
// Request body
{
  "tile_id": 5,
  "question_type": "standard",
  "question_id": 12,
  "is_correct": true,
  "game_state": {
    "board": [1, 2, 0, 3, 0, 4, 5],
    "current_turn": "player1"
  }
}

// 200 Response
{
  "match_id": 123,
  "tile_id": 5,
  "question_type": "standard",
  "question_id": 12,
  "is_correct": true,
  "player1_score": 6,
  "player2_score": 3
}
```

#### Forfeit

Response model: `ForfeitResponse`

| Field        | Type                                 | Notes                      |
| ------------ | ------------------------------------ | -------------------------- |
| `match_id`   | `int`                                | Match id                   |
| `status`     | `ongoing`, `completed`, or `aborted` | Final status               |
| `winner_uid` | `string`                             | Winner UID after forfeit   |
| `reason`     | `string`                             | The backend uses `forfeit` |

Example response:

```json
// POST /api/multiplayer/matches/123/forfeit
// 200 Response
{
  "match_id": 123,
  "status": "completed",
  "winner_uid": "player-2-uuid",
  "reason": "forfeit"
}
```

#### WebSocket behavior

Connection rules:

- Token can be passed as `?token=<token>` or `Authorization: Bearer <token>`.
- If the token is missing or invalid the server closes the socket with code `1008`.
- The server resolves the user through `UserServices.get_user_from_token(token)` and verifies the user is a participant in the match.

Inbound messages:

- `ping` -> server replies with `pong` and the match id.
- `state_request` -> server sends `match_snapshot` and, if available, `game_snapshot`.
- `game_snapshot` -> server stores and rebroadcasts the snapshot.
- `timer_update` -> server rebroadcasts only if the sender matches the current turn owner.

Outbound events:

- `match_snapshot`
- `game_snapshot`
- `player_connected`
- `player_disconnected`
- `score_updated`
- `match_finished`
- `error`

Example connection and messages:

```
ws://<host>/api/multiplayer/ws/123?token=<firebase_id_token>
```

```json
// Client: ping message
{
  "type": "ping"
}

// Server: pong response
{
  "type": "pong",
  "match_id": 123,
  "timestamp": "2026-05-04T10:30:45Z"
}
```

```json
// Server: player_connected event
{
  "type": "player_connected",
  "player_uid": "user-uuid-2",
  "player_username": "opponent_name",
  "opponent_elo": 1250
}

// Server: score_updated event
{
  "type": "score_updated",
  "match_id": 123,
  "player1_score": 3,
  "player2_score": 2,
  "latest_turn": {
    "tile_id": 5,
    "player_id": "user-uuid-1",
    "is_correct": true,
    "question_id": 12,
    "question_type": "standard"
  }
}

// Server: match_finished event
{
  "type": "match_finished",
  "match_id": 123,
  "status": "completed",
  "winner_uid": "user-uuid-1",
  "final_scores": {
    "player1": 14,
    "player2": 10
  },
  "elo_changes": {
    "player1": { "from": 1200, "to": 1215, "change": 15 },
    "player2": { "from": 1250, "to": 1235, "change": -15 }
  },
  "finished_at": "2026-05-04T10:45:30Z"
}
```

## Infrastructure & Deployment

Azure cloud environment setup, resource selection, and the CI/CD pipeline architecture.

### Local Development

- **Local development**: Docker & Docker Compose for consistent environment across developers.
- **Database**: PostgreSQL running in a Docker container locally.
- **Backend**: FastAPI + Uvicorn in a container.
- **Frontend**: Vite dev server with hot reload.
- **Configuration**: Environment variables (`.env`) for local overrides.

### CI/CD Pipeline

High-level pipeline architecture:

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant GitHub as GitHub<br/>Repository
    participant GHActions as GitHub Actions<br/>CI/CD
    participant Azure as Azure Cloud<br/>Services
    participant DEV as Environment<br/>Container Instance

    Dev->>GitHub: Push to feature branch
    GitHub->>GHActions: Trigger workflow
    GHActions->>GHActions: Run unit tests (pytest, Vitest)
    GHActions->>GHActions: Lint & code style checks

    Dev->>GitHub: Create Pull Request → Main
    GitHub->>GHActions: Run PR checks
    GHActions-->>GitHub: Tests pass / fail status

    Dev->>GitHub: Merge PR to main
    GitHub->>GHActions: Trigger main branch workflow

    GHActions->>GHActions: Build backend Docker image
    GHActions->>GHActions: Build frontend Docker image
    GHActions->>Azure: Push images to Azure Container Registry
    Azure->>DEV: Spin up container instances
    end
```

**Pipeline stages:**

1. **Unit Testing**: Backend (pytest) and frontend (Vitest) tests run in parallel.
2. **Linting & Code Quality**: ESLint, Prettier, mypy checks.
3. **Build**: Docker images for backend and frontend are built and tagged with commit SHA and `latest`.
4. **Registry Push**: Images pushed to Azure Container Registry.
5. **Deployment**: Container instances deployed in subscription.

**Key Infrastructure Components:**

- **Azure Container Registry**: Central image repository for backend and frontend.
- **Azure Container App**: Managed, serverless container platform for production workload.
- **Azure PostgreSQL**: Production database (managed service).
- **Application Insights**: Logging, tracing, and monitoring (integrated via OpenTelemetry).
- **GitHub Actions**: Workflow orchestration and automation.

**Deployment Configuration:**

- Environment variables are injected at runtime (e.g., `APPLICATIONINSIGHTS_CONNECTION_STRING`, database credentials).
- Docker Compose is used for local and DEV multi-container orchestration.
- PROD runs a reverse proxy (nginx) in front of the FastAPI backend and frontend static files.

## Reliability & Observability

Plan for Logging, Monitoring, Alerting, and defined SLA/SLO/SLI metrics.

### Logging

Backend logging is centralized in `backend/logging_config.py` and outputs structured JSON to stdout for container logs. When the Azure Container App exposes `APPLICATIONINSIGHTS_CONNECTION_STRING`, the backend also initializes Azure Monitor OpenTelemetry so the same Python logs are exported to Application Insights.

**Log Structure:**

- **Request ID**: Attached to each log record to correlate logs from a single request across services.
- **Request Metadata**: User UID, endpoint, method, response status, and duration.
- **Service Logs**: Service-level operations (user lookup, question selection, matchmaking, turn validation).
- **Error Logs**: Full stack traces, context, and user action leading to the error.

**Log Levels:**

- `DEBUG`: Detailed diagnostic info (token validation, cache hits).
- `INFO`: Notable events (user login, match created, question delivered).
- `WARNING`: Recoverable issues (malformed input, cache miss, stale connection).
- `ERROR`: Failures requiring action (DB connection lost, invalid token, business logic violation).
- `CRITICAL`: System failures (startup errors, unrecoverable database issues).

**Example log entry (JSON):**

```json
{
  "timestamp": "2026-05-04T10:30:45.123Z",
  "level": "INFO",
  "request_id": "req-abc123",
  "service": "multiplayer",
  "action": "match_created",
  "player1_uid": "user-1",
  "player2_uid": "user-2",
  "match_id": 456,
  "elo_diff": 35,
  "message": "Match created with Elo window 100"
}
```

### Monitoring

**Azure Insights Integration:**

- All backend HTTP requests and WebSocket connections are traced via OpenTelemetry.
- Dependencies (PostgreSQL queries) are tracked with duration and status.

### Resilience

**Current Design Considerations:**

- **Connection Pooling**: Database connections are pooled to avoid exhaustion.
- **Request Timeout**: HTTP requests timeout after 30 seconds; WebSocket pings verify connectivity.
- **Graceful Degradation**: If the database is temporarily unavailable, some endpoints may return cached responses or queue operations for retry.
- **Circuit Breaker Pattern**: Consider implementing circuit breakers for external services (Firebase, AI API) in future iterations.

**Recovery Procedures:**

- **Database Failover**: PostgreSQL managed service in Azure provides automatic failover.
- **Container Restart**: Container orchestration automatically restarts failed containers.
- **Queue Cleanup**: Stale matchmaking queue entries are pruned periodically (e.g., after 30 minutes of inactivity).
- **Match Recovery**: Matches with no activity for > 1 hour are marked `aborted` and cleaned up.

### Future Improvements

- Real-time dashboard for match statistics, queue depth, and error rates.
- Distributed tracing across frontend → backend → database for complex flows.
- Performance profiling to identify bottlenecks in question selection and Elo calculation.
- Chaos engineering tests for network partitions and database unavailability.
- Automated capacity planning based on queue depth trends.

## Security Architecture

Authentication is Firebase-based. The frontend signs users in with Firebase Authentication and stores the resulting Firebase ID token on the client. Protected HTTP requests send that token in `Authorization: Bearer <firebase_id_token>`.

Backend verification flow:

- `get_firebase_id` verifies the Firebase ID token with the Firebase Admin SDK.
- If Firebase Admin is not configured, the dependency falls back to `UserServices.get_user_from_token`, which is used by tests and legacy token flows.
- After verification, the backend maps the Firebase UID to the local user table and uses local records for app-specific data such as username and Elo rating.
- Multiplayer WebSocket connections accept the token either in the query string or in the `Authorization` header and reject missing or invalid tokens with close code `1008`.

Security properties:

- No application password is stored or issued by the backend.
- Firebase is the source of identity; the backend is the source of authorization and local profile state.
- Firebase configuration is driven by environment variables and initialized only when the service-account fields are present.

Additional planned security: XSRF, CORS, token revocation handling, and optional rate limiting.

```mermaid
flowchart LR
    Browser[Browser / Frontend]
    FirebaseAuth[Firebase Authentication]
    Backend["Backend (FastAPI)"]
    DB[(Database)]

    Browser -->|Sign in with Firebase SDK| FirebaseAuth
    FirebaseAuth -->|"ID token (JWT)"| Browser
    Browser -->|Authorization: Bearer <id_token>| Backend
    Backend -->|get_firebase_id| FirebaseAuth
    Backend -->|UID -> local profile| DB
    Backend -->|Legacy/test fallback: get_user_from_token| DB
    Backend -->|HTTP 200 / WS accept| Browser
```

## Testing Strategy

Testing is split between backend (pytest) and frontend (Vitest + Testing Library). The goal is to validate service logic, API behavior, and critical UI/API flows.

### Backend tests (pytest)

Backend tests are organized in `backend/tests`:

- `unit/`: service-level logic validation (`UserServices`, `QuestionsService`)
- `integration/`: FastAPI endpoint tests using `fastapi.testclient.TestClient`
- `db/`: currently a database testing stub with TODO plan for real PostgreSQL integration tests
- `conftest.py`: shared fixtures (test client, sample users/questions, monkeypatch-based mocks)

How backend tests work:

- Fixtures create deterministic sample data and isolate tests from external state.
- Integration tests call HTTP endpoints and assert status codes + response schema.
- Unit tests verify behavior such as authentication checks, answer validation, and token generation.
- `pytest.ini` configures discovery (`test_*.py`), async mode (`asyncio_mode=auto`), and coverage reports (`term-missing` + HTML).

Backend run commands:

```bash
cd backend
pytest
```

Useful pytest markers defined in project config: `unit`, `integration`, `db`, `slow`, `auth`.

### Frontend tests (Vitest)

Frontend tests are implemented with Vitest in a jsdom environment:

- Component tests in `frontend/app/components/__tests__/`
- API-flow tests in `frontend/app/__tests__/`
- Global setup in `frontend/vitest.setup.ts`

How frontend tests work:

- React components are tested with `@testing-library/react`.
- API requests are mocked with MSW (`msw/node`) to keep tests deterministic and independent of backend runtime.
- Test setup starts a mock server before all tests, resets handlers after each test, and closes it after test run.
- Coverage is collected with the V8 provider and exported as text, JSON, HTML, and LCOV.

Frontend run commands:

```bash
cd frontend
npm run test
npm run test:ci
```

### Current status and known gaps

- Database integration tests are not implemented yet (documented in `backend/tests/db/test_database_stub.py`).
- Current backend tests rely heavily on mocks/fixtures; this is fast for CI but should be complemented by real DB integration tests.
- Some tests still reflect older endpoint paths/payload assumptions and should be synchronized continuously with API contracts during development.
