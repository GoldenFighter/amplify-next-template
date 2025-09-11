import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

export async function POST(request: NextRequest) {
  try {
    const { imageKey, bucketName } = await request.json();

    if (!imageKey || !bucketName) {
      return NextResponse.json(
        { error: 'imageKey and bucketName are required' },
        { status: 400 }
      );
    }

    // Create S3 event structure
    const s3Event = {
      Records: [
        {
          s3: {
            bucket: { name: bucketName },
            object: { key: imageKey }
          }
        }
      ]
    };

    // Invoke both Lambda functions
    const [exifResult, rekognitionResult] = await Promise.allSettled([
      lambdaClient.send(new InvokeCommand({
        FunctionName: process.env.EXIF_EXTRACTION_FUNCTION_NAME || 'exifExtraction',
        Payload: JSON.stringify(s3Event)
      })),
      lambdaClient.send(new InvokeCommand({
        FunctionName: process.env.REKOGNITION_ANALYSIS_FUNCTION_NAME || 'rekognitionAnalysis',
        Payload: JSON.stringify(s3Event)
      }))
    ]);

    const results = {
      exif: exifResult.status === 'fulfilled' 
        ? JSON.parse(new TextDecoder().decode(exifResult.value.Payload))
        : { error: exifResult.reason },
      rekognition: rekognitionResult.status === 'fulfilled'
        ? JSON.parse(new TextDecoder().decode(rekognitionResult.value.Payload))
        : { error: rekognitionResult.reason }
    };

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error triggering Lambda functions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to trigger Lambda functions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
