# auth_service.py
from datetime import datetime, timedelta, timezone
from jose import jwt
from app.core.config import settings
from app.models.user import User

class JwtService:

    def create_access_token(self, user: User):
        payload = {
            "sub": str(user.id),
            "role": user.role,
            "type": "access",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=int(settings.jwt_access_expire_min))
        }
        return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

    def create_refresh_token(self, user: User):
        payload = {
            "sub": str(user.id),
            "type": "refresh",
            "exp": datetime.now(timezone.utc) + timedelta(days=int(settings.jwt_refresh_expire_days))
        }
        return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

    def create_api_key(self, user: User):
        payload = {
            "sub": str(user.id),
            "role": user.role,
            "type": "access",
            "exp": datetime.now(timezone.utc) + timedelta(days=30 * int(settings.jwt_api_key_expire_months))   
        }
        return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
