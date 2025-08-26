"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { client, useAIGeneration } from "../../../lib/client";
import { getDisplayName, canSubmitToBoard, isAdmin } from "../../../lib/utils";
import SubmissionsView from "../../components/SubmissionsView";
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

    const prompt = window.prompt("Describe the task to analyze:");
    if (!prompt) return;
    
    // Reset state for new score
    setCurrentPrompt(prompt);
    setHasProcessedScore(false);
    setManualScoredData(null);
    
    try {
      const result = await generateScore({ prompt, context: "Task analysis request" });
      
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
    } catch (error: any) {
      console.error("Error in handleScore:", error);
      alert(`Error triggering score: ${error.message || 'Unknown error'}`);
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{board.name}</h1>
            {board.description && (
              <p className="text-gray-600 text-lg">{board.description}</p>
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
            <h2 className="text-xl font-semibold">Submit New Analysis</h2>
            <div className="text-sm text-gray-600">
              {submissionLimit.currentCount} / {submissionLimit.maxAllowed} submissions used
            </div>
          </div>
          
          {submissionLimit.canSubmit ? (
            <button
              onClick={handleScore}
              disabled={loadingScore}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingScore ? "Generating..." : "Submit for AI Analysis"}
            </button>
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
