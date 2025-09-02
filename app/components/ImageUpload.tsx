"use client";

import { useState, useRef } from 'react';
import {
  Card,
  Flex,
  Heading,
  Text,
  Button,
  Alert,
  Badge,
  Divider,
} from '@aws-amplify/ui-react';
import { uploadData, getUrl } from 'aws-amplify/storage';
import { extractImageMetadata, ImageMetadata, validateImageForContest, getValidationReport } from '../../lib/imageMetadata';

interface ImageUploadProps {
  boardId: string;
  boardName: string;
  userEmail?: string;
  maxImageSize?: number;
  allowedImageTypes?: string[];
  onImageUploaded: (imageUrl: string, imageKey: string, imageSize: number, imageType: string, metadata?: ImageMetadata) => void;
  onError: (error: string) => void;
}

export default function ImageUpload({
  boardId,
  boardName,
  userEmail,
  maxImageSize = 5242880, // 5MB default
  allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'],
  onImageUploaded,
  onError,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; reasons: string[]; score: number } | null>(null);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxImageSize) {
      return `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxImageSize)})`;
    }

    // Check file type
    if (!allowedImageTypes.includes(file.type)) {
      return `File type (${file.type}) is not allowed. Allowed types: ${allowedImageTypes.join(', ')}`;
    }

    return null;
  };

  const handleFileSelect = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      onError(validationError);
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Extract and validate metadata
    try {
      const extractedMetadata = await extractImageMetadata(file);
      setMetadata(extractedMetadata);
      
      const validation = validateImageForContest(extractedMetadata, userEmail);
      setValidationResult(validation);
      
      if (!validation.isValid) {
        onError(`Image validation failed: ${validation.reasons.join(', ')}`);
      }
    } catch (error) {
      console.error('Error extracting metadata:', error);
      onError('Failed to analyze image metadata');
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique key for the image
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExtension = selectedFile.name.split('.').pop();
      const imageKey = `contest-submissions/${boardId}/${timestamp}-${randomId}.${fileExtension}`;

      // Upload to S3 using Amplify Gen2 Storage API
      const result = await uploadData({
        path: imageKey,
        data: selectedFile,
        options: {
          contentType: selectedFile.type,
          onProgress: (progress) => {
            if (progress.totalBytes) {
              const percentage = Math.round((progress.transferredBytes / progress.totalBytes) * 100);
              setUploadProgress(percentage);
            }
          },
        },
      }).result;

      // Get the public URL using the proper Amplify Gen2 Storage API
      let imageUrl: string;
      
      try {
        // Use getUrl to get the proper public URL for the uploaded file
        const urlResult = await getUrl({
          path: imageKey,
          options: {
            expiresIn: 3600, // URL expires in 1 hour
          },
        });
        imageUrl = urlResult.url.toString();
      } catch (urlError) {
        console.warn('Could not get URL from Storage:', urlError);
        // Fallback: try to construct URL from upload result
        if (result && typeof result === 'object' && 'url' in result) {
          imageUrl = (result as any).url;
        } else {
          // Last resort: construct a placeholder URL
          imageUrl = `https://storage-url/${imageKey}`;
        }
      }

      // Extract image metadata
      const metadata = await extractImageMetadata(selectedFile);

      // Call the callback with upload details
      onImageUploaded(imageUrl, imageKey, selectedFile.size, selectedFile.type, metadata);

      // Reset state
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);

    } catch (error) {
      console.error('Error uploading image:', error);
      onError(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setMetadata(null);
    setValidationResult(null);
    setShowValidationDetails(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="w-full">
      <Flex direction="column" gap="1rem">
        <Heading level={5}>📸 Upload Image for Contest</Heading>
        
        <Text fontSize="0.875rem" color="gray-600">
          Upload an image for the "{boardName}" contest. The AI will evaluate your image based on the contest criteria.
        </Text>

        {/* File Requirements */}
        <div>
          <Text fontSize="0.75rem" fontWeight="medium" marginBottom="0.5rem">
            File Requirements:
          </Text>
          <Flex gap="0.5rem" wrap="wrap">
            <Badge variation="info" size="small">
              Max Size: {formatFileSize(maxImageSize)}
            </Badge>
            <Badge variation="info" size="small">
              Types: {allowedImageTypes.join(', ')}
            </Badge>
          </Flex>
        </div>

        <Divider />

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : selectedFile
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedImageTypes.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
          />

          {selectedFile ? (
            <Flex direction="column" alignItems="center" gap="1rem">
              {/* Image Preview */}
              {previewUrl && (
                <div className="max-w-xs">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-auto rounded-lg shadow-sm"
                  />
                </div>
              )}

              {/* File Info */}
              <div className="text-center">
                <Text fontSize="0.875rem" fontWeight="medium">
                  {selectedFile.name}
                </Text>
                <Text fontSize="0.75rem" color="gray-600">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </Text>
                
                {/* Validation Status */}
                {validationResult && (
                  <div className="mt-2">
                    <Badge 
                      variation={validationResult.isValid ? "success" : "error"} 
                      size="small"
                    >
                      {validationResult.isValid ? "✅ Valid" : "❌ Invalid"} ({validationResult.score}/100)
                    </Badge>
                    <button
                      onClick={() => setShowValidationDetails(!showValidationDetails)}
                      className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      {showValidationDetails ? "Hide Details" : "Show Details"}
                    </button>
                  </div>
                )}
              </div>

              {/* Validation Details */}
              {showValidationDetails && validationResult && metadata && (
                <div className="w-full max-w-xs text-left">
                  <Alert variation={validationResult.isValid ? "success" : "error"}>
                    <Text fontSize="0.75rem" whiteSpace="pre-line">
                      {getValidationReport(metadata, userEmail)}
                    </Text>
                  </Alert>
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="w-full max-w-xs">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <Text fontSize="0.75rem" color="gray-600" textAlign="center">
                    Uploading... {uploadProgress}%
                  </Text>
                </div>
              )}

              {/* Action Buttons */}
              <Flex gap="0.5rem">
                {!isUploading && (
                  <>
                    <Button
                      onClick={handleUpload}
                      variation="primary"
                      size="small"
                      isDisabled={!validationResult?.isValid}
                    >
                      Upload Image
                    </Button>
                    <Button
                      onClick={handleRemoveFile}
                      variation="link"
                      size="small"
                    >
                      Remove
                    </Button>
                  </>
                )}
              </Flex>
            </Flex>
          ) : (
            <Flex direction="column" alignItems="center" gap="1rem">
              <div className="text-4xl">📁</div>
              <div>
                <Text fontSize="1rem" fontWeight="medium">
                  {dragActive ? 'Drop your image here' : 'Drag & drop an image here'}
                </Text>
                <Text fontSize="0.875rem" color="gray-600">
                  or{' '}
                  <button
                    onClick={handleBrowseClick}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    browse files
                  </button>
                </Text>
              </div>
            </Flex>
          )}
        </div>

        {/* Upload Tips */}
        <Alert variation="info">
          <Text fontSize="0.75rem">
            💡 <strong>Requirements:</strong> Images must be taken from a phone camera within the last hour. 
            Stock photos and old images will be rejected. The AI will evaluate your image based on creativity, 
            technical skill, and adherence to contest requirements.
          </Text>
        </Alert>
      </Flex>
    </Card>
  );
}
