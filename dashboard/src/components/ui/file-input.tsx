import React, { useState } from "react";
import { Input } from "./input";
import { Button } from "./button";
import { XIcon } from "lucide-react";

interface FileInputProps {
  onFileChange: (file: File | null) => void;
  accept?: string;
  maxSize?: number; // in MB
  showAcceptedTypes?: boolean;
  acceptedTypesLabel?: string;
}

export function FileInput({ 
  onFileChange, 
  accept = "*/*", 
  maxSize = 5, 
  showAcceptedTypes = false,
  acceptedTypesLabel = ""
}: FileInputProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    
    if (!file) {
      setSelectedFile(null);
      setError(null);
      onFileChange(null);
      return;
    }
    
    // Check file size
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      setSelectedFile(null);
      onFileChange(null);
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    onFileChange(file);
  };
  
  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
    onFileChange(null);
  };
  
  // Format filename to shorten if too long
  const formatFileName = (name: string): string => {
    if (name.length <= 30) return name;
    
    const extension = name.split('.').pop() || '';
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    
    if (nameWithoutExt.length <= 25) return name;
    
    return `${nameWithoutExt.substring(0, 12)}...${nameWithoutExt.substring(nameWithoutExt.length - 8)}.${extension}`;
  };
  
  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
        />
        <div className="border border-input bg-background rounded-md px-3 py-2 text-sm flex items-center overflow-hidden hover:bg-muted/50 transition-colors cursor-pointer">
          <span className="truncate flex-1 mr-2" title={selectedFile?.name}>
            {selectedFile ? formatFileName(selectedFile.name) : "Choose file..."}
          </span>
          {selectedFile && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {showAcceptedTypes && acceptedTypesLabel && (
        <p className="text-xs text-muted-foreground">{acceptedTypesLabel}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
} 