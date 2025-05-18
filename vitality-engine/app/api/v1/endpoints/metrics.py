from fastapi import APIRouter, HTTPException
from app.services import metrics_service
from app.models.metrics import Metrics

router = APIRouter()


@router.get("/", response_model=Metrics)
def get_metrics():
    """
    Get user health metrics.
    """
    return metrics_service.get_metrics() 