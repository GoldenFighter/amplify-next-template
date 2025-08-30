import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
      isDone: a.boolean(),
      owner: a.string(),
    })
    .authorization((allow) => [allow.owner()]),

  ScoredResponse: a.customType({
    rating: a.integer().required(),
    summary: a.string().required(),
    reasoning: a.string().required(),
    risks: a.string().array().required(),
    recommendations: a.string().array().required(),
  }),

  // Board model for organizing different evaluation categories
  Board: a
    .model({
      name: a.string().required(),
      description: a.string(),
      isPublic: a.boolean().default(false), // Whether board is visible to all users
      maxSubmissionsPerUser: a.integer().default(2), // Max submissions per user
      createdBy: a.string().required(), // Admin who created the board
      allowedUsers: a.string().array(), // Specific users who can access (if not public)
      allowedEmails: a.string().array(), // Specific emails who can access (if not public)
      expiresAt: a.datetime(), // When the board expires (optional)
      isActive: a.boolean().default(true), // Whether the board is active
      submissionFrequency: a.enum(['daily', 'weekly', 'monthly', 'unlimited']), // Submission frequency limit
      lastEditedAt: a.datetime(), // Track when board was last edited
      lastEditedBy: a.string(), // Track who last edited the board
      contestPrompt: a.string(), // The specific contest prompt/question for submissions
      contestType: a.string(), // Type of contest (e.g., "boy names", "recipes", "designs", "image-based")
      judgingCriteria: a.string().array(), // Specific criteria for judging submissions
      maxScore: a.integer().default(100), // Maximum possible score for this contest
      allowImageSubmissions: a.boolean().default(false), // Whether this board accepts image submissions
      maxImageSize: a.integer().default(5242880), // 5MB default
      allowedImageTypes: a.string().array().default(['image/jpeg', 'image/png', 'image/gif']), // Allowed image formats
    })
    .authorization(allow => [
      allow.owner(), // Creator can do everything
      allow.authenticated().to(['read']), // All authenticated users can read boards
    ]),

  // Submission model for user entries to specific boards
  Submission: a
    .model({
      boardId: a.string().required(), // Reference to the board
      prompt: a.string().required(), // User's submission
      context: a.string(),
      result: a.ref('ScoredResponse').required(), // AI evaluation result
      ownerEmail: a.string().required(), // User who submitted
      boardName: a.string().required(), // Denormalized for easier queries
      submissionDate: a.datetime().required(), // Date of submission for frequency tracking
      isDeleted: a.boolean().default(false), // Soft delete for submissions
      hasImage: a.boolean().default(false), // Whether this submission includes an image
      imageUrl: a.string(), // URL to the uploaded image (if applicable)
    })
    .authorization(allow => [
      allow.owner(), // Submitter can do everything
      allow.authenticated().to(['read']), // All authenticated users can read submissions
    ]),

  // ImageSubmission model for handling image uploads
  ImageSubmission: a
    .model({
      boardId: a.string().required(), // Reference to the board
      imageUrl: a.string().required(), // URL to the uploaded image
      imageKey: a.string().required(), // S3 key for the image
      imageSize: a.integer().required(), // Size of the image in bytes
      imageType: a.string().required(), // MIME type of the image
      prompt: a.string(), // Optional text prompt accompanying the image
      context: a.string(), // Additional context for the submission
      result: a.ref('ScoredResponse'), // AI evaluation result (optional, may be generated later)
      ownerEmail: a.string().required(), // User who submitted
      boardName: a.string().required(), // Denormalized for easier queries
      submissionDate: a.datetime().required(), // Date of submission for frequency tracking
      isDeleted: a.boolean().default(false), // Soft delete for submissions
      isProcessed: a.boolean().default(false), // Whether AI has processed this image
    })
    .authorization(allow => [
      allow.owner(), // Submitter can do everything
      allow.authenticated().to(['read']), // All authenticated users can read submissions
    ]),

  generateRecipe: a.generation({
    aiModel: a.ai.model('Claude 3 Haiku'),
    systemPrompt: 'You are a helpful assistant that generates recipes. Return a JSON object with: name (string), ingredients (array of strings), instructions (string). Return only valid JSON.',
  })
  .arguments({
    description: a.string(),
  })
  .returns(
    a.customType({
      name: a.string(),
      ingredients: a.string().array(),
      instructions: a.string(),
    })
  )
  .authorization((allow) => allow.authenticated()),

  // AI Generation route following the official AWS guide
  scoreTask: a.generation({
    aiModel: a.ai.model('Claude 3 Haiku'),
    systemPrompt: 'You are a task analyst. Analyze the given task and return a JSON object with: rating (0-100 integer), summary (string), reasoning (string), risks (array of strings), recommendations (array of strings). Return only valid JSON.',
    inferenceConfiguration: { temperature: 0.1, topP: 0.1, maxTokens: 1000 },
  })
    .arguments({
      prompt: a.string().required(),
      context: a.string(), // optional extra info
    })
    .returns(a.ref('ScoredResponse'))
    .authorization(allow => allow.authenticated()),

  // Contest-specific AI generation for consistent judging
  scoreContest: a.generation({
    aiModel: a.ai.model('Claude 3 Haiku'),
    systemPrompt: 'You are a contest judge. You will be given a contest type, prompt, judging criteria, and a submission. Rate the submission based on the criteria and return a JSON object with: rating (integer based on maxScore), summary (string), reasoning (string), risks (array of strings), recommendations (array of strings). Be strict and consistent in your judging. Return only valid JSON.',
    inferenceConfiguration: { temperature: 0.1, topP: 0.1, maxTokens: 1000 },
  })
    .arguments({
      submission: a.string().required(),
      contestType: a.string().required(),
      contestPrompt: a.string().required(),
      judgingCriteria: a.string().array().required(),
      maxScore: a.integer().required(),
    })
    .returns(a.ref('ScoredResponse'))
    .authorization(allow => allow.authenticated()),

  // AI generation for image-based contest judging
  scoreImageContest: a.generation({
    aiModel: a.ai.model('Claude 3 Haiku'),
    systemPrompt: 'You are an expert contest judge specializing in image evaluation. You will be given a contest type, prompt, judging criteria, and an image description. Rate the image submission based on the criteria and return a JSON object with: rating (integer based on maxScore), summary (string), reasoning (string), risks (array of strings), recommendations (array of strings). Be strict and consistent in your judging. Consider visual appeal, creativity, technical skill, and adherence to contest requirements. Return only valid JSON.',
    inferenceConfiguration: { temperature: 0.1, topP: 0.1, maxTokens: 1000 },
  })
    .arguments({
      imageDescription: a.string().required(), // Description of the image content
      contestType: a.string().required(),
      contestPrompt: a.string().required(),
      judgingCriteria: a.string().array().required(),
      maxScore: a.integer().required(),
      prompt: a.string(), // Optional text prompt accompanying the image
    })
    .returns(a.ref('ScoredResponse'))
    .authorization(allow => allow.authenticated()),

  // Legacy Analysis model - keeping for backward compatibility
  Analysis: a
    .model({
      prompt: a.string().required(),
      context: a.string(),
      result: a.ref('ScoredResponse').required(),
      ownerEmail: a.string().required(), // Store the user's email for display
    })
    .authorization(allow => [
      allow.owner(), // Owner can do everything
      allow.authenticated().to(['read']), // All authenticated users can read all analyses
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
});
