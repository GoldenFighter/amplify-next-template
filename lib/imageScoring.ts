import { analyzeImage, type ImageAnalysisResult } from './imageAnalysis';

// Scoring criteria types
export interface ScoringCriteria {
  creativity: number; // 0-100
  technical: number; // 0-100
  composition: number; // 0-100
  relevance: number; // 0-100
  originality: number; // 0-100
  overall: number; // 0-100
}

// Contest-specific scoring prompts
export interface ContestScoringPrompt {
  analysisType: 'general' | 'document' | 'art' | 'product' | 'medical';
  documentType?: string;
  expectedFields: string[];
  specificQuestions: string[];
  contestTheme: string;
  scoringCriteria: string[];
}

// Scoring result from image analysis
export interface ImageScoringResult {
  success: boolean;
  score?: ScoringCriteria;
  analysis?: any; // Raw analysis data
  error?: string;
  processingTime?: number;
  contestId: string;
  submissionId: string;
  userId: string;
  timestamp: string;
}

// Contest type definitions
export type ContestType = 'photography' | 'art' | 'design' | 'document' | 'general';

// Predefined scoring prompts for different contest types
export const CONTEST_SCORING_PROMPTS: Record<ContestType, ContestScoringPrompt> = {
  photography: {
    analysisType: 'general',
    expectedFields: [
      'composition_quality',
      'lighting_quality',
      'focus_sharpness',
      'color_balance',
      'subject_interest',
      'technical_excellence'
    ],
    specificQuestions: [
      'Rate the composition quality from 1-10',
      'How well is the image lit? Rate 1-10',
      'Is the image in focus and sharp? Rate 1-10',
      'How balanced are the colors? Rate 1-10',
      'How interesting is the subject matter? Rate 1-10',
      'Rate the overall technical quality 1-10'
    ],
    contestTheme: 'photography contest',
    scoringCriteria: ['composition', 'technical', 'creativity', 'relevance', 'originality']
  },
  art: {
    analysisType: 'art',
    expectedFields: [
      'artistic_style',
      'color_harmony',
      'composition_balance',
      'emotional_impact',
      'technical_skill',
      'originality'
    ],
    specificQuestions: [
      'What artistic style is this? Rate the style execution 1-10',
      'How harmonious are the colors? Rate 1-10',
      'How well balanced is the composition? Rate 1-10',
      'What emotional impact does this have? Rate 1-10',
      'Rate the technical skill shown 1-10',
      'How original is this artwork? Rate 1-10'
    ],
    contestTheme: 'art contest',
    scoringCriteria: ['creativity', 'technical', 'composition', 'relevance', 'originality']
  },
  design: {
    analysisType: 'product',
    expectedFields: [
      'design_quality',
      'visual_hierarchy',
      'color_scheme',
      'typography',
      'brand_consistency',
      'user_appeal'
    ],
    specificQuestions: [
      'Rate the overall design quality 1-10',
      'How effective is the visual hierarchy? Rate 1-10',
      'How well chosen is the color scheme? Rate 1-10',
      'Rate the typography choices 1-10',
      'How consistent is this with good design principles? Rate 1-10',
      'How appealing would this be to users? Rate 1-10'
    ],
    contestTheme: 'design contest',
    scoringCriteria: ['creativity', 'technical', 'composition', 'relevance', 'originality']
  },
  document: {
    analysisType: 'document',
    documentType: 'submission',
    expectedFields: [
      'clarity',
      'completeness',
      'formatting',
      'readability',
      'professionalism',
      'accuracy'
    ],
    specificQuestions: [
      'How clear is this document? Rate 1-10',
      'How complete is the information? Rate 1-10',
      'Rate the formatting quality 1-10',
      'How readable is this document? Rate 1-10',
      'How professional does this look? Rate 1-10',
      'Rate the apparent accuracy 1-10'
    ],
    contestTheme: 'document contest',
    scoringCriteria: ['technical', 'relevance', 'composition', 'creativity', 'originality']
  },
  general: {
    analysisType: 'general',
    expectedFields: [
      'visual_appeal',
      'content_quality',
      'technical_quality',
      'creativity',
      'relevance',
      'overall_impact'
    ],
    specificQuestions: [
      'How visually appealing is this image? Rate 1-10',
      'Rate the content quality 1-10',
      'How good is the technical quality? Rate 1-10',
      'How creative is this submission? Rate 1-10',
      'How relevant is this to the contest theme? Rate 1-10',
      'Rate the overall impact 1-10'
    ],
    contestTheme: 'general contest',
    scoringCriteria: ['creativity', 'technical', 'composition', 'relevance', 'originality']
  }
};

/**
 * Score an image submission using AI analysis
 * @param imageUrl - URL of the image to score
 * @param contestType - Type of contest (photography, art, design, etc.)
 * @param contestTheme - Specific theme of the contest
 * @param contestId - ID of the contest
 * @param submissionId - ID of the submission
 * @param userId - ID of the user who submitted
 * @returns Promise with scoring result
 */
export async function scoreImageSubmission(
  imageUrl: string,
  contestType: ContestType,
  contestTheme: string,
  contestId: string,
  submissionId: string,
  userId: string
): Promise<ImageScoringResult> {
  try {
    const startTime = Date.now();
    
    // Get the scoring prompt for this contest type
    const scoringPrompt = CONTEST_SCORING_PROMPTS[contestType];
    
    // Customize the prompt with the specific contest theme
    const customizedPrompt = {
      ...scoringPrompt,
      specificQuestions: scoringPrompt.specificQuestions.map(question => 
        question.replace('contest', contestTheme)
      ),
      contestTheme
    };

    console.log('Scoring image with prompt:', customizedPrompt);

    // Analyze the image with the scoring prompt
    const analysisResult = await analyzeImage(imageUrl, {
      analysisType: customizedPrompt.analysisType,
      documentType: customizedPrompt.documentType,
      expectedFields: customizedPrompt.expectedFields,
      specificQuestions: customizedPrompt.specificQuestions,
    });

    if (!analysisResult.success || !analysisResult.data) {
      return {
        success: false,
        error: analysisResult.error || 'Analysis failed',
        contestId,
        submissionId,
        userId,
        timestamp: new Date().toISOString(),
      };
    }

    // Extract scores from the analysis result
    const scores = extractScoresFromAnalysis(analysisResult.data, customizedPrompt.scoringCriteria);
    
    const processingTime = Date.now() - startTime;

    return {
      success: true,
      score: scores,
      analysis: analysisResult.data,
      processingTime,
      contestId,
      submissionId,
      userId,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Error scoring image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      contestId,
      submissionId,
      userId,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Extract numerical scores from the AI analysis result
 * @param analysisData - Raw analysis data from Claude
 * @param scoringCriteria - List of criteria to score
 * @returns ScoringCriteria object with numerical scores
 */
function extractScoresFromAnalysis(analysisData: any, scoringCriteria: string[]): ScoringCriteria {
  // Default scores
  const scores: ScoringCriteria = {
    creativity: 50,
    technical: 50,
    composition: 50,
    relevance: 50,
    originality: 50,
    overall: 50,
  };

  try {
    // Try to extract scores from specific questions in the analysis
    if (analysisData.objects && Array.isArray(analysisData.objects)) {
      // Use object confidence as a base for technical quality
      const avgConfidence = analysisData.objects.reduce((sum: number, obj: any) => 
        sum + (obj.confidence || 0), 0) / analysisData.objects.length;
      scores.technical = Math.round(avgConfidence * 100);
    }

    // Extract from technical analysis
    if (analysisData.technical) {
      if (analysisData.technical.quality === 'high') scores.technical = Math.max(scores.technical, 80);
      if (analysisData.technical.quality === 'medium') scores.technical = Math.max(scores.technical, 60);
      if (analysisData.technical.quality === 'low') scores.technical = Math.min(scores.technical, 40);
    }

    // Extract from composition analysis
    if (analysisData.composition) {
      let compositionScore = 50;
      if (analysisData.composition.ruleOfThirds) compositionScore += 20;
      if (analysisData.composition.symmetry) compositionScore += 15;
      if (analysisData.composition.leadingLines) compositionScore += 15;
      scores.composition = Math.min(100, compositionScore);
    }

    // Extract from scene analysis for creativity and relevance
    if (analysisData.scene) {
      if (analysisData.scene.mood) {
        const moodWords = analysisData.scene.mood.toLowerCase();
        if (moodWords.includes('creative') || moodWords.includes('unique')) {
          scores.creativity = Math.max(scores.creativity, 70);
        }
        if (moodWords.includes('professional') || moodWords.includes('polished')) {
          scores.technical = Math.max(scores.technical, 70);
        }
      }
    }

    // Use tags to determine originality and creativity
    if (analysisData.tags && Array.isArray(analysisData.tags)) {
      const creativeTags = ['creative', 'unique', 'original', 'artistic', 'innovative'];
      const creativeTagCount = analysisData.tags.filter((tag: string) => 
        creativeTags.some(creativeTag => tag.toLowerCase().includes(creativeTag))
      ).length;
      scores.creativity = Math.min(100, 50 + (creativeTagCount * 10));
      scores.originality = Math.min(100, 50 + (creativeTagCount * 8));
    }

    // Calculate overall score as average of all criteria
    scores.overall = Math.round(
      (scores.creativity + scores.technical + scores.composition + scores.relevance + scores.originality) / 5
    );

    // Ensure all scores are within 0-100 range
    Object.keys(scores).forEach(key => {
      const scoreKey = key as keyof ScoringCriteria;
      scores[scoreKey] = Math.max(0, Math.min(100, scores[scoreKey]));
    });

  } catch (error) {
    console.error('Error extracting scores from analysis:', error);
    // Return default scores if extraction fails
  }

  return scores;
}

/**
 * Get a human-readable score description
 * @param score - Numerical score (0-100)
 * @returns String description of the score
 */
export function getScoreDescription(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 50) return 'Average';
  if (score >= 40) return 'Below Average';
  if (score >= 30) return 'Poor';
  return 'Very Poor';
}

/**
 * Format scores for display
 * @param scores - ScoringCriteria object
 * @returns Formatted string with all scores
 */
export function formatScores(scores: ScoringCriteria): string {
  return Object.entries(scores)
    .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}/100 (${getScoreDescription(value)})`)
    .join('\n');
}
