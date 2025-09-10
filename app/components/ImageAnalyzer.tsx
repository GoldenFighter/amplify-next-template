'use client';

import React, { useState } from 'react';
import { Button } from '@aws-amplify/ui-react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { uploadData, getUrl } from 'aws-amplify/storage';
import { analyzeImage as analyzeImageFunction, type ImageAnalysisResult } from '@/lib/imageAnalysis';

// Type for the Claude analysis result (matching the Lambda response)
interface ClaudeAnalysisResult {
  objects?: Array<{
    name: string;
    confidence: number;
    description: string;
  }>;
  scene?: {
    description: string;
    setting: string;
    mood: string;
  };
  text?: {
    detected: boolean;
    content: string;
    language: string;
  };
  colors?: {
    dominant: string[];
    palette: string[];
  };
  composition?: {
    ruleOfThirds: boolean;
    symmetry: boolean;
    leadingLines: boolean;
  };
  technical?: {
    quality: string;
    lighting: string;
    focus: string;
  };
  summary: string;
  tags: string[];
  metadata?: {
    estimatedDate: string;
    location: string;
    camera: string;
  };
}

// Using imported ImageAnalysisResult type from lib/imageAnalysis

interface ImageAnalyzerProps {
  onAnalysisComplete?: (result: ImageAnalysisResult) => void;
  analysisType?: 'general' | 'document' | 'art' | 'product' | 'medical';
  documentType?: string;
  expectedFields?: string[];
  specificQuestions?: string[];
}

interface StructuredAnalysisForm {
  analysisType: 'general' | 'document' | 'art' | 'product' | 'medical';
  documentType: string;
  expectedFields: string[];
  specificQuestions: string[];
  useStructuredResponse: boolean;
}

