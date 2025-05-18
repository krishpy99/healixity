from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ChatMessageBase(BaseModel):
    content: str
    sender: str


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessage(ChatMessageBase):
    id: str
    timestamp: datetime
    
    class Config:
        from_attributes = True 