import { generateClient } from 'aws-amplify/data';
import { type Schema } from '@/amplify/data/resource';

// Type for the Claude analysis result
interface ClaudeAnalysisResult {
  objects?: Array<{
    name: string;
    confidence: number;
    description: string;
  }>;
  scene?: {
    description: string;
    setting: string;
    mood: string;
  };
  text?: {
    detected: boolean;
    content: string;
    language: string;
  };
  colors?: {
    dominant: string[];
    palette: string[];
  };
  composition?: {
    ruleOfThirds: boolean;
    symmetry: boolean;
    leadingLines: boolean;
  };
  technical?: {
    quality: string;
    lighting: string;
    focus: string;
  };
  summary: string;
  tags: string[];
  metadata?: {
    estimatedDate: string;
    location: string;
    camera: string;
  };
}

// Type for the Lambda function response
interface LambdaResponse {
  success: boolean;
  data?: ClaudeAnalysisResult;
  error?: string;
  processingTime: number;
}

// Type for the GraphQL response
type AnalyzeImageResponse = Schema['analyzeImage']['returnType'];

export interface ImageAnalysisOptions {
  analysisType?: 'general' | 'document' | 'art' | 'product' | 'medical';
  documentType?: string;
  expectedFields?: string[];
  specificQuestions?: string[];
  // Removed metadata parameter to simplify and avoid GraphQL validation issues
}

export interface ImageAnalysisResult {
  success: boolean;
  data?: ClaudeAnalysisResult;
  error?: string;
  analysisType?: string;
  timestamp?: string;
}

/**
 * Analyze an image using Claude 3.5 Sonnet via Amplify Data client (Gen 2 best practice)
 * @param imageUrl - URL of the image to analyze
 * @param options - Analysis options
 * @returns Promise with analysis result
 */
export async function analyzeImage(
  imageUrl: string, 
  options: ImageAnalysisOptions = {}
): Promise<ImageAnalysisResult> {
  try {
    const { analysisType, documentType, expectedFields, specificQuestions } = options;

    // Use the client-side Data client (Amplify Gen 2 best practice)
    const client = generateClient<Schema>();
    
    const { data, errors } = await client.queries.analyzeImage({
      imageUrl,
      analysisType,
      documentType,
      expectedFields,
      specificQuestions,
      // Removed metadata parameter to avoid GraphQL validation issues
    });

    if (errors?.length) {
      const errorMessages = errors.map(error => 
        typeof error === 'string' ? error : JSON.stringify(error)
      );
      throw new Error(`Analysis failed: ${errorMessages.join(', ')}`);
    }

    if (!data) {
      throw new Error('No analysis result received');
    }

    console.log('Raw GraphQL response:', JSON.stringify(data, null, 2));
    
    // The GraphQL response contains the Lambda response directly
    // The Lambda returns: { success: true, data: parsedResult, processingTime }
    let lambdaResponse: LambdaResponse;
    if (typeof data === 'string') {
      lambdaResponse = JSON.parse(data);
    } else {
      lambdaResponse = data as LambdaResponse;
    }
    
    console.log('Parsed Lambda response:', JSON.stringify(lambdaResponse, null, 2));
    
    if (!lambdaResponse.success) {
      throw new Error(lambdaResponse.error || 'Analysis failed');
    }
    
    const resultData = lambdaResponse.data;
    console.log('Extracted result data:', JSON.stringify(resultData, null, 2));
    
    return {
      success: true,
      data: resultData,
      analysisType: analysisType || 'general',
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Image analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Analyze a document image for structured data extraction
 * @param imageUrl - URL of the document image
 * @param documentType - Type of document (form, invoice, contract, etc.)
 * @param expectedFields - Fields to extract from the document
 * @returns Promise with document analysis result
 */
export async function analyzeDocument(
  imageUrl: string,
  documentType?: string,
  expectedFields?: string[]
): Promise<ImageAnalysisResult> {
  return analyzeImage(imageUrl, {
    analysisType: 'document',
    documentType,
    expectedFields,
  });
}

/**
 * Get a presigned URL for uploading images to S3
 * @param fileName - Name of the file to upload
 * @param contentType - MIME type of the file
 * @returns Promise with presigned URL
 */
export async function getImageUploadUrl(fileName: string, contentType: string): Promise<string> {
  try {
    // This would typically use Amplify's uploadData function
    // For now, return a placeholder - you'll need to implement this based on your storage setup
    throw new Error('Image upload URL generation not implemented yet');
  } catch (error) {
    console.error('Error generating upload URL:', error);
    throw error;
  }
}

/**
 * Validate image file before upload
 * @param file - File object to validate
 * @returns Validation result with error message if invalid
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  // Check supported formats
  const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!supportedTypes.includes(file.type)) {
    return { valid: false, error: 'Unsupported image format. Please use JPEG, PNG, GIF, or WebP' };
  }

  return { valid: true };
}

/**
 * Format analysis result for display
 * @param result - Analysis result from Claude
 * @param analysisType - Type of analysis performed
 * @returns Formatted result object
 */
export function formatAnalysisResult(result: any, analysisType: string = 'general') {
  if (analysisType === 'document') {
    return {
      documentType: result.documentType,
      confidence: result.confidence,
      extractedData: result.extractedData,
      textContent: result.textContent,
      quality: result.quality,
      metadata: result.metadata,
    };
  }

  return {
    summary: result.summary,
    objects: result.objects,
    scene: result.scene,
    text: result.text,
    colors: result.colors,
    composition: result.composition,
    technical: result.technical,
    tags: result.tags,
    metadata: result.metadata,
  };
}
