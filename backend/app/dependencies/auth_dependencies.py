from app.repositories.user_repository import UserRepository
from app.services.user_service import UserService
from app.services.jwt_service import JwtService
from app.services.auth_service import AuthService
from passlib.context import CryptContext
from app.dependencies.dependencies import bigquery_client  # import the singleton
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends
from app.core.config import settings

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# tokenUrl must match the route that returns the JWT
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Initialize services (singleton)
user_repository = UserRepository(  
    bigquery_client,
    settings.gcp_project_id,
    settings.bq_dataset,
    settings.bq_users_table
    )
user_service = UserService(user_repository)
jwt_service = JwtService()
auth_service = AuthService(user_service, jwt_service, pwd_context)


# Dependency functions
def get_user_service() -> UserService:
    return user_service

def get_jwt_service() -> JwtService:
    return jwt_service

def get_auth_service() -> AuthService:
    return auth_service

def get_current_user(token: str = Depends(oauth2_scheme)):
    return auth_service.get_current_user(token)