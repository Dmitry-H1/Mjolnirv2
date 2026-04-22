import time
from pathlib import Path
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, Response
from passlib.context import CryptContext
from jose import jwt, JWTError
from app.services.user_service import UserService
from app.services.jwt_service import JwtService
from uuid import uuid4
from app.models.user import User
from app.core.config import settings
from app.services.email_service import EmailService

_WELCOME_TEMPLATE = Path(__file__).parent.parent / "templates" / "welcome.html"


class AuthService:
    def __init__(self, user_service: UserService, jwt_service: JwtService, pwd_context: CryptContext, email_service: EmailService):
        self.user_service = user_service
        self.jwt_service = jwt_service
        self.pwd_context = pwd_context
        self.email_service = email_service

    # ---------------------------
    # User registration
    # ---------------------------
    def register_user(self, username: str, email: str, password: str, role: str = "USER"):
        existing = self.user_service.get_user_by_username(username)
        if existing:
            raise HTTPException(status_code=400, detail="User already exists")

        # (optional but recommended) check email uniqueness
        existing_email = self.user_service.get_user_by_email(email)
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already exists")

        hashed = self.pwd_context.hash(password)

        user = User(
            id=uuid4(),
            username=username,
            email=email,   
            password=hashed,
            role=role
        )

        self.user_service.create_user(user)

        html = (
            _WELCOME_TEMPLATE.read_text(encoding="utf-8")
            .replace("{{username}}", username)
            .replace("{{initial}}", username[0].upper())
            .replace("{{email}}", email)
            .replace("{{role}}", role)
            .replace("{{app_url}}", settings.app_url)
            .replace("{{year}}", str(datetime.now().year))
        )
        self.email_service.send_html_email(email, "Welcome to Mjolnir", html)

        return user
    # ---------------------------
    # Login
    # ---------------------------
    def login_user(self, username: str, password: str):
        user: User = self.user_service.get_user_by_username(username)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not self.pwd_context.verify(password, user.password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        access_token = self.jwt_service.create_access_token(user)
        refresh_token = self.jwt_service.create_refresh_token(user)
        

        return access_token, refresh_token

    # ---------------------------
    # Logout (clears refresh cookie)
    # ---------------------------
    def logout_user(self, response: Response):
        response.delete_cookie("refresh_token")
        return {"message": "Logged out"}
    # ---------------------------
    # Refresh token
    # ---------------------------
    def refresh_access_token(self, refresh_token: str):
        try:
            payload = jwt.decode(refresh_token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
            if payload.get("type") != "refresh":
                raise HTTPException(status_code=401, detail="Invalid token")
            user_id = payload.get("sub")
            user = self.user_service.get_user_by_id(user_id)
            if not user:
                raise HTTPException(status_code=401, detail="User not found")

            # create new access token
            access_token = self.jwt_service.create_access_token(user)
            return access_token
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
        

    def get_current_user(self, token: str):
        try:
            payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
            if payload.get("type") != "access":
                raise HTTPException(status_code=401, detail="Invalid token")
            user_id = payload.get("sub")
            user = self.user_service.get_user_by_id(user_id)
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            return user
        except JWTError as e:
            raise HTTPException(status_code=401, detail="Invalid token error")
        

    def get_api_key(self, user: User):
        return self.jwt_service.create_api_key(user)