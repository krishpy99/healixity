import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { FileInput } from "./ui/file-input";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2, CheckCircle, FileText, Trash2, Eye } from "lucide-react";
import { useDocuments } from "@/hooks";
import { DocumentUploadRequest } from "@/hooks/types";
import { config } from "@/lib/config";

const DocumentUpload: React.FC = () => {
  const { 
    documents, 
    loading, 
    uploading, 
    error, 
    uploadDocument,
    deleteDocument,
    processDocument
  } = useDocuments();
  
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<DocumentUploadRequest>({
    title: '',
    category: '',
    description: ''
  });
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    if (selectedFile) {
      // Auto-populate title with filename
      setMetadata(prev => ({
        ...prev,
        title: prev.title || selectedFile.name.replace(/\.[^/.]+$/, "")
      }));
    }
    setUploadSuccess(false);
  };

  const handleUpload = async () => {
    if (!file || !metadata.title || !metadata.category) return;
    
    const result = await uploadDocument(file, metadata);
    if (result) {
      setFile(null);
      setMetadata({ title: '', category: '', description: '' });
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(documentId);
    }
  };

  const handleProcess = async (documentId: string) => {
    await processDocument(documentId);
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
    } catch (error) {
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
  const getProcessingStatus = (processed: boolean | undefined, status?: string) => {
    if (processed === true) {
      return <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Processed</span>;
    }
    if (status === 'processing') {
      return <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Processing...</span>;
    }
    return <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">Pending</span>;
  };

  // Safe documents array with fallback
  const safeDocuments = Array.isArray(documents) ? documents : [];

  return (
    <Card className="shadow-md h-full">
      <CardHeader>
        <CardTitle>Document Upload</CardTitle>
        <CardDescription>
          Upload medical documents for AI analysis and record keeping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 w-full">
          <form onSubmit={(e) => {
            e.preventDefault();
            handleUpload();
          }}>
            <div className="space-y-3">
              <FileInput
                onFileChange={handleFileChange}
                accept={config.documents.allowedTypes.join(',')}
              />
              
              {file && (
                <>
                  <div>
                    <Label htmlFor="title">Document Title *</Label>
                    <Input
                      id="title"
                      value={metadata.title}
                      onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter document title"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <select 
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
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      value={metadata.description}
                      onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the document"
                    />
                  </div>
                </>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full mt-4"
              disabled={!file || !metadata.title || !metadata.category || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : "Upload Document"}
            </Button>
          </form>
        </div>

        {uploadSuccess && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>Document uploaded successfully!</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="bg-red-50 border-red-200 text-red-800">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div>
          <h3 className="text-sm font-medium mb-2">Your Documents</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : safeDocuments.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">No documents uploaded yet.</p>
            ) : (
              safeDocuments.map((doc) => (
                <div
                  key={doc?.id || Math.random().toString(36)}
                  className="flex items-center p-3 border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <FileText className={`h-8 w-8 mr-3 flex-shrink-0 ${getFileTypeColor(doc?.content_type)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc?.title || 'Untitled Document'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">
                        {formatFileSize(doc?.file_size)}
                      </span>
                      <span>•</span>
                      <span>{formatDate(doc?.upload_date)}</span>
                      <span>•</span>
                      <span className="capitalize">{(doc?.category || 'unknown').replace(/_/g, ' ')}</span>
                    </div>
                    <div className="mt-1">
                      {getProcessingStatus(doc?.processed, doc?.processing_status)}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!doc?.processed && doc?.id && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleProcess(doc.id)}
                        title="Process document"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                    {doc?.id && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                        title="Delete document"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentUpload;