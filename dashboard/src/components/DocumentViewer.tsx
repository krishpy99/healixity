import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Loader2, Download, X, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
  getDocumentViewURL: (documentId: string) => Promise<any>;
}

interface DocumentViewData {
  document_id: string;
  view_url: string;
  content_type: string;
  file_name: string;
  title: string;
  expires_in: number;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  isOpen,
  onClose,
  documentId,
  getDocumentViewURL,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentData, setDocumentData] = useState<DocumentViewData | null>(null);

  useEffect(() => {
    if (isOpen && documentId) {
      loadDocument();
    } else {
      // Reset state when modal closes
      setDocumentData(null);
      setError(null);
    }
  }, [isOpen, documentId]);

  const loadDocument = async () => {
    if (!documentId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getDocumentViewURL(documentId);
      if (data) {
        setDocumentData(data);
      } else {
        setError('Failed to load document');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (documentData?.view_url) {
      const link = document.createElement('a');
      link.href = documentData.view_url;
      link.download = documentData.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderDocumentContent = () => {
    if (!documentData) return null;

    const { content_type, view_url, file_name } = documentData;

    // PDF viewer
    if (content_type === 'application/pdf') {
      return (
        <div className="w-full h-[70vh] border rounded-md overflow-hidden">
          <iframe
            src={view_url}
            className="w-full h-full"
            title={file_name}
            style={{ border: 'none' }}
          />
        </div>
      );
    }

    // Text files
    if (content_type.startsWith('text/')) {
      return (
        <div className="w-full h-[70vh] border rounded-md overflow-hidden">
          <iframe
            src={view_url}
            className="w-full h-full p-4"
            title={file_name}
            style={{ border: 'none' }}
          />
        </div>
      );
    }

    // Image files
    if (content_type.startsWith('image/')) {
      return (
        <div className="w-full max-h-[70vh] border rounded-md overflow-hidden flex items-center justify-center">
          <img
            src={view_url}
            alt={file_name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }

    // Unsupported file type
    return (
      <div className="w-full h-[70vh] border rounded-md flex flex-col items-center justify-center text-muted-foreground">
        <FileText className="h-16 w-16 mb-4" />
        <p className="text-lg font-medium mb-2">Preview not available</p>
        <p className="text-sm mb-4">This file type cannot be previewed in the browser.</p>
        <Button onClick={handleDownload} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download to view
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate pr-4">
              {documentData?.title || 'Loading...'}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-shrink-0 mr-5">
              {documentData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  title="Download document"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {documentData && (
            <p className="text-sm text-muted-foreground">
              {documentData.file_name} • {documentData.content_type}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-[70vh]">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading document...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-[70vh]">
              <Alert className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {!loading && !error && documentData && renderDocumentContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentViewer; 