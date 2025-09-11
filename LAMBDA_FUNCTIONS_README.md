# Lambda Functions for Image Analysis

This project includes two AWS Lambda functions for automatic image analysis when images are uploaded to the S3 bucket.

## Functions

### 1. EXIF Data Extraction (`exifExtraction`)
- **Purpose**: Extracts EXIF metadata from uploaded images
- **Trigger**: S3 object creation events for `.jpg`, `.jpeg`, and `.png` files in the `contest-submissions/` folder
- **Features**:
  - Detects if EXIF data is present
  - Extracts basic image dimensions
  - Identifies file type (JPEG, PNG, GIF)
  - Provides file size information
  - Basic EXIF header detection

### 2. Rekognition Analysis (`rekognitionAnalysis`)
- **Purpose**: Performs comprehensive image analysis using Amazon Rekognition
- **Trigger**: S3 object creation events for `.jpg`, `.jpeg`, and `.png` files in the `contest-submissions/` folder
- **Features**:
  - **Label Detection**: Identifies objects, scenes, and activities in the image
  - **Face Detection**: Detects faces and extracts attributes like age, emotions, gender
  - **Text Detection**: Finds and extracts text within the image
  - **Confidence Scores**: Provides confidence levels for all detections

## Setup Instructions

1. **Deploy the functions**:
   ```bash
   npx ampx sandbox deploy
   ```

2. **Test the functions**:
   - Navigate to the main page
   - Click "🧪 Test Lambda Functions (EXIF & Rekognition)"
   - Upload an image to trigger both functions automatically

## How It Works

1. **Image Upload**: When you upload an image through the test interface, it's stored in the S3 bucket under `contest-submissions/`
2. **Automatic Triggering**: Both Lambda functions are automatically triggered by S3 events
3. **Parallel Processing**: Both functions run simultaneously and independently
4. **Results Display**: The test interface shows the results from both functions

## Function Outputs

### EXIF Extraction Output
```json
{
  "hasExif": true,
  "fileType": "JPEG",
  "fileSize": 2048576,
  "imageWidth": 1920,
  "imageHeight": 1080,
  "extractedAt": "2024-01-15T10:30:00.000Z"
}
```

### Rekognition Analysis Output
```json
{
  "labels": [
    {
      "name": "Person",
      "confidence": 95.5,
      "instances": [...]
    }
  ],
  "faces": {
    "faceCount": 1,
    "faces": [
      {
        "confidence": 99.2,
        "ageRange": {"low": 25, "high": 35},
        "emotions": [{"type": "HAPPY", "confidence": 85.3}],
        "gender": {"value": "Male", "confidence": 92.1}
      }
    ]
  },
  "text": {
    "textDetections": [
      {
        "detectedText": "Welcome to New York",
        "confidence": 98.7
      }
    ],
    "textCount": 1
  }
}
```

## Permissions

The functions have the following AWS permissions:
- **S3 Access**: Read access to the contest submissions bucket
- **Rekognition Access**: Full access to Rekognition detection services
- **CloudWatch Logs**: Automatic logging for debugging

## Testing

1. Go to `/lambda-test` in your application
2. Upload an image file (JPEG, PNG, etc.)
3. Watch the results appear automatically
4. Use the "Simulate Results" button to see example outputs

## Troubleshooting

- **Functions not triggering**: Check that images are uploaded to the `contest-submissions/` folder
- **Permission errors**: Ensure the Lambda execution role has the necessary S3 and Rekognition permissions
- **Timeout errors**: Check CloudWatch logs for function execution details
- **No results**: Verify the functions are deployed and the S3 triggers are configured correctly

## Future Enhancements

- Store results in DynamoDB for persistence
- Add more EXIF fields extraction
- Implement custom metadata storage
- Add image preprocessing before analysis
- Create a results dashboard
