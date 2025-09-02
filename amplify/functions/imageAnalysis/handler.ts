import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// Initialize AWS clients
const bedrockClient = new BedrockRuntimeClient({ 
  region: process.env.BEDROCK_REGION || 'us-east-1' 
});
const s3Client = new S3Client({ region: process.env.BEDROCK_REGION || 'us-east-1' });

// Claude 3.5 Sonnet model ID
const MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';

interface ImageAnalysisRequest {
  imageUrl: string;
  analysisType?: string;
  specificQuestions?: string[];
  documentType?: string;
  expectedFields?: string[];
}

interface ImageAnalysisResponse {
  success: boolean;
  data?: any;
  error?: string;
  processingTime?: number;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();
  
  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}') as ImageAnalysisRequest;
    const { imageUrl, analysisType, specificQuestions, documentType, expectedFields } = body;

    if (!imageUrl) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
        body: JSON.stringify({
          success: false,
          error: 'Image URL is required',
        }),
      };
    }

    // Download image from S3 or URL
    const imageBase64 = await downloadAndEncodeImage(imageUrl);

    // Determine analysis type and create appropriate prompt
    const systemPrompt = createSystemPrompt(analysisType, documentType, expectedFields);
    const userPrompt = createUserPrompt(analysisType, specificQuestions, expectedFields);

    // Prepare the request for Claude
    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      temperature: analysisType === 'document' ? 0.1 : 0.2,
      top_p: analysisType === 'document' ? 0.1 : 0.9,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt,
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              },
            },
          ],
        },
      ],
    };

    // Invoke Claude model
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      body: JSON.stringify(requestBody),
      contentType: 'application/json',
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // Extract the analysis result
    const analysisResult = responseBody.content[0].text;
    
    // Parse the JSON response
    let parsedResult;
    try {
      parsedResult = JSON.parse(analysisResult);
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError);
      parsedResult = { rawResponse: analysisResult };
    }

    const processingTime = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({
        success: true,
        data: parsedResult,
        processingTime,
      } as ImageAnalysisResponse),
    };

  } catch (error) {
    console.error('Error processing image analysis:', error);
    const processingTime = Date.now() - startTime;

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime,
      } as ImageAnalysisResponse),
    };
  }
};

async function downloadAndEncodeImage(imageUrl: string): Promise<string> {
  try {
    // Handle S3 URLs
    if (imageUrl.includes('amazonaws.com') || imageUrl.includes('s3://')) {
      return await downloadFromS3(imageUrl);
    }
    
    // Handle regular URLs
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return base64;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw new Error(`Failed to download and encode image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function downloadFromS3(s3Url: string): Promise<string> {
  try {
    // Parse S3 URL to extract bucket and key
    const url = new URL(s3Url);
    const bucket = url.hostname.split('.')[0];
    const key = url.pathname.substring(1); // Remove leading slash

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    const arrayBuffer = await response.Body?.transformToByteArray();
    
    if (!arrayBuffer) {
      throw new Error('No data received from S3');
    }

    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return base64;
  } catch (error) {
    console.error('Error downloading from S3:', error);
    throw new Error(`Failed to download from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function createSystemPrompt(analysisType?: string, documentType?: string, expectedFields?: string[]): string {
  if (analysisType === 'document' || documentType) {
    return `You are an expert document processing specialist. Analyze the provided document image and extract structured data. Return a JSON object with: { "documentType": "string", "confidence": "number", "extractedData": {"key": "value"}, "textContent": "string", "layout": {"sections": [{"type": "string", "content": "string", "position": {"x": "number", "y": "number", "width": "number", "height": "number"}}]}, "quality": {"readability": "string", "completeness": "string", "issues": ["string"]}, "metadata": {"language": "string", "orientation": "string", "pageCount": "number"}}. Focus on accuracy and completeness of data extraction. Return only valid JSON.`;
  }

  return `You are an expert image analyst with advanced computer vision capabilities. Analyze the provided image and return a comprehensive JSON object with the following structure: { "objects": [{"name": "string", "confidence": "number", "description": "string"}], "scene": {"description": "string", "setting": "string", "mood": "string"}, "text": {"detected": "boolean", "content": "string", "language": "string"}, "colors": {"dominant": ["string"], "palette": ["string"]}, "composition": {"ruleOfThirds": "boolean", "symmetry": "boolean", "leadingLines": "boolean"}, "technical": {"quality": "string", "lighting": "string", "focus": "string"}, "summary": "string", "tags": ["string"], "metadata": {"estimatedDate": "string", "location": "string", "camera": "string"}}. Be thorough and accurate in your analysis. Return only valid JSON.`;
}

function createUserPrompt(analysisType?: string, specificQuestions?: string[], expectedFields?: string[]): string {
  let prompt = 'Please analyze this image and provide a comprehensive analysis.';
  
  if (analysisType) {
    prompt += ` Focus on ${analysisType} analysis.`;
  }
  
  if (specificQuestions && specificQuestions.length > 0) {
    prompt += ` Please specifically address these questions: ${specificQuestions.join(', ')}.`;
  }
  
  if (expectedFields && expectedFields.length > 0) {
    prompt += ` Pay special attention to extracting these fields: ${expectedFields.join(', ')}.`;
  }
  
  return prompt;
}
