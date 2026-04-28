"""User models used by backend user routes/services."""
from pydantic import BaseModel


class RegisterRequest(BaseModel):
    """User registration payload persisted in backend DB."""
    username: str
    uid: str
