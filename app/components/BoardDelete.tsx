"use client";

import { useState } from "react";
import { client } from "../../lib/client";

interface Board {
  id: string;
  name: string;
  createdBy: string;
}

interface BoardDeleteProps {
  board: Board;
  onBoardDeleted: () => void;
  isAdmin: boolean;
  userEmail: string;
}

export default function BoardDelete({ board, onBoardDeleted, isAdmin, userEmail }: BoardDeleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isAdmin || board.createdBy !== userEmail) return null;

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      // First, soft delete all submissions for this board
      const { data: submissions } = await client.models.Submission.list({
        filter: { boardId: { eq: board.id } }
      });

      // Mark submissions as deleted
      if (submissions && submissions.length > 0) {
        await Promise.all(
          submissions.map(submission =>
            client.models.Submission.update({
              id: submission.id,
              isDeleted: true
            })
          )
        );
      }

      // Delete the board
      await client.models.Board.delete({ id: board.id });

      setIsOpen(false);
      onBoardDeleted();
    } catch (error: any) {
      console.error("Error deleting board:", error);
      alert(`Failed to delete board: ${error.message || "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
      >
        Delete
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-red-600">Delete Board</h2>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete the board <strong>"{board.name}"</strong>?
              </p>
              <p className="text-sm text-gray-600">
                This action cannot be undone. All submissions will be marked as deleted.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Board"}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
