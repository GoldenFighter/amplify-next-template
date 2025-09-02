'use client';

import React, { useState } from 'react';
import { Button } from '@aws-amplify/ui-react';
import { uploadData } from 'aws-amplify/storage';

interface ImageAnalysisResult {
  success: boolean;
  data?: any;
  error?: string;
  analysisType?: string;
  timestamp?: string;
}

interface ImageAnalyzerProps {
  onAnalysisComplete?: (result: ImageAnalysisResult) => void;
  analysisType?: 'general' | 'document' | 'art' | 'product' | 'medical';
  documentType?: string;
  expectedFields?: string[];
  specificQuestions?: string[];
}

export default function ImageAnalyzer({
  onAnalysisComplete,
  analysisType = 'general',
  documentType,
  expectedFields,
  specificQuestions,
}: ImageAnalyzerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      setError(null);
      setAnalysisResult(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      const fileName = `image-analysis/${Date.now()}-${file.name}`;
      
      const result = await uploadData({
        key: fileName,
        data: file,
        options: {
          contentType: file.type,
        },
      }).result;

      // Return the full S3 URL
      return `https://${result.bucket}.s3.${result.region}.amazonaws.com/${result.key}`;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  };

  const analyzeImage = async (imageUrl: string) => {
    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          analysisType,
          documentType,
          expectedFields,
          specificQuestions,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed');
      }

      return result;
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw error;
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select an image file first');
      return;
    }

    setIsUploading(true);
    setIsAnalyzing(true);
    setError(null);

    try {
      // Upload image to S3
      const imageUrl = await uploadImage(selectedFile);

      // Analyze the image
      const result = await analyzeImage(imageUrl);
      
      setAnalysisResult(result);
      onAnalysisComplete?.(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Analysis error:', error);
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  const formatAnalysisResult = (data: any) => {
    if (analysisType === 'document' || documentType) {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Document Type:</h3>
            <p>{data.documentType}</p>
          </div>
          <div>
            <h3 className="font-semibold">Confidence:</h3>
            <p>{(data.confidence * 100).toFixed(1)}%</p>
          </div>
          <div>
            <h3 className="font-semibold">Extracted Data:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(data.extractedData, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="font-semibold">Text Content:</h3>
            <p className="whitespace-pre-wrap">{data.textContent}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">Summary:</h3>
          <p>{data.summary}</p>
        </div>
        <div>
          <h3 className="font-semibold">Objects Detected:</h3>
          <ul className="list-disc list-inside">
            {data.objects?.map((obj: any, index: number) => (
              <li key={index}>
                {obj.name} ({(obj.confidence * 100).toFixed(1)}% confidence)
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">Scene Description:</h3>
          <p>{data.scene?.description}</p>
        </div>
        <div>
          <h3 className="font-semibold">Tags:</h3>
          <div className="flex flex-wrap gap-2">
            {data.tags?.map((tag: string, index: number) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>
        {data.text?.detected && (
          <div>
            <h3 className="font-semibold">Text Detected:</h3>
            <p>{data.text.content}</p>
            <p className="text-sm text-gray-600">Language: {data.text.language}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Image Analysis with Claude 3.5 Sonnet</h2>
        <p className="text-gray-600">
          Upload an image to get detailed analysis including object detection, scene understanding, and more.
        </p>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <div className="text-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Select Image
          </label>
          <p className="mt-2 text-sm text-gray-500">
            Supports JPEG, PNG, GIF, WebP (max 10MB)
          </p>
        </div>

        {imagePreview && (
          <div className="mt-4">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-full h-64 object-contain mx-auto rounded"
            />
          </div>
        )}

        {selectedFile && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
            <Button
              onClick={handleAnalyze}
              disabled={isUploading || isAnalyzing}
              className="mt-2"
              variation="primary"
            >
              {isUploading ? 'Uploading...' : isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {analysisResult && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <h3 className="font-semibold text-green-800 mb-2">Analysis Results</h3>
          <div className="text-sm text-green-700 mb-2">
            Analysis Type: {analysisResult.analysisType} | 
            Timestamp: {new Date(analysisResult.timestamp || '').toLocaleString()}
          </div>
          {analysisResult.data && formatAnalysisResult(analysisResult.data)}
        </div>
      )}
    </div>
  );
}
