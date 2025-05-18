from pydantic_settings import BaseSettings
import os
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "Vitality Engine API"
    API_V1_STR: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings() 