"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { client, useAIGeneration } from "../../../lib/client";
import { getDisplayName, canSubmitToBoard, isAdmin, checkSubmissionFrequency } from "../../../lib/utils";
import { scoreImageSubmission, type ContestType } from "../../../lib/imageScoring";
import { Button } from "@aws-amplify/ui-react";

import SubmissionsView from "../../components/SubmissionsView";
import ImageUpload from "../../components/ImageUpload";
import { Amplify } from "aws-amplify";
import outputs from "../../../amplify_outputs.json";

// Configure Amplify if not already configured
if (!Amplify.getConfig().Auth) {
  Amplify.configure(outputs);
}

// Function to analyze image content and create a detailed description for AI
async function analyzeImageContent(imageUrl: string, imageType: string, imageSize: number, userPrompt?: string): Promise<string> {
  try {
    // Get detailed image information
    const imageInfo = await getDetailedImageInfo(imageUrl);
    
    // Create a comprehensive description that focuses on what's actually in the image
    const description = [
      `DETAILED IMAGE ANALYSIS:`,
      `Image contains: ${imageInfo.contentDescription}`,
      `Main subjects: ${imageInfo.subjects}`,
      `Visual elements: ${imageInfo.visualElements}`,
      `Color scheme: ${imageInfo.colors}`,
      `Composition: ${imageInfo.composition}`,
      `Technical quality: ${imageInfo.quality}`,
      `Image dimensions: ${imageInfo.width}×${imageInfo.height}px`,
      `File details: ${imageType}, ${Math.round(imageSize / 1024)}KB`,
      'Image-only submission - no additional text context provided',
    ].join(' ');
    
    return description;
  } catch (error) {
    console.error('Error analyzing image:', error);
    // Fallback with basic info
    return `Image Analysis Error. File: ${imageType}, ${Math.round(imageSize / 1024)}KB. Image-only submission - no text context. Please analyze the actual image content carefully.`;
  }
}

