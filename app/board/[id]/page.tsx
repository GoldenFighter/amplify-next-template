"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { client, useAIGeneration } from "../../../lib/client";
import { getDisplayName, canSubmitToBoard, isAdmin } from "../../../lib/utils";
import SubmissionsView from "../../components/SubmissionsView";
import ImageUpload from "../../components/ImageUpload";
import { Amplify } from "aws-amplify";
import outputs from "../../../amplify_outputs.json";

// Configure Amplify if not already configured
if (!Amplify.getConfig().Auth) {
  Amplify.configure(outputs);
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

  // Check submission frequency limits
  const checkFrequencyLimit = async (board: Board, userEmail: string) => {
    if (board.submissionFrequency === 'unlimited') return true;
    
    const now = new Date();
    let startDate = new Date();
    
    switch (board.submissionFrequency) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        return true;
    }
    
    const { data: recentSubmissions } = await client.models.Submission.list({
      filter: {
        boardId: { eq: board.id },
        ownerEmail: { eq: userEmail },
        submissionDate: { ge: startDate.toISOString() }
      }
    });
    
    return (recentSubmissions?.length || 0) < (board.maxSubmissionsPerUser || 2);
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

  const handleImageUpload = async (imageUrl: string, imageKey: string, imageSize: number, imageType: string) => {
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

    // Get optional text prompt for the image
    let prompt = "";
    if (board.contestPrompt) {
      prompt = window.prompt(`Contest Question: ${board.contestPrompt}\n\nOptional text description for your image:`) || "";
    } else {
      prompt = window.prompt("Optional text description for your image:") || "";
    }

    try {
      // Create image submission record
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
      });

      // Generate AI evaluation for the image
      if (board.contestType && board.contestPrompt && board.judgingCriteria && board.maxScore) {
        // For now, we'll use a placeholder description since we don't have image analysis yet
        // In a real implementation, you'd use AWS Rekognition or similar to analyze the image
        const imageDescription = `Image uploaded: ${imageType}, ${Math.round(imageSize / 1024)}KB. ${prompt ? `Description: ${prompt}` : 'No description provided.'}`;
        
        const result = await client.generations.scoreImageContest({
          imageDescription,
          contestType: board.contestType,
          contestPrompt: board.contestPrompt,
          judgingCriteria: board.judgingCriteria.filter(c => c !== null) as string[],
          maxScore: board.maxScore,
          prompt: prompt || null,
        });

        if (result.data) {
          // Update the image submission with the AI result
          await client.models.ImageSubmission.update({
            id: (await client.models.ImageSubmission.list({
              filter: { imageKey: { eq: imageKey } }
            })).data?.[0]?.id,
            result: result.data,
            isProcessed: true,
          });
        }
      }

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
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/")}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Boards
        </button>
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{board.name}</h1>
            {board.contestType && (
              <p className="text-xl text-blue-600 font-semibold mb-2">{board.contestType}</p>
            )}
            {board.contestPrompt && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                <p className="text-lg text-blue-800 font-medium mb-2">Contest Question:</p>
                <p className="text-blue-700 text-lg">{board.contestPrompt}</p>
              </div>
            )}
            {board.description && (
              <p className="text-gray-600 text-lg">{board.description}</p>
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
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Submit New Entry</h2>
            <div className="text-sm text-gray-600">
              {submissionLimit.currentCount} / {submissionLimit.maxAllowed} submissions used
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
              {/* Text Submission */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-3">📝 Text Submission</h3>
                <button
                  onClick={handleScore}
                  disabled={loadingScore}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingScore ? "Generating..." : "Submit Text Entry"}
                </button>
              </div>

              {/* Image Submission */}
              {board.allowImageSubmissions && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-3">📸 Image Submission</h3>
                  <ImageUpload
                    boardId={board.id}
                    boardName={board.name}
                    maxImageSize={board.maxImageSize || 5242880}
                    allowedImageTypes={board.allowedImageTypes?.filter(t => t !== null) as string[] || ['image/jpeg', 'image/png', 'image/gif']}
                    onImageUploaded={handleImageUpload}
                    onError={(error) => alert(error)}
                  />
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
