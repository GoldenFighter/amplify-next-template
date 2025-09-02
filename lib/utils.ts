// Extract email prefix (characters before @) for display
export const getDisplayName = (email: string): string => {
  return email.split('@')[0] || email;
};

// Check if user is admin (for now, anyone can be admin - you can customize this logic)
export const isAdmin = (userEmail: string): boolean => {
  // You can implement your own admin logic here
  // For example, check against a list of admin emails
  const adminEmails = [
    'cmacleod5@me.com', // Add your admin emails here
    // Add more admin emails as needed
  ];
  
  return adminEmails.includes(userEmail);
};

// Check if user is the site owner
export const isOwner = (userEmail: string): boolean => {
  return userEmail === 'cmacleod5@me.com';
};

// Check if user can access a specific board
export const canAccessBoard = (
  board: any, 
  userEmail: string
): boolean => {
  // Public boards are accessible to everyone
  if (board.isPublic === true) return true;
  
  // Creator can always access their own boards
  if (board.createdBy === userEmail) return true;
  
  // Check if user's email is in allowed emails
  if (board.allowedEmails?.some((email: string) => email === userEmail)) return true;
  
  return false;
};

// Check if board is active and not expired
export const isBoardActive = (board: any): boolean => {
  if (!board.isActive) return false;
  
  if (board.expiresAt) {
    const now = new Date();
    const expiration = new Date(board.expiresAt);
    return expiration > now;
  }
  
  return true;
};

// Check if user can submit to a board (considering submission limits)
export const canSubmitToBoard = async (
  boardId: string,
  userEmail: string,
  client: any
): Promise<{ canSubmit: boolean; currentCount: number; maxAllowed: number }> => {
  try {
    // Get user's current text submissions to this board (excluding deleted ones)
    const { data: textSubmissions } = await client.models.Submission.list({
      filter: {
        boardId: { eq: boardId },
        ownerEmail: { eq: userEmail },
        isDeleted: { ne: true }
      }
    });

    // Get user's current image submissions to this board (excluding deleted ones)
    const { data: imageSubmissions } = await client.models.ImageSubmission.list({
      filter: {
        boardId: { eq: boardId },
        ownerEmail: { eq: userEmail },
        isDeleted: { ne: true }
      }
    });

    // Combine both types of submissions
    const currentCount = (textSubmissions?.length || 0) + (imageSubmissions?.length || 0);
    
    // Get board details to check max submissions
    const { data: boards } = await client.models.Board.list({
      filter: { id: { eq: boardId } }
    });
    
    const board = boards?.[0];
    if (!board || !isBoardActive(board)) {
      return { canSubmit: false, currentCount, maxAllowed: 0 };
    }
    
    const maxAllowed = board?.maxSubmissionsPerUser || 2;
    
    console.log(`Submission limit check for ${userEmail}:`, {
      textSubmissions: textSubmissions?.length || 0,
      imageSubmissions: imageSubmissions?.length || 0,
      totalCount: currentCount,
      maxAllowed,
      canSubmit: currentCount < maxAllowed
    });
    
    return {
      canSubmit: currentCount < maxAllowed,
      currentCount,
      maxAllowed
    };
  } catch (error) {
    console.error("Error checking submission limits:", error);
    return { canSubmit: false, currentCount: 0, maxAllowed: 2 };
  }
};

// Check submission frequency limits
export const checkSubmissionFrequency = async (
  board: any,
  userEmail: string,
  client: any
): Promise<boolean> => {
  if (board.submissionFrequency === 'unlimited') return true;
  
  const now = new Date();
  let startDate = new Date();
  
  switch (board.submissionFrequency) {
    case 'daily':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      return true;
  }
  
  try {
    // Check text submissions within the frequency period
    const { data: recentTextSubmissions } = await client.models.Submission.list({
      filter: {
        boardId: { eq: board.id },
        ownerEmail: { eq: userEmail },
        submissionDate: { ge: startDate.toISOString() },
        isDeleted: { ne: true }
      }
    });

    // Check image submissions within the frequency period
    const { data: recentImageSubmissions } = await client.models.ImageSubmission.list({
      filter: {
        boardId: { eq: board.id },
        ownerEmail: { eq: userEmail },
        submissionDate: { ge: startDate.toISOString() },
        isDeleted: { ne: true }
      }
    });

    const totalRecentSubmissions = (recentTextSubmissions?.length || 0) + (recentImageSubmissions?.length || 0);
    const maxAllowed = board.maxSubmissionsPerUser || 2;
    
    console.log(`Frequency limit check for ${userEmail}:`, {
      frequency: board.submissionFrequency,
      startDate: startDate.toISOString(),
      textSubmissions: recentTextSubmissions?.length || 0,
      imageSubmissions: recentImageSubmissions?.length || 0,
      totalRecent: totalRecentSubmissions,
      maxAllowed,
      canSubmit: totalRecentSubmissions < maxAllowed
    });
    
    return totalRecentSubmissions < maxAllowed;
  } catch (error) {
    console.error("Error checking submission frequency:", error);
    return false;
  }
};

// Format expiration time remaining
export const formatExpirationTime = (expiresAt: string | null): string | null => {
  if (!expiresAt) return null;
  
  const now = new Date();
  const expiration = new Date(expiresAt);
  const timeLeft = expiration.getTime() - now.getTime();
  
  if (timeLeft <= 0) return "Expired";
  
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m left`;
};

// Calculate time until expiration with more details
export const getExpirationInfo = (expiresAt: string | null) => {
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
export const getStatusBadge = (board: any) => {
  if (!board.isActive) return { text: 'Inactive', class: 'warning' };
  
  const expirationInfo = getExpirationInfo(board.expiresAt);
  if (expirationInfo?.expired) return { text: 'Expired', class: 'error' };
  
  if (board.isPublic) return { text: 'Public', class: 'success' };
  return { text: 'Private', class: 'info' };
};
