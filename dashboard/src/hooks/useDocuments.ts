import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Document, DocumentUploadRequest, DocumentUploadResponse } from './types';

interface DocumentsState {
  documents: Document[];
  recentDocuments: Document[];
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
    recentDocuments: [],
    loading: true,
    uploading: false,
    error: null,
    hasMore: false
  });

  // Fetch recent documents (top 5)
  const fetchRecentDocuments = useCallback(async () => {
    try {
      console.log('🔄 useDocuments: Fetching recent documents...');
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await api.documents.listDocuments({
        limit: 5
      });
      console.log('✅ useDocuments: Recent documents fetched successfully', { count: response.documents ? response.documents.length : 0 });

      setState(prev => ({
        ...prev,
        recentDocuments: response.documents || [],
        loading: false
      }));

    } catch (error) {
      console.error('❌ useDocuments: Failed to fetch recent documents:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load documents',
        loading: false
      }));
    }
  }, []);

  // Fetch all documents (for modal)
  const fetchAllDocuments = useCallback(async (cursor?: string, append = false) => {
    try {
      console.log('🔄 useDocuments: Fetching all documents...', { cursor, append });
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await api.documents.listDocuments({
        limit: 20,
        cursor
      });
      console.log('✅ useDocuments: All documents fetched successfully', { count: response.documents ? response.documents.length : 0 });

      setState(prev => ({
        ...prev,
        documents: append ? [...prev.documents, ...response.documents] : response.documents,
        hasMore: response.has_more,
        nextCursor: response.next_cursor,
        loading: false
      }));

    } catch (error) {
      console.error('❌ useDocuments: Failed to fetch all documents:', error);
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
      fetchAllDocuments(state.nextCursor, true);
    }
  }, [state.hasMore, state.nextCursor, state.loading, fetchAllDocuments]);

  // Upload document
  const uploadDocument = useCallback(async (file: File, metadata: DocumentUploadRequest): Promise<DocumentUploadResponse | null> => {
    try {
      setState(prev => ({ ...prev, uploading: true, error: null }));

      const response = await api.documents.uploadDocument(file, metadata);

      // Refresh recent documents list after successful upload
      await fetchRecentDocuments();

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
  }, [fetchRecentDocuments]);

  // Delete document
  const deleteDocument = useCallback(async (documentId: string): Promise<boolean> => {
    try {
      await api.documents.deleteDocument(documentId);
      
      // Remove from both local states
      setState(prev => ({
        ...prev,
        documents: prev.documents.filter(doc => doc.document_id !== documentId),
        recentDocuments: prev.recentDocuments.filter(doc => doc.document_id !== documentId)
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
      
      // Update document status in both local states
      setState(prev => ({
        ...prev,
        documents: prev.documents.map(doc => 
          doc.document_id === documentId 
            ? { ...doc, status: 'processing' }
            : doc
        ),
        recentDocuments: prev.recentDocuments.map(doc => 
          doc.document_id === documentId 
            ? { ...doc, status: 'processing' }
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

  // Retry document processing
  const retryProcessDocument = useCallback(async (documentId: string): Promise<boolean> => {
    try {
      await api.documents.retryProcessDocument(documentId);
      
      // Update document status in both local states
      setState(prev => ({
        ...prev,
        documents: prev.documents.map(doc => 
          doc.document_id === documentId 
            ? { ...doc, status: 'processing', error_message: '' }
            : doc
        ),
        recentDocuments: prev.recentDocuments.map(doc => 
          doc.document_id === documentId 
            ? { ...doc, status: 'processing', error_message: '' }
            : doc
        )
      }));

      return true;
    } catch (error) {
      console.error('Failed to retry document processing:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to retry document processing'
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

  // Get document view URL
  const getDocumentViewURL = useCallback(async (documentId: string) => {
    try {
      const response = await api.documents.getDocumentViewURL(documentId);
      return response;
    } catch (error) {
      console.error('Failed to get document view URL:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get document view URL'
      }));
      return null;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchRecentDocuments();
  }, [fetchRecentDocuments]);

  return {
    documents: state.documents,
    recentDocuments: state.recentDocuments,
    loading: state.loading,
    uploading: state.uploading,
    error: state.error,
    hasMore: state.hasMore,
    uploadDocument,
    deleteDocument,
    processDocument,
    retryProcessDocument,
    searchDocuments,
    getDocumentViewURL,
    loadMore,
    fetchAllDocuments,
    refresh: () => fetchRecentDocuments()
  };
} 