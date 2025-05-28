import React, { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { FileInput } from "./ui/file-input";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Loader2, CheckCircle, FileText, Trash2, Eye, MoreHorizontal, Settings, Upload } from "lucide-react";
import { useDocuments } from "@/hooks";
import { DocumentUploadRequest } from "@/hooks/types";
import type { Document } from "@/lib/api";
import { config } from "@/lib/config";
import DocumentViewer from "./DocumentViewer";

const DocumentUpload: React.FC = () => {
  const {
    recentDocuments,
    documents,
    loading,
    uploading,
    error,
    hasMore,
    uploadDocument,
    deleteDocument,
    retryProcessDocument,
    getDocumentViewURL,
    fetchAllDocuments,
    loadMore
  } = useDocuments();

  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<DocumentUploadRequest>({
    title: '',
    category: '',
    description: ''
  });
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    if (selectedFile) {
      // Auto-populate title with filename
      setMetadata(prev => ({
        ...prev,
        title: prev.title || selectedFile.name.replace(/\.[^/.]+$/, "")
      }));
      // Open modal after file is selected
      setUploadModalOpen(true);
    }
    setUploadSuccess(false);
    
    // Sync the hidden input with the selected file
    if (fileInputRef.current && selectedFile) {
      // Create a new FileList with the selected file
      const dt = new DataTransfer();
      dt.items.add(selectedFile);
      fileInputRef.current.files = dt.files;
    } else if (fileInputRef.current && !selectedFile) {
      // Clear the hidden input
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file || !metadata.title || !metadata.category) return;

    const result = await uploadDocument(file, metadata);
    if (result) {
      setFile(null);
      setMetadata({ title: '', category: '', description: '' });
      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        setUploadModalOpen(false);
      }, 2000);
    }
  };

  const handleUploadButtonClick = () => {
    // Directly trigger file picker without opening modal
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleModalClose = () => {
    setUploadModalOpen(false);
    // Reset form when modal closes
    setFile(null);
    setMetadata({ title: '', category: '', description: '' });
    setUploadSuccess(false);
    
    // Reset the hidden file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (documentId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(documentId);
    }
  };

  const handleRetry = async (documentId: string) => {
    await retryProcessDocument(documentId);
  };

  const handleView = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setViewerOpen(true);
  };

  const handleViewMore = async () => {
    setModalOpen(true);
    if (documents.length === 0) {
      setModalLoading(true);
      await fetchAllDocuments();
      setModalLoading(false);
    }
  };

  // Format file size with fallback
  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes || typeof bytes !== 'number') return "Unknown size";
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Format date with fallback
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Unknown date";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      console.warn('Failed to format date:', dateString);
      return "Invalid date";
    }
  };

  // Get file type icon color with fallback
  const getFileTypeColor = (contentType: string | undefined) => {
    if (!contentType) return 'text-gray-500';
    if (contentType.includes('pdf')) return 'text-red-500';
    if (contentType.includes('image')) return 'text-green-500';
    if (contentType.includes('text')) return 'text-blue-500';
    return 'text-gray-500';
  };

  // Get processing status badge with fallback
  const getProcessingStatus = (status: string | undefined) => {
    if (status === 'processed') {
      return <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Processed</span>;
    }
    if (status === 'processing') {
      return <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Processing...</span>;
    }
    if (status === 'failed') {
      return <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Failed</span>;
    }
    return <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Uploaded</span>;
  };

  // Document row component
  const DocumentRow = ({ doc, showActions = true }: { doc: Document, showActions?: boolean }) => (
    <div className="flex items-center p-2 border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
      <FileText className={`h-6 w-6 mr-2 flex-shrink-0 ${getFileTypeColor(doc?.content_type)}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{doc?.title || 'Untitled Document'}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">
            {formatFileSize(doc?.file_size)}
          </span>
          <span>•</span>
          <span>{formatDate(doc?.upload_time)}</span>
          <span>•</span>
          <span className="capitalize">{(doc?.category || 'unknown').replace(/_/g, ' ')}</span>
        </div>
        <div className="mt-1">
          {getProcessingStatus(doc?.status)}
        </div>
      </div>
      {showActions && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleView(doc.document_id)}
            title="View document"
          >
            <Eye className="h-3 w-3" />
          </Button>
          {doc?.status === 'failed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRetry(doc.document_id)}
              title="Retry processing"
            >
              <Settings className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(doc.document_id)}
            title="Delete document"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );

  // Safe documents array with fallback
  const safeRecentDocuments = Array.isArray(recentDocuments) ? recentDocuments : [];
  const safeAllDocuments = Array.isArray(documents) ? documents : [];

  return (
    <Card className="shadow-md h-full overflow-hidden">
      <CardHeader className="pb-1 pt-3 mt-3 mb-3">
        <CardTitle>Document Upload</CardTitle>
        <CardDescription>
          Upload medical documents for AI analysis and record keeping. Documents are automatically processed and indexed for search.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 p-2 flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          {/* Hidden file input for direct triggering */}
          <input
            ref={fileInputRef}
            type="file"
            accept={config.documents.allowedTypes.join(',')}
            onChange={(e) => {
              const selectedFile = e.target.files ? e.target.files[0] : null;
              handleFileChange(selectedFile);
            }}
            className="hidden"
          />
        </div>

        {error && (
          <Alert className="bg-red-50 border-red-200 text-red-800">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-1 pl-4 pr-4">
          <div className="flex items-center justify-between mb-0">
            <div className="flex flex-row w-full justify-between mr-3">
              <h3 className="text-sm font-medium">Recent Documents</h3>
              <Button
                size="sm"
                onClick={handleUploadButtonClick}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </div>
            {safeRecentDocuments.length > 0 && (
              <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleViewMore}
                    className="text-xs"
                  >
                    <MoreHorizontal className="h-3 w-3 mr-1" />
                    View All
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>All Documents</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                    {modalLoading ? (
                      <div className="flex justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : safeAllDocuments.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-8">No documents found.</p>
                    ) : (
                      <>
                        {safeAllDocuments.map((doc) => (
                          <DocumentRow key={doc?.document_id || Math.random().toString(36)} doc={doc} />
                        ))}
                        {hasMore && (
                          <div className="flex justify-center pt-4">
                            <Button
                              variant="outline"
                              onClick={loadMore}
                              disabled={loading}
                            >
                              {loading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Loading...
                                </>
                              ) : "Load More"}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : safeRecentDocuments.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm p-4">No documents uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {safeRecentDocuments.slice(0, 4).map((doc) => (
                <DocumentRow key={doc?.document_id || Math.random().toString(36)} doc={doc} />
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={(open) => {
        if (!open) {
          handleModalClose();
        } else {
          setUploadModalOpen(true);
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            handleUpload();
          }} className="space-y-4">
            <div>
              {/* Accepted file types info */}
              <div className="mb-3 p-3 bg-muted/50 rounded-md">
                <p className="text-xs text-muted-foreground">
                  <strong>Accepted file types:</strong> {config.documents.allowedTypes.map(type => {
                    if (type === 'application/pdf') return 'PDF';
                    if (type === 'text/plain') return 'Text';
                    if (type === 'text/markdown') return 'Markdown';
                    return type;
                  }).join(', ')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Max size:</strong> {Math.round(config.documents.maxFileSize / (1024 * 1024))}MB
                </p>
              </div>

              <FileInput
                onFileChange={handleFileChange}
                accept={config.documents.allowedTypes.join(',')}
                maxSize={config.documents.maxFileSize / (1024 * 1024)}
                showAcceptedTypes={false}
              />

              {/* Selected file display */}
              {file && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    <strong>Selected file:</strong> {file.name}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Size: {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>

            {file && (
              <>
                <div>
                  <Label htmlFor="modal-title">Document Title *</Label>
                  <Input
                    id="modal-title"
                    value={metadata.title}
                    onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter document title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="modal-category">Category *</Label>
                  <select
                    id="modal-category"
                    value={metadata.category}
                    onChange={(e) => setMetadata(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select category</option>
                    {config.documents.categories.map(category => (
                      <option key={category} value={category}>
                        {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Available categories: {config.documents.categories.map(cat =>
                      cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                    ).join(', ')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="modal-description">Description (Optional)</Label>
                  <Input
                    id="modal-description"
                    value={metadata.description}
                    onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the document"
                  />
                </div>
              </>
            )}

            {uploadSuccess && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>Document uploaded successfully! Processing will begin automatically.</AlertDescription>
              </Alert>
            )}

            {file && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleModalClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!file || !metadata.title || !metadata.category || uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : "Upload Document"}
                </Button>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Document Viewer Modal */}
      <DocumentViewer
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        documentId={selectedDocumentId}
        getDocumentViewURL={getDocumentViewURL}
      />
    </Card>
  );
};

export default DocumentUpload;