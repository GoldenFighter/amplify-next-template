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

  // Data model for storing results, restricted per-owner
  Analysis: a
    .model({
      prompt: a.string().required(),
      context: a.string(),
      result: a.ref('ScoredResponse').required(),
    })
    .authorization(allow => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
});
