"use client";

// TODO: Have boards expire or have a countdown ✅
// TODO: Add a way to delete boards ✅
// TODO: Add a way to edit boards ✅
// TODO: Add a way to view boards ✅
// TODO: Add a way to view submissions ✅
// TODO: Add a way to limit to daily or weekly submissions ✅

import { useState } from "react";
import { client } from "../../lib/client";

interface CreateBoardProps {
  onBoardCreated: () => void;
  isAdmin: boolean;
  userEmail: string;
}

export default function CreateBoard({ onBoardCreated, isAdmin, userEmail }: CreateBoardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPublic: false,
    maxSubmissionsPerUser: 2,
    allowedEmails: "",
    expiresAt: "",
    submissionFrequency: "unlimited" as "daily" | "weekly" | "monthly" | "unlimited",
    isActive: true,
    contestPrompt: "",
    contestType: "",
    judgingCriteria: "",
    maxScore: 100,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAdmin) return null;

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

      await client.models.Board.create({
        name: formData.name,
        description: formData.description || null,
        isPublic: formData.isPublic,
        maxSubmissionsPerUser: formData.maxSubmissionsPerUser,
        allowedEmails: allowedEmails.length > 0 ? allowedEmails : null,
        createdBy: userEmail,
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

      // Reset form and close modal
      setFormData({
        name: "",
        description: "",
        isPublic: false,
        maxSubmissionsPerUser: 2,
        allowedEmails: "",
        expiresAt: "",
        submissionFrequency: "unlimited",
        isActive: true,
        contestPrompt: "",
        contestType: "",
        judgingCriteria: "",
        maxScore: 100,
      });
      setIsOpen(false);
      onBoardCreated();
    } catch (error: any) {
      console.error("Error creating board:", error);
      alert(`Failed to create board: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Create New Board
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Board</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Board Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Enter board name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Enter board description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Contest Type</label>
                <input
                  type="text"
                  value={formData.contestType}
                  onChange={(e) => setFormData({ ...formData, contestType: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="e.g., Boy Names, Recipes, Designs"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Contest Prompt/Question</label>
                <textarea
                  value={formData.contestPrompt}
                  onChange={(e) => setFormData({ ...formData, contestPrompt: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="What should users submit? e.g., 'Submit your favorite boy names'"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Judging Criteria (comma-separated)</label>
                <input
                  type="text"
                  value={formData.judgingCriteria}
                  onChange={(e) => setFormData({ ...formData, judgingCriteria: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="e.g., Creativity, Uniqueness, Popularity, Meaning"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Maximum Score</label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={formData.maxScore}
                  onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

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
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Board"}
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
