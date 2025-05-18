from typing import List
from datetime import datetime
from app.models.document import Document, DocumentCreate

# Mock database
documents = []


def get_all_documents() -> List[Document]:
    return documents


def create_document(document: DocumentCreate) -> Document:
    new_document = Document(
        id=f"doc_{len(documents) + 1}",
        title=document.title,
        content=document.content,
        timestamp=datetime.now()
    )
    
    documents.append(new_document)
    return new_document 