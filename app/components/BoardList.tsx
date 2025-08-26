"use client";

import { useState, useEffect } from "react";
import { client } from "../../lib/client";
import { useRouter } from "next/navigation";
import { isAdmin, getExpirationInfo, getStatusBadge, getDisplayName } from "../../lib/utils";
import BoardEdit from "./BoardEdit";
import BoardDelete from "./BoardDelete";
import {
  Card,
  Flex,
  Heading,
  Text,
  Badge,
  Button,
  Divider,
  Alert,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

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
  contestPrompt: string | null;
  contestType: string | null;
  judgingCriteria: (string | null)[] | null;
  maxScore: number | null;
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
          <Card
            key={board.id}
            variation="outlined"
            className="hover:shadow-md transition-shadow"
          >
            <Flex direction="column" gap="1rem">
              <Flex justifyContent="space-between" alignItems="flex-start">
                <Flex direction="column" gap="0.25rem">
                  <Heading level={4}>{board.name}</Heading>
                  {board.contestType && (
                    <Text fontSize="0.875rem" color="blue-600" fontWeight="medium">
                      {board.contestType}
                    </Text>
                  )}
                </Flex>
                <Flex gap="0.5rem" alignItems="center">
                  <Badge variation={statusBadge.class as any}>{statusBadge.text}</Badge>
                  {userIsAdmin && board.createdBy === userEmail && (
                    <Flex gap="0.5rem">
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
                    </Flex>
                  )}
                </Flex>
              </Flex>
              
              {board.contestPrompt && (
                <Alert variation="info">
                  <Heading level={5} fontWeight="medium">Contest Question:</Heading>
                  <Text fontSize="0.875rem">{board.contestPrompt}</Text>
                </Alert>
              )}
              
              {board.description && (
                <Text fontSize="0.875rem" color="gray-600">
                  {board.description}
                </Text>
              )}
              
              <Divider />

              <Flex direction="column" gap="0.5rem">
                <Flex justifyContent="space-between">
                  <Text fontSize="0.875rem" color="gray-500">Max submissions:</Text>
                  <Text fontSize="0.875rem" fontWeight="medium">{board.maxSubmissionsPerUser || 2}</Text>
                </Flex>
                <Flex justifyContent="space-between">
                  <Text fontSize="0.875rem" color="gray-500">Frequency:</Text>
                  <Text fontSize="0.875rem" fontWeight="medium">
                    {(board.submissionFrequency || 'unlimited').charAt(0).toUpperCase() + (board.submissionFrequency || 'unlimited').slice(1)}
                  </Text>
                </Flex>
                {board.maxScore && (
                  <Flex justifyContent="space-between">
                    <Text fontSize="0.875rem" color="gray-500">Max score:</Text>
                    <Text fontSize="0.875rem" fontWeight="medium">{board.maxScore}</Text>
                  </Flex>
                )}
                <Flex justifyContent="space-between">
                  <Text fontSize="0.875rem" color="gray-500">Created by:</Text>
                  <Text fontSize="0.875rem" fontWeight="medium">{getDisplayName(board.createdBy)}</Text>
                </Flex>
                <Flex justifyContent="space-between">
                  <Text fontSize="0.875rem" color="gray-500">Created:</Text>
                  <Text fontSize="0.875rem" fontWeight="medium">
                    {new Date(board.createdAt).toLocaleDateString()}
                  </Text>
                </Flex>
                {board.lastEditedAt && board.lastEditedAt !== board.createdAt && (
                  <Flex justifyContent="space-between">
                    <Text fontSize="0.875rem" color="gray-500">Last edited:</Text>
                    <Text fontSize="0.875rem" fontWeight="medium">
                      {new Date(board.lastEditedAt).toLocaleDateString()}
                    </Text>
                  </Flex>
                )}
                {expirationInfo && (
                  <Flex justifyContent="space-between">
                    <Text fontSize="0.875rem" color="gray-500">Expires:</Text>
                    <Text fontSize="0.875rem" fontWeight="medium" color={expirationInfo.expired ? 'red-600' : 'orange-600'}>
                      {expirationInfo.text}
                    </Text>
                  </Flex>
                )}
              </Flex>

              {board.judgingCriteria && board.judgingCriteria.length > 0 && (
                <div>
                  <Text fontSize="0.75rem" color="gray-500" marginBottom="0.5rem">Judging Criteria:</Text>
                  <Flex wrap="wrap" gap="0.5rem">
                    {board.judgingCriteria.map((criteria, index) => (
                                           <Badge key={index}>
                       {criteria}
                     </Badge>
                    ))}
                  </Flex>
                </div>
              )}
              
              <Button
                onClick={() => handleBoardClick(board.id)}
                variation="link"
                size="small"
              >
                View submissions →
              </Button>
            </Flex>
          </Card>
        );
      })}
    </div>
  );
}
