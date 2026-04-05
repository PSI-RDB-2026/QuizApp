'''This module defines the data models for user authentication
and token management in the QuizApp backend.
'''
from pydantic import BaseModel


class LoginRequest(BaseModel):
    '''Model for user login request. It includes the email and password'''
    email: str
    password: str


class TokenResponse(BaseModel):
    '''Model for the response returned after successful authentication.'''
    access_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    """Model for user registration request. It includes basics for new user"""
    username: str
    email: str
    password: str
