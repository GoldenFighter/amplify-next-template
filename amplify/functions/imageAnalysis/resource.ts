import { defineFunction } from '@aws-amplify/backend';

export const imageAnalysis = defineFunction({
  name: 'imageAnalysis',
  entry: './handler.ts',
  runtime: 20, // Node.js 20
  timeoutSeconds: 300, // 5 minutes for image processing
  memoryMB: 1024, // 1GB memory for image processing
  environment: {
    BEDROCK_REGION: 'eu-west-1',
  },
});
