"use client";

import { useState, useEffect } from 'react';
import {
  Card,
  Flex,
  Heading,
  Text,
  Button,
  Alert,
  Badge,
  Divider,
  Loader,
} from '@aws-amplify/ui-react';
import { uploadData, getUrl } from 'aws-amplify/storage';
import { extractImageMetadata, ImageMetadata, validateImageForContest } from '../../lib/imageMetadata';
import { client } from '../../lib/client';

interface ConversationJudgingProps {
  boardId: string;
  boardName: string;
  contestType: string;
  contestPrompt: string;
  judgingCriteria: string[];
  maxScore: number;
  userEmail: string;
  onSubmissionComplete: (result: any) => void;
  onError: (error: string) => void;
}

interface ConversationSubmission {
  id: string;
  imageUrl: string;
  imageKey: string;
  result: any;
  submissionDate: string;
  isProcessed: boolean;
}

export default function ConversationJudging({
  boardId,
  boardName,
  contestType,
  contestPrompt,
  judgingCriteria,
  maxScore,
  userEmail,
  onSubmissionComplete,
  onError,
}: ConversationJudgingProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const [conversation, setConversation] = useState<any>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  const [previousSubmissions, setPreviousSubmissions] = useState<ConversationSubmission[]>([]);

  // Initialize or load conversation
  useEffect(() => {
    initializeConversation();
  }, [boardId]);

  const initializeConversation = async () => {
    try {
      setIsLoadingConversation(true);
      
      // Check if conversation already exists for this board
      const { data: existingConversations } = await client.models.ContestConversation.list({
        filter: { boardId: { eq: boardId } }
      });

      let conversationRecord = existingConversations?.[0];

      if (!conversationRecord) {
        // Create new conversation
        const { data: newConversation } = await client.models.ContestConversation.create({
          boardId,
          boardName,
          contestType,
          contestPrompt,
          judgingCriteria,
          maxScore,
          ownerEmail: userEmail,
        });
        conversationRecord = newConversation;
      }

      // Initialize Amplify AI Conversation
      const conversation = client.conversations.chat({
        systemPrompt: `You are an expert contest judge specializing in image evaluation. You are judging a "${contestType}" contest with the prompt: "${contestPrompt}".

Judging Criteria: ${judgingCriteria.join(', ')}
Maximum Score: ${maxScore}

You will receive images to judge. For each image, analyze it carefully and provide a structured response in JSON format with:
- rating: integer (0 to ${maxScore})
- summary: string (brief description of what you see)
- reasoning: string (detailed explanation of your rating)
- risks: array of strings (potential issues or concerns)
- recommendations: array of strings (suggestions for improvement)

Be consistent in your judging and consider previous submissions to maintain fairness. If an image doesn't match the contest requirements, give a low score (0-20). Return only valid JSON.`,
      });

      setConversation(conversation);
      
      // Load previous submissions for context
      await loadPreviousSubmissions();
      
    } catch (error) {
      console.error('Error initializing conversation:', error);
      onError('Failed to initialize AI conversation');
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const loadPreviousSubmissions = async () => {
    try {
      // Load previous submissions for this board to show context
      const { data: submissions } = await client.models.ImageSubmission.list({
        filter: { 
          boardId: { eq: boardId },
          isDeleted: { ne: true }
        }
      });

      const formattedSubmissions = submissions?.map(sub => ({
        id: sub.id,
        imageUrl: sub.imageUrl || '',
        imageKey: sub.imageKey || '',
        result: sub.result,
        submissionDate: sub.submissionDate || '',
        isProcessed: sub.isProcessed || false,
      })) || [];

      setPreviousSubmissions(formattedSubmissions);
    } catch (error) {
      console.error('Error loading previous submissions:', error);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Extract and validate metadata
    try {
      const extractedMetadata = await extractImageMetadata(file);
      setMetadata(extractedMetadata);
      
      const validation = validateImageForContest(extractedMetadata, userEmail);
      setValidationResult(validation);
      
      if (!validation.isValid) {
        onError(`Image validation failed: ${validation.reasons.join(', ')}`);
      }
    } catch (error) {
      console.error('Error extracting metadata:', error);
      onError('Failed to analyze image metadata');
    }
  };

  const convertImageToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || !conversation || !validationResult?.isValid) return;

    setIsUploading(true);
    
    try {
      // Upload image to S3
      const imageKey = `conversation-judging/${boardId}/${Date.now()}-${selectedFile.name}`;
      const { result } = await uploadData({
        key: imageKey,
        data: selectedFile,
        options: {
          accessLevel: 'public',
        },
      }).result;

      const imageUrl = await getUrl({
        key: imageKey,
        options: {
          accessLevel: 'public',
        },
      }).result.toString();

      // Convert image to base64 for conversation
      const imageBase64 = await convertImageToBase64(selectedFile);
      const imageFormat = selectedFile.type.split('/')[1] || 'jpeg';

      console.log('Sending image to AI conversation for judging...');

      // Send image to conversation for judging
      const { data: message, errors } = await conversation.sendMessage({
        content: [
          {
            text: `Please judge this image for the "${contestType}" contest. The prompt is: "${contestPrompt}". Judging criteria: ${judgingCriteria.join(', ')}. Maximum score: ${maxScore}.`,
          },
          {
            image: {
              format: imageFormat,
              source: {
                bytes: new Uint8Array(atob(imageBase64).split('').map(c => c.charCodeAt(0))),
              },
            },
          },
        ],
      });

      if (errors) {
        throw new Error(`AI conversation error: ${errors[0]?.message}`);
      }

      // Listen for AI response
      const subscription = conversation.onStreamEvent({
        next: async (event: any) => {
          console.log('Conversation event:', event);
          
          if (event.type === 'conversationStreamTurnDone') {
            // Get the final response
            const { data: messages } = await conversation.listMessages();
            const lastMessage = messages?.[messages.length - 1];
            
            if (lastMessage && lastMessage.role === 'assistant') {
              try {
                // Parse the AI response as JSON
                const aiResult = JSON.parse(lastMessage.content);
                
                // Create submission record
                const { data: submission } = await client.models.ImageSubmission.create({
                  boardId,
                  imageUrl,
                  imageKey,
                  imageSize: selectedFile.size,
                  imageType: selectedFile.type,
                  prompt: null,
                  context: contestPrompt,
                  ownerEmail: userEmail,
                  boardName,
                  submissionDate: new Date().toISOString(),
                  isProcessed: true,
                  result: aiResult,
                  // Store metadata if available
                  fileName: metadata?.fileName || null,
                  lastModified: metadata?.lastModified?.toISOString() || null,
                  deviceMake: metadata?.exifData?.make || null,
                  deviceModel: metadata?.exifData?.model || null,
                  software: metadata?.exifData?.software || null,
                  gpsLatitude: metadata?.exifData?.gps?.latitude || null,
                  gpsLongitude: metadata?.exifData?.gps?.longitude || null,
                  imageWidth: metadata?.exifData?.image?.width || null,
                  imageHeight: metadata?.exifData?.image?.height || null,
                  orientation: metadata?.exifData?.image?.orientation || null,
                });

                // Update conversation record
                await client.models.ContestConversation.update({
                  id: conversation.id,
                  totalSubmissions: (conversation.totalSubmissions || 0) + 1,
                  lastSubmissionDate: new Date().toISOString(),
                });

                onSubmissionComplete(aiResult);
                
                // Reset form
                setSelectedFile(null);
                setPreviewUrl(null);
                setMetadata(null);
                setValidationResult(null);
                setShowValidationDetails(false);
                
                // Reload previous submissions
                await loadPreviousSubmissions();
                
              } catch (parseError) {
                console.error('Error parsing AI response:', parseError);
                onError('AI response was not in expected format');
              }
            }
          }
        },
        error: (error: any) => {
          console.error('Conversation stream error:', error);
          onError(`AI conversation failed: ${error.message}`);
        },
      });

      // Clean up subscription after a timeout
      setTimeout(() => {
        subscription.unsubscribe();
      }, 30000);

    } catch (error: any) {
      console.error('Error in conversation judging:', error);
      onError(`Failed to judge image: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setMetadata(null);
    setValidationResult(null);
    setShowValidationDetails(false);
  };

  if (isLoadingConversation) {
    return (
      <Card>
        <Flex direction="column" alignItems="center" gap="medium">
          <Loader size="large" />
          <Text>Initializing AI conversation...</Text>
        </Flex>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Contest Information */}
      <Card>
        <Heading level={4} marginBottom="medium">
          🤖 AI Conversation Judging
        </Heading>
        <Text fontSize="0.875rem" color="gray-600" marginBottom="medium">
          This board uses a persistent AI conversation that learns from previous submissions to provide more consistent and contextual judging.
        </Text>
        
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <Text fontSize="0.875rem" fontWeight="semibold" color="blue-800">
            Contest: {contestType}
          </Text>
          <Text fontSize="0.875rem" color="blue-700">
            {contestPrompt}
          </Text>
          <Text fontSize="0.75rem" color="blue-600" marginTop="small">
            Criteria: {judgingCriteria.join(', ')} | Max Score: {maxScore}
          </Text>
        </div>
      </Card>

      {/* Previous Submissions Context */}
      {previousSubmissions.length > 0 && (
        <Card>
          <Heading level={5} marginBottom="medium">
            📊 Previous Submissions ({previousSubmissions.length})
          </Heading>
          <div className="space-y-2">
            {previousSubmissions.slice(-3).map((submission) => (
              <div key={submission.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                  <Text fontSize="0.75rem">📷</Text>
                </div>
                <div className="flex-1">
                  <Text fontSize="0.75rem" fontWeight="medium">
                    Score: {submission.result?.rating || 'N/A'}/{maxScore}
                  </Text>
                  <Text fontSize="0.75rem" color="gray-600">
                    {new Date(submission.submissionDate).toLocaleDateString()}
                  </Text>
                </div>
                <Badge variation={submission.isProcessed ? "success" : "warning"} size="small">
                  {submission.isProcessed ? "Judged" : "Pending"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Image Upload */}
      <Card>
        <Heading level={5} marginBottom="medium">
          📸 Submit New Image
        </Heading>
        
        <div className="space-y-4">
          {/* File Input */}
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="space-y-2">
              <Text fontSize="0.875rem" fontWeight="medium">Preview:</Text>
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-48 object-contain rounded border"
                />
                <Button
                  onClick={handleRemoveFile}
                  variation="link"
                  size="small"
                  className="absolute top-2 right-2 bg-white bg-opacity-80"
                >
                  ✕
                </Button>
              </div>
            </div>
          )}

          {/* Validation */}
          {validationResult && (
            <div>
              <Badge 
                variation={validationResult.isValid ? "success" : "error"} 
                size="small"
              >
                {validationResult.isValid ? "✅ Valid" : "❌ Invalid"} ({validationResult.score}/100)
              </Badge>
              <Button
                onClick={() => setShowValidationDetails(!showValidationDetails)}
                variation="link"
                size="small"
                className="ml-2"
              >
                {showValidationDetails ? "Hide Details" : "Show Details"}
              </Button>
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            variation="primary"
            size="small"
            isDisabled={!selectedFile || !validationResult?.isValid || isUploading}
            isLoading={isUploading}
          >
            {isUploading ? "Judging with AI..." : "Submit for AI Judging"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
