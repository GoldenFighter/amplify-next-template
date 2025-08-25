"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import "./../app/app.css";
//import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import { client, useAIGeneration } from "@/lib/client";

//Amplify.configure(outputs);

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

  // ---- AI Scoring using Gen2 hooks ----
  type Analysis = any;
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [active, setActive] = useState<Analysis | null>(null);
  const loginId = user?.signInDetails?.loginId ?? "User";

  // Use the official Gen2 AI generation hook
  const [{ data: scored, isLoading: loadingScore }, generateScore] = useAIGeneration("scoreTask");

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

  // Trigger AI scoring using Gen2 hooks
  async function handleScore() {
    const prompt = window.prompt("Describe the task to analyze:");
    if (!prompt) return;
    
    try {
      // Use the Gen2 generation hook
      generateScore({ 
        prompt, 
        context: "Task analysis request" 
      });
    } catch (e) {
      console.error(e);
      alert("Error triggering score.");
    }
  }

  // Save the scored result when it's available
  useEffect(() => {
    if (scored) {
      // Save the result to the Analysis model
      client.models.Analysis.create({
        prompt: "Task analysis request", // You might want to store the actual prompt
        context: "Task analysis request",
        result: scored
      }).then(({ data: saved, errors: saveErr }) => {
        if (saveErr?.length) {
          console.error(saveErr);
          alert("Failed to save analysis result.");
        } else {
          console.log("Analysis saved successfully:", saved);
        }
      });
    }
  }, [scored]);

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
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      {/* ---- Todos section (unchanged) ---- */}
      <h1>{loginId}&apos;s todos</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={createTodo}>+ new</button>
      </div>
      <ul>
        {todos.map((todo: any) => (
          <li
            key={todo.id}
            onClick={() => deleteTodo(todo.id)}
            style={{
              cursor: "pointer",
              padding: "6px 8px",
              borderBottom: "1px solid #eee",
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 8,
              alignItems: "center",
            }}
            title="Click to delete"
          >
            <span>{todo.content}</span>
            <small style={{ opacity: 0.6 }}>{todo.owner}</small>
            <small style={{ opacity: 0.6 }}>{String(todo.isDone ?? false)}</small>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #ddd" }}>
        {/* ---- AI Scoring controls ---- */}
        <h2>AI Scoring</h2>
        <button onClick={handleScore} disabled={loadingScore}>
          {loadingScore ? "Scoring…" : "Score with AI"}
        </button>

        {/* ---- Recent scores list ---- */}
        <h3 style={{ marginTop: 16 }}>Recent scores</h3>
        {!analyses.length && <div>No scores yet.</div>}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {analyses.map((a: any) => (
            <li
              key={a.id}
              onClick={() => openModal(a)}
              style={{
                border: "1px solid #eee",
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                cursor: "pointer",
              }}
              title="Click to view details"
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>
                  Rating: {a.result.rating}/100
                </strong>
                <span style={{ opacity: 0.7 }}>{fmt(a.createdAt)}</span>
              </div>
              <div style={{ marginTop: 4, opacity: 0.9 }}>
                <b>Submitted by:</b> {a.owner || "unknown"}
              </div>
              <div style={{ marginTop: 6 }}>
                <b>Summary:</b> {a.result.summary}
              </div>
              <div style={{ marginTop: 4, opacity: 0.8 }}>
                <b>Prompt:</b> {a.prompt}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ---- Footer ---- */}
      <div style={{ marginTop: 24 }}>
        🥳 App successfully hosted. Try creating a new todo and running a score.
        <br />
        <a href="https://docs.amplify.aws/nextjs/start/quickstart/nextjs-app-router-client-components/">
          Review next steps of this tutorial.
        </a>
      </div>
      <button onClick={signOut} style={{ marginTop: 12 }}>
        Sign out
      </button>

      {/* ---- Modal ---- */}
      {modalOpen && active && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              padding: 16,
              borderRadius: 10,
              maxWidth: 720,
              width: "95%",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>
                Rating: {active.result.rating}/100
              </h3>
              <button onClick={closeModal}>Close</button>
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ margin: "8px 0" }}>
                <b>Prompt</b>
                <div>{active.prompt}</div>
              </div>
              {active.context && (
                <div style={{ margin: "8px 0" }}>
                  <b>Context</b>
                  <div>{active.context}</div>
                </div>
              )}
              <div style={{ margin: "8px 0" }}>
                <b>Summary</b>
                <div>{active.result.summary}</div>
              </div>
              <div style={{ margin: "8px 0" }}>
                <b>Reasoning</b>
                <div style={{ whiteSpace: "pre-wrap" }}>
                  {active.result.reasoning}
                </div>
              </div>
              {!!active.result.risks?.length && (
                <div style={{ margin: "8px 0" }}>
                  <b>Risks</b>
                  <ul>
                    {active.result.risks.map((r: any, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!!active.result.recommendations?.length && (
                <div style={{ margin: "8px 0" }}>
                  <b>Recommendations</b>
                  <ul>
                    {active.result.recommendations.map((r: any, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div style={{ marginTop: 8, opacity: 0.7 }}>
                <small>Submitted by: {active.owner || "unknown"}</small>
                <br />
                <small>Created: {fmt(active.createdAt)}</small>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
