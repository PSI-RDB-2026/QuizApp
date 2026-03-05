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

TODO(@MichalPKN) - dodat databázové schéma here

TODO(@všichni) - Budeme sem dávat i class diagram?

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