export default function ImageAnalyzer({
  onAnalysisComplete,
  analysisType = 'general',
  documentType,
  expectedFields,
  specificQuestions,
}: ImageAnalyzerProps) {
  // Get authentication state
  const { user } = useAuthenticator();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [structuredForm, setStructuredForm] = useState<StructuredAnalysisForm>({
    analysisType: 'general',
    documentType: '',
    expectedFields: [''],
    specificQuestions: [''],
    useStructuredResponse: false,
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      // Use the same pattern as the existing ImageUpload component
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop();
      const imageKey = `contest-submissions/image-analysis/${timestamp}-${randomId}.${fileExtension}`;
      
      const result = await uploadData({
        path: imageKey,
        data: file,
        options: {
          contentType: file.type,
        },
      }).result;

      // Get the public URL for the uploaded file
      const urlResult = await getUrl({
        path: result.path,
        options: {
          expiresIn: 3600, // 1 hour
        },
      });

      return urlResult.url.toString();
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  };

  const handleStructuredFormChange = (field: keyof StructuredAnalysisForm, value: any) => {
    setStructuredForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const addExpectedField = () => {
    setStructuredForm(prev => ({
      ...prev,
      expectedFields: [...prev.expectedFields, ''],
    }));
  };

  const removeExpectedField = (index: number) => {
    setStructuredForm(prev => ({
      ...prev,
      expectedFields: prev.expectedFields.filter((_, i) => i !== index),
    }));
  };

  const updateExpectedField = (index: number, value: string) => {
    setStructuredForm(prev => ({
      ...prev,
      expectedFields: prev.expectedFields.map((field, i) => i === index ? value : field),
    }));
  };

  const addSpecificQuestion = () => {
    setStructuredForm(prev => ({
      ...prev,
      specificQuestions: [...prev.specificQuestions, ''],
    }));
  };

  const removeSpecificQuestion = (index: number) => {
    setStructuredForm(prev => ({
      ...prev,
      specificQuestions: prev.specificQuestions.filter((_, i) => i !== index),
    }));
  };

  const updateSpecificQuestion = (index: number, value: string) => {
    setStructuredForm(prev => ({
      ...prev,
      specificQuestions: prev.specificQuestions.map((question, i) => i === index ? value : question),
    }));
  };

  const performImageAnalysis = async (imageUrl: string) => {
    try {
      // Use the structured form data if enabled, otherwise use props
      const analysisOptions = structuredForm.useStructuredResponse ? {
        analysisType: structuredForm.analysisType,
        documentType: structuredForm.documentType || undefined,
        expectedFields: structuredForm.expectedFields.filter(field => field.trim() !== ''),
        specificQuestions: structuredForm.specificQuestions.filter(question => question.trim() !== ''),
      } : {
        analysisType,
        documentType,
        expectedFields,
        specificQuestions,
      };

      const result = await analyzeImageFunction(imageUrl, analysisOptions);
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

      // Analyze the image with metadata
      const result = await performImageAnalysis(imageUrl);
      console.log('Analysis result received:', JSON.stringify(result, null, 2));
      
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

  const formatAnalysisResult = (data: ClaudeAnalysisResult) => {
    const currentAnalysisType = structuredForm.useStructuredResponse ? structuredForm.analysisType : analysisType;
    const currentDocumentType = structuredForm.useStructuredResponse ? structuredForm.documentType : documentType;

    if (currentAnalysisType === 'document' || currentDocumentType) {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="font-semibold text-blue-800 mb-2">📄 Document Analysis Results</h3>
            <div className="text-sm text-blue-700">
              <div><strong>Document Type:</strong> {currentDocumentType || 'General Document'}</div>
              <div><strong>Analysis Type:</strong> {currentAnalysisType}</div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">📋 Summary</h3>
            <p className="bg-gray-50 p-3 rounded-md">{data.summary}</p>
          </div>

          {data.text?.detected && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">📝 Extracted Text</h3>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="whitespace-pre-wrap">{data.text.content}</p>
                <p className="text-sm text-gray-600 mt-2">Language: {data.text.language}</p>
              </div>
            </div>
          )}

          {/* Show structured data if available */}
          {data.objects && data.objects.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">🎯 Detected Elements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.objects.map((obj, index: number) => (
                  <div key={index} className="bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="font-medium text-green-800">{obj.name}</div>
                    <div className="text-sm text-green-600">Confidence: {(obj.confidence * 100).toFixed(1)}%</div>
                    {obj.description && <div className="text-sm text-gray-600 mt-1">{obj.description}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">🏷️ Tags</h3>
            <div className="flex flex-wrap gap-2">
              {data.tags?.map((tag: string, index: number) => (
                <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">🔍 Raw Analysis Data</h3>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <h3 className="font-semibold text-green-800 mb-2">🎨 General Analysis Results</h3>
          <div className="text-sm text-green-700">
            <div><strong>Analysis Type:</strong> {currentAnalysisType}</div>
            {structuredForm.useStructuredResponse && (
              <div><strong>Structured Response:</strong> Enabled</div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">📋 Summary</h3>
          <p className="bg-gray-50 p-3 rounded-md">{data.summary}</p>
        </div>

        {data.objects && data.objects.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">🎯 Objects Detected</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {data.objects.map((obj, index: number) => (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="font-medium text-blue-800">{obj.name}</div>
                  <div className="text-sm text-blue-600">Confidence: {(obj.confidence * 100).toFixed(1)}%</div>
                  {obj.description && <div className="text-sm text-gray-600 mt-1">{obj.description}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.scene && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">🌅 Scene Description</h3>
            <div className="bg-gray-50 p-3 rounded-md">
              <p><strong>Description:</strong> {data.scene.description}</p>
              {data.scene.setting && <p><strong>Setting:</strong> {data.scene.setting}</p>}
              {data.scene.mood && <p><strong>Mood:</strong> {data.scene.mood}</p>}
            </div>
          </div>
        )}

        {data.colors && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">🎨 Colors</h3>
            <div className="bg-gray-50 p-3 rounded-md">
              {data.colors.dominant && data.colors.dominant.length > 0 && (
                <div className="mb-2">
                  <strong>Dominant Colors:</strong>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {data.colors.dominant.map((color, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-200 rounded text-sm">{color}</span>
                    ))}
                  </div>
                </div>
              )}
              {data.colors.palette && data.colors.palette.length > 0 && (
                <div>
                  <strong>Color Palette:</strong>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {data.colors.palette.map((color, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-200 rounded text-sm">{color}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {data.tags && data.tags.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">🏷️ Tags</h3>
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag: string, index: number) => (
                <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.text?.detected && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">📝 Text Detected</h3>
            <div className="bg-gray-50 p-3 rounded-md">
              <p>{data.text.content}</p>
              <p className="text-sm text-gray-600 mt-2">Language: {data.text.language}</p>
            </div>
          </div>
        )}

        {data.technical && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">⚙️ Technical Details</h3>
            <div className="bg-gray-50 p-3 rounded-md">
              {data.technical.quality && <p><strong>Quality:</strong> {data.technical.quality}</p>}
              {data.technical.lighting && <p><strong>Lighting:</strong> {data.technical.lighting}</p>}
              {data.technical.focus && <p><strong>Focus:</strong> {data.technical.focus}</p>}
            </div>
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
        <div className="mt-2 text-sm text-gray-500">
          Logged in as: {user.signInDetails?.loginId || user.username}
        </div>
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

      {/* Structured Analysis Options */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Structured Analysis Options</h3>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={structuredForm.useStructuredResponse}
              onChange={(e) => handleStructuredFormChange('useStructuredResponse', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Enable structured response</span>
          </label>
        </div>

        {structuredForm.useStructuredResponse && (
          <div className="space-y-4">
            {/* Analysis Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Analysis Type
              </label>
              <select
                value={structuredForm.analysisType}
                onChange={(e) => handleStructuredFormChange('analysisType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">General Analysis</option>
                <option value="document">Document Analysis</option>
                <option value="art">Art Analysis</option>
                <option value="product">Product Analysis</option>
                <option value="medical">Medical Analysis</option>
              </select>
            </div>

            {/* Document Type */}
            {structuredForm.analysisType === 'document' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <input
                  type="text"
                  value={structuredForm.documentType}
                  onChange={(e) => handleStructuredFormChange('documentType', e.target.value)}
                  placeholder="e.g., invoice, contract, form, receipt"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Expected Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Fields to Extract
              </label>
              {structuredForm.expectedFields.map((field, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={field}
                    onChange={(e) => updateExpectedField(index, e.target.value)}
                    placeholder="e.g., name, amount, date, signature"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeExpectedField(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addExpectedField}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + Add Field
              </button>
            </div>

            {/* Specific Questions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specific Questions
              </label>
              {structuredForm.specificQuestions.map((question, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => updateSpecificQuestion(index, e.target.value)}
                    placeholder="e.g., What is the total amount? Who is the recipient?"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpecificQuestion(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSpecificQuestion}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + Add Question
              </button>
            </div>

            {/* Preview of what will be sent */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Analysis Parameters Preview:</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div><strong>Type:</strong> {structuredForm.analysisType}</div>
                {structuredForm.documentType && <div><strong>Document Type:</strong> {structuredForm.documentType}</div>}
                {structuredForm.expectedFields.filter(f => f.trim()).length > 0 && (
                  <div><strong>Expected Fields:</strong> {structuredForm.expectedFields.filter(f => f.trim()).join(', ')}</div>
                )}
                {structuredForm.specificQuestions.filter(q => q.trim()).length > 0 && (
                  <div><strong>Questions:</strong> {structuredForm.specificQuestions.filter(q => q.trim()).join(', ')}</div>
                )}
              </div>
            </div>
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
            Timestamp: {new Date(analysisResult.timestamp || '').toLocaleString()} |
            Success: {analysisResult.success ? 'Yes' : 'No'}
          </div>

          {analysisResult.success && analysisResult.data && formatAnalysisResult(analysisResult.data)}
          {!analysisResult.success && analysisResult.error && (
            <div className="text-red-600">
              <strong>Error:</strong> {analysisResult.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
