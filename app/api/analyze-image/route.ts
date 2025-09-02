import { NextRequest, NextResponse } from 'next/server';
import { serverClient } from '@/lib/amplifyServerClient';

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

    // Determine which AI generation to use based on analysis type
    let result;
    let errors;

    if (analysisType === 'document' || documentType) {
      // Use document analysis
      const { data, errors: docErrors } = await serverClient.analyzeDocument({
        imageUrl,
        documentType,
        expectedFields,
      });
      result = data;
      errors = docErrors;
    } else {
      // Use general image analysis
      const { data, errors: imgErrors } = await serverClient.analyzeImage({
        imageUrl,
        analysisType,
        specificQuestions,
      });
      result = data;
      errors = imgErrors;
    }

    console.log("Image Analysis API: AI generation result:", { result, errors });

    if (errors?.length) {
      console.error("Image Analysis API: AI generation errors:", errors);
      return NextResponse.json(
        { error: errors }, 
        { status: 400 }
      );
    }

    if (!result) {
      return NextResponse.json(
        { error: 'No analysis result received' }, 
        { status: 500 }
      );
    }

    // Return the structured analysis result
    return NextResponse.json({
      success: true,
      data: result,
      analysisType: analysisType || 'general',
      timestamp: new Date().toISOString(),
    });

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
