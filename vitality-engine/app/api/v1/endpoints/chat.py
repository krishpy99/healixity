from fastapi import APIRouter, HTTPException, status
from app.services import chat_service
from app.models.chat import ChatMessage, ChatMessageCreate
from typing import List

router = APIRouter()


@router.get("/", response_model=List[ChatMessage])
def get_chat_messages():
    """
    Retrieve all chat messages.
    """
    return chat_service.get_all_messages()


@router.post("/", response_model=ChatMessage, status_code=status.HTTP_201_CREATED)
def create_chat_message(message: ChatMessageCreate):
    """
    Create a new chat message.
    """
    return chat_service.create_message(message) 