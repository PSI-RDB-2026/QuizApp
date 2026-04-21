from datetime import datetime, timezone
from fastapi import HTTPException

from db.database import execute, fetch_one


class MultiplayerMatchService:
    _runtime_scores: dict[int, dict[str, int]] = {}

    @staticmethod
    async def get_user_profile(email: str) -> dict:
        return dict(await MultiplayerMatchService._get_user(email))

    @staticmethod
    async def _get_user(email: str):
        user = await fetch_one(
            """
            SELECT email, username, elo_rating
            FROM users
            WHERE email = :email
            """,
            {"email": email},
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user._mapping

    @staticmethod
    async def create_match(player1_email: str, player2_email: str) -> dict:
        if player1_email == player2_email:
            raise HTTPException(status_code=400, detail="Cannot create match with the same player")

        player1 = await MultiplayerMatchService._get_user(player1_email)
        player2 = await MultiplayerMatchService._get_user(player2_email)

        match = await fetch_one(
            """
            INSERT INTO matches (player1_id, player2_id, status)
            VALUES (:player1, :player2, 'ongoing')
            RETURNING id, status, started_at
            """,
            {"player1": player1_email, "player2": player2_email},
        )
        match_map = match._mapping
        match_id = match_map["id"]
        MultiplayerMatchService._runtime_scores[match_id] = {
            player1_email: 0,
            player2_email: 0,
        }
        return {
            "id": match_id,
            "status": match_map["status"],
            "started_at": match_map["started_at"],
            "finished_at": None,
            "winner_email": None,
            "player1": dict(player1),
            "player2": dict(player2),
            "player1_score": 0,
            "player2_score": 0,
        }

    @staticmethod
    async def get_match(match_id: int) -> dict:
        match = await fetch_one(
            """
            SELECT id, player1_id, player2_id, winner_id, status, started_at, finished_at
            FROM matches
            WHERE id = :match_id
            """,
            {"match_id": match_id},
        )
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")

        match_map = match._mapping
        player1 = await MultiplayerMatchService._get_user(match_map["player1_id"])
        player2 = await MultiplayerMatchService._get_user(match_map["player2_id"])

        score_map = MultiplayerMatchService._runtime_scores.get(match_id)
        if not score_map:
            score_map = {
                match_map["player1_id"]: 0,
                match_map["player2_id"]: 0,
            }
            MultiplayerMatchService._runtime_scores[match_id] = score_map

        return {
            "id": match_map["id"],
            "status": match_map["status"],
            "started_at": match_map["started_at"],
            "finished_at": match_map["finished_at"],
            "winner_email": match_map["winner_id"],
            "player1": dict(player1),
            "player2": dict(player2),
            "player1_score": score_map.get(match_map["player1_id"], 0),
            "player2_score": score_map.get(match_map["player2_id"], 0),
        }

    @staticmethod
    async def ensure_participant(match_id: int, player_email: str) -> dict:
        match = await MultiplayerMatchService.get_match(match_id)
        if player_email not in {match["player1"]["email"], match["player2"]["email"]}:
            raise HTTPException(status_code=403, detail="You are not a participant in this match")
        return match

    @staticmethod
    async def submit_turn(
        match_id: int,
        player_email: str,
        tile_id: int,
        question_type: str,
        question_id: int,
        is_correct: bool,
    ) -> dict:
        match = await MultiplayerMatchService.ensure_participant(match_id, player_email)
        if match["status"] != "ongoing":
            raise HTTPException(status_code=409, detail="Match is already finished")

        standard_question_id = question_id if question_type == "standard" else None
        yes_no_question_id = question_id if question_type == "yes_no" else None

        await execute(
            """
            INSERT INTO match_turns (match_id, player_id, tile_id, standard_question_id, yes_no_question_id, is_correct)
            VALUES (:match_id, :player_id, :tile_id, :standard_question_id, :yes_no_question_id, :is_correct)
            """,
            {
                "match_id": match_id,
                "player_id": player_email,
                "tile_id": tile_id,
                "standard_question_id": standard_question_id,
                "yes_no_question_id": yes_no_question_id,
                "is_correct": is_correct,
            },
        )

        score_map = MultiplayerMatchService._runtime_scores.setdefault(
            match_id,
            {
                match["player1"]["email"]: match["player1_score"],
                match["player2"]["email"]: match["player2_score"],
            },
        )
        if is_correct:
            score_map[player_email] = score_map.get(player_email, 0) + 1

        return {
            "match_id": match_id,
            "tile_id": tile_id,
            "question_type": question_type,
            "question_id": question_id,
            "is_correct": is_correct,
            "player1_score": score_map.get(match["player1"]["email"], 0),
            "player2_score": score_map.get(match["player2"]["email"], 0),
        }

    @staticmethod
    def _elo_delta(winner_elo: int, loser_elo: int, k_factor: int = 32) -> tuple[int, int]:
        expected_win = 1 / (1 + (10 ** ((loser_elo - winner_elo) / 400)))
        winner_delta = round(k_factor * (1 - expected_win))
        loser_delta = -winner_delta
        return winner_delta, loser_delta

    @staticmethod
    async def _update_elo(winner_email: str, loser_email: str) -> tuple[int, int]:
        winner = await MultiplayerMatchService._get_user(winner_email)
        loser = await MultiplayerMatchService._get_user(loser_email)
        winner_delta, loser_delta = MultiplayerMatchService._elo_delta(
            winner["elo_rating"], loser["elo_rating"]
        )

        await execute(
            """
            UPDATE users
            SET elo_rating = elo_rating + :elo_delta
            WHERE email = :email
            """,
            {"elo_delta": winner_delta, "email": winner_email},
        )
        await execute(
            """
            UPDATE users
            SET elo_rating = elo_rating + :elo_delta
            WHERE email = :email
            """,
            {"elo_delta": loser_delta, "email": loser_email},
        )
        return winner_delta, loser_delta

    @staticmethod
    async def finalize_match(
        match_id: int,
        winner_email: str,
        status: str = "completed",
    ) -> dict:
        match = await MultiplayerMatchService.get_match(match_id)
        participants = [match["player1"]["email"], match["player2"]["email"]]
        if winner_email not in participants:
            raise HTTPException(status_code=400, detail="Winner must be a participant")

        loser_email = participants[1] if participants[0] == winner_email else participants[0]
        winner_delta, loser_delta = await MultiplayerMatchService._update_elo(winner_email, loser_email)

        player1_delta = winner_delta if match["player1"]["email"] == winner_email else loser_delta
        player2_delta = winner_delta if match["player2"]["email"] == winner_email else loser_delta

        await execute(
            """
            UPDATE matches
            SET winner_id = :winner_id,
                player1_elo_change = :player1_elo_change,
                player2_elo_change = :player2_elo_change,
                status = :status,
                finished_at = :finished_at
            WHERE id = :match_id
            """,
            {
                "winner_id": winner_email,
                "player1_elo_change": player1_delta,
                "player2_elo_change": player2_delta,
                "status": status,
                "finished_at": datetime.now(timezone.utc),
                "match_id": match_id,
            },
        )

        return await MultiplayerMatchService.get_match(match_id)

    @staticmethod
    async def forfeit(match_id: int, forfeited_email: str) -> dict:
        match = await MultiplayerMatchService.ensure_participant(match_id, forfeited_email)
        if match["status"] != "ongoing":
            raise HTTPException(status_code=409, detail="Match is already finished")

        winner_email = (
            match["player2"]["email"]
            if match["player1"]["email"] == forfeited_email
            else match["player1"]["email"]
        )
        return await MultiplayerMatchService.finalize_match(match_id, winner_email, status="aborted")
