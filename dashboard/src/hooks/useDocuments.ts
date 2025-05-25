import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Document, DocumentUploadRequest, DocumentUploadResponse } from './types';

interface DocumentsState {
  documents: Document[];
  loading: boolean;
  uploading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Custom hook for managing documents (list and upload)
 */
export function useDocuments() {
  const [state, setState] = useState<DocumentsState>({
    documents: [],
    loading: true,
    uploading: false,
    error: null,
    hasMore: false
  });

  // Fetch documents
  const fetchDocuments = useCallback(async (cursor?: string, append = false) => {
    try {
      console.log('🔄 useDocuments: Fetching documents...', { cursor, append });
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await api.documents.listDocuments({
        limit: 20,
        cursor
      });
      console.log('✅ useDocuments: Documents fetched successfully', { count: response.documents ? response.documents.length : 0 });

      setState(prev => ({
        ...prev,
        documents: append ? [...prev.documents, ...response.documents] : response.documents,
        hasMore: response.has_more,
        nextCursor: response.next_cursor,
        loading: false
      }));

    } catch (error) {
      console.error('❌ useDocuments: Failed to fetch documents:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load documents',
        loading: false
      }));
    }
  }, []);

  // Load more documents
  const loadMore = useCallback(() => {
    if (state.hasMore && state.nextCursor && !state.loading) {
      fetchDocuments(state.nextCursor, true);
    }
  }, [state.hasMore, state.nextCursor, state.loading, fetchDocuments]);

  // Upload document
  const uploadDocument = useCallback(async (file: File, metadata: DocumentUploadRequest): Promise<DocumentUploadResponse | null> => {
    try {
      setState(prev => ({ ...prev, uploading: true, error: null }));

      const response = await api.documents.uploadDocument(file, metadata);

      // Refresh documents list after successful upload
      await fetchDocuments();

      setState(prev => ({ ...prev, uploading: false }));
      return response;

    } catch (error) {
      console.error('Failed to upload document:', error);
      setState(prev => ({
        ...prev,
        uploading: false,
        error: error instanceof Error ? error.message : 'Failed to upload document'
      }));
      return null;
    }
  }, [fetchDocuments]);

  // Delete document
  const deleteDocument = useCallback(async (documentId: string): Promise<boolean> => {
    try {
      await api.documents.deleteDocument(documentId);
      
      // Remove from local state
      setState(prev => ({
        ...prev,
        documents: prev.documents.filter(doc => doc.id !== documentId)
      }));

      return true;
    } catch (error) {
      console.error('Failed to delete document:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete document'
      }));
      return false;
    }
  }, []);

  // Process document
  const processDocument = useCallback(async (documentId: string): Promise<boolean> => {
    try {
      await api.documents.processDocument(documentId);
      
      // Update document status in local state
      setState(prev => ({
        ...prev,
        documents: prev.documents.map(doc => 
          doc.id === documentId 
            ? { ...doc, processing_status: 'processing' }
            : doc
        )
      }));

      return true;
    } catch (error) {
      console.error('Failed to process document:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to process document'
      }));
      return false;
    }
  }, []);

  // Search documents
  const searchDocuments = useCallback(async (query: string): Promise<Document[]> => {
    try {
      const response = await api.documents.searchDocuments({ query, limit: 50 });
      return response.documents;
    } catch (error) {
      console.error('Failed to search documents:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to search documents'
      }));
      return [];
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, []);

  return {
    documents: state.documents,
    loading: state.loading,
    uploading: state.uploading,
    error: state.error,
    hasMore: state.hasMore,
    uploadDocument,
    deleteDocument,
    processDocument,
    searchDocuments,
    loadMore,
    refresh: () => fetchDocuments()
  };
} 