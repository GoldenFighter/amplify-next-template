'use client';

import React, { useState } from 'react';
import { Button } from '@aws-amplify/ui-react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { uploadData, getUrl } from 'aws-amplify/storage';
import { analyzeImage as analyzeImageFunction, type ImageAnalysisResult } from '@/lib/imageAnalysis';
import RadarChart from './RadarChart';
import MUIRadarChart from './MUIRadarChart';

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
  const [radarScores, setRadarScores] = useState<{
    creativity: number;
    technical: number;
    composition: number;
    relevance: number;
    originality: number;
  } | null>(null);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(0);
  const [catJudgeMode, setCatJudgeMode] = useState<boolean>(false);
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
      let analysisOptions;
      
      if (catJudgeMode) {
        // Cat Judge Mode - hardcoded for cat photo judging
        analysisOptions = {
          analysisType: 'general' as const,
          documentType: undefined,
          expectedFields: [
            'cuteness_factor',
            'expression_quality', 
            'photo_technical_quality',
            'composition_appeal',
            'overall_charm'
          ],
          specificQuestions: [
            'How cute is this cat? Rate 1-10',
            'How expressive is the cat\'s face? Rate 1-10', 
            'How good is the photo quality? Rate 1-10',
            'How appealing is the composition? Rate 1-10',
            'How charming is this cat overall? Rate 1-10'
          ],
        };
      } else if (structuredForm.useStructuredResponse) {
        // Structured form mode
        analysisOptions = {
          analysisType: structuredForm.analysisType,
          documentType: structuredForm.documentType || undefined,
          expectedFields: structuredForm.expectedFields.filter(field => field.trim() !== ''),
          specificQuestions: structuredForm.specificQuestions.filter(question => question.trim() !== ''),
        };
      } else {
        // Default mode
        analysisOptions = {
          analysisType,
          documentType,
          expectedFields,
          specificQuestions,
        };
      }

      const result = await analyzeImageFunction(imageUrl, analysisOptions);
      return result;
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw error;
    }
  };

  // Extract scores from analysis result for radar chart
  const extractScoresForRadar = (analysisData: any) => {
    let scores;
    
    if (catJudgeMode) {
      // Cat Judge Mode - 5 cute cat characteristics
      scores = {
        creativity: 50, // Cuteness Factor
        technical: 50,  // Expression Quality  
        composition: 50, // Photo Technical Quality
        relevance: 50,  // Composition Appeal
        originality: 50, // Overall Charm
      };
    } else {
      // Default mode
      scores = {
        creativity: 50,
        technical: 50,
        composition: 50,
        relevance: 50,
        originality: 50,
      };
    }

    try {
      if (catJudgeMode) {
        // Cat Judge Mode - focus on cute cat characteristics
        if (analysisData.objects && Array.isArray(analysisData.objects)) {
          const catObjects = analysisData.objects.filter((obj: any) => 
            obj.name.toLowerCase().includes('cat') || 
            obj.name.toLowerCase().includes('kitten') ||
            obj.name.toLowerCase().includes('feline')
          );
          
          if (catObjects.length > 0) {
            // Cuteness Factor (creativity)
            const avgConfidence = catObjects.reduce((sum: number, obj: any) => 
              sum + (obj.confidence || 0), 0) / catObjects.length;
            scores.creativity = Math.round(avgConfidence * 100);
            
            // Expression Quality (technical) - based on object descriptions
            const hasCuteWords = catObjects.some((obj: any) => 
              obj.description && (
                obj.description.toLowerCase().includes('cute') ||
                obj.description.toLowerCase().includes('adorable') ||
                obj.description.toLowerCase().includes('sweet')
              )
            );
            scores.technical = hasCuteWords ? Math.min(100, scores.technical + 30) : scores.technical;
          } else {
            // Not a cat - low scores
            scores.creativity = 20;
            scores.technical = 20;
            scores.composition = 20;
            scores.relevance = 20;
            scores.originality = 20;
          }
        }
      } else {
        // Default mode - original logic
        if (analysisData.objects && Array.isArray(analysisData.objects)) {
          const catObjects = analysisData.objects.filter((obj: any) => 
            obj.name.toLowerCase().includes('cat') || 
            obj.name.toLowerCase().includes('kitten') ||
            obj.name.toLowerCase().includes('feline')
          );
          
          if (catObjects.length > 0) {
            scores.relevance = Math.min(100, 70 + (catObjects.length * 10));
            // Use cat object confidence for technical quality
            const avgConfidence = catObjects.reduce((sum: number, obj: any) => 
              sum + (obj.confidence || 0), 0) / catObjects.length;
            scores.technical = Math.round(avgConfidence * 100);
          } else {
            scores.relevance = 20; // Low relevance if no cat detected
          }
        }
      }

      // Extract from technical analysis
      if (analysisData.technical) {
        if (analysisData.technical.quality === 'high') scores.technical = Math.max(scores.technical, 80);
        if (analysisData.technical.quality === 'medium') scores.technical = Math.max(scores.technical, 60);
        if (analysisData.technical.quality === 'low') scores.technical = Math.min(scores.technical, 40);
      }

      // Extract from composition analysis
      if (analysisData.composition) {
        let compositionScore = 50;
        if (analysisData.composition.ruleOfThirds) compositionScore += 20;
        if (analysisData.composition.symmetry) compositionScore += 15;
        if (analysisData.composition.leadingLines) compositionScore += 15;
        scores.composition = Math.min(100, compositionScore);
      }

      // Extract from scene analysis for creativity and cuteness
      if (analysisData.scene) {
        if (analysisData.scene.mood) {
          const moodWords = analysisData.scene.mood.toLowerCase();
          if (moodWords.includes('cute') || moodWords.includes('adorable') || moodWords.includes('sweet')) {
            scores.creativity = Math.max(scores.creativity, 80);
            scores.originality = Math.max(scores.originality, 70);
          }
          if (moodWords.includes('playful') || moodWords.includes('fun')) {
            scores.creativity = Math.max(scores.creativity, 75);
          }
        }
      }

      // Use tags to determine creativity and originality
      if (analysisData.tags && Array.isArray(analysisData.tags)) {
        const creativeTags = ['cute', 'adorable', 'playful', 'fun', 'sweet', 'lovely'];
        const creativeTagCount = analysisData.tags.filter((tag: string) => 
          creativeTags.some(creativeTag => tag.toLowerCase().includes(creativeTag))
        ).length;
        scores.creativity = Math.min(100, 50 + (creativeTagCount * 15));
        scores.originality = Math.min(100, 50 + (creativeTagCount * 12));
      }

      // Ensure all scores are within 0-100 range
      Object.keys(scores).forEach(key => {
        const scoreKey = key as keyof typeof scores;
        scores[scoreKey] = Math.max(0, Math.min(100, scores[scoreKey]));
      });

    } catch (error) {
      console.error('Error extracting scores from analysis:', error);
    }

    return scores;
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select an image file first');
      return;
    }

    // Rate limiting: prevent analysis within 10 seconds of each other
    const now = Date.now();
    const timeSinceLastAnalysis = now - lastAnalysisTime;
    if (timeSinceLastAnalysis < 10000) { // 10 seconds
      const remainingTime = Math.ceil((10000 - timeSinceLastAnalysis) / 1000);
      setError(`Please wait ${remainingTime} more seconds before analyzing another image. This prevents overwhelming the AI service.`);
      return;
    }

    setIsUploading(true);
    setIsAnalyzing(true);
    setError(null);
    setLastAnalysisTime(now);

    try {
      // Upload image to S3
      const imageUrl = await uploadImage(selectedFile);

      // Analyze the image with metadata
      const result = await performImageAnalysis(imageUrl);
      console.log('Analysis result received:', JSON.stringify(result, null, 2));
      
      // Extract scores for radar chart
      if (result.success && result.data) {
        const scores = extractScoresForRadar(result.data);
        setRadarScores(scores);
        console.log('Radar scores extracted:', scores);
      }
      
      setAnalysisResult(result);
      onAnalysisComplete?.(result);

    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Handle specific Bedrock rate limiting errors
      if (errorMessage.includes('Too many requests')) {
        errorMessage = 'AI service is temporarily busy. Please wait 30 seconds and try again. This prevents overwhelming the AI service.';
      }
      
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header Section */}
        <div className="text-center bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
            🐱 Cat Photo Analysis & Scoring
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            Upload a cat photo to get detailed AI analysis and see your cat's score on a 5-axis radar chart!
          </p>
          <div className="text-sm text-gray-500 mb-4">
            Logged in as: {user.signInDetails?.loginId || user.username}
          </div>
          
          {/* Cat Judge Mode Toggle */}
          <div className="flex justify-center">
            <label className="flex items-center space-x-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer">
              <input
                type="checkbox"
                checked={catJudgeMode}
                onChange={(e) => setCatJudgeMode(e.target.checked)}
                className="rounded text-white focus:ring-2 focus:ring-white"
              />
              <span className="font-semibold">
                🏆 Cat Judge Mode
              </span>
            </label>
          </div>
          
          {catJudgeMode && (
            <div className="mt-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-4 max-w-4xl mx-auto">
              <h3 className="font-bold text-green-800 mb-3 text-lg">Cat Judge Mode Active</h3>
              <p className="text-green-700 mb-3">
                This mode judges your cat photo on 5 specific characteristics:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <strong className="text-green-800">Cuteness Factor</strong>
                  <p className="text-gray-600 text-xs">How adorable is this cat?</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <strong className="text-green-800">Expression Quality</strong>
                  <p className="text-gray-600 text-xs">How expressive is the cat's face?</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <strong className="text-green-800">Photo Technical Quality</strong>
                  <p className="text-gray-600 text-xs">How well is the photo taken?</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <strong className="text-green-800">Composition Appeal</strong>
                  <p className="text-gray-600 text-xs">How appealing is the framing?</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <strong className="text-green-800">Overall Charm</strong>
                  <p className="text-gray-600 text-xs">How charming is this cat overall?</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          {!selectedFile ? (
            /* Upload Area - Only show when no file selected */
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
                className="cursor-pointer inline-flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-100 hover:border-blue-400 transition-all duration-200"
              >
                <div className="flex flex-col items-center justify-center pt-4 pb-4">
                  <svg
                    className="w-8 h-8 mb-3 text-gray-500"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 20 16"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                    />
                  </svg>
                  <p className="mb-1 text-base font-semibold text-gray-700">
                    Click to upload a cat photo
                  </p>
                  <p className="text-sm text-gray-500">PNG, JPG, GIF or WEBP (MAX. 10MB)</p>
                </div>
              </label>
            </div>
          ) : (
            /* File Selected - Show preview and controls */
            <div className="space-y-4">
              {/* Image Preview */}
              {imagePreview && (
                <div className="relative bg-gray-100 rounded-xl p-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-full h-64 md:h-80 object-contain mx-auto rounded-lg shadow-lg"
                  />
                </div>
              )}

              {/* File Info and Controls */}
              <div className="text-center space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-800">
                    Selected: {selectedFile.name}
                  </p>
                  <p className="text-xs text-blue-600">
                    Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={handleAnalyze}
                    disabled={isUploading || isAnalyzing}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    variation="primary"
                  >
                    {isUploading ? 'Uploading...' : isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
                  </Button>
                  
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setImagePreview(null);
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Choose Different Image
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
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

        {/* Analysis Results */}
        {analysisResult && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Analysis Results</h3>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${analysisResult.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium text-gray-600">
                  {analysisResult.success ? 'Success' : 'Failed'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm font-medium text-gray-600">Analysis Type</span>
                <p className="text-lg font-semibold text-gray-800">{analysisResult.analysisType}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm font-medium text-gray-600">Timestamp</span>
                <p className="text-lg font-semibold text-gray-800">
                  {new Date(analysisResult.timestamp || '').toLocaleString()}
                </p>
              </div>
            </div>

            {analysisResult.success && analysisResult.data && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
                {formatAnalysisResult(analysisResult.data)}
              </div>
            )}
            
            {!analysisResult.success && analysisResult.error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h4 className="text-lg font-bold text-red-800 mb-2">Error</h4>
                <p className="text-red-700">{analysisResult.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Radar Charts for Cat Evaluation */}
        {radarScores && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                {catJudgeMode ? '🏆 Cat Judge Mode - 5 Cute Cat Characteristics' : '🐱 Cat Photo Evaluation Radar Charts'}
              </h3>
              <p className="text-gray-600 text-lg">
                {catJudgeMode 
                  ? 'Professional MUI X radar chart showing your cat\'s scores on 5 cute cat characteristics'
                  : 'Compare our custom radar chart (left) with the professional MUI X radar chart (right)'
                }
              </p>
            </div>
            
            {catJudgeMode ? (
              /* Cat Judge Mode - Only MUI Chart */
              <div className="flex justify-center">
                <div className="text-center">
                  <h4 className="text-xl font-bold text-gray-800 mb-6">Professional Cat Judge Radar Chart</h4>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <MUIRadarChart data={radarScores} size={400} catJudgeMode={catJudgeMode} />
                  </div>
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-green-500">✅</span>
                      <span>Professional MUI X radar chart</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-green-500">✅</span>
                      <span>5 cute cat characteristics</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-green-500">✅</span>
                      <span>Interactive tooltips</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Default Mode - Both Charts */
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Custom Radar Chart */}
                <div className="text-center">
                  <h4 className="text-xl font-bold text-gray-800 mb-6">Custom SVG Radar Chart</h4>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex justify-center">
                      <RadarChart data={radarScores} size={350} />
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-1 gap-2 text-sm text-gray-600">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-green-500">✅</span>
                      <span>Custom built with SVG</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-green-500">✅</span>
                      <span>Fighting game style</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-green-500">✅</span>
                      <span>Lightweight & fast</span>
                    </div>
                  </div>
                </div>

                {/* MUI Radar Chart */}
                <div className="text-center">
                  <h4 className="text-xl font-bold text-gray-800 mb-6">MUI X Radar Chart</h4>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex justify-center">
                      <MUIRadarChart data={radarScores} size={350} catJudgeMode={catJudgeMode} />
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-1 gap-2 text-sm text-gray-600">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-green-500">✅</span>
                      <span>Professional library</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-green-500">✅</span>
                      <span>Rich interactions</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-green-500">✅</span>
                      <span>Built-in tooltips</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-8 text-center">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                <p className="text-gray-700 text-lg">
                  {catJudgeMode 
                    ? 'The larger the area, the better your cat photo scores on all 5 cute cat characteristics!'
                    : 'Both charts show how your cat photo scores across 5 key evaluation criteria. The larger the area, the better the overall cat photo quality!'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
