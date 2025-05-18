from fastapi import APIRouter

from app.api.v1.endpoints import metrics, recovery, chat, documents

api_router = APIRouter()

api_router.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
api_router.include_router(recovery.router, prefix="/recovery", tags=["recovery"])
api_router.include_router(chat.router, prefix="/chat-messages", tags=["chat"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"]) 