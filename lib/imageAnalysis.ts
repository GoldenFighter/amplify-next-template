import { serverClient } from './amplifyServerClient';

export interface ImageAnalysisOptions {
  analysisType?: 'general' | 'document' | 'art' | 'product' | 'medical';
  documentType?: string;
  expectedFields?: string[];
  specificQuestions?: string[];
}

export interface ImageAnalysisResult {
  success: boolean;
  data?: any;
  error?: string;
  analysisType?: string;
  timestamp?: string;
}

/**
 * Analyze an image using Claude 3.5 Sonnet
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

    if (errors?.length) {
      throw new Error(`Analysis failed: ${errors.join(', ')}`);
    }

    if (!result) {
      throw new Error('No analysis result received');
    }

    return {
      success: true,
      data: result,
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
