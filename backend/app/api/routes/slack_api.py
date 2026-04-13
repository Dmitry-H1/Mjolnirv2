import httpx
import secrets
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.dependencies.auth_dependencies import get_current_user, get_user_service, auth_service
from app.services.user_service import UserService
from app.models.user import User

router = APIRouter(prefix="/auth/slack", tags=["slack"])

SLACK_OAUTH_URL = "https://slack.com/oauth/v2/authorize"
SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access"


# ---------------------------
# Connect — browser redirect, token passed as query param
# ---------------------------
@router.get("/connect")
def slack_connect(token: str = Query(...)):
    """
    Frontend sends user here with their JWT as ?token=...
    We verify it, encode user_id in state, then redirect to Slack.
    """
    user: User = auth_service.get_current_user(token)

    # Encode user_id + random nonce in state so we can retrieve the user in the callback
    state = f"{user.id}:{secrets.token_urlsafe(16)}"

    url = (
        f"{SLACK_OAUTH_URL}"
        f"?client_id={settings.slack_client_id}"
        f"&scope=incoming-webhook"
        f"&redirect_uri={settings.slack_redirect_uri}"
        f"&state={state}"
    )
    return RedirectResponse(url)


# ---------------------------
# Callback — Slack redirects here after user authorizes
# ---------------------------
@router.get("/callback")
def slack_callback(
    code: str = Query(...),
    state: str = Query(...),
    user_service: UserService = Depends(get_user_service),
):
    """
    Slack sends code + state back here.
    We exchange code for a webhook URL and save it to the user's record.
    """
    # Extract user_id from state
    try:
        user_id = state.split(":")[0]
    except IndexError:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    # Exchange code for webhook URL
    response = httpx.post(SLACK_TOKEN_URL, data={
        "client_id": settings.slack_client_id,
        "client_secret": settings.slack_client_secret,
        "code": code,
        "redirect_uri": settings.slack_redirect_uri,
    })
    data = response.json()

    if not data.get("ok"):
        raise HTTPException(
            status_code=400,
            detail=f"Slack OAuth failed: {data.get('error', 'unknown error')}"
        )

    webhook_url = data["incoming_webhook"]["url"]
    channel = data["incoming_webhook"]["channel"]

    # Persist webhook URL to user record
    user_service.update_slack_webhook(user_id, webhook_url)

    # Redirect back to frontend profile page with success indicator
    return RedirectResponse(
        f"{settings.frontend_url}/profile?slack=connected&channel={channel}"
    )


# ---------------------------
# Status — is Slack connected for this user?
# ---------------------------
@router.get("/status")
def slack_status(current_user: User = Depends(get_current_user)):
    return {"connected": bool(current_user.slack_webhook_url)}


# ---------------------------
# Disconnect — remove webhook from user record
# ---------------------------
@router.delete("/disconnect")
def slack_disconnect(
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    user_service.update_slack_webhook(str(current_user.id), None)
    return {"message": "Slack disconnected"}