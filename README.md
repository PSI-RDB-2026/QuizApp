# QuizApp

A competitive, real-time quiz platform where users test knowledge individually or challenge friends to head-to-head matches across devices. Semestral project for PSI and RDB (Summer 2026).

## 1. Overview & Features

**Core Capabilities:**
- Individual quiz mode with instant feedback and scoring
- Real-time two-player competitive matches with live score synchronization
- Global and quiz-specific leaderboards
- Secure user accounts and admin quiz management
- Cross-browser support (desktop, tablet, mobile)
- Containerized architecture deployable to Azure or AWS

**Tech Stack:** React + TypeScript (frontend) | FastAPI + Python (backend) | SQL database | Docker

**Architecture:** Stateless REST + WebSocket backend with persistent SQL storage, responsive React SPA.

## 2. Scope

**In Scope:**
- User registration, login, authentication
- Quiz browsing and single-player completion with auto-scoring
- Real-time two-player matches with invitation system
- Leaderboards (global, per-quiz, competitive)
- Admin quiz/question management (create, edit, publish)
- Local Docker Compose development and cloud deployment
- WebSocket support for live match synchronization

## 3. Tech Stack

### Frontend
- React, TypeScript
- HTTP client (REST API), UI framework TBD

### Backend
- Python, FastAPI, Pydantic
- ASGI server (Uvicorn/Gunicorn)

### Database
- SQL relational database (PostgreSQL recommended, MySQL as alternative)

### Infrastructure
- Docker, Docker Compose (local)
- Cloud: Azure or AWS (TBD)

## 4. Architecture

```
[React + TypeScript SPA]
        |
        | HTTPS / REST + WebSocket
        v
[FastAPI Backend]
        |
        | SQL
        v
[Relational Database]
```

**Principles:** Stateless API with token/session auth, explicit API contracts, input validation, environment-driven config.

## 5. User Roles

- **Guest**: Browse public pages; register/login to play
- **User**: Take quizzes, challenge others, view results and leaderboards, receive real-time match notifications
- **Admin**: Create/edit/publish quizzes, manage questions, moderate content

## 6. Requirements

### Functional

**Authentication & Users**
- FR-01: Register with unique credentials
- FR-02: Authenticate and receive session/token
- FR-03: View/update profile details

**Quiz Management**
- FR-04: Admin create quizzes with metadata (title, category, difficulty, time limit optional)
- FR-05: Admin add/edit/remove questions and answer options
- FR-06: Single correct answer per question (MVP)
- FR-07: Publish state controls user visibility

**Single-Player Quizzes**
- FR-08: Start attempts on published quizzes
- FR-09: Submit and validate answers
- FR-10: Auto-score after submission
- FR-11: View result summary (score, percentage, correct count)

**Multiplayer Matches**
- FR-12: Initiate match requests to other users
- FR-13: Invited user accepts/declines invitation
- FR-14: Match created with shared quiz; both players answer same questions
- FR-15: Real-time score synchronization between players
- FR-16: Match persists across browser refreshes/device switches
- FR-17: Match concludes when both players submit; scores recorded
- FR-18: Match result shows head-to-head score, winner/loser/tie, timestamp

**Leaderboards**
- FR-19: Global leaderboard ranks users by cumulative score (single + multiplayer)
- FR-20: Quiz leaderboard ranks users by best score per quiz
- FR-21: Match leaderboard ranks users by wins, win rate, head-to-head performance
- FR-22: Ties resolved by submission time (earlier higher)

**Admin**
- FR-23: Admin endpoints role-protected
- FR-24: Admin can deactivate quizzes
- FR-25: Admin can view/cancel in-progress matches

### Non-Functional
- Responsive UI across browsers
- OpenAPI auto-generated documentation
- Hashed passwords, JWT/session validation, input validation, CORS control
- Structured logging for events and errors
- Containerized services with env-based config
- WebSocket reconnection resilience and state synchronization

## 7. Data Model

- `users`: id, username, email, password_hash, role, created_at
- `quizzes`: id, title, description, category, difficulty, is_published, created_by (FK), created_at
- `questions`: id, quiz_id (FK), text, order_index
- `options`: id, question_id (FK), text, is_correct
- `attempts`: id, user_id (FK), quiz_id (FK), score, max_score, submitted_at
- `attempt_answers`: id, attempt_id (FK), question_id (FK), selected_option_id (FK), is_correct
- `matches`: id, quiz_id (FK), player1_id (FK), player2_id (FK), player1_score, player2_score, status (pending/active/completed), started_at, completed_at
- `match_answers`: id, match_id (FK), player_id (FK), question_id (FK), selected_option_id (FK), is_correct, answered_at

## 8. API Design

**Auth**
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`

**Quizzes**
- `GET /quizzes`, `GET /quizzes/{quiz_id}`
- `POST /quizzes` (admin), `PUT /quizzes/{quiz_id}` (admin), `POST /quizzes/{quiz_id}/publish` (admin)

**Single-Player**
- `POST /quizzes/{quiz_id}/attempts/start`
- `POST /attempts/{attempt_id}/submit`
- `GET /users/me/attempts`

**Multiplayer**
- `POST /matches/invite`, `POST /matches/{match_id}/accept`, `POST /matches/{match_id}/decline`
- `GET /matches/{match_id}`, `POST /matches/{match_id}/answer`, `POST /matches/{match_id}/submit`
- `GET /users/me/matches`
- `WS /ws/matches/{match_id}` (WebSocket for real-time events)

**Leaderboards**
- `GET /leaderboard/global`, `GET /leaderboard/quizzes/{quiz_id}`, `GET /leaderboard/matches`

## 9. Frontend Modules

- Auth pages (Login, Register), User profile/history
- Quiz browsing and detail pages
- Quiz attempt page, Result summary page
- Match invitation page, Live match page (real-time sync'd), Match result page
- Leaderboards (global, per-quiz, competitive)
- Admin dashboard (quiz/question CRUD)

## 10. Security

- Argon2 or Bcrypt password hashing
- JWT or secure session authentication
- Role-based access control (RBAC) for admin endpoints
- Input validation and CORS control per environment
- Environment-based secret management (no secrets in code)

## 11. Deployment

**Local:** Docker Compose (frontend, backend, database containers)

**Cloud:** Deploy to Azure or AWS (decision pending)
- Azure: Static Web Apps/App Service (frontend), App Service/Container Apps (backend), Azure Database for PostgreSQL/MySQL, Azure Container Registry
- AWS: S3+CloudFront/Amplify (frontend), ECS/Fargate/EKS (backend), RDS PostgreSQL/MySQL, ECR

**CI/CD:** Test on PRs → Build images on main → Push to registry → Deploy

**Config:** Environment variables for `APP_ENV`, `API_BASE_URL`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_MIN`, `CORS_ORIGINS`

## 12. Project Structure

```
quizapp/
  frontend/        # React + TypeScript SPA
  backend/         # FastAPI application
  infra/           # Docker, Docker Compose, deployment configs
```

## 13. Development Roadmap

**Phase 0 (Initial Deploy - Priority)**
- Auth (register/login)
- Single-player quiz flow with auto-scoring
- User dashboard and profile
- Admin quiz management
- Local Docker Compose working
- MVP deployed to cloud (Azure or AWS)

**Phase 1 (Post-Launch - Features)**
- Leaderboards (global, per-quiz, competitive)
- Multiplayer match system with real-time sync
- Match history and statistics

**Phase 2 (Polish & Scale)**
- Performance optimization and security hardening
- Advanced analytics and admin tools
- Mobile-optimized UI enhancements

**Definition of Done (Phase 0):**
- Users register/login and complete quizzes end-to-end
- Results persist in database
- Application runs via Docker Compose locally
- MVP deployed to cloud environment and accessible

## 14. Future Scope & Open Decisions

**Not in Current Roadmap:**
- Native mobile apps (web responsive only)
- Group matches (>2 players)
- Payments/subscriptions
- AI-generated quiz content
- Advanced question types (multiple-choice with partial credit, drag-and-drop, etc.)

**Decisions to Make:**
- Final cloud provider: Azure vs AWS
- Final SQL engine: PostgreSQL vs MySQL
- Frontend UI component/styling library (Material-UI, Tailwind, etc.)
- Authentication token lifetime and refresh strategy
- WebSocket protocol for match sync (Socket.IO, raw WebSocket, etc.)
