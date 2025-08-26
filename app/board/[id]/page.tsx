"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { client, useAIGeneration } from "@/lib/client";
import { getDisplayName, canSubmitToBoard } from "@/lib/utils";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";

// Configure Amplify if not already configured
if (!Amplify.getConfig().Auth) {
  Amplify.configure(outputs);
}

interface Board {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  maxSubmissionsPerUser: number;
  createdBy: string;
  allowedEmails?: string[];
  createdAt: string;
}

interface Submission {
  id: string;
  boardId: string;
  prompt: string;
  context?: string;
  result: {
    rating: number;
    summary: string;
    reasoning: string;
    risks: string[];
    recommendations: string[];
  };
  ownerEmail: string;
  boardName: string;
  createdAt: string;
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

        const boardData = boards[0];
        setBoard(boardData);

        // Check submission limits
        const limitCheck = await canSubmitToBoard(boardId, loginId, client);
        setSubmissionLimit(limitCheck);

        // Fetch submissions for this board
        const { data: submissionsData, errors: submissionErrors } = await client.models.Submission.list({
          filter: { boardId: { eq: boardId } }
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
    if (!submissionLimit.canSubmit) {
      alert(`You have reached the maximum number of submissions (${submissionLimit.maxAllowed}) for this board.`);
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
            <span className={`px-3 py-1 text-sm rounded-full ${
              board.isPublic 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {board.isPublic ? 'Public Board' : 'Private Board'}
            </span>
            <p className="text-sm text-gray-500 mt-1">
              Created by {getDisplayName(board.createdBy)}
            </p>
          </div>
        </div>
      </div>

      {/* Submission Controls */}
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

      {/* Submissions List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6">Recent Submissions</h2>
        
        {submissions.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            No submissions yet. Be the first to submit!
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-semibold text-gray-900">
                        Rating: {submission.result.rating}/100
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(submission.createdAt).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Submitted by:</strong> {getDisplayName(submission.ownerEmail)}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Prompt:</strong> {submission.prompt}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Summary:</strong> {submission.result.summary}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
