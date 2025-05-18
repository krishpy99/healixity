from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DocumentBase(BaseModel):
    title: str
    content: str


class DocumentCreate(DocumentBase):
    pass


class Document(DocumentBase):
    id: str
    timestamp: datetime
    
    class Config:
        from_attributes = True 