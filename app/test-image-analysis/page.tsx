'use client';

import React, { useState } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { analyzeImage, analyzeDocument } from '@/lib/imageAnalysis';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

export default function TestImageAnalysisPage() {
  // Configure Amplify if not already configured
  if (!Amplify.getConfig().Auth) {
    console.log("Configuring Amplify in test page...");
    Amplify.configure(outputs);
    console.log("Amplify configured successfully in test page");
  }

  // Get authentication state
  const { user } = useAuthenticator();

  const [testUrl, setTestUrl] = useState('https://via.placeholder.com/400x300/0066CC/FFFFFF?text=Test+Image');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testGeneralAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const analysisResult = await analyzeImage(testUrl, {
        analysisType: 'general',
        specificQuestions: ['What do you see in this image?', 'What colors are prominent?'],
      });
      setResult(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testDocumentAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const analysisResult = await analyzeDocument(testUrl, 'form', ['name', 'email', 'phone']);
      setResult(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Show authentication prompt if not logged in
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Image Analysis Test Page</h1>
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Please log in to use the image analysis test feature.
          </p>
          <p className="text-sm text-gray-500">
            This feature requires authentication to access AWS services.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Image Analysis Test Page</h1>
      <div className="mb-4 text-sm text-gray-500">
        Logged in as: {user.signInDetails?.loginId || user.username}
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Test Image URL:</label>
          <input
            type="url"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter image URL"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={testGeneralAnalysis}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Test General Analysis'}
          </button>
          
          <button
            onClick={testDocumentAnalysis}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Test Document Analysis'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {result && (
          <div className="bg-gray-50 border rounded p-4">
            <h3 className="font-semibold mb-2">Analysis Result:</h3>
            <pre className="text-sm overflow-auto bg-white p-2 rounded border">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
