import { defineFunction } from '@aws-amplify/backend';

export const rekognitionAnalysis = defineFunction({
  name: 'rekognitionAnalysis',
  entry: './handler.ts',
  runtime: 20, // Node.js 20
  timeoutSeconds: 60, // 1 minute timeout
  memoryMB: 512, // 512MB memory
  environment: {
    BUCKET_NAME: '${storage.picfight-contest-storage.bucketName}',
  },
});
