import { useState, useEffect, useCallback } from 'react';
import { get, post } from './api';
import { Document, DocumentUploadPayload } from './types';

/**
 * Custom hook for managing documents (list and upload)
 */
export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await get<Document[]>('/api/documents');
      setDocuments(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Upload document
  const uploadDocument = useCallback(async (file: File) => {
    if (!file) return;

    setUploading(true);
    setUploadSuccess(false);
    
    try {
      const payload: DocumentUploadPayload = {
        name: file.name,
        type: file.type,
        size: file.size
      };
      
      const newDocument = await post<Document, DocumentUploadPayload>('/api/documents', payload);
      
      // Update documents list with the new document
      setDocuments(prev => [newDocument, ...prev]);
      setUploadSuccess(true);
      setError(null);
      return newDocument;
    } catch (err) {
      console.error('Error uploading document:', err);
      setError('Failed to upload document');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { 
    documents, 
    loading, 
    uploading, 
    error, 
    uploadSuccess,
    uploadDocument,
    refreshDocuments: fetchDocuments
  };
} 