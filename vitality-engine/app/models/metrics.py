from pydantic import BaseModel


class Metrics(BaseModel):
    recovery_score: int
    mobility_score: int
    pain_level: int
    exercises_completed: int
    streak_days: int


class RecoveryDataPoint(BaseModel):
    date: str
    score: int


class RecoveryChartData(BaseModel):
    data: list[RecoveryDataPoint] 