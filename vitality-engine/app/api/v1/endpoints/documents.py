from fastapi import APIRouter, HTTPException, status
from app.services import document_service
from app.models.document import Document, DocumentCreate
from typing import List

router = APIRouter()


@router.get("/", response_model=List[Document])
def get_documents():
    """
    Retrieve all documents.
    """
    return document_service.get_all_documents()


@router.post("/", response_model=Document, status_code=status.HTTP_201_CREATED)
def create_document(document: DocumentCreate):
    """
    Create a new document.
    """
    return document_service.create_document(document) 