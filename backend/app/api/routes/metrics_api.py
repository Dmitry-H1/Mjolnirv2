from pyexpat import model

from fastapi import APIRouter, Depends
from app.services.metrics_service import MetricsService
from app.dependencies.dependencies import get_metrics_service
from app.models.user import User
from app.dependencies.auth_dependencies import get_current_user

router = APIRouter()

@router.get("")
def get_metrics(
    service: MetricsService = Depends(get_metrics_service),
    user: User = Depends(get_current_user)
):
    return service.get_metrics(user.id)