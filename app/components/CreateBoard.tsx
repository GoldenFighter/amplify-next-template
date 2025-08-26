"use client";

import { useState } from "react";
import { client } from "@/lib/client";

interface CreateBoardProps {
  onBoardCreated: () => void;
  isAdmin: boolean;
}

export default function CreateBoard({ onBoardCreated, isAdmin }: CreateBoardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPublic: false,
    maxSubmissionsPerUser: 2,
    allowedEmails: "",
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

      await client.models.Board.create({
        name: formData.name,
        description: formData.description,
        isPublic: formData.isPublic,
        maxSubmissionsPerUser: formData.maxSubmissionsPerUser,
        allowedEmails: allowedEmails.length > 0 ? allowedEmails : undefined,
      });

      // Reset form and close modal
      setFormData({
        name: "",
        description: "",
        isPublic: false,
        maxSubmissionsPerUser: 2,
        allowedEmails: "",
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
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
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
