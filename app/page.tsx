"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import "./../app/app.css";
import "@aws-amplify/ui-react/styles.css";
import { client, useAIGeneration } from "../lib/client";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import CreateBoard from "./components/CreateBoard";
import BoardList from "./components/BoardList";
import OwnerDashboard from "./components/OwnerDashboard";
import ThemeDemo from "./components/ThemeDemo";
import { isAdmin } from "../lib/utils";

// Configure Amplify if not already configured
if (!Amplify.getConfig().Auth) {
  console.log("Configuring Amplify in page component...");
  Amplify.configure(outputs);
  console.log("Amplify configured successfully in page component");
}

export default function App() {
  // ---- Auth ----
  const { signOut, user } = useAuthenticator();

  // ---- Todos (unchanged) ----
  const [todos, setTodos] = useState<Array<any>>([]);

  useEffect(() => {
    const sub = client.models.Todo.observeQuery().subscribe({
      next: (data: any) => setTodos([...data.items]),
    });
    return () => sub.unsubscribe();
  }, []);

  function createTodo() {
    client.models.Todo.create({
      content: window.prompt("Todo content") || "",
    });
  }
  function deleteTodo(id: string) {
    client.models.Todo.delete({ id });
  }

  // ---- AI Scoring using Gen2 hooks (Legacy) ----
  type Analysis = any;
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [active, setActive] = useState<Analysis | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const [hasProcessedScore, setHasProcessedScore] = useState(false);
  const [manualScoredData, setManualScoredData] = useState<any>(null);
  
  // Extract email prefix (characters before @) for display
  const getDisplayName = (email: string) => {
    return email.split('@')[0] || email;
  };
  
  const loginId = user?.signInDetails?.loginId ?? "User";
  const displayName = getDisplayName(loginId);

  // Use the official Gen2 AI generation hook
  const [{ data: scored, isLoading: loadingScore }, generateScore] = useAIGeneration("scoreTask");

  console.log("AI Generation hook state:", { scored, loadingScore, generateScore });

  // Debug: Monitor when scored data changes
  useEffect(() => {
    console.log("scored data changed:", scored);
    if (scored) {
      console.log("scored data details:", JSON.stringify(scored, null, 2));
      console.log("Current state - hasProcessedScore:", hasProcessedScore, "currentPrompt:", currentPrompt);
      console.log("Will attempt save:", !hasProcessedScore && currentPrompt);
    }
  }, [scored, hasProcessedScore, currentPrompt]);

  // Debug: Monitor manual scored data
  useEffect(() => {
    if (manualScoredData) {
      console.log("Manual scored data set:", manualScoredData);
      console.log("Current state - hasProcessedScore:", hasProcessedScore, "currentPrompt:", currentPrompt);
      console.log("Will attempt save:", !hasProcessedScore && currentPrompt);
    }
  }, [manualScoredData, hasProcessedScore, currentPrompt]);

  // Live query of recent analyses, newest first
  useEffect(() => {
    const sub = client.models.Analysis
      .observeQuery()
      .subscribe({
        next: (data: any) => {
          // sort newest first for display consistency
          const items = [...data.items].sort((a: any, b: any) =>
            (b.createdAt || "").localeCompare(a.createdAt || "")
          );
          setAnalyses(items);
        },
      });
    return () => sub.unsubscribe();
  }, []);

  // Trigger AI scoring using Gen2 hooks (Legacy)
  async function handleScore() {
    const prompt = window.prompt("Describe the task to analyze:");
    if (!prompt) return;
    
    // Reset state for new score
    setCurrentPrompt(prompt);
    setHasProcessedScore(false);
    setManualScoredData(null);
    
    console.log("Starting AI generation with prompt:", prompt);
    console.log("Current user:", user);
    
    try {
      console.log("Calling generateScore...");
      console.log("Input parameters:", { prompt, context: "Task analysis request" });
      
      // Try the hook first
      const result = await generateScore({ prompt, context: "Task analysis request" });
      console.log("generateScore result:", result);
      
      if (result === undefined) {
        console.warn("generateScore returned undefined - trying direct client approach...");
        
        // Try using the client directly to see if we get better error information
        try {
          console.log("Trying direct client.generations.scoreTask...");
          const directResult = await client.generations.scoreTask({
            prompt,
            context: "Task analysis request"
          });
          console.log("Direct client result:", directResult);
          
          if (directResult.data) {
            console.log("Direct client succeeded with data:", directResult.data);
            // Manually update the scored data since the hook isn't working
            // This will trigger the save useEffect
            setManualScoredData(directResult.data);
          } else if (directResult.errors) {
            console.error("Direct client errors:", directResult.errors);
            console.error("Error details:", JSON.stringify(directResult.errors, null, 2));
            
            // Show the first error message
            const firstError = directResult.errors[0];
            console.error("First error:", firstError);
            
            alert(`AI generation failed: ${firstError?.message || JSON.stringify(directResult.errors)}`);
          }
        } catch (directError: any) {
          console.error("Direct client error:", directError);
          alert(`Direct client error: ${directError?.message || 'Unknown error'}`);
        }
      }
      
    } catch (e: any) {
      console.error("Error in handleScore:", e);
      console.error("Error details:", {
        name: e?.name,
        message: e?.message,
        stack: e?.stack,
        cause: e?.cause
      });
      alert(`Error triggering score: ${e?.message || 'Unknown error'}`);
    }
  }

  // Save the scored result when it's available (Legacy)
  useEffect(() => {
    // Check both hook data and manual data
    const dataToSave = scored || manualScoredData;
    
    if (dataToSave && !hasProcessedScore && currentPrompt) {
      console.log("Saving new analysis with prompt:", currentPrompt);
      console.log("Scored data to save:", dataToSave);
      console.log("Owner email:", loginId);
      console.log("Data source:", scored ? "hook" : "manual");
      
      // Validate required fields
      if (!currentPrompt || !dataToSave || !loginId) {
        console.error("Missing required fields for save:", { currentPrompt, dataToSave, loginId });
        alert("Missing required data for save. Please try again.");
        return;
      }
      
      // Mark as processing to prevent duplicate saves
      setHasProcessedScore(true);
      
      // Save the result to the Analysis model
      client.models.Analysis.create({
        prompt: currentPrompt,
        context: "Task analysis request",
        result: dataToSave,
        ownerEmail: loginId, // Store the user's email for display
      }).then(({ data: saved, errors: saveErr }) => {
        if (saveErr?.length) {
          console.error("Save errors:", saveErr);
          console.error("Error details:", JSON.stringify(saveErr, null, 2));
          alert("Failed to save analysis result.");
          // Reset the flag so user can try again
          setHasProcessedScore(false);
        } else {
          console.log("Analysis saved successfully:", saved);
          // Clear the prompt and manual data after successful save
          setCurrentPrompt("");
          setManualScoredData(null);
        }
      }).catch((error) => {
        console.error("Exception during save:", error);
        alert(`Save exception: ${error.message || 'Unknown error'}`);
        // Reset the flag so user can try again
        setHasProcessedScore(false);
      });
    }
  }, [scored, manualScoredData, hasProcessedScore, currentPrompt, loginId]);

  // Simple modal UI
  function openModal(item: Analysis) {
    setActive(item);
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setActive(null);
  }

  // Nicely formatted date
  const fmt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString() : "";

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome, {displayName}!
        </h1>
        <p className="text-gray-600">
          Choose a contest board to submit your entries for AI judging, or create a new contest board if you're an admin.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Contest boards allow you to create specific competitions (like "Best Boy Names", "Recipe Contest", etc.) with consistent judging criteria.
        </p>
      </div>

      {/* Admin Controls */}
      <div className="mb-8">
        <CreateBoard 
          onBoardCreated={() => window.location.reload()} 
          isAdmin={isAdmin(loginId)} 
          userEmail={loginId}
        />
        
        {/* Lambda Test Link */}
        <div className="mt-4">
          <a 
            href="/lambda-test" 
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            🧪 Test Lambda Functions (EXIF & Rekognition)
          </a>
        </div>
      </div>



      {/* Board List */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Available Boards</h2>
        <BoardList userEmail={loginId} />
      </div>

      {/* Legacy Section - Keeping for backward compatibility */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Legacy AI Scoring</h2>
        <p className="text-gray-600 mb-4">
          This is the old AI scoring system. Use the boards above for the new organized approach.
        </p>
        
        <button 
          onClick={handleScore} 
          disabled={loadingScore}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {loadingScore ? "Scoring…" : "Legacy Score with AI"}
        </button>

        {/* Recent scores list */}
        {analyses.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Legacy Scores</h3>
            <ul className="space-y-3">
              {analyses.map((a: any) => (
                <li
                  key={a.id}
                  onClick={() => openModal(a)}
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <strong className="text-lg">
                      Rating: {a.result.rating}/100
                    </strong>
                    <span className="text-sm text-gray-500">{fmt(a.createdAt)}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Submitted by:</strong> {a.ownerEmail ? getDisplayName(a.ownerEmail) : "unknown"}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Summary:</strong> {a.result.summary}
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Prompt:</strong> {a.prompt}
                  </div>
                </li>
              ))}
            </ul>
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

      {/* Modal */}
      {modalOpen && active && (
        <div
          onClick={closeModal}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                Rating: {active.result.rating}/100
              </h3>
              <button 
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <strong className="block text-sm font-medium text-gray-700 mb-1">Prompt</strong>
                <div className="text-gray-900">{active.prompt}</div>
              </div>
              
              {active.context && (
                <div>
                  <strong className="block text-sm font-medium text-gray-700 mb-1">Context</strong>
                  <div className="text-gray-900">{active.context}</div>
                </div>
              )}
              
              <div>
                <strong className="block text-sm font-medium text-gray-700 mb-1">Summary</strong>
                <div className="text-gray-900">{active.result.summary}</div>
              </div>
              
              <div>
                <strong className="block text-sm font-medium text-gray-700 mb-1">Reasoning</strong>
                <div className="text-gray-900 whitespace-pre-wrap">{active.result.reasoning}</div>
              </div>
              
              {!!active.result.risks?.length && (
                <div>
                  <strong className="block text-sm font-medium text-gray-700 mb-1">Risks</strong>
                  <ul className="list-disc list-inside text-gray-900">
                    {active.result.risks.map((r: any, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {!!active.result.recommendations?.length && (
                <div>
                  <strong className="block text-sm font-medium text-gray-700 mb-1">Recommendations</strong>
                  <ul className="list-disc list-inside text-gray-900">
                    {active.result.recommendations.map((r: any, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
                <div>Submitted by: {active.ownerEmail ? getDisplayName(active.ownerEmail) : "unknown"}</div>
                <div>Created: {fmt(active.createdAt)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Theme Demo - Only visible to site owner */}
      <ThemeDemo />

      {/* Owner Dashboard - Only visible to site owner */}
      <OwnerDashboard />
    </main>
  );
}
