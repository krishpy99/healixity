from fastapi import APIRouter, HTTPException
from app.services import metrics_service
from app.models.metrics import RecoveryDataPoint
from typing import List

router = APIRouter()


@router.get("/chart", response_model=List[RecoveryDataPoint])
def get_recovery_chart():
    """
    Get recovery chart data for the last 7 days.
    """
    return metrics_service.get_recovery_chart_data() 