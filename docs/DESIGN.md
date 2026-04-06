# Design documentation: QuizApp

This document presents the technical plan for implementing QuizApp project.

## Architecture

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
- HTTP client (REST API), UI framework TBD

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
        varchar email PK
        varchar username UK
        varchar password_hash
        varchar google_id
        int elo_rating
        timestamp created_at
    }

    STANDARD_QUESTIONS {
        int id PK
        varchar initials
        text question_text UK
        varchar correct_answer
        varchar category
        int difficulty
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
        varchar status
        timestamp started_at
        timestamp finished_at
    }

    MATCH_TURNS {
        bigint id PK
        bigint match_id FK
        varchar player_id FK
        int tile_id
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

Constraint: each turn references exactly one question type (`standard_question_id` xor `yes_no_question_id`).

Original DB diagrama is in [/diagrams/DB-diagram.md](../diagrams/DB-diagram.png)

## Interaction Design

### Single-Player Mode

```mermaid
flowchart LR
    Browser[Browser]
    Backend[Backend]
    DB[(Database)]

    Browser -->|HTTP: Login, Get Quiz| Backend
    Browser -->|Store answers locally| Browser
    Browser -->|HTTP: Submit answers| Backend

    DB -->|Load Questions| Backend

    Backend ~~~ DB

    Backend -->|HTTP: Results| Browser


```

**Communication:** HTTP/REST only. Answers stored locally, submitted once.

### Multiplayer Mode

```mermaid
flowchart LR
    P1[Player 1]
    P2[Player 2]
    Backend[Backend]
    DB[(Database)]

    P1 -->|HTTP: Create match| Backend

    P2 -->|HTTP: Accept match| Backend

    P1 <-->|WebSocket: Connect| Backend
    P2 <-->|WebSocket: Connect| Backend

    P1 -->|HTTP: Submit answer| Backend
    Backend -->|Save| DB
    Backend -->|WebSocket: Score update| P2

    P2 -->|HTTP: Submit answer| Backend
    DB -->|Load Question| Backend
    Backend -->|WebSocket: Score update| P1
```

**Communication:** HTTP/REST for setup and answers. WebSocket for real-time score updates.

## API & Interface Specification

TODO later

## Infrastructure & Deployment

Azure cloud environment setup, resource selection, and the CI/CD pipeline architecture

High-level plan:

```mermaid
flowchart LR
    FB[Feature Branch]
    PR[Pull Request]
    MAIN[Main Branch]
    DEV[DEV environment]
    PROD[PROD environment]

    FB -- Unit Test & Code Style --> PR
    PR -- Code Review --> MAIN
    MAIN -- Build & Test --> DEV
    DEV -- Integration Tests --> PROD
```

TODO(@anyone) Máte jiný návrh?

## Reliability & Observability

Plan for Logging, Monitoring, Alerting, and defined SLA/SLO/SLI metrics.

## Security Architecture

Auth login flow: email stores in PostgreSQL. User presents the token and upon validation backend issues JSON Web Token back to the React app which stores it localStorage.

Additional planned security: XSRF, CORS.

## Testing Strategy

Overview of Unit, Integration, and UI testing approaches
