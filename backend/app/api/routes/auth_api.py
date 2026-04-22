from fastapi import APIRouter, Depends, Response, Cookie, HTTPException
from app.schemas.auth_schema import UserRegister, UserLogin 
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.services.jwt_service import JwtService

from app.models.user import User
from app.dependencies.auth_dependencies import get_current_user, get_auth_service
from app.core.config import settings

router = APIRouter()

# -----------------------
# Register
# -----------------------
@router.post("/register")
def register(user: UserRegister, auth_service: AuthService = Depends(get_auth_service)):
    new_user: User = auth_service.register_user(
        username=user.username,
        email=user.email,
        password=user.password,
        role=user.role
    )
    return {
        "id": str(new_user.id),
        "username": new_user.username,
        "email": new_user.email,
        "role": new_user.role
    }

# -----------------------
# Login
# -----------------------
@router.post("/login")
def login(response: Response, form_data: UserLogin, auth_service: AuthService = Depends(get_auth_service)):
    access_token, refresh_token = auth_service.login_user(
        username=form_data.username,
        password=form_data.password
    )

    # Set refresh token as HttpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        max_age=int(settings.jwt_refresh_expire_days) * 24 * 60 * 60,
        samesite="none",
        path="/"
    )

    return {"access_token": access_token, "token_type": "Bearer"}

# -----------------------
# Refresh access token
# -----------------------
@router.post("/refresh")
def refresh(response: Response, refresh_token: str = Cookie(None), auth_service: AuthService = Depends(get_auth_service)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    access_token = auth_service.refresh_access_token(refresh_token)
    return {"access_token": access_token, "token_type": "Bearer"}

# -----------------------
# Logout
# -----------------------
@router.post("/logout")
def logout(response: Response, auth_service: AuthService = Depends(get_auth_service)):
    return auth_service.logout_user(response)


@router.post("/api-key")
def api_key(current_user: User = Depends(get_current_user), 
            auth_service: AuthService = Depends(get_auth_service)):
    
    api_key = auth_service.get_api_key(current_user)
    return {"api_key": api_key, "token_type": "Bearer"}


# -----------------------
# Protected route example
# -----------------------
@router.get("/me")
def me(current_user: User = Depends(get_current_user)):

    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role
    }

