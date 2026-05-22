import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_optional_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
) -> User | None:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None
    return db.query(User).filter(User.id == user_id).first()


async def verify_google_token(credential: str) -> dict:
    """Verify Google ID token and return user info."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}"
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    payload = resp.json()
    if payload.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Token not intended for this app")

    return {
        "email": payload["email"],
        "name": payload.get("name", ""),
        "sub": payload["sub"],
    }


def get_or_create_google_user(db: Session, google_info: dict) -> User:
    """Find existing user by email or create a new one from Google info."""
    user = db.query(User).filter(User.email == google_info["email"]).first()
    if user:
        return user

    # Generate a unique username from email prefix
    base_username = google_info["email"].split("@")[0].lower()
    base_username = "".join(c for c in base_username if c.isalnum() or c in "-_")[:40]
    username = base_username

    # Ensure uniqueness
    while db.query(User).filter(User.username == username).first():
        username = f"{base_username}-{secrets.token_hex(3)}"

    user = User(
        username=username,
        email=google_info["email"],
        password_hash=hash_password(secrets.token_hex(16)),  # random password (unused)
        display_name=google_info.get("name"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
