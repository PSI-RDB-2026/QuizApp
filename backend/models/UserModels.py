"""User models used by backend user routes/services."""
from pydantic import BaseModel


class RegisterRequest(BaseModel):
    """User registration payload persisted in backend DB."""
    username: str
    uid: str


class LeaderboardEntry(BaseModel):
    """Single leaderboard row returned by the users API."""
    uid: str
    username: str
    elo_rating: int
    win_rate: float
    matches: int
