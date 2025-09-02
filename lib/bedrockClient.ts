// Direct AWS Bedrock integration for image analysis
// This is a fallback if Amplify AI generation doesn't support image input

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({ 
  region: "us-east-1" // Adjust region as needed
});

export interface ImageAnalysisRequest {
  imageUrl: string;
  contestType: string;
  contestPrompt: string;
  judgingCriteria: string[];
  maxScore: number;
}

export interface ImageAnalysisResponse {
  rating: number;
  summary: string;
  reasoning: string;
  risks: string[];
  recommendations: string[];
}

export async function analyzeImageWithBedrock(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse> {
  try {
    console.log("Analyzing image with AWS Bedrock:", request.imageUrl);
    
    // Create the prompt for Claude 3.5 Sonnet
    const systemPrompt = `You are an expert contest judge specializing in image evaluation. You will be given an image and contest criteria. Analyze the actual image content and rate it based on the contest requirements. CRITICAL: You must base your rating ONLY on what you actually see in the image. If the image does not contain the required subject matter, you MUST give a very low score (0-20 out of 100). Be extremely strict about matching contest requirements. Return a JSON object with: rating (integer based on maxScore), summary (string), reasoning (string), risks (array of strings), recommendations (array of strings). Return only valid JSON.`;

    const userPrompt = `
Contest Type: ${request.contestType}
Contest Prompt: ${request.contestPrompt}
Judging Criteria: ${request.judgingCriteria.join(', ')}
Maximum Score: ${request.maxScore}

Please analyze the image at this URL: ${request.imageUrl}

Rate this image based on the contest criteria and return your analysis in the specified JSON format.
`;

    // Prepare the request body for Claude 3.5 Sonnet
    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1500,
      temperature: 0.1,
      top_p: 0.1,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt
            },
            {
              type: "image",
              source: {
                type: "url",
                url: request.imageUrl
              }
            }
          ]
        }
      ],
      system: systemPrompt
    };

    // Invoke the model
    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0", // Claude 3.5 Sonnet model ID
      body: JSON.stringify(requestBody),
      contentType: "application/json",
    });

    const response = await bedrockClient.send(command);
    
    // Parse the response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const content = responseBody.content[0].text;
    
    console.log("Bedrock response:", content);
    
    // Parse the JSON response
    const analysisResult = JSON.parse(content);
    
    return {
      rating: analysisResult.rating,
      summary: analysisResult.summary,
      reasoning: analysisResult.reasoning,
      risks: analysisResult.risks || [],
      recommendations: analysisResult.recommendations || []
    };
    
  } catch (error) {
    console.error("Error analyzing image with Bedrock:", error);
    throw new Error(`Bedrock analysis failed: ${error.message}`);
  }
}

// Alternative method using base64 image data
export async function analyzeImageWithBedrockBase64(
  imageBase64: string, 
  imageType: string, 
  request: Omit<ImageAnalysisRequest, 'imageUrl'>
): Promise<ImageAnalysisResponse> {
  try {
    console.log("Analyzing image with AWS Bedrock (base64)");
    
    const systemPrompt = `You are an expert contest judge specializing in image evaluation. You will be given an image and contest criteria. Analyze the actual image content and rate it based on the contest requirements. CRITICAL: You must base your rating ONLY on what you actually see in the image. If the image does not contain the required subject matter, you MUST give a very low score (0-20 out of 100). Be extremely strict about matching contest requirements. Return a JSON object with: rating (integer based on maxScore), summary (string), reasoning (string), risks (array of strings), recommendations (array of strings). Return only valid JSON.`;

    const userPrompt = `
Contest Type: ${request.contestType}
Contest Prompt: ${request.contestPrompt}
Judging Criteria: ${request.judgingCriteria.join(', ')}
Maximum Score: ${request.maxScore}

Please analyze this image and rate it based on the contest criteria. Return your analysis in the specified JSON format.
`;

    // Prepare the request body for Claude 3.5 Sonnet
    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1500,
      temperature: 0.1,
      top_p: 0.1,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageType,
                data: imageBase64
              }
            }
          ]
        }
      ],
      system: systemPrompt
    };

    // Invoke the model
    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      body: JSON.stringify(requestBody),
      contentType: "application/json",
    });

    const response = await bedrockClient.send(command);
    
    // Parse the response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const content = responseBody.content[0].text;
    
    console.log("Bedrock response:", content);
    
    // Parse the JSON response
    const analysisResult = JSON.parse(content);
    
    return {
      rating: analysisResult.rating,
      summary: analysisResult.summary,
      reasoning: analysisResult.reasoning,
      risks: analysisResult.risks || [],
      recommendations: analysisResult.recommendations || []
    };
    
  } catch (error) {
    console.error("Error analyzing image with Bedrock (base64):", error);
    throw new Error(`Bedrock analysis failed: ${error.message}`);
  }
}
