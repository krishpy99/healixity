import random
from app.models.metrics import Metrics
from datetime import datetime, timedelta
from typing import List
from app.models.metrics import RecoveryDataPoint


def get_metrics() -> Metrics:
    """Get random health metrics for the user."""
    return Metrics(
        recovery_score=random.randint(70, 95),
        mobility_score=random.randint(60, 90),
        pain_level=random.randint(1, 5),
        exercises_completed=random.randint(3, 15),
        streak_days=random.randint(1, 10)
    )


def get_recovery_chart_data() -> List[RecoveryDataPoint]:
    """Get historical recovery chart data for the last 7 days."""
    today = datetime.now()
    data = []
    
    for i in range(7):
        date = today - timedelta(days=6-i)
        data.append(RecoveryDataPoint(
            date=date.strftime("%Y-%m-%d"),
            score=random.randint(65, 95)
        ))
    
    return data 