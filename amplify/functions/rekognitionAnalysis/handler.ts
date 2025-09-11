import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { RekognitionClient, DetectLabelsCommand, DetectFacesCommand, DetectTextCommand } from '@aws-sdk/client-rekognition';
import { S3Event, S3EventRecord } from 'aws-lambda';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const rekognitionClient = new RekognitionClient({ region: process.env.AWS_REGION || 'us-east-1' });

export const handler = async (event: S3Event) => {
  console.log('Rekognition Analysis Lambda triggered');
  console.log('Event:', JSON.stringify(event, null, 2));

  const results = [];

  for (const record of event.Records) {
    try {
      const result = await processImage(record);
      results.push(result);
    } catch (error) {
      console.error(`Error processing record ${record.s3.object.key}:`, error);
      results.push({
        key: record.s3.object.key,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Rekognition analysis completed',
      results,
    }),
  };
};

async function processImage(record: S3EventRecord) {
  const bucketName = record.s3.bucket.name;
  const objectKey = record.s3.object.key;

  console.log(`Processing image with Rekognition: ${objectKey}`);

  // Download the image from S3
  const getObjectCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });

  const response = await s3Client.send(getObjectCommand);
  const imageData = await response.Body?.transformToByteArray();

  if (!imageData) {
    throw new Error('No image data received from S3');
  }

  // Perform multiple Rekognition analyses
  const [labelsResult, facesResult, textResult] = await Promise.allSettled([
    detectLabels(bucketName, objectKey),
    detectFaces(bucketName, objectKey),
    detectText(bucketName, objectKey),
  ]);

  const analysisResult = {
    labels: labelsResult.status === 'fulfilled' ? labelsResult.value : { error: labelsResult.reason },
    faces: facesResult.status === 'fulfilled' ? facesResult.value : { error: facesResult.reason },
    text: textResult.status === 'fulfilled' ? textResult.value : { error: textResult.reason },
  };

  console.log(`Rekognition analysis completed for ${objectKey}:`, analysisResult);

  return {
    key: objectKey,
    success: true,
    analysisResult,
    timestamp: new Date().toISOString(),
  };
}

async function detectLabels(bucketName: string, objectKey: string) {
  const command = new DetectLabelsCommand({
    Image: {
      S3Object: {
        Bucket: bucketName,
        Name: objectKey,
      },
    },
    MaxLabels: 20,
    MinConfidence: 50,
  });

  const response = await rekognitionClient.send(command);
  
  return {
    labels: response.Labels?.map((label: any) => ({
      name: label.Name,
      confidence: label.Confidence,
      instances: label.Instances?.map((instance: any) => ({
        confidence: instance.Confidence,
        boundingBox: instance.BoundingBox,
      })),
      parents: label.Parents?.map((parent: any) => ({
        name: parent.Name,
      })),
    })) || [],
  };
}

async function detectFaces(bucketName: string, objectKey: string) {
  const command = new DetectFacesCommand({
    Image: {
      S3Object: {
        Bucket: bucketName,
        Name: objectKey,
      },
    },
    Attributes: ['ALL'],
  });

  const response = await rekognitionClient.send(command);
  
  return {
    faceCount: response.FaceDetails?.length || 0,
    faces: response.FaceDetails?.map((face: any) => ({
      confidence: face.Confidence,
      boundingBox: face.BoundingBox,
      ageRange: face.AgeRange ? {
        low: face.AgeRange.Low,
        high: face.AgeRange.High,
      } : null,
      smile: face.Smile ? {
        value: face.Smile.Value,
        confidence: face.Smile.Confidence,
      } : null,
      emotions: face.Emotions?.map((emotion: any) => ({
        type: emotion.Type,
        confidence: emotion.Confidence,
      })) || [],
      gender: face.Gender ? {
        value: face.Gender.Value,
        confidence: face.Gender.Confidence,
      } : null,
      eyeglasses: face.Eyeglasses ? {
        value: face.Eyeglasses.Value,
        confidence: face.Eyeglasses.Confidence,
      } : null,
      sunglasses: face.Sunglasses ? {
        value: face.Sunglasses.Value,
        confidence: face.Sunglasses.Confidence,
      } : null,
      beard: face.Beard ? {
        value: face.Beard.Value,
        confidence: face.Beard.Confidence,
      } : null,
      mustache: face.Mustache ? {
        value: face.Mustache.Value,
        confidence: face.Mustache.Confidence,
      } : null,
    })) || [],
  };
}

async function detectText(bucketName: string, objectKey: string) {
  const command = new DetectTextCommand({
    Image: {
      S3Object: {
        Bucket: bucketName,
        Name: objectKey,
      },
    },
  });

  const response = await rekognitionClient.send(command);
  
  return {
    textDetections: response.TextDetections?.map((text: any) => ({
      detectedText: text.DetectedText,
      confidence: text.Confidence,
      type: text.Type,
      boundingBox: text.Geometry?.BoundingBox,
      polygon: text.Geometry?.Polygon?.map((point: any) => ({
        x: point.X,
        y: point.Y,
      })) || [],
    })) || [],
    textCount: response.TextDetections?.length || 0,
  };
}
