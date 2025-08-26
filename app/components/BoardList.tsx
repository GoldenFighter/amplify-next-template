"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { client } from "@/lib/client";
import { getDisplayName, isAdmin } from "../../lib/utils";
import BoardEdit from "./BoardEdit";
import BoardDelete from "./BoardDelete";

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

interface BoardListProps {
  userEmail: string;
}

export default function BoardList({ userEmail }: BoardListProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const userIsAdmin = isAdmin(userEmail);

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

  useEffect(() => {
    fetchBoards();
  }, [userEmail]);

  const handleBoardClick = (boardId: string) => {
    router.push(`/board/${boardId}`);
  };

  // Calculate time until expiration
  const getExpirationInfo = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    
    const now = new Date();
    const expiration = new Date(expiresAt);
    const timeLeft = expiration.getTime() - now.getTime();
    
    if (timeLeft <= 0) return { expired: true, text: "Expired" };
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return { expired: false, text: `${days}d ${hours}h left` };
    if (hours > 0) return { expired: false, text: `${hours}h left` };
    
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    return { expired: false, text: `${minutes}m left` };
  };

  // Get status badge for board
  const getStatusBadge = (board: Board) => {
    if (!board.isActive) return { text: 'Inactive', class: 'bg-gray-100 text-gray-800' };
    
    const expirationInfo = getExpirationInfo(board.expiresAt);
    if (expirationInfo?.expired) return { text: 'Expired', class: 'bg-red-100 text-red-800' };
    
    if (board.isPublic) return { text: 'Public', class: 'bg-green-100 text-green-800' };
    return { text: 'Private', class: 'bg-blue-100 text-blue-800' };
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
      {boards.map((board) => {
        const statusBadge = getStatusBadge(board);
        const expirationInfo = getExpirationInfo(board.expiresAt);
        
        return (
          <div
            key={board.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">{board.name}</h3>
              <div className="flex gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${statusBadge.class}`}>
                  {statusBadge.text}
                </span>
                {userIsAdmin && board.createdBy === userEmail && (
                  <div className="flex gap-1">
                    <BoardEdit 
                      board={board} 
                      onBoardUpdated={fetchBoards} 
                      isAdmin={userIsAdmin} 
                      userEmail={userEmail} 
                    />
                    <BoardDelete 
                      board={board} 
                      onBoardDeleted={fetchBoards} 
                      isAdmin={userIsAdmin} 
                      userEmail={userEmail} 
                    />
                  </div>
                )}
              </div>
            </div>
            
            {board.description && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {board.description}
              </p>
            )}
            
            <div className="space-y-2 text-sm text-gray-500 mb-4">
              <div className="flex justify-between">
                <span>Max submissions:</span>
                <span className="font-medium">{board.maxSubmissionsPerUser || 2}</span>
              </div>
              <div className="flex justify-between">
                <span>Frequency:</span>
                <span className="font-medium capitalize">{board.submissionFrequency || 'unlimited'}</span>
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
              {board.lastEditedAt && board.lastEditedAt !== board.createdAt && (
                <div className="flex justify-between">
                  <span>Last edited:</span>
                  <span className="font-medium">
                    {new Date(board.lastEditedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              {expirationInfo && (
                <div className="flex justify-between">
                  <span>Expires:</span>
                  <span className={`font-medium ${expirationInfo.expired ? 'text-red-600' : 'text-orange-600'}`}>
                    {expirationInfo.text}
                  </span>
                </div>
              )}
            </div>
            
            <div className="pt-3 border-t border-gray-100">
              <button
                onClick={() => handleBoardClick(board.id)}
                className="w-full text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors"
              >
                View submissions →
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
