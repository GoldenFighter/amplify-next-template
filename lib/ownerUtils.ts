import { client } from './client';

// Owner-specific utility functions
export interface SiteStatistics {
  totalBoards: number;
  totalSubmissions: number;
  activeUsers: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user: string;
  }>;
}

export interface SiteConfiguration {
  allowNewRegistrations: boolean;
  maxBoardsPerUser: number;
  maxSubmissionsPerBoard: number;
  aiGenerationEnabled: boolean;
  maintenanceMode: boolean;
}

// Get site statistics
export async function getSiteStatistics(): Promise<SiteStatistics> {
  try {
    // Get total boards
    const boardsResult = await client.models.Board.list();
    const totalBoards = boardsResult.data?.length || 0;

    // Get total submissions
    const submissionsResult = await client.models.Submission.list();
    const totalSubmissions = submissionsResult.data?.length || 0;

    // Get unique users (simplified - in production you'd want a proper user model)
    const uniqueUsers = new Set<string>();
    if (boardsResult.data) {
      boardsResult.data.forEach(board => {
        if (board.ownerEmail) uniqueUsers.add(board.ownerEmail);
      });
    }
    if (submissionsResult.data) {
      submissionsResult.data.forEach(submission => {
        if (submission.userEmail) uniqueUsers.add(submission.userEmail);
      });
    }
    const activeUsers = uniqueUsers.size;

    // Get recent activity (simplified - in production you'd want an activity log)
    const recentActivity = [];
    
    // Add recent board creations
    if (boardsResult.data) {
      const recentBoards = boardsResult.data
        .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
        .slice(0, 3);
      
      recentBoards.forEach(board => {
        recentActivity.push({
          id: `board-${board.id}`,
          type: 'board_created',
          description: `New contest board created: "${board.name}"`,
          timestamp: board.createdAt || new Date().toISOString(),
          user: board.ownerEmail || 'unknown',
        });
      });
    }

    // Add recent submissions
    if (submissionsResult.data) {
      const recentSubmissions = submissionsResult.data
        .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
        .slice(0, 2);
      
      recentSubmissions.forEach(submission => {
        recentActivity.push({
          id: `submission-${submission.id}`,
          type: 'submission_added',
          description: `New submission to contest board`,
          timestamp: submission.createdAt || new Date().toISOString(),
          user: submission.userEmail || 'unknown',
        });
      });
    }

    // Sort activity by timestamp
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      totalBoards,
      totalSubmissions,
      activeUsers,
      recentActivity: recentActivity.slice(0, 5), // Keep only top 5
    };
  } catch (error) {
    console.error('Error getting site statistics:', error);
    throw new Error('Failed to get site statistics');
  }
}

// Save site configuration
export async function saveSiteConfiguration(config: SiteConfiguration): Promise<void> {
  try {
    // In a real application, you'd save this to a database
    // For now, we'll just log it and could save to localStorage
    console.log('Saving site configuration:', config);
    
    // Save to localStorage for persistence
    localStorage.setItem('picfight-site-config', JSON.stringify(config));
    
    // You could also save to a database table here
    // await client.models.SiteConfig.update(config);
    
  } catch (error) {
    console.error('Error saving site configuration:', error);
    throw new Error('Failed to save site configuration');
  }
}

// Load site configuration
export async function loadSiteConfiguration(): Promise<SiteConfiguration> {
  try {
    // Try to load from localStorage first
    const savedConfig = localStorage.getItem('picfight-site-config');
    if (savedConfig) {
      return JSON.parse(savedConfig);
    }
    
    // Default configuration
    return {
      allowNewRegistrations: true,
      maxBoardsPerUser: 10,
      maxSubmissionsPerBoard: 100,
      aiGenerationEnabled: true,
      maintenanceMode: false,
    };
  } catch (error) {
    console.error('Error loading site configuration:', error);
    // Return default configuration on error
    return {
      allowNewRegistrations: true,
      maxBoardsPerUser: 10,
      maxSubmissionsPerBoard: 100,
      aiGenerationEnabled: true,
      maintenanceMode: false,
    };
  }
}

// Check if user can create more boards
export function canCreateBoard(userEmail: string, currentBoardCount: number): boolean {
  // This would use the actual site configuration
  // For now, hardcoded limit
  const maxBoardsPerUser = 10;
  return currentBoardCount < maxBoardsPerUser;
}

// Check if user can submit to board
export function canSubmitToBoard(userEmail: string, currentSubmissionCount: number): boolean {
  // This would use the actual site configuration
  // For now, hardcoded limit
  const maxSubmissionsPerBoard = 100;
  return currentSubmissionCount < maxSubmissionsPerBoard;
}

// Get user statistics
export async function getUserStatistics(userEmail: string) {
  try {
    const boardsResult = await client.models.Board.list({
      filter: { ownerEmail: { eq: userEmail } }
    });
    
    const submissionsResult = await client.models.Submission.list({
      filter: { userEmail: { eq: userEmail } }
    });

    return {
      boardsCreated: boardsResult.data?.length || 0,
      submissionsMade: submissionsResult.data?.length || 0,
      totalScore: submissionsResult.data?.reduce((sum, sub) => sum + (sub.score || 0), 0) || 0,
    };
  } catch (error) {
    console.error('Error getting user statistics:', error);
    return {
      boardsCreated: 0,
      submissionsMade: 0,
      totalScore: 0,
    };
  }
}
