"use client";

import { useState, useEffect } from "react";
import { client } from "../../lib/client";

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
      <button
        onClick={() => setIsOpen(true)}
        className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
      >
        Edit
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Board: {board.name}</h2>
            
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
