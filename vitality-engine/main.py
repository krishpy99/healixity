import uvicorn
from app.core.config import settings
from app.api.api import app

if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
