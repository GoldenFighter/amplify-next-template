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
import { uploadData, downloadData } from 'aws-amplify/storage';
import { extractImageMetadata, ImageMetadata } from '../../lib/imageMetadata';

interface ImageUploadProps {
  boardId: string;
  boardName: string;
  maxImageSize?: number;
  allowedImageTypes?: string[];
  onImageUploaded: (imageUrl: string, imageKey: string, imageSize: number, imageType: string, metadata?: ImageMetadata) => void;
  onError: (error: string) => void;
}

export default function ImageUpload({
  boardId,
  boardName,
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

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      onError(validationError);
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
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

      // Get the public URL using the new API
      const downloadResult = await downloadData({
        path: imageKey,
      }).result;

      // Extract the URL from the download result
      const imageUrl = downloadResult.toString();

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
              </div>

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
            💡 <strong>Tips:</strong> For best results, use high-quality images with good lighting. 
            The AI will evaluate your image based on creativity, technical skill, and adherence to contest requirements.
          </Text>
        </Alert>
      </Flex>
    </Card>
  );
}
