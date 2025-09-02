import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'eu-west-1' });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, analysisType, specificQuestions, documentType, expectedFields } = body;

    console.log("Image Analysis API: Received request:", { 
      imageUrl, 
      analysisType, 
      documentType,
      hasQuestions: specificQuestions?.length > 0,
      hasExpectedFields: expectedFields?.length > 0
    });

    // Validate required fields
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' }, 
        { status: 400 }
      );
    }

    // Prepare the payload for the Lambda function
    const payload = {
      imageUrl,
      analysisType,
      specificQuestions,
      documentType,
      expectedFields,
    };

    // Invoke the Lambda function
    const command = new InvokeCommand({
      FunctionName: process.env.IMAGE_ANALYSIS_FUNCTION_NAME || 'imageAnalysis',
      Payload: JSON.stringify(payload),
    });

    const response = await lambdaClient.send(command);
    
    console.log("Image Analysis API: Lambda response status:", response.StatusCode);
    console.log("Image Analysis API: Lambda response payload exists:", !!response.Payload);
    
    if (response.Payload) {
      const result = JSON.parse(new TextDecoder().decode(response.Payload));
      
      console.log("Image Analysis API: Lambda result:", result);

      if (result.errorMessage) {
        console.error("Image Analysis API: Lambda error:", result.errorMessage);
        return NextResponse.json(
          { error: result.errorMessage }, 
          { status: 500 }
        );
      }

      if (result.statusCode && result.statusCode !== 200) {
        console.error("Image Analysis API: Lambda returned error status:", result.statusCode);
        return NextResponse.json(
          { error: result.body || 'Lambda function error' }, 
          { status: result.statusCode }
        );
      }

      // Return the structured analysis result
      return NextResponse.json({
        success: true,
        data: result,
        analysisType: analysisType || 'general',
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error("Image Analysis API: No payload in Lambda response");
      return NextResponse.json(
        { error: 'No response from Lambda function' }, 
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Image Analysis API: Unexpected error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
