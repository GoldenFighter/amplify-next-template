"use client";

import { useState, useEffect } from "react";
import { client } from "../../lib/client";
import {
  TextField,
  TextAreaField,
  SelectField,
  Button,
  Card,
  Flex,
  Heading,
  SwitchField,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

interface Board {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean | null;
  maxSubmissionsPerUser: number | null;
  createdBy: string;
  allowedEmails: (string | null)[] | null;
  expiresAt: string | null;
  isActive: boolean | null;
  submissionFrequency: string | null;
  lastEditedAt: string | null;
  lastEditedBy: string | null;
  contestPrompt: string | null;
  contestType: string | null;
  judgingCriteria: (string | null)[] | null;
  maxScore: number | null;
}

interface BoardEditProps {
  board: Board;
  onBoardUpdated: () => void;
  isAdmin: boolean;
  userEmail: string;
}

export default function BoardEdit({ board, onBoardUpdated, isAdmin, userEmail }: BoardEditProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: board.name,
    description: board.description || "",
    isPublic: board.isPublic || false,
    maxSubmissionsPerUser: board.maxSubmissionsPerUser || 2,
    allowedEmails: board.allowedEmails?.join(", ") || "",
    expiresAt: board.expiresAt ? new Date(board.expiresAt).toISOString().slice(0, 16) : "",
    submissionFrequency: (board.submissionFrequency as "daily" | "weekly" | "monthly" | "unlimited") || "unlimited",
    isActive: board.isActive !== false,
    contestPrompt: board.contestPrompt || "",
    contestType: board.contestType || "",
    judgingCriteria: board.judgingCriteria?.join(", ") || "",
    maxScore: board.maxScore || 100,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData({
      name: board.name,
      description: board.description || "",
      isPublic: board.isPublic || false,
      maxSubmissionsPerUser: board.maxSubmissionsPerUser || 2,
      allowedEmails: board.allowedEmails?.join(", ") || "",
      expiresAt: board.expiresAt ? new Date(board.expiresAt).toISOString().slice(0, 16) : "",
      submissionFrequency: (board.submissionFrequency as "daily" | "weekly" | "monthly" | "unlimited") || "unlimited",
      isActive: board.isActive !== false,
      contestPrompt: board.contestPrompt || "",
      contestType: board.contestType || "",
      judgingCriteria: board.judgingCriteria?.join(", ") || "",
      maxScore: board.maxScore || 100,
    });
  }, [board]);

  if (!isAdmin || board.createdBy !== userEmail) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Parse allowed emails from comma-separated string
      const allowedEmails = formData.allowedEmails
        .split(",")
        .map(email => email.trim())
        .filter(email => email.length > 0);

      // Parse expiration date
      const expiresAt = formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null;

      // Parse judging criteria from comma-separated string
      const judgingCriteria = formData.judgingCriteria
        .split(",")
        .map(criteria => criteria.trim())
        .filter(criteria => criteria.length > 0);

      await client.models.Board.update({
        id: board.id,
        name: formData.name,
        description: formData.description || null,
        isPublic: formData.isPublic,
        maxSubmissionsPerUser: formData.maxSubmissionsPerUser,
        allowedEmails: allowedEmails.length > 0 ? allowedEmails : null,
        expiresAt,
        isActive: formData.isActive,
        submissionFrequency: formData.submissionFrequency,
        lastEditedAt: new Date().toISOString(),
        lastEditedBy: userEmail,
        contestPrompt: formData.contestPrompt || null,
        contestType: formData.contestType || null,
        judgingCriteria: judgingCriteria.length > 0 ? judgingCriteria : null,
        maxScore: formData.maxScore,
      });

      setIsOpen(false);
      onBoardUpdated();
    } catch (error: any) {
      console.error("Error updating board:", error);
      alert(`Failed to update board: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variation="primary"
        size="small"
        style={{ backgroundColor: "#d97706" }}
      >
        Edit
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <Flex direction="column" gap="1rem">
              <Heading level={2}>Edit Board: {board.name}</Heading>
              
              <form onSubmit={handleSubmit}>
                <Flex direction="column" gap="1rem">
              <TextField
                label="Board Name *"
                placeholder="Enter board name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <TextAreaField
                label="Description"
                placeholder="Enter board description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />

              <TextField
                label="Contest Type"
                placeholder="e.g., Boy Names, Recipes, Designs"
                value={formData.contestType}
                onChange={(e) => setFormData({ ...formData, contestType: e.target.value })}
              />

              <TextAreaField
                label="Contest Prompt/Question"
                placeholder="What should users submit? e.g., 'Submit your favorite boy names'"
                value={formData.contestPrompt}
                onChange={(e) => setFormData({ ...formData, contestPrompt: e.target.value })}
                rows={3}
              />

              <TextField
                label="Judging Criteria (comma-separated)"
                placeholder="e.g., Creativity, Uniqueness, Popularity, Meaning"
                value={formData.judgingCriteria}
                onChange={(e) => setFormData({ ...formData, judgingCriteria: e.target.value })}
              />

              <TextField
                type="number"
                label="Maximum Score"
                min={10}
                max={1000}
                value={formData.maxScore.toString()}
                onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) })}
              />

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isPublic" className="text-sm font-medium">
                  Public Board (visible to all users)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm font-medium">
                  Active Board (can accept submissions)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Submissions Per User
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.maxSubmissionsPerUser}
                  onChange={(e) => setFormData({ ...formData, maxSubmissionsPerUser: parseInt(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Submission Frequency Limit
                </label>
                <select
                  value={formData.submissionFrequency}
                  onChange={(e) => setFormData({ ...formData, submissionFrequency: e.target.value as any })}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="unlimited">Unlimited</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Expiration Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Leave empty for no expiration
                </p>
              </div>

              {!formData.isPublic && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Allowed Emails (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.allowedEmails}
                    onChange={(e) => setFormData({ ...formData, allowedEmails: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="user1@example.com, user2@example.com"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Leave empty to make board private to creator only
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Updating..." : "Update Board"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
