"use client";

import { useState, useEffect } from "react";
import { client } from "../../lib/client";
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
}

export default function SubmissionsView({ boardId, boardName, userEmail, isAdmin }: SubmissionsViewProps) {
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
    if (rating >= 80) return 'text-green-600';
    if (rating >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 80) return 'bg-green-100 text-green-800';
    if (rating >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return <div className="text-center py-8">Loading submissions...</div>;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h2 className="text-xl font-semibold">Submissions ({filteredAndSortedSubmissions.length})</h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search submissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          />
          
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          >
            <option value="all">All Submissions</option>
            <option value="mine">My Submissions</option>
            <option value="others">Others' Submissions</option>
          </select>
          
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          >
            <option value="date">Sort by Date</option>
            <option value="rating">Sort by Rating</option>
            <option value="user">Sort by User</option>
          </select>
        </div>
      </div>
      
      {filteredAndSortedSubmissions.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          {searchTerm || filter !== 'all' 
            ? "No submissions match your criteria." 
            : "No submissions yet. Be the first to submit!"
          }
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedSubmissions.map((submission) => (
            <div
              key={submission.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                    <span className={`text-lg font-semibold ${getRatingColor(submission.result.rating)}`}>
                      Rating: {submission.result.rating}/100
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getRatingBadge(submission.result.rating)}`}>
                      {submission.result.rating >= 80 ? 'Excellent' : 
                       submission.result.rating >= 60 ? 'Good' : 'Needs Improvement'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(submission.createdAt).toLocaleString()}
                    </span>
                  </div>
                  
                  {/* User Info */}
                  <div className="text-sm text-gray-600 mb-3">
                    <strong>Submitted by:</strong> {getDisplayName(submission.ownerEmail)}
                    {submission.ownerEmail === userEmail && (
                      <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        You
                      </span>
                    )}
                  </div>
                  
                  {/* Prompt */}
                  <div className="mb-3">
                    <strong className="text-sm text-gray-700">Task:</strong>
                    <p className="text-sm text-gray-600 mt-1">{submission.prompt}</p>
                  </div>
                  
                  {/* Summary */}
                  <div className="mb-3">
                    <strong className="text-sm text-gray-700">Summary:</strong>
                    <p className="text-sm text-gray-600 mt-1">{submission.result.summary}</p>
                  </div>
                  
                  {/* Reasoning */}
                  <div className="mb-3">
                    <strong className="text-sm text-gray-700">Reasoning:</strong>
                    <p className="text-sm text-gray-600 mt-1">{submission.result.reasoning}</p>
                  </div>
                  
                  {/* Risks and Recommendations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <strong className="text-sm text-gray-700">Risks:</strong>
                      <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                        {submission.result.risks.map((risk, index) => (
                          <li key={index}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <strong className="text-sm text-gray-700">Recommendations:</strong>
                      <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                        {submission.result.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* Action buttons for admin or owner */}
                {(isAdmin || submission.ownerEmail === userEmail) && (
                  <div className="flex flex-col gap-2 lg:ml-4">
                    <button
                      onClick={() => {
                        // TODO: Implement edit submission functionality
                        alert("Edit submission functionality coming soon!");
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm("Are you sure you want to delete this submission?")) {
                          try {
                            await client.models.Submission.update({
                              id: submission.id,
                              isDeleted: true
                            });
                            fetchSubmissions();
                          } catch (error) {
                            console.error("Error deleting submission:", error);
                            alert("Failed to delete submission");
                          }
                        }
                      }}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
