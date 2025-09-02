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
  // For image submissions
  hasImage?: boolean;
  imageUrl?: string;
  imageKey?: string;
  imageSize?: number;
  imageType?: string;
  isProcessed?: boolean;
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
  const [viewMode, setViewMode] = useState<'list' | 'gallery'>('list');

  useEffect(() => {
    fetchSubmissions();
  }, [boardId]);

  const fetchSubmissions = async () => {
    try {
      // Fetch text submissions
      const { data: textSubmissions, errors: textErrors } = await client.models.Submission.list({
        filter: { 
          boardId: { eq: boardId },
          isDeleted: { ne: true }
        }
      });

      // Fetch image submissions
      const { data: imageSubmissions, errors: imageErrors } = await client.models.ImageSubmission.list({
        filter: { 
          boardId: { eq: boardId },
          isDeleted: { ne: true }
        }
      });

      if (textErrors?.length || imageErrors?.length) {
        console.error("Error fetching submissions:", textErrors || imageErrors);
        return;
      }

      // Combine and normalize both types of submissions
      const combinedSubmissions: Submission[] = [
        // Text submissions (add hasImage: false)
        ...(textSubmissions || []).map(sub => ({
          ...sub,
          hasImage: false,
          imageUrl: undefined,
          imageKey: undefined,
          imageSize: undefined,
          imageType: undefined,
          isProcessed: undefined,
        })),
        // Image submissions (normalize to match Submission interface)
        ...(imageSubmissions || []).map(sub => ({
          id: sub.id,
          boardId: sub.boardId,
          prompt: sub.prompt || '',
          context: sub.context,
          result: sub.result || { rating: 0, summary: '', reasoning: '', risks: [], recommendations: [] },
          ownerEmail: sub.ownerEmail,
          boardName: sub.boardName,
          createdAt: sub.submissionDate,
          updatedAt: sub.submissionDate,
          submissionDate: sub.submissionDate,
          isDeleted: sub.isDeleted,
          hasImage: true,
          imageUrl: sub.imageUrl || undefined,
          imageKey: sub.imageKey || undefined,
          imageSize: sub.imageSize || undefined,
          imageType: sub.imageType || undefined,
          isProcessed: sub.isProcessed || undefined,
        }))
      ];

      // Sort by creation date (newest first)
      combinedSubmissions.sort((a, b) => 
        new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
      );

      setSubmissions(combinedSubmissions);
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
        // Find the submission to determine its type
        const submission = submissions.find(s => s.id === submissionId);
        if (!submission) {
          alert("Submission not found");
          return;
        }

        // Delete based on submission type
        if (submission.hasImage) {
          await client.models.ImageSubmission.update({
            id: submissionId,
            isDeleted: true
          });
        } else {
          await client.models.Submission.update({
            id: submissionId,
            isDeleted: true
          });
        }
        
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
      return 'info'; // Changed from 'neutral' to 'info'
    };

    return (
      <Card variation="outlined" className="hover:shadow-md transition-shadow" data-submission-id={submission.id}>
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
              {submission.hasImage ? 'Image Submission' : (contestType ? 'Entry' : 'Task')}:
            </Text>
            
            {/* Enhanced Image Display */}
            {submission.hasImage && submission.imageUrl && (
              <div className="mt-3 mb-4">
                <div className="relative group">
                  <img 
                    src={submission.imageUrl} 
                    alt="Submission" 
                    className="w-full h-auto max-h-80 rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                    onClick={() => {
                      // Open image in new tab for full view
                      window.open(submission.imageUrl, '_blank');
                    }}
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Badge variation="info" size="small">
                      Click to view full size
                    </Badge>
                  </div>
                </div>
                
                {/* Image Info Bar */}
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                  <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap="1rem">
                    <Flex alignItems="center" gap="1rem">
                      <Badge variation="info" size="small">
                        📸 {submission.imageType}
                      </Badge>
                      <Badge variation="info" size="small">
                        📏 {Math.round((submission.imageSize || 0) / 1024)}KB
                      </Badge>
                      {submission.isProcessed === false && (
                        <Badge variation="warning" size="small">
                          ⏳ Processing...
                        </Badge>
                      )}
                      {submission.isProcessed === true && (
                        <Badge variation="success" size="small">
                          ✅ Analyzed
                        </Badge>
                      )}
                    </Flex>
                    
                    {/* Metadata Toggle Button */}
                    <Button
                      variation="link"
                      size="small"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {isExpanded ? '📋 Hide Metadata' : '📋 View Metadata'}
                    </Button>
                  </Flex>
                </div>
              </div>
            )}
            
            {/* Text Prompt */}
            {submission.prompt && (
              <Text fontSize="0.875rem" color="gray-600">
                {submission.prompt}
              </Text>
            )}
          </div>

          {/* Expand/Collapse Button */}
          <Button
            variation="link"
            size="small"
            onClick={() => setIsExpanded(!isExpanded)}
            className="self-start"
            data-expand
          >
            {isExpanded ? 'Show Less' : 'Show Details'}
          </Button>

          {/* Expandable Details */}
          {isExpanded && (
            <>
              <Divider />
              
              <Flex direction="column" gap="1.5rem">
                {/* Image Metadata Section (for image submissions) */}
                {submission.hasImage && (
                  <div>
                    <Heading level={5} marginBottom="medium" color="blue-600">
                      📸 Image Metadata & Technical Details
                    </Heading>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">File Name:</Text>
                          <Text fontSize="0.875rem" color="gray-600" className="font-mono text-xs">
                            {submission.imageKey?.split('/').pop() || 'Unknown'}
                          </Text>
                        </div>
                        <div className="flex justify-between">
                          <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">File Size:</Text>
                          <Text fontSize="0.875rem" color="gray-600">
                            {Math.round((submission.imageSize || 0) / 1024)}KB
                          </Text>
                        </div>
                        <div className="flex justify-between">
                          <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">MIME Type:</Text>
                          <Text fontSize="0.875rem" color="gray-600" className="font-mono text-xs">
                            {submission.imageType || 'Unknown'}
                          </Text>
                        </div>
                        <div className="flex justify-between">
                          <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">Storage Key:</Text>
                          <Text fontSize="0.875rem" color="gray-600" className="font-mono text-xs break-all">
                            {submission.imageKey || 'Unknown'}
                          </Text>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">Upload Date:</Text>
                          <Text fontSize="0.875rem" color="gray-600">
                            {new Date(submission.createdAt).toLocaleString()}
                          </Text>
                        </div>
                        <div className="flex justify-between">
                          <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">Processing Status:</Text>
                          <Badge variation={submission.isProcessed ? "success" : "warning"} size="small">
                            {submission.isProcessed ? "✅ Processed" : "⏳ Processing"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">Submission ID:</Text>
                          <Text fontSize="0.875rem" color="gray-600" className="font-mono text-xs">
                            {submission.id}
                          </Text>
                        </div>
                        <div className="flex justify-between">
                          <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">Direct URL:</Text>
                          <Button
                            variation="link"
                            size="small"
                            onClick={() => {
                              navigator.clipboard.writeText(submission.imageUrl);
                              alert('URL copied to clipboard!');
                            }}
                            className="text-xs font-mono text-blue-600 hover:text-blue-800"
                          >
                            Copy URL
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Analysis Results */}
                <div>
                  <Heading level={5} marginBottom="medium" color="green-600">
                    🤖 AI Analysis Results
                  </Heading>
                  
                  {/* Summary */}
                  <div className="mb-4">
                    <Text fontSize="0.875rem" fontWeight="medium" color="gray-700" marginBottom="small">
                      Summary:
                    </Text>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <Text fontSize="0.875rem" color="gray-600">
                        {submission.result.summary}
                      </Text>
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div className="mb-4">
                    <Text fontSize="0.875rem" fontWeight="medium" color="gray-700" marginBottom="small">
                      Detailed Reasoning:
                    </Text>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <Text fontSize="0.875rem" color="gray-600" whiteSpace="pre-wrap">
                        {submission.result.reasoning}
                      </Text>
                    </div>
                  </div>

                  {/* Risks and Recommendations */}
                  <Flex direction="column" gap="1rem" className="md:grid md:grid-cols-2 md:gap-4">
                    {submission.result.risks && submission.result.risks.length > 0 && (
                      <div>
                        <Text fontSize="0.875rem" fontWeight="medium" color="gray-700" marginBottom="small">
                          ⚠️ Identified Risks:
                        </Text>
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <ul className="text-sm text-gray-600 space-y-1">
                            {submission.result.risks.map((risk: string, index: number) => (
                              <li key={index} className="flex items-start">
                                <span className="text-red-500 mr-2">•</span>
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    {submission.result.recommendations && submission.result.recommendations.length > 0 && (
                      <div>
                        <Text fontSize="0.875rem" fontWeight="medium" color="gray-700" marginBottom="small">
                          💡 Recommendations:
                        </Text>
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <ul className="text-sm text-gray-600 space-y-1">
                            {submission.result.recommendations.map((rec: string, index: number) => (
                              <li key={index} className="flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </Flex>
                </div>

                {/* Submission Context */}
                <div>
                  <Heading level={5} marginBottom="medium" color="purple-600">
                    📝 Submission Context
                  </Heading>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">Board:</Text>
                        <Text fontSize="0.875rem" color="gray-600">{submission.boardName}</Text>
                      </div>
                      <div className="flex justify-between">
                        <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">Contest Type:</Text>
                        <Text fontSize="0.875rem" color="gray-600">{contestType || 'General'}</Text>
                      </div>
                      <div className="flex justify-between">
                        <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">Submitted By:</Text>
                        <Text fontSize="0.875rem" color="gray-600">{getDisplayName(submission.ownerEmail)}</Text>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">Submission Date:</Text>
                        <Text fontSize="0.875rem" color="gray-600">
                          {new Date(submission.createdAt).toLocaleString()}
                        </Text>
                      </div>
                      <div className="flex justify-between">
                        <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">Last Updated:</Text>
                        <Text fontSize="0.875rem" color="gray-600">
                          {new Date(submission.updatedAt).toLocaleString()}
                        </Text>
                      </div>
                      <div className="flex justify-between">
                        <Text fontSize="0.875rem" fontWeight="medium" color="gray-700">Status:</Text>
                        <Badge variation={submission.isDeleted ? "error" : "success"} size="small">
                          {submission.isDeleted ? "🗑️ Deleted" : "✅ Active"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
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
        <Flex alignItems="center" gap="1rem">
          {contestType && (
            <Text fontSize="0.875rem" color="gray-600">{contestType} Contest</Text>
          )}
          
          {/* View Mode Toggle */}
          <Flex alignItems="center" gap="0.5rem" className="bg-gray-100 rounded-lg p-1">
            <Button
              variation={viewMode === 'list' ? 'primary' : 'link'}
              size="small"
              onClick={() => setViewMode('list')}
              className="px-3 py-1"
            >
              📋 List
            </Button>
            <Button
              variation={viewMode === 'gallery' ? 'primary' : 'link'}
              size="small"
              onClick={() => setViewMode('gallery')}
              className="px-3 py-1"
            >
              🖼️ Gallery
            </Button>
          </Flex>
        </Flex>
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

      {/* Submissions Display */}
      {rankedSubmissions.length === 0 ? (
        <Alert variation="info">
          <Text textAlign="center">
            {searchTerm || filter !== 'all' 
              ? "No submissions match your criteria." 
              : "No submissions yet. Be the first to submit!"
            }
          </Text>
        </Alert>
      ) : viewMode === 'list' ? (
        /* List View */
        <Flex direction="column" gap="1rem">
          {rankedSubmissions.map((submission, index) => (
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
          ))}
        </Flex>
      ) : (
        /* Gallery View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rankedSubmissions.map((submission, index) => (
            <div key={submission.id} className="relative">
              <Card variation="outlined" className="hover:shadow-lg transition-shadow duration-300">
                <Flex direction="column" gap="0.75rem">
                  {/* Rank Badge */}
                  <div className="absolute top-2 left-2 z-10">
                    <Badge variation={index === 0 ? "success" : index === 1 ? "info" : index === 2 ? "warning" : "info"} size="large">
                      #{index + 1}
                    </Badge>
                  </div>
                  
                  {/* Score Badge */}
                  <div className="absolute top-2 right-2 z-10">
                    <Badge variation={submission.result.rating >= (maxScore || 100) * 0.8 ? "success" : submission.result.rating >= (maxScore || 100) * 0.6 ? "warning" : "error"} size="small">
                      {submission.result.rating}/{maxScore || 100}
                    </Badge>
                  </div>

                  {/* Image or Text Content */}
                  {submission.hasImage && submission.imageUrl ? (
                    <div className="relative">
                      <img 
                        src={submission.imageUrl} 
                        alt="Submission" 
                        className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(submission.imageUrl, '_blank')}
                      />
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="bg-black bg-opacity-50 text-white text-xs p-2 rounded">
                          <div className="flex justify-between items-center">
                            <span>📸 {submission.imageType}</span>
                            <span>{Math.round((submission.imageSize || 0) / 1024)}KB</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center p-4">
                      <Text fontSize="0.875rem" color="gray-600" textAlign="center" className="line-clamp-6">
                        {submission.prompt || 'Text submission'}
                      </Text>
                    </div>
                  )}

                  {/* Submission Info */}
                  <div className="p-2">
                    <Text fontSize="0.875rem" fontWeight="medium" color="gray-700" className="truncate">
                      {getDisplayName(submission.ownerEmail)}
                      {submission.ownerEmail === userEmail && (
                        <Badge variation="info" size="small" className="ml-1">You</Badge>
                      )}
                    </Text>
                    <Text fontSize="0.75rem" color="gray-500">
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </Text>
                    
                    {/* Quick Actions */}
                    <Flex gap="0.5rem" marginTop="small">
                      <Button
                        variation="link"
                        size="small"
                        onClick={() => {
                          // Find the submission card and expand it
                          const cardElement = document.querySelector(`[data-submission-id="${submission.id}"]`);
                          if (cardElement) {
                            const expandButton = cardElement.querySelector('button[data-expand]') as HTMLButtonElement;
                            if (expandButton) expandButton.click();
                          }
                        }}
                        className="text-xs"
                      >
                        View Details
                      </Button>
                      {(isAdmin || submission.ownerEmail === userEmail) && (
                        <Button
                          variation="link"
                          size="small"
                          color="red-600"
                          onClick={() => handleDelete(submission.id)}
                          className="text-xs"
                        >
                          Delete
                        </Button>
                      )}
                    </Flex>
                  </div>
                </Flex>
              </Card>
            </div>
          ))}
        </div>
      )}
    </Flex>
  );
}
