# Image Analysis with Claude 3.5 Sonnet Setup

This document explains how to use the image analysis functionality that has been set up in your Amplify project.

## Overview

The image analysis system uses AWS Amplify Gen 2 with a Lambda function that invokes Claude 3.5 Sonnet to analyze images and extract structured information. It supports both general image analysis and document processing (IDP) use cases.

## Features

### 1. General Image Analysis (`analyzeImage`)
- Object detection and recognition
- Scene understanding and description
- Text extraction (OCR)
- Color analysis
- Composition analysis
- Technical quality assessment
- Metadata extraction

### 2. Document Analysis (`analyzeDocument`)
- Document type classification
- Structured data extraction
- Layout analysis
- Quality assessment
- Multi-language support

## Setup Instructions

### 1. Deploy the Backend
```bash
npx ampx sandbox
```

This will deploy your Amplify backend with the new AI generation functions.

### 2. Access the Image Analysis Page
Navigate to `/image-analysis` in your application to use the interactive image analyzer.

### 3. Programmatic Usage

#### Using the API Route
```typescript
const response = await fetch('/api/analyze-image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    imageUrl: 'https://example.com/image.jpg',
    analysisType: 'general', // or 'document'
    specificQuestions: ['What objects are in this image?'],
    documentType: 'form', // for document analysis
    expectedFields: ['name', 'email', 'phone'], // for document analysis
  }),
});

const result = await response.json();
```

#### Using the Utility Functions
```typescript
import { analyzeImage, analyzeDocument } from '@/lib/imageAnalysis';

// General image analysis
const result = await analyzeImage('https://example.com/image.jpg', {
  analysisType: 'general',
  specificQuestions: ['What is the main subject?'],
});

// Document analysis
const docResult = await analyzeDocument('https://example.com/document.jpg', 'form', [
  'name',
  'email',
  'phone',
]);
```

#### Using Amplify AI Generation Directly
```typescript
import { serverClient } from '@/lib/amplifyServerClient';

// General analysis
const { data, errors } = await serverClient.analyzeImage({
  imageUrl: 'https://example.com/image.jpg',
  analysisType: 'general',
  specificQuestions: ['What objects are visible?'],
});

// Document analysis
const { data, errors } = await serverClient.analyzeDocument({
  imageUrl: 'https://example.com/document.jpg',
  documentType: 'invoice',
  expectedFields: ['total', 'date', 'vendor'],
});
```

## Response Format

### General Image Analysis Response
```json
{
  "objects": [
    {
      "name": "person",
      "confidence": 0.95,
      "description": "A person standing in the center"
    }
  ],
  "scene": {
    "description": "Outdoor park setting with trees and grass",
    "setting": "park",
    "mood": "peaceful"
  },
  "text": {
    "detected": true,
    "content": "Welcome to Central Park",
    "language": "english"
  },
  "colors": {
    "dominant": ["green", "blue"],
    "palette": ["#2E8B57", "#87CEEB", "#FFFFFF"]
  },
  "composition": {
    "ruleOfThirds": true,
    "symmetry": false,
    "leadingLines": true
  },
  "technical": {
    "quality": "high",
    "lighting": "natural",
    "focus": "sharp"
  },
  "summary": "A peaceful park scene with a person in the center",
  "tags": ["outdoor", "park", "person", "nature"],
  "metadata": {
    "estimatedDate": "2024",
    "location": "Central Park",
    "camera": "smartphone"
  }
}
```

### Document Analysis Response
```json
{
  "documentType": "invoice",
  "confidence": 0.92,
  "extractedData": {
    "total": "$150.00",
    "date": "2024-01-15",
    "vendor": "ABC Company",
    "invoiceNumber": "INV-001"
  },
  "textContent": "Full text content of the document...",
  "layout": {
    "sections": [
      {
        "type": "header",
        "content": "ABC Company Invoice",
        "position": {
          "x": 0,
          "y": 0,
          "width": 100,
          "height": 20
        }
      }
    ]
  },
  "quality": {
    "readability": "excellent",
    "completeness": "complete",
    "issues": []
  },
  "metadata": {
    "language": "english",
    "orientation": "portrait",
    "pageCount": 1
  }
}
```

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

## File Size Limits

- Maximum file size: 10MB
- Recommended: Under 5MB for optimal performance

## Use Cases

### 1. General Image Analysis
- Content moderation
- Image tagging and categorization
- Scene understanding
- Object detection
- Visual search

### 2. Document Processing (IDP)
- Form data extraction
- Invoice processing
- Receipt analysis
- ID document verification
- Contract analysis

### 3. Contest/Competition Judging
- Image-based contest evaluation
- Quality assessment
- Criteria-based scoring

## Best Practices

1. **Image Quality**: Use high-quality, well-lit images for best results
2. **File Size**: Keep images under 5MB for optimal performance
3. **Specific Questions**: Provide specific questions for more targeted analysis
4. **Document Types**: Specify document type for better extraction accuracy
5. **Error Handling**: Always handle errors gracefully in your application

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure your AWS account has access to Claude 3.5 Sonnet in Amazon Bedrock
2. **Image Upload Failures**: Check S3 bucket permissions and file size limits
3. **Analysis Timeouts**: Large images may take longer to process
4. **Invalid Responses**: Ensure the image URL is accessible and the image format is supported

### Debug Mode

Enable debug logging by checking the browser console and server logs for detailed error information.

## Cost Considerations

- Claude 3.5 Sonnet charges per token used
- Image analysis typically uses more tokens than text-only requests
- Consider implementing caching for repeated analyses
- Monitor usage through AWS Cost Explorer

## Security

- Images are processed through AWS Bedrock (secure and compliant)
- No image data is stored permanently (only during processing)
- All requests require authentication
- Images are uploaded to your private S3 bucket

## Next Steps

1. Deploy the backend: `npx ampx sandbox`
2. Test with sample images
3. Integrate into your application workflow
4. Monitor usage and costs
5. Consider implementing caching for production use
