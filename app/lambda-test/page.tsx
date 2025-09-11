'use client';

import React, { useState, useEffect } from 'react';
import { uploadData, getUrl } from 'aws-amplify/storage';
import { generateClient } from 'aws-amplify/api';
import { Card, CardContent, CardHeader } from '@mui/material';
import { Button, TextField, Typography, Box, Alert, CircularProgress, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ImageIcon from '@mui/icons-material/Image';
import InfoIcon from '@mui/icons-material/Info';

const client = generateClient();

interface AnalysisResult {
  exifData?: any;
  rekognitionData?: any;
  timestamp: string;
  imageUrl: string;
  fileName: string;
}

export default function LambdaTestPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [manualTriggering, setManualTriggering] = useState(false);

  // Poll for new analysis results
  useEffect(() => {
    const pollResults = () => {
      // In a real implementation, you would poll CloudWatch logs or a database
      // For now, we'll just show a message that the functions are triggered
      console.log('Polling for analysis results...');
    };

    const interval = setInterval(pollResults, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if it's an image file
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (JPEG, PNG, etc.)');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Generate a unique filename
      const timestamp = Date.now();
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `test-${timestamp}.${fileExtension}`;
      const filePath = `contest-submissions/${fileName}`;

      // Upload the file to S3
      const uploadResult = await uploadData({
        key: filePath,
        data: selectedFile,
        options: {
          contentType: selectedFile.type,
        },
      }).result;

      console.log('File uploaded successfully:', uploadResult);

      // Get the public URL for the uploaded image
      const imageUrlResult = await getUrl({
        key: filePath,
        options: {
          expiresIn: 3600, // 1 hour
        },
      });
      const imageUrl = imageUrlResult.toString();

      // Add to results with placeholder data
      const newResult: AnalysisResult = {
        exifData: { status: 'Processing...', message: 'EXIF extraction in progress' },
        rekognitionData: { status: 'Processing...', message: 'Rekognition analysis in progress' },
        timestamp: new Date().toISOString(),
        imageUrl: imageUrl.toString(),
        fileName: selectedFile.name,
      };

      setAnalysisResults(prev => [newResult, ...prev]);
      setSuccess(`File uploaded successfully! The Lambda functions will process the image automatically.`);
      setSelectedFile(null);

      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err) {
      console.error('Upload error:', err);
      setError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const simulateAnalysisResults = (result: AnalysisResult) => {
    // Simulate EXIF data extraction
    const exifData = {
      hasExif: true,
      fileType: selectedFile?.type.split('/')[1].toUpperCase() || 'JPEG',
      fileSize: selectedFile?.size || 0,
      imageWidth: Math.floor(Math.random() * 2000) + 1000,
      imageHeight: Math.floor(Math.random() * 2000) + 1000,
      extractedAt: new Date().toISOString(),
      camera: 'Canon EOS R5',
      dateTime: new Date().toISOString(),
      gps: {
        latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
        longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
      },
    };

    // Simulate Rekognition analysis
    const rekognitionData = {
      labels: [
        { name: 'Person', confidence: 95.5 },
        { name: 'Outdoor', confidence: 87.2 },
        { name: 'Nature', confidence: 82.1 },
        { name: 'Landscape', confidence: 78.9 },
      ],
      faces: {
        faceCount: 1,
        faces: [{
          confidence: 99.2,
          ageRange: { low: 25, high: 35 },
          emotions: [{ type: 'HAPPY', confidence: 85.3 }],
          gender: { value: 'Male', confidence: 92.1 },
        }],
      },
      text: {
        textDetections: [
          { detectedText: 'Welcome to New York', confidence: 98.7 },
        ],
        textCount: 1,
      },
    };

    // Update the result
    setAnalysisResults(prev => 
      prev.map(r => 
        r.timestamp === result.timestamp 
          ? { ...r, exifData, rekognitionData }
          : r
      )
    );
  };

  const manuallyTriggerLambda = async (result: AnalysisResult) => {
    setManualTriggering(true);
    try {
      // Extract bucket name and key from the image URL
      const url = new URL(result.imageUrl);
      const bucketName = url.hostname.split('.')[0];
      const key = url.pathname.substring(1);

      const response = await fetch('/api/trigger-lambda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageKey: key,
          bucketName: bucketName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update the result with real Lambda output
        setAnalysisResults(prev => 
          prev.map(r => 
            r.timestamp === result.timestamp 
              ? { 
                  ...r, 
                  exifData: data.results.exif,
                  rekognitionData: data.results.rekognition
                }
              : r
          )
        );
        setSuccess('Lambda functions triggered successfully!');
      } else {
        setError(`Failed to trigger Lambda functions: ${data.error}`);
      }
    } catch (err) {
      setError(`Error triggering Lambda functions: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setManualTriggering(false);
    }
  };

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', padding: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Lambda Function Test Interface
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Upload images to test the EXIF extraction and Rekognition analysis Lambda functions.
        The functions will be triggered automatically when you upload an image to the S3 bucket.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Upload Test Image" />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              type="file"
              inputProps={{ accept: 'image/*' }}
              onChange={handleFileSelect}
              id="file-input"
              helperText="Select an image file (JPEG, PNG, etc.)"
            />
            
            {selectedFile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ImageIcon color="primary" />
                <Typography variant="body2">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </Typography>
              </Box>
            )}

            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              sx={{ alignSelf: 'flex-start' }}
            >
              {uploading ? <CircularProgress size={20} /> : 'Upload & Test'}
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader 
          title="Analysis Results" 
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                onClick={() => {
                  if (analysisResults.length > 0) {
                    const result = analysisResults[0];
                    simulateAnalysisResults(result);
                  }
                }}
                variant="outlined"
                size="small"
              >
                Simulate Results
              </Button>
              <Button 
                onClick={() => {
                  if (analysisResults.length > 0) {
                    const result = analysisResults[0];
                    manuallyTriggerLambda(result);
                  }
                }}
                variant="contained"
                size="small"
                disabled={manualTriggering || analysisResults.length === 0}
              >
                {manualTriggering ? <CircularProgress size={16} /> : 'Trigger Lambda'}
              </Button>
            </Box>
          }
        />
        <CardContent>
          {analysisResults.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <InfoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No analysis results yet. Upload an image to see the Lambda functions in action.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {analysisResults.map((result, index) => (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">{result.fileName}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button
                          onClick={() => manuallyTriggerLambda(result)}
                          variant="outlined"
                          size="small"
                          disabled={manualTriggering}
                        >
                          {manualTriggering ? <CircularProgress size={16} /> : 'Re-trigger'}
                        </Button>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(result.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <img 
                        src={result.imageUrl} 
                        alt={result.fileName}
                        style={{ 
                          maxWidth: '200px', 
                          maxHeight: '200px', 
                          objectFit: 'cover',
                          borderRadius: '8px'
                        }}
                      />
                    </Box>

                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1">EXIF Data Extraction</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <pre style={{ 
                          backgroundColor: '#f5f5f5', 
                          padding: '16px', 
                          borderRadius: '4px',
                          overflow: 'auto',
                          fontSize: '12px'
                        }}>
                          {formatJson(result.exifData)}
                        </pre>
                      </AccordionDetails>
                    </Accordion>

                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1">Rekognition Analysis</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <pre style={{ 
                          backgroundColor: '#f5f5f5', 
                          padding: '16px', 
                          borderRadius: '4px',
                          overflow: 'auto',
                          fontSize: '12px'
                        }}>
                          {formatJson(result.rekognitionData)}
                        </pre>
                      </AccordionDetails>
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