// Generate a simple hash for the image based on its URL and properties
async function generateImageHash(imageUrl: string): Promise<string> {
  try {
    // Create a hash based on the image URL and current timestamp
    // This ensures each image gets a unique identifier
    const data = `${imageUrl}-${Date.now()}-${Math.random()}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  } catch (error) {
    // Fallback to a simple random string
    return Math.random().toString(36).substring(2, 18);
  }
}

// Get detailed image information for better AI analysis
async function getDetailedImageInfo(imageUrl: string): Promise<{
  width: number;
  height: number;
  contentDescription: string;
  subjects: string;
  visualElements: string;
  colors: string;
  composition: string;
  quality: string;
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Create canvas to analyze the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          
          // Get image data for detailed analysis
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Perform detailed analysis
          const colors = analyzeColors(imageData);
          const composition = analyzeComposition(canvas.width, canvas.height);
          const quality = analyzeImageQuality(imageData, canvas.width, canvas.height);
          const subjects = analyzeSubjects(imageData, canvas.width, canvas.height);
          const visualElements = analyzeVisualElements(imageData, canvas.width, canvas.height);
          const contentDescription = generateDetailedDescription(canvas.width, canvas.height, colors, subjects, visualElements);
          
          resolve({
            width: canvas.width,
            height: canvas.height,
            contentDescription,
            subjects,
            visualElements,
            colors,
            composition,
            quality,
          });
        } else {
          resolve(getFallbackDetailedInfo());
        }
      } catch (error) {
        console.error('Error analyzing image:', error);
        resolve(getFallbackDetailedInfo());
      }
    };
    
    img.onerror = () => {
      resolve(getFallbackDetailedInfo());
    };
    
    img.src = imageUrl;
  });
}

// Analyze dominant colors in the image
function analyzeColors(imageData: ImageData): string {
  const data = imageData.data;
  const colorCounts: { [key: string]: number } = {};
  
  // Sample every 10th pixel for performance
  for (let i = 0; i < data.length; i += 40) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    if (a > 128) { // Only count non-transparent pixels
      const color = `${r},${g},${b}`;
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    }
  }
  
  // Get top 3 colors
  const sortedColors = Object.entries(colorCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([color]) => `rgb(${color})`);
  
  return sortedColors.join(', ');
}

// Analyze image composition
function analyzeComposition(width: number, height: number): string {
  const aspectRatio = width / height;
  
  if (aspectRatio > 1.5) return 'Landscape orientation, wide format';
  if (aspectRatio < 0.7) return 'Portrait orientation, tall format';
  if (aspectRatio > 0.9 && aspectRatio < 1.1) return 'Square format';
  return 'Standard rectangular format';
}

// Generate a basic image description
function generateImageDescription(width: number, height: number, colors: string): string {
  const size = width * height;
  const megapixels = (size / 1000000).toFixed(1);
  
  return `High-resolution image (${megapixels}MP) with ${width}×${height} dimensions. Dominant colors include ${colors}.`;
}

// Analyze image quality based on pixel data
function analyzeImageQuality(imageData: ImageData, width: number, height: number): string {
  const data = imageData.data;
  let totalBrightness = 0;
  let totalContrast = 0;
  let pixelCount = 0;
  
  // Sample pixels for performance
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    if (a > 128) {
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      pixelCount++;
    }
  }
  
  const avgBrightness = totalBrightness / pixelCount;
  const resolution = width * height;
  
  let quality = 'Unknown';
  if (resolution > 2000000) quality = 'High resolution';
  else if (resolution > 500000) quality = 'Medium resolution';
  else quality = 'Low resolution';
  
  if (avgBrightness < 50) quality += ', very dark';
  else if (avgBrightness > 200) quality += ', very bright';
  else quality += ', good lighting';
  
  return quality;
}

// Analyze potential subjects in the image
function analyzeSubjects(imageData: ImageData, width: number, height: number): string {
  const data = imageData.data;
  let edgeCount = 0;
  let colorVariation = 0;
  let previousR = 0, previousG = 0, previousB = 0;
  
  // Sample pixels to detect edges and color variation
  for (let i = 0; i < data.length; i += 20) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    if (a > 128) {
      // Detect edges by comparing with previous pixel
      const edgeStrength = Math.abs(r - previousR) + Math.abs(g - previousG) + Math.abs(b - previousB);
      if (edgeStrength > 50) edgeCount++;
      
      // Calculate color variation
      colorVariation += Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
      
      previousR = r;
      previousG = g;
      previousB = b;
    }
  }
  
  let subjects = 'Unknown content';
  if (edgeCount > 1000) subjects = 'Complex scene with many details';
  else if (edgeCount > 500) subjects = 'Moderate detail level';
  else subjects = 'Simple or uniform content';
  
  if (colorVariation > 10000) subjects += ', high color variation';
  else if (colorVariation > 5000) subjects += ', moderate color variation';
  else subjects += ', low color variation';
  
  return subjects;
}

// Analyze visual elements in the image
function analyzeVisualElements(imageData: ImageData, width: number, height: number): string {
  const data = imageData.data;
  let totalPixels = 0;
  let transparentPixels = 0;
  let darkPixels = 0;
  let brightPixels = 0;
  
  // Sample pixels for analysis
  for (let i = 0; i < data.length; i += 12) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    totalPixels++;
    
    if (a < 128) {
      transparentPixels++;
    } else {
      const brightness = (r + g + b) / 3;
      if (brightness < 85) darkPixels++;
      else if (brightness > 170) brightPixels++;
    }
  }
  
  const transparency = (transparentPixels / totalPixels) * 100;
  const darkness = (darkPixels / totalPixels) * 100;
  const brightness = (brightPixels / totalPixels) * 100;
  
  let elements = '';
  if (transparency > 10) elements += 'Transparent areas, ';
  if (darkness > 30) elements += 'Dark areas, ';
  if (brightness > 30) elements += 'Bright areas, ';
  
  elements += `Overall contrast level: ${darkness > 20 && brightness > 20 ? 'High' : 'Low'}`;
  
  return elements || 'Standard visual elements';
}

// Generate detailed description based on analysis
function generateDetailedDescription(width: number, height: number, colors: string, subjects: string, visualElements: string): string {
  const aspectRatio = width / height;
  const megapixels = (width * height / 1000000).toFixed(1);
  
  let description = `Image with ${megapixels}MP resolution (${width}×${height}px)`;
  
  if (aspectRatio > 1.5) description += ', landscape orientation';
  else if (aspectRatio < 0.7) description += ', portrait orientation';
  else description += ', square or standard format';
  
  description += `. ${subjects}. Visual characteristics: ${visualElements}. Color palette: ${colors}`;
  
  return description;
}

// Fallback detailed info when analysis fails
function getFallbackDetailedInfo() {
  return {
    width: 0,
    height: 0,
    contentDescription: 'Image analysis unavailable - please examine the actual image content',
    subjects: 'Unknown subjects',
    visualElements: 'Unknown visual elements',
    colors: 'Unknown colors',
    composition: 'Unknown composition',
    quality: 'Unknown quality',
  };
}

interface Board {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean | null;
  maxSubmissionsPerUser: number | null;
  createdBy: string;
  allowedUsers: (string | null)[] | null;
  allowedEmails: (string | null)[] | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  isActive: boolean | null;
  submissionFrequency: string | null;
  lastEditedAt: string | null;
  lastEditedBy: string | null;
  contestPrompt: string | null;
  contestType: string | null;
  judgingCriteria: (string | null)[] | null;
  maxScore: number | null;
  allowImageSubmissions: boolean | null;
  maxImageSize: number | null;
  allowedImageTypes: (string | null)[] | null;
}

interface Submission {
  id: string;
  boardId: string;
  prompt: string;
  context: string | null;
  result: {
    rating: number;
    summary: string;
    reasoning: string;
    risks: (string | null)[];
    recommendations: (string | null)[];
  };
  ownerEmail: string;
  boardName: string;
  createdAt: string;
  updatedAt: string;
  submissionDate: string | null;
  isDeleted: boolean | null;
}

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const { user, signOut } = useAuthenticator();
  const boardId = params.id as string;
  
  const [board, setBoard] = useState<Board | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionLimit, setSubmissionLimit] = useState({ canSubmit: false, currentCount: 0, maxAllowed: 2 });
  const [lastSubmissionTime, setLastSubmissionTime] = useState<number>(0);
  
  // AI Generation state
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const [hasProcessedScore, setHasProcessedScore] = useState(false);
  const [manualScoredData, setManualScoredData] = useState<any>(null);
  const [{ data: scored, isLoading: loadingScore }, generateScore] = useAIGeneration("scoreTask");

  const loginId = user?.signInDetails?.loginId ?? "User";
  const displayName = getDisplayName(loginId);

  // Check if board is expired or inactive
  const isBoardActive = (board: Board) => {
    if (!board.isActive) return false;
    
    if (board.expiresAt) {
      const now = new Date();
      const expiration = new Date(board.expiresAt);
      return expiration > now;
    }
    
    return true;
  };

  // Use the improved frequency checking function from utils
  const checkFrequencyLimit = async (board: Board, userEmail: string) => {
    return await checkSubmissionFrequency(board, userEmail, client);
  };

  // Test AI generation endpoint
  const testAIGeneration = async () => {
    try {
      console.log("Testing AI generation endpoint...");
      const testResult = await client.generations.scoreTask({
        prompt: "Test prompt for AI generation",
        context: "Testing if AI generation is working"
      });
      console.log("AI generation test result:", testResult);
      return testResult;
    } catch (error) {
      console.error("AI generation test failed:", error);
      return null;
    }
  };

  useEffect(() => {
    const fetchBoardData = async () => {
      try {
        // Fetch board details
        const { data: boards, errors: boardErrors } = await client.models.Board.list({
          filter: { id: { eq: boardId } }
        });
        
        if (boardErrors?.length || !boards?.length) {
          alert("Board not found");
          router.push("/");
          return;
        }

        const boardData = boards[0] as Board;
        setBoard(boardData);

        // Check submission limits
        const limitCheck = await canSubmitToBoard(boardId, loginId, client);
        setSubmissionLimit(limitCheck);

        // Test AI generation endpoint
        await testAIGeneration();

        // Fetch submissions for this board (excluding deleted ones)
        const { data: submissionsData, errors: submissionErrors } = await client.models.Submission.list({
          filter: { 
            boardId: { eq: boardId },
            isDeleted: { ne: true }
          }
        });

        if (submissionErrors?.length) {
          console.error("Error fetching submissions:", submissionErrors);
        } else {
          // Sort by newest first
          const sortedSubmissions = submissionsData.sort((a: Submission, b: Submission) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setSubmissions(sortedSubmissions);
        }
      } catch (error) {
        console.error("Error fetching board data:", error);
        alert("Failed to load board data");
      } finally {
        setLoading(false);
      }
    };

    if (boardId && loginId) {
      fetchBoardData();
    }
  }, [boardId, loginId, router]);

  // Save the scored result when it's available
  useEffect(() => {
    const dataToSave = scored || manualScoredData;
    
    if (dataToSave && !hasProcessedScore && currentPrompt && board) {
      console.log("Saving new submission with prompt:", currentPrompt);
      
      // Mark as processing to prevent duplicate saves
      setHasProcessedScore(true);
      
      // Save the result to the Submission model
      client.models.Submission.create({
        boardId: board.id,
        prompt: currentPrompt,
        context: "Task analysis request",
        result: dataToSave,
        ownerEmail: loginId,
        boardName: board.name,
        submissionDate: new Date().toISOString(),
      }).then(({ data: saved, errors: saveErr }) => {
        if (saveErr?.length) {
          console.error("Save errors:", saveErr);
          alert("Failed to save submission result.");
          setHasProcessedScore(false);
        } else {
          console.log("Submission saved successfully:", saved);
          setCurrentPrompt("");
          setManualScoredData(null);
          // Refresh the page to show new submission
          window.location.reload();
        }
      }).catch((error) => {
        console.error("Exception during save:", error);
        alert(`Save exception: ${error.message || 'Unknown error'}`);
        setHasProcessedScore(false);
      });
    }
  }, [scored, manualScoredData, hasProcessedScore, currentPrompt, loginId, board]);

  const handleScore = async () => {
    if (!board) return;
    
    if (!isBoardActive(board)) {
      alert("This board is no longer active or has expired.");
      return;
    }

    if (!submissionLimit.canSubmit) {
      alert(`You have reached the maximum number of submissions (${submissionLimit.maxAllowed}) for this board.`);
      return;
    }

    // Check frequency limits
    const frequencyOk = await checkFrequencyLimit(board, loginId);
    if (!frequencyOk) {
      const frequencyText = board.submissionFrequency === 'daily' ? 'today' : 
                           board.submissionFrequency === 'weekly' ? 'this week' : 'this month';
      alert(`You have reached the maximum submissions for ${frequencyText}.`);
      return;
    }

    // Use contest-specific prompt if available, otherwise fall back to generic prompt
    let prompt: string;
    if (board.contestPrompt) {
      prompt = window.prompt(`Contest Question: ${board.contestPrompt}\n\nYour submission:`) || "";
    } else {
      prompt = window.prompt("Describe the task to analyze:") || "";
    }
    
    if (!prompt) return;
    
    // Reset state for new score
    setCurrentPrompt(prompt);
    setHasProcessedScore(false);
    setManualScoredData(null);
    
    try {
      let result;
      
      // Use contest-specific scoring if available, otherwise fall back to generic scoring
      if (board.contestType && board.contestPrompt && board.judgingCriteria && board.maxScore) {
        // Use contest-specific scoring
        result = await client.generations.scoreContest({
          submission: prompt,
          contestType: board.contestType,
          contestPrompt: board.contestPrompt,
          judgingCriteria: board.judgingCriteria.filter(c => c !== null) as string[],
          maxScore: board.maxScore,
        });
        
        if (result.data) {
          setManualScoredData(result.data);
        } else if (result.errors) {
          alert(`AI generation failed: ${result.errors[0]?.message || 'Unknown error'}`);
        }
      } else {
        // Fall back to generic scoring
        result = await generateScore({ prompt, context: "Task analysis request" });
        
        if (result === undefined) {
          // Try direct client approach
          const directResult = await client.generations.scoreTask({
            prompt,
            context: "Task analysis request"
          });
          
          if (directResult.data) {
            setManualScoredData(directResult.data);
          } else if (directResult.errors) {
            alert(`AI generation failed: ${directResult.errors[0]?.message || 'Unknown error'}`);
          }
        }
      }
    } catch (error: any) {
      console.error("Error in handleScore:", error);
      alert(`Error triggering score: ${error.message || 'Unknown error'}`);
    }
  };

  const handleImageUpload = async (imageUrl: string, imageKey: string, imageSize: number, imageType: string, metadata?: any) => {
    if (!board) return;
    
    if (!isBoardActive(board)) {
      alert("This board is no longer active or has expired.");
      return;
    }

    console.log("Image upload attempt for user:", loginId);
    console.log("Current submission limit:", submissionLimit);

    // Rate limiting: prevent submissions within 5 seconds of each other
    const now = Date.now();
    const timeSinceLastSubmission = now - lastSubmissionTime;
    if (timeSinceLastSubmission < 5000) { // 5 seconds
      const remainingTime = Math.ceil((5000 - timeSinceLastSubmission) / 1000);
      alert(`Please wait ${remainingTime} more seconds before submitting again.`);
      return;
    }

    // Double-check submission limits before processing
    const currentLimitCheck = await canSubmitToBoard(board.id, loginId, client);
    console.log("Fresh limit check:", currentLimitCheck);
    
    if (!currentLimitCheck.canSubmit) {
      alert(`You have reached the maximum number of submissions (${currentLimitCheck.maxAllowed}) for this board.`);
      return;
    }

    // Check frequency limits
    const frequencyOk = await checkFrequencyLimit(board, loginId);
    console.log("Frequency check result:", frequencyOk);
    
    if (!frequencyOk) {
      const frequencyText = board.submissionFrequency === 'daily' ? 'today' : 
                           board.submissionFrequency === 'weekly' ? 'this week' : 
                           board.submissionFrequency === 'monthly' ? 'this month' : 'for this board';
      alert(`You have reached the maximum submissions for ${frequencyText}.`);
      return;
    }

    // No text prompt needed - image-only submission
    const prompt = "";

    try {
      // Create image submission record with metadata
      await client.models.ImageSubmission.create({
        boardId: board.id,
        imageUrl,
        imageKey,
        imageSize,
        imageType,
        prompt: prompt || null,
        context: board.contestPrompt || null,
        ownerEmail: loginId,
        boardName: board.name,
        submissionDate: new Date().toISOString(),
        isProcessed: false,
        // Store metadata if available
        fileName: metadata?.fileName || null,
        lastModified: metadata?.lastModified?.toISOString() || null,
        deviceMake: metadata?.exifData?.make || null,
        deviceModel: metadata?.exifData?.model || null,
        software: metadata?.exifData?.software || null,
        gpsLatitude: metadata?.exifData?.gps?.latitude || null,
        gpsLongitude: metadata?.exifData?.gps?.longitude || null,
        imageWidth: metadata?.exifData?.camera?.focalLength ? 
          parseInt(metadata.exifData.camera.focalLength.split('x')[0]) : null,
        imageHeight: metadata?.exifData?.camera?.focalLength ? 
          parseInt(metadata.exifData.camera.focalLength.split('x')[1]) : null,
        orientation: metadata?.exifData?.orientation || null,
      });

      // Generate AI evaluation for the image
      console.log("Board contest fields:", {
        contestType: board.contestType,
        contestPrompt: board.contestPrompt,
        judgingCriteria: board.judgingCriteria,
        maxScore: board.maxScore
      });

      if (board.contestType && board.contestPrompt && board.judgingCriteria && board.maxScore) {
        try {
          console.log("Starting AI analysis...");
          console.log("Using image URL for AI analysis:", imageUrl);
          
          console.log("Calling AI generation with parameters:", {
            imageUrl: imageUrl,
            contestType: board.contestType,
            contestPrompt: board.contestPrompt,
            judgingCriteria: board.judgingCriteria.filter(c => c !== null) as string[],
            maxScore: board.maxScore
          });

          // Use our comprehensive scoring system
          console.log("Attempting comprehensive AI scoring...");
          
          // Map board contest type to our scoring system contest type
          const contestTypeMapping: Record<string, ContestType> = {
            'photography': 'photography',
            'art': 'art',
            'design': 'design',
            'document': 'document',
            'image-based': 'general',
            'general': 'general'
          };
          
          const contestType = contestTypeMapping[board.contestType.toLowerCase()] || 'general';
          
          const scoringResult = await scoreImageSubmission(
            imageUrl,
            contestType,
            board.contestPrompt,
            board.id,
            `submission-${Date.now()}`,
            loginId
          );
          
          // Convert our scoring format to the expected format
          const result = {
            data: scoringResult.success && scoringResult.score ? {
              rating: Math.round(scoringResult.score.overall * (board.maxScore / 100)),
              summary: `Comprehensive AI Analysis - Overall Score: ${scoringResult.score.overall}/100`,
              reasoning: `Creativity: ${scoringResult.score.creativity}/100, Technical: ${scoringResult.score.technical}/100, Composition: ${scoringResult.score.composition}/100, Relevance: ${scoringResult.score.relevance}/100, Originality: ${scoringResult.score.originality}/100`,
              risks: [],
              recommendations: [],
              // Store the full scoring data for detailed display
              detailedScores: scoringResult.score,
              processingTime: scoringResult.processingTime,
              analysisData: scoringResult.analysis
            } : null,
            errors: scoringResult.success ? null : [scoringResult.error]
          };
          console.log("Amplify AI result received:", result);

          console.log("Final AI result:", result);
          console.log("AI result data:", result.data);
          console.log("AI result errors:", result.errors);

          if (result.data) {
            console.log("Updating submission with AI result...");
            
            // Find the submission we just created
            const submissions = await client.models.ImageSubmission.list({
              filter: { imageKey: { eq: imageKey } }
            });
            
            if (submissions.data && submissions.data.length > 0) {
              const submissionId = submissions.data[0].id;
              console.log("Updating submission ID:", submissionId);
              
              await client.models.ImageSubmission.update({
                id: submissionId,
                result: result.data,
                isProcessed: true,
              });
              
              console.log("AI result saved successfully");
            } else {
              console.error("Could not find submission to update");
            }
          } else {
            console.error("No AI result data received:", result);
            console.error("Full result object:", JSON.stringify(result, null, 2));
            
            // Check if there are errors in the result
            if (result.errors && result.errors.length > 0) {
              console.error("AI generation errors:", result.errors);
              alert(`AI analysis failed: ${result.errors[0] || 'Unknown error'}`);
            } else {
              alert("Image uploaded successfully, but AI analysis returned no results. Please try again.");
            }
            return;
          }
        } catch (aiError: any) {
          console.error("AI processing error:", aiError);
          console.error("Error details:", {
            message: aiError?.message,
            stack: aiError?.stack,
            name: aiError?.name
          });
          alert(`Image uploaded successfully, but AI analysis failed: ${aiError?.message || 'Unknown error'}. Please try again.`);
          return;
        }
      } else {
        console.warn("Board missing contest configuration:", {
          hasContestType: !!board.contestType,
          hasContestPrompt: !!board.contestPrompt,
          hasJudgingCriteria: !!board.judgingCriteria,
          hasMaxScore: !!board.maxScore
        });
        alert("Image uploaded successfully, but this board is not configured for AI judging.");
      }

      // Update last submission time for rate limiting
      setLastSubmissionTime(Date.now());
      
      alert("Image uploaded successfully! The AI is evaluating your submission.");
      window.location.reload();
    } catch (error: any) {
      console.error("Error uploading image:", error);
      alert(`Failed to upload image: ${error.message || 'Unknown error'}`);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading board...</div>;
  }

  if (!board) {
    return <div className="text-center py-8">Board not found</div>;
  }

  const boardActive = isBoardActive(board);

  return (
    <main className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/")}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Boards
        </button>
        
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{board.name}</h1>
            {board.contestType && (
              <p className="text-lg sm:text-xl text-blue-600 font-semibold mb-2">{board.contestType}</p>
            )}
            {board.contestPrompt && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-3">
                <p className="text-base sm:text-lg text-blue-800 font-medium mb-2">Contest Question:</p>
                <p className="text-blue-700 text-sm sm:text-lg">{board.contestPrompt}</p>
              </div>
            )}
            {board.description && (
              <p className="text-gray-600 text-sm sm:text-lg">{board.description}</p>
            )}
            {board.judgingCriteria && board.judgingCriteria.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Judging Criteria:</p>
                <div className="flex flex-wrap gap-2">
                  {board.judgingCriteria.map((criteria, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                    >
                      {criteria}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="text-right">
            <div className="flex gap-2 mb-2">
              <span className={`px-3 py-1 text-sm rounded-full ${
                board.isPublic === true
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {board.isPublic === true ? 'Public Board' : 'Private Board'}
              </span>
              <span className={`px-3 py-1 text-sm rounded-full ${
                boardActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {boardActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Created by {getDisplayName(board.createdBy)}
            </p>
            {board.expiresAt && (
              <p className="text-sm text-gray-500">
                Expires: {new Date(board.expiresAt).toLocaleString()}
              </p>
            )}
            {board.submissionFrequency && board.submissionFrequency !== 'unlimited' && (
              <p className="text-sm text-gray-500">
                Limit: {board.submissionFrequency} submissions
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Submission Controls */}
      {boardActive ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h2 className="text-lg sm:text-xl font-semibold">Submit New Entry</h2>
            <div className="flex items-center gap-4">
              <div className="text-xs sm:text-sm text-gray-600">
                {submissionLimit.currentCount} / {submissionLimit.maxAllowed} submissions used
              </div>
              
              {/* AI Generation Test Button - Only show for owner */}
              {isAdmin(loginId) && (
                <Button
                  onClick={testAIGeneration}
                  variation="primary"
                  size="small"
                >
                  🧪 Test AI
                </Button>
              )}
            </div>
          </div>
          
          {board.contestPrompt && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-2">What to submit:</p>
              <p className="text-gray-800 font-medium">{board.contestPrompt}</p>
            </div>
          )}
          
          {submissionLimit.canSubmit ? (
            <div className="space-y-4">
              {/* Image Submission Only */}
              {board.allowImageSubmissions ? (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-3">📸 Image Submission</h3>
                  <ImageUpload
                    boardId={board.id}
                    boardName={board.name}
                    userEmail={loginId}
                    maxImageSize={board.maxImageSize || 5242880}
                    allowedImageTypes={board.allowedImageTypes?.filter(t => t !== null) as string[] || ['image/jpeg', 'image/png', 'image/gif']}
                    onImageUploaded={handleImageUpload}
                    onError={(error) => alert(error)}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>This board does not allow image submissions.</p>
                  <p className="text-sm mt-2">Contact the board creator to enable image uploads.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-2">
                You have reached the maximum number of submissions for this board.
              </p>
              <p className="text-sm text-gray-500">
                Contact the board creator if you need more submissions.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">Board Inactive</h2>
            <p className="text-yellow-700">
              {board.expiresAt && new Date(board.expiresAt) < new Date() 
                ? "This board has expired and is no longer accepting submissions."
                : "This board is currently inactive and not accepting submissions."
              }
            </p>
          </div>
        </div>
      )}

      {/* Submissions List */}
      <SubmissionsView 
        boardId={board.id}
        boardName={board.name}
        userEmail={loginId}
        isAdmin={isAdmin(loginId)}
        contestType={board.contestType}
        maxScore={board.maxScore}
      />

      {/* Sign Out */}
      <div className="mt-8 text-center">
        <button
          onClick={signOut}
          className="text-gray-600 hover:text-gray-800"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
