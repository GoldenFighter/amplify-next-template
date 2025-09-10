'use client';

import React, { useState } from 'react';
import { Button } from '@aws-amplify/ui-react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { uploadData, getUrl } from 'aws-amplify/storage';
import { scoreImageSubmission, type ImageScoringResult, type ContestType, getScoreDescription, formatScores } from '@/lib/imageScoring';
import RadarChart from './RadarChart';
import MUIRadarChart from './MUIRadarChart';

export default function ImageScoringTest() {
  const { user } = useAuthenticator();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [scoringResult, setScoringResult] = useState<ImageScoringResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedContestType, setSelectedContestType] = useState<ContestType>('photography');
  const [contestTheme, setContestTheme] = useState('sunset photography');

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
      setScoringResult(null);

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
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop();
      const imageKey = `contest-submissions/scoring-test/${timestamp}-${randomId}.${fileExtension}`;
      
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

  const handleScoreImage = async () => {
    if (!selectedFile) {
      setError('Please select an image file first');
      return;
    }

    setIsUploading(true);
    setIsScoring(true);
    setError(null);

    try {
      // Upload image to S3
      const imageUrl = await uploadImage(selectedFile);

      // Score the image
      const result = await scoreImageSubmission(
        imageUrl,
        selectedContestType,
        contestTheme,
        'test-contest-123',
        `submission-${Date.now()}`,
        user.userId || 'test-user'
      );
      
      console.log('Scoring result received:', JSON.stringify(result, null, 2));
      
      setScoringResult(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Scoring error:', error);
    } finally {
      setIsUploading(false);
      setIsScoring(false);
    }
  };

  const formatScoreDisplay = (scores: any) => {
    return (
      <div className="space-y-3">
        {Object.entries(scores).map(([key, value]) => {
          const numericValue = typeof value === 'number' ? value : 0;
          return (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${numericValue}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold w-12 text-right">
                  {numericValue}/100
                </span>
                <span className="text-xs text-gray-600 w-20">
                  {getScoreDescription(numericValue)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">AI Image Scoring System Test</h2>
        <p className="text-gray-600">
          Test the new AI-powered image scoring system that replaces the old judge system.
        </p>
        <div className="mt-2 text-sm text-gray-500">
          Logged in as: {user.signInDetails?.loginId || user.username}
        </div>
      </div>

      {/* Contest Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Contest Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contest Type
            </label>
            <select
              value={selectedContestType}
              onChange={(e) => setSelectedContestType(e.target.value as ContestType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="photography">Photography</option>
              <option value="art">Art</option>
              <option value="design">Design</option>
              <option value="document">Document</option>
              <option value="general">General</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contest Theme
            </label>
            <input
              type="text"
              value={contestTheme}
              onChange={(e) => setContestTheme(e.target.value)}
              placeholder="e.g., sunset photography, abstract art"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Image Upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <div className="text-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="scoring-image-upload"
          />
          <label
            htmlFor="scoring-image-upload"
            className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Select Image to Score
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
              onClick={handleScoreImage}
              disabled={isUploading || isScoring}
              className="mt-2"
              variation="primary"
            >
              {isUploading ? 'Uploading...' : isScoring ? 'Scoring...' : 'Score Image'}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {scoringResult && (
        <div className="bg-green-50 border border-green-200 rounded-md p-6">
          <h3 className="font-semibold text-green-800 mb-4 text-lg">
            {scoringResult.success ? '✅ Scoring Results' : '❌ Scoring Failed'}
          </h3>
          
          {scoringResult.success && scoringResult.score && (
            <div className="space-y-4">
              {/* Radar Charts Comparison */}
              <div className="bg-white p-4 rounded-md">
                <h4 className="font-semibold text-gray-800 mb-4 text-center">📊 Radar Chart Comparison</h4>
                <p className="text-sm text-gray-600 text-center mb-6">
                  Compare our custom radar chart with the professional MUI X radar chart
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Custom Radar Chart */}
                  <div className="text-center">
                    <h5 className="font-semibold text-gray-700 mb-3">Custom SVG Radar Chart</h5>
                    <div className="flex justify-center">
                      <RadarChart data={scoringResult.score} size={300} />
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      <p>✅ Custom built with SVG</p>
                      <p>✅ Fighting game style</p>
                      <p>✅ Lightweight & fast</p>
                    </div>
                  </div>

                  {/* MUI Radar Chart */}
                  <div className="text-center">
                    <h5 className="font-semibold text-gray-700 mb-3">MUI X Radar Chart</h5>
                    <div className="flex justify-center">
                      <MUIRadarChart data={scoringResult.score} size={300} />
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      <p>✅ Professional library</p>
                      <p>✅ Rich interactions</p>
                      <p>✅ Built-in tooltips</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-md">
                <h4 className="font-semibold text-gray-800 mb-3">📊 Detailed Scores</h4>
                {formatScoreDisplay(scoringResult.score)}
              </div>

              <div className="bg-white p-4 rounded-md">
                <h4 className="font-semibold text-gray-800 mb-2">📋 Score Summary</h4>
                <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                  {formatScores(scoringResult.score)}
                </pre>
              </div>

              <div className="bg-white p-4 rounded-md">
                <h4 className="font-semibold text-gray-800 mb-2">⏱️ Processing Info</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>Processing Time:</strong> {scoringResult.processingTime}ms</div>
                  <div><strong>Contest ID:</strong> {scoringResult.contestId}</div>
                  <div><strong>Submission ID:</strong> {scoringResult.submissionId}</div>
                  <div><strong>Timestamp:</strong> {new Date(scoringResult.timestamp).toLocaleString()}</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-md">
                <h4 className="font-semibold text-gray-800 mb-2">🔍 Raw Analysis Data</h4>
                <pre className="text-xs text-gray-600 overflow-auto max-h-64 bg-gray-50 p-2 rounded">
                  {JSON.stringify(scoringResult.analysis, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {!scoringResult.success && scoringResult.error && (
            <div className="text-red-600">
              <strong>Error:</strong> {scoringResult.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
