# QuizApp Component Diagram - Communication Flow

## Single-Player Mode

```mermaid
flowchart LR
    Browser[Browser]
    Backend[Backend]
    DB[(Database)]

    Browser -->|HTTP: Login, Get Quiz| Backend
    Browser -->|Store answers locally| Browser
    Browser -->|HTTP: Submit answers| Backend
    Backend -->|Save| DB
    Backend -->|HTTP: Results| Browser
```

**Communication:** HTTP/REST only. Answers stored locally, submitted once.

---

## Multiplayer Mode

```mermaid
flowchart LR
    P1[Player 1]
    P2[Player 2]
    Backend[Backend]
    DB[(Database)]

    P1 -->|HTTP: Create match| Backend
    Backend -->|Store| DB
    P2 -->|HTTP: Accept match| Backend

    P1 <-->|WebSocket: Connect| Backend
    P2 <-->|WebSocket: Connect| Backend

    P1 -->|HTTP: Submit answer| Backend
    Backend -->|Save| DB
    Backend -->|WebSocket: Score update| P2

    P2 -->|HTTP: Submit answer| Backend
    Backend -->|Save| DB
    Backend -->|WebSocket: Score update| P1
```

**Communication:** HTTP/REST for setup and answers. WebSocket for real-time score updates.

---

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

---

## Comparison

| Aspect            | Single-Player | Multiplayer      |
| ----------------- | ------------- | ---------------- |
| Protocol          | HTTP only     | HTTP + WebSocket |
| Answer submission | Once at end   | Per answer       |
| Real-time sync    | No            | Yes              |
