from fastapi import Depends, HTTPException, status
import os
from dotenv import load_dotenv
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging
import firebase_admin
from firebase_admin import credentials, auth

load_dotenv()

security = HTTPBearer()

logger = logging.getLogger(__name__)

firebase_cfg = {
    "type": "service_account",
    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
    "private_key": (os.getenv("FIREBASE_PRIVATE_KEY") or "").replace('\\n', '\n'),
    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
    "client_id": os.getenv("FIREBASE_CLIENT_ID"),
    "auth_uri": os.getenv("FIREBASE_AUTH_URI"),
    "token_uri": os.getenv("FIREBASE_TOKEN_URI"),
    "auth_provider_x509_cert_url": os.getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL"),
    "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL")
}

_firebase_initialized = False
if all(firebase_cfg.values()):
    if not firebase_admin._apps:
        cred = credentials.Certificate(firebase_cfg)
        firebase_admin.initialize_app(cred)
    _firebase_initialized = True


def _verify_firebase_token(id_token: str) -> str:
    if not _firebase_initialized:
        logger.error("firebase_not_initialized")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Firebase Admin SDK is not configured on backend.",
        )

    try:
        decoded_token = auth.verify_id_token(id_token, clock_skew_seconds=10)
        user_id = decoded_token["uid"]
        logger.info("token_verified", extra={"user_id": user_id})
        return user_id
    except Exception as e:
        logger.warning("token_verification_failed", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Neplatny nebo vyprsely token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


def get_firebase_id(
    token: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """Dependency to verify JWT token from Authorization header."""
    return _verify_firebase_token(token.credentials)
