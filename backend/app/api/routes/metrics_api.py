from fastapi import APIRouter, Depends
from services.metrics_service import MetricsService
from dependencies.dependencies import get_metrics_service

router = APIRouter()

@router.get("")
def get_metrics(service: MetricsService = Depends(get_metrics_service)):
    return service.get_metrics()