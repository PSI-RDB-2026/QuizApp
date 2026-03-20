CREATE TABLE "users" (
  "email" varchar PRIMARY KEY,
  "username" varchar UNIQUE NOT NULL,
  "password_hash" varchar,
  "google_id" varchar,
  "elo_rating" int DEFAULT 1200,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "standard_questions" (
  "id" SERIAL PRIMARY KEY,
  "initials" varchar NOT NULL,
  "question_text" text NOT NULL UNIQUE,
  "correct_answer" varchar NOT NULL,
  "category" varchar,
  "difficulty" int DEFAULT 1
);

CREATE TABLE "yes_no_questions" (
  "id" SERIAL PRIMARY KEY,
  "question_text" text NOT NULL UNIQUE,
  "correct_answer" boolean NOT NULL,
  "category" varchar
);

CREATE TABLE "matches" (
  "id" BIGSERIAL PRIMARY KEY,
  "player1_id" varchar NOT NULL,
  "player2_id" varchar NOT NULL,
  "winner_id" varchar,
  "player1_elo_change" int,
  "player2_elo_change" int,
  "status" varchar NOT NULL DEFAULT 'ongoing',
  "started_at" timestamp DEFAULT (now()),
  "finished_at" timestamp
);

CREATE TABLE "match_turns" (
  "id" BIGSERIAL PRIMARY KEY,
  "match_id" bigint NOT NULL,
  "player_id" varchar NOT NULL,
  "tile_id" int NOT NULL,
  "standard_question_id" int,
  "yes_no_question_id" int,
  "is_correct" boolean NOT NULL,
  "turn_timestamp" timestamp DEFAULT (now())
);

COMMENT ON COLUMN "users"."elo_rating" IS 'Determines MMR and Leaderboard rank';

COMMENT ON COLUMN "standard_questions"."initials" IS 'e.g., "A", "CH", "K"';

COMMENT ON COLUMN "standard_questions"."difficulty" IS '1 to 5 scale';

COMMENT ON COLUMN "yes_no_questions"."question_text" IS 'For wrongly answered/contested tiles';

COMMENT ON COLUMN "matches"."winner_id" IS 'Null if match is a draw or ongoing';

COMMENT ON COLUMN "matches"."player1_elo_change" IS 'e.g., +15 or -12';

COMMENT ON COLUMN "matches"."player2_elo_change" IS 'e.g., -15 or +12';

COMMENT ON COLUMN "matches"."status" IS 'ongoing, completed, aborted';

COMMENT ON COLUMN "match_turns"."tile_id" IS 'Tile number 1-28 on the AZ kvíz pyramid';

COMMENT ON COLUMN "match_turns"."standard_question_id" IS 'Null if a Yes/No question was used';

COMMENT ON COLUMN "match_turns"."yes_no_question_id" IS 'Null if a standard question was used';

ALTER TABLE "matches" ADD FOREIGN KEY ("player1_id") REFERENCES "users" ("email");

ALTER TABLE "matches" ADD FOREIGN KEY ("player2_id") REFERENCES "users" ("email");

ALTER TABLE "matches" ADD FOREIGN KEY ("winner_id") REFERENCES "users" ("email");

ALTER TABLE "match_turns" ADD FOREIGN KEY ("match_id") REFERENCES "matches" ("id");

ALTER TABLE "match_turns" ADD FOREIGN KEY ("player_id") REFERENCES "users" ("email");

ALTER TABLE "match_turns" ADD FOREIGN KEY ("standard_question_id") REFERENCES "standard_questions" ("id");

ALTER TABLE "match_turns" ADD FOREIGN KEY ("yes_no_question_id") REFERENCES "yes_no_questions" ("id");

ALTER TABLE match_turns ADD CONSTRAINT check_one_question_type
CHECK (
  (standard_question_id IS NOT NULL AND yes_no_question_id IS NULL)
  OR
  (standard_question_id IS NULL AND yes_no_question_id IS NOT NULL)
);

ALTER TABLE matches ADD CONSTRAINT check_status
CHECK (status IN ('ongoing', 'completed', 'aborted'));