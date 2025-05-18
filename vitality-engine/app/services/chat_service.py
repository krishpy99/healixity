from typing import List
from datetime import datetime
from app.models.chat import ChatMessage, ChatMessageCreate

# Mock database
chat_messages = []


def get_all_messages() -> List[ChatMessage]:
    return chat_messages


def create_message(message: ChatMessageCreate) -> ChatMessage:
    new_message = ChatMessage(
        id=f"msg_{len(chat_messages) + 1}",
        content=message.content,
        sender=message.sender,
        timestamp=datetime.now()
    )
    
    chat_messages.append(new_message)
    return new_message 