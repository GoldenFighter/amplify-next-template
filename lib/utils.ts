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

// Check if user can access a specific board
export const canAccessBoard = (
  board: any, 
  userEmail: string
): boolean => {
  // Public boards are accessible to everyone
  if (board.isPublic) return true;
  
  // Creator can always access their own boards
  if (board.createdBy === userEmail) return true;
  
  // Check if user's email is in allowed emails
  if (board.allowedEmails?.includes(userEmail)) return true;
  
  return false;
};

// Check if user can submit to a board (considering submission limits)
export const canSubmitToBoard = async (
  boardId: string,
  userEmail: string,
  client: any
): Promise<{ canSubmit: boolean; currentCount: number; maxAllowed: number }> => {
  try {
    // Get user's current submissions to this board
    const { data: submissions } = await client.models.Submission.list({
      filter: {
        boardId: { eq: boardId },
        ownerEmail: { eq: userEmail }
      }
    });

    const currentCount = submissions?.length || 0;
    
    // Get board details to check max submissions
    const { data: boards } = await client.models.Board.list({
      filter: { id: { eq: boardId } }
    });
    
    const board = boards?.[0];
    const maxAllowed = board?.maxSubmissionsPerUser || 2;
    
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
