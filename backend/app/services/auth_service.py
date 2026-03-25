import time
from typing import Optional
from fastapi import HTTPException, Response
from passlib.context import CryptContext
from jose import jwt, JWTError
from services.user_service import UserService
from services.jwt_service import JwtService
from uuid import uuid4
from models.user import User
from core.config import settings


class AuthService:
    def __init__(self, user_service: UserService, jwt_service: JwtService, pwd_context: CryptContext):
        self.user_service = user_service
        self.jwt_service = jwt_service
        self.pwd_context = pwd_context

    # ---------------------------
    # User registration
    # ---------------------------
    def register_user(self, username: str, password: str, role: str = "USER"):
        existing = self.user_service.get_user_by_username(username)
        if existing:
            raise HTTPException(status_code=400, detail="User already exists")

        hashed = self.pwd_context.hash(password)

        user = User(
            id=uuid4(),  # generate a proper UUID
            username=username,
            password=hashed,  # store hashed password
            role=role
        )

        self.user_service.create_user(user)  # make sure add_user accepts a Pydantic User

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