import type { Schema } from "../../data/resource";
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Initialize AWS clients
const bedrockClient = new BedrockRuntimeClient({ 
  region: process.env.BEDROCK_REGION || 'eu-west-1' 
});
const s3Client = new S3Client({ region: process.env.BEDROCK_REGION || 'eu-west-1' });

// Claude 3.5 Sonnet model ID
const MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';

export const handler: Schema["analyzeImage"]["functionHandler"] = async (event) => {
  const startTime = Date.now();
  
  console.log('Lambda function started');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Get arguments from the event (typed from schema)
    const { imageUrl, analysisType, specificQuestions, documentType, expectedFields } = event.arguments;

    console.log('Parsed request arguments:', {
      imageUrl,
      analysisType: analysisType || undefined,
      documentType: documentType || undefined,
      hasQuestions: specificQuestions && specificQuestions.length > 0,
      hasExpectedFields: expectedFields && expectedFields.length > 0
    });

    if (!imageUrl) {
      console.log('Error: Image URL is required');
      throw new Error('Image URL is required');
    }

    // Download image from S3 or URL
    console.log('Starting image download and encoding...');
    const imageBase64 = await downloadAndEncodeImage(imageUrl);
    console.log('Image downloaded and encoded, length:', imageBase64.length);

    // Determine analysis type and create appropriate prompt
    const systemPrompt = createSystemPrompt(
      analysisType || undefined, 
      documentType || undefined, 
      expectedFields?.filter(field => field !== null) || undefined
    );
    const userPrompt = createUserPrompt(
      analysisType || undefined, 
      specificQuestions?.filter(question => question !== null) || undefined, 
      expectedFields?.filter(field => field !== null) || undefined
    );
    
    console.log('System prompt:', systemPrompt);
    console.log('User prompt:', userPrompt);

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
    console.log('Invoking Claude model:', MODEL_ID);
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      body: JSON.stringify(requestBody),
      contentType: 'application/json',
    });

    const response = await bedrockClient.send(command);
    console.log('Claude response received');
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('Claude response body:', JSON.stringify(responseBody, null, 2));
    
    // Extract the analysis result
    const analysisResult = responseBody.content[0].text;
    console.log('Analysis result:', analysisResult);
    
    // Parse the JSON response
    let parsedResult;
    try {
      parsedResult = JSON.parse(analysisResult);
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError);
      parsedResult = { rawResponse: analysisResult };
    }

    const processingTime = Date.now() - startTime;
    console.log('Processing completed successfully in', processingTime, 'ms');

    // Return the result directly (typed from schema)
    return {
      success: true,
      data: parsedResult,
      processingTime,
    };

  } catch (error) {
    console.error('Error processing image analysis:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    const processingTime = Date.now() - startTime;

    // Return error result (typed from schema)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      processingTime,
    };
  }
};

async function downloadAndEncodeImage(imageUrl: string): Promise<string> {
  try {
    console.log('Downloading image from URL:', imageUrl);
    
    // Handle S3 URLs
    if (imageUrl.includes('amazonaws.com') || imageUrl.includes('s3://')) {
      console.log('Detected S3 URL, using S3 download method');
      return await downloadFromS3(imageUrl);
    }
    
    // Handle regular URLs
    console.log('Using fetch for regular URL');
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    console.log('Image downloaded and encoded successfully, base64 length:', base64.length);
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
