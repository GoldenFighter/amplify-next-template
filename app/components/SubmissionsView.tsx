"use client";

import { useState, useEffect } from "react";
import { client } from "../../lib/client";
import {
  Card,
  Flex,
  Heading,
  Text,
  Badge,
  Button,
  Divider,
  Alert,
  Collection,
  Loader,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { getDisplayName } from "../../lib/utils";

interface Submission {
  id: string;
  boardId: string;
  prompt: string;
  context: string | null;
  result: {
    rating: number;
    summary: string;
    reasoning: string;
    risks: (string | null)[];
    recommendations: (string | null)[];
  };
  ownerEmail: string;
  boardName: string;
  createdAt: string;
  updatedAt: string;
  submissionDate: string | null;
  isDeleted: boolean | null;
}

interface SubmissionsViewProps {
  boardId: string;
  boardName: string;
  userEmail: string;
  isAdmin: boolean;
  contestType?: string | null;
  maxScore?: number | null;
}

export default function SubmissionsView({ boardId, boardName, userEmail, isAdmin, contestType, maxScore }: SubmissionsViewProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine' | 'others'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'user'>('date');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, [boardId]);

  const fetchSubmissions = async () => {
    try {
      const { data, errors } = await client.models.Submission.list({
        filter: { 
          boardId: { eq: boardId },
          isDeleted: { ne: true }
        }
      });

      if (errors?.length) {
        console.error("Error fetching submissions:", errors);
        return;
      }

      setSubmissions(data || []);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedSubmissions = submissions
    .filter(submission => {
      // Apply filter
      if (filter === 'mine' && submission.ownerEmail !== userEmail) return false;
      if (filter === 'others' && submission.ownerEmail === userEmail) return false;
      
      // Apply search
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          submission.prompt.toLowerCase().includes(searchLower) ||
          submission.result.summary.toLowerCase().includes(searchLower) ||
          submission.ownerEmail.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'rating':
          return b.result.rating - a.result.rating;
        case 'user':
          return a.ownerEmail.localeCompare(b.ownerEmail);
        default:
          return 0;
      }
    });

  const getRatingColor = (rating: number) => {
    const max = maxScore || 100;
    if (rating >= max * 0.8) return 'text-green-600';
    if (rating >= max * 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingBadge = (rating: number) => {
    const max = maxScore || 100;
    if (rating >= max * 0.8) return 'bg-green-100 text-green-800';
    if (rating >= max * 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const handleEdit = (submissionId: string) => {
    // TODO: Implement edit submission functionality
    alert("Edit submission functionality coming soon!");
  };

  const handleDelete = async (submissionId: string) => {
    if (confirm("Are you sure you want to delete this submission?")) {
      try {
        await client.models.Submission.update({
          id: submissionId,
          isDeleted: true
        });
        fetchSubmissions();
      } catch (error) {
        console.error("Error deleting submission:", error);
        alert("Failed to delete submission");
      }
    }
  };

  // SubmissionCard Component
  const SubmissionCard = ({ 
    submission, 
    rank, 
    maxScore, 
    contestType, 
    isAdmin, 
    userEmail, 
    onEdit, 
    onDelete 
  }: {
    submission: any;
    rank: number;
    maxScore: number | null | undefined;
    contestType: string | null | undefined;
    isAdmin: boolean;
    userEmail: string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const getRatingColor = (rating: number) => {
      const max = maxScore || 100;
      if (rating >= max * 0.8) return 'green-600';
      if (rating >= max * 0.6) return 'yellow-600';
      return 'red-600';
    };

    const getRatingBadge = (rating: number) => {
      const max = maxScore || 100;
      if (rating >= max * 0.8) return 'success';
      if (rating >= max * 0.6) return 'warning';
      return 'error';
    };

    const getRankBadge = (rank: number) => {
      if (rank === 1) return 'success';
      if (rank === 2) return 'info';
      if (rank === 3) return 'warning';
      return 'neutral';
    };

    return (
      <Card variation="outlined" className="hover:shadow-md transition-shadow">
        <Flex direction="column" gap="1rem">
          {/* Header with Rank, Score, and Basic Info */}
          <Flex justifyContent="space-between" alignItems="flex-start" wrap="wrap">
            <Flex alignItems="center" gap="1rem">
              {/* Rank Badge */}
              <Badge variation={getRankBadge(rank) as any} size="large">
                #{rank}
              </Badge>
              
              {/* Score Display */}
              <Flex direction="column" gap="0.25rem">
                <Text fontSize="1.25rem" fontWeight="bold" color={getRatingColor(submission.result.rating)}>
                  {submission.result.rating}/{maxScore || 100}
                </Text>
                <Badge variation={getRatingBadge(submission.result.rating) as any}>
                  {submission.result.rating >= (maxScore || 100) * 0.8 ? 'Excellent' :
                   submission.result.rating >= (maxScore || 100) * 0.6 ? 'Good' : 'Needs Improvement'}
                </Badge>
              </Flex>
            </Flex>

            {/* User Info and Actions */}
            <Flex direction="column" alignItems="flex-end" gap="0.5rem">
              <Text fontSize="0.875rem" color="gray-600">
                {getDisplayName(submission.ownerEmail)}
                {submission.ownerEmail === userEmail && (
                  <Badge variation="info" size="small" className="ml-2">You</Badge>
                )}
              </Text>
              <Text fontSize="0.75rem" color="gray-500">
                {new Date(submission.createdAt).toLocaleDateString()}
              </Text>
              
              {/* Action Buttons */}
              {(isAdmin || submission.ownerEmail === userEmail) && (
                <Flex gap="0.5rem">
                  <Button
                    size="small"
                    variation="link"
                    onClick={() => onEdit(submission.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    variation="link"
                    color="red-600"
                    onClick={() => onDelete(submission.id)}
                  >
                    Delete
                  </Button>
                </Flex>
              )}
            </Flex>
          </Flex>

          {/* Entry/Submission Prompt */}
          <div>
            <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">
              {contestType ? 'Entry' : 'Task'}:
            </Text>
            <Text fontSize="0.875rem" color="gray-600">
              {submission.prompt}
            </Text>
          </div>

          {/* Expand/Collapse Button */}
          <Button
            variation="link"
            size="small"
            onClick={() => setIsExpanded(!isExpanded)}
            className="self-start"
          >
            {isExpanded ? 'Show Less' : 'Show Details'}
          </Button>

          {/* Expandable Details */}
          {isExpanded && (
            <>
              <Divider />
              
              <Flex direction="column" gap="1rem">
                {/* Summary */}
                <div>
                  <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">
                    Summary:
                  </Text>
                  <Text fontSize="0.875rem" color="gray-600">
                    {submission.result.summary}
                  </Text>
                </div>

                {/* Reasoning */}
                <div>
                  <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">
                    Reasoning:
                  </Text>
                  <Text fontSize="0.875rem" color="gray-600" whiteSpace="pre-wrap">
                    {submission.result.reasoning}
                  </Text>
                </div>

                {/* Risks and Recommendations */}
                <Flex direction="column" gap="1rem" className="md:grid md:grid-cols-2 md:gap-4">
                  {submission.result.risks && submission.result.risks.length > 0 && (
                    <div>
                      <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">
                        Risks:
                      </Text>
                      <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                        {submission.result.risks.map((risk: string, index: number) => (
                          <li key={index}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {submission.result.recommendations && submission.result.recommendations.length > 0 && (
                    <div>
                      <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">
                        Recommendations:
                      </Text>
                      <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                        {submission.result.recommendations.map((rec: string, index: number) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                    )}
                  </Flex>
                </Flex>
              </>
            )}
          </Flex>
        </Card>
      );
    };

  if (loading) {
    return (
      <Flex justifyContent="center" padding="2rem">
        <Loader size="large" />
      </Flex>
    );
  }

  // Sort submissions by score (highest first) for ranking
  const rankedSubmissions = [...filteredAndSortedSubmissions].sort((a, b) => 
    (b.result.rating || 0) - (a.result.rating || 0)
  );

  return (
    <Flex direction="column" gap="1.5rem">
      {/* Header */}
      <Flex justifyContent="space-between" alignItems="center" wrap="wrap">
        <Heading level={3}>Submissions ({filteredAndSortedSubmissions.length})</Heading>
        {contestType && (
          <Text fontSize="0.875rem" color="gray-600">{contestType} Contest</Text>
        )}
      </Flex>

      {/* Search and Filters */}
      <Flex direction="column" gap="1rem" className="sm:flex-row">
        <input
          type="text"
          placeholder="Search submissions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-2 border border-gray-300 rounded"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="p-2 border border-gray-300 rounded"
        >
          <option value="all">All Submissions</option>
          <option value="mine">My Submissions</option>
          <option value="others">Others' Submissions</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="p-2 border border-gray-300 rounded"
        >
          <option value="date">Sort by Date</option>
          <option value="rating">Sort by Rating</option>
          <option value="user">Sort by User</option>
        </select>
      </Flex>

      {/* Submissions Ranking List */}
      <Flex direction="column" gap="1rem">
        {rankedSubmissions.length === 0 ? (
          <Alert variation="info">
            <Text textAlign="center">
              {searchTerm || filter !== 'all' 
                ? "No submissions match your criteria." 
                : "No submissions yet. Be the first to submit!"
              }
            </Text>
          </Alert>
        ) : (
          rankedSubmissions.map((submission, index) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              rank={index + 1}
              maxScore={maxScore}
              contestType={contestType}
              isAdmin={isAdmin}
              userEmail={userEmail}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </Flex>
    </Flex>
  );
}
