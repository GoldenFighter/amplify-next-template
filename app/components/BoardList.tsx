"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { client } from "@/lib/client";
import { getDisplayName } from "../../lib/utils";

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
}

interface BoardListProps {
  userEmail: string;
}

export default function BoardList({ userEmail }: BoardListProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const { data, errors } = await client.models.Board.list();
        if (errors?.length) {
          console.error("Error fetching boards:", errors);
          return;
        }

        // Filter boards based on access permissions
        const accessibleBoards = data.filter((board: Board) => {
          // Public boards are accessible to everyone
          if (board.isPublic === true) return true;
          
          // Creator can always access their own boards
          if (board.createdBy === userEmail) return true;
          
          // Check if user's email is in allowed emails
          if (board.allowedEmails?.some(email => email === userEmail)) return true;
          
          return false;
        });

        setBoards(accessibleBoards);
      } catch (error) {
        console.error("Error fetching boards:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBoards();
  }, [userEmail]);

  const handleBoardClick = (boardId: string) => {
    router.push(`/board/${boardId}`);
  };

  if (loading) {
    return <div className="text-center py-8">Loading boards...</div>;
  }

  if (boards.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        No boards available. Create a board to get started!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {boards.map((board) => (
        <div
          key={board.id}
          onClick={() => handleBoardClick(board.id)}
          className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">{board.name}</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${
              board.isPublic === true
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {board.isPublic === true ? 'Public' : 'Private'}
            </span>
          </div>
          
          {board.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {board.description}
            </p>
          )}
          
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex justify-between">
              <span>Max submissions:</span>
              <span className="font-medium">{board.maxSubmissionsPerUser || 2}</span>
            </div>
            <div className="flex justify-between">
              <span>Created by:</span>
              <span className="font-medium">{getDisplayName(board.createdBy)}</span>
            </div>
            <div className="flex justify-between">
              <span>Created:</span>
              <span className="font-medium">
                {new Date(board.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-100">
            <span className="text-blue-600 text-sm font-medium">
              Click to view submissions →
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
