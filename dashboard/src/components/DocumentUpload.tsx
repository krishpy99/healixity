import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { FileInput } from "./ui/file-input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2, CheckCircle, FileText } from "lucide-react";

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

const DocumentUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: "1",
      name: "Medical_Report_2023.pdf",
      type: "application/pdf",
      size: 2500000,
      uploadedAt: new Date(2023, 4, 15),
    },
    {
      id: "2",
      name: "Blood_Test_Results.pdf",
      type: "application/pdf",
      size: 1200000,
      uploadedAt: new Date(2023, 4, 10),
    },
    {
      id: "3",
      name: "Vaccination_Certificate.pdf",
      type: "application/pdf",
      size: 980000,
      uploadedAt: new Date(2023, 3, 22),
    },
  ]);

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    setUploadSuccess(false);
  };

  const handleUpload = () => {
    if (!file) return;

    setIsUploading(true);

    // Simulate upload
    setTimeout(() => {
      const newDocument: Document = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date(),
      };

      setDocuments((prev) => [newDocument, ...prev]);
      setIsUploading(false);
      setUploadSuccess(true);
      setFile(null);
    }, 2000);
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className="shadow-md h-full">
      <CardHeader>
        <CardTitle>Document Upload</CardTitle>
        <CardDescription>
          Upload your medical documents for record keeping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 w-full">
          <form onSubmit={(e) => {
            e.preventDefault();
            handleUpload();
          }}>
            <FileInput
              onFileChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            <Button 
              type="submit" 
              className="w-full mt-2"
              disabled={!file || isUploading}
              onClick={handleUpload}
            >
              {isUploading ? "Uploading..." : "Upload Document"}
            </Button>
          </form>
        </div>

        {uploadSuccess && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>Document uploaded successfully!</AlertDescription>
          </Alert>
        )}

        <div>
          <h3 className="text-sm font-medium mb-2">Recently Uploaded</h3>
          <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center p-2 border rounded-md bg-muted/30"
              >
                <FileText className="h-8 w-8 text-blue-500 mr-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <div className="flex text-xs text-muted-foreground">
                    <span className="truncate mr-2">
                      {formatFileSize(doc.size)}
                    </span>
                    <span>{formatDate(doc.uploadedAt)}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="flex-shrink-0">
                  View
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentUpload;