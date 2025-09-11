import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { storage } from './storage/resource.js';
import { imageAnalysis } from './functions/imageAnalysis/resource.js';
// import { exifExtraction } from './functions/exifExtraction/resource';
// import { rekognitionAnalysis } from './functions/rekognitionAnalysis/resource.js';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { EventType } from 'aws-cdk-lib/aws-s3';

const backend = defineBackend({
  auth,
  data,
  storage,
  imageAnalysis,
  // exifExtraction,
  // rekognitionAnalysis,
});

// Grant the function access to Bedrock
backend.imageAnalysis.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'bedrock:InvokeModel',
      'bedrock:InvokeModelWithResponseStream',
    ],
    resources: [
      'arn:aws:bedrock:eu-west-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
    ],
  })
);

// Grant the function access to S3 for image downloads
backend.imageAnalysis.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      's3:GetObject',
      's3:GetObjectVersion',
    ],
    resources: [
      `${backend.storage.resources.bucket.bucketArn}/*`,
    ],
  })
);

// Grant EXIF extraction function access to S3
// backend.exifExtraction.resources.lambda.addToRolePolicy(
//   new PolicyStatement({
//     effect: Effect.ALLOW,
//     actions: [
//       's3:GetObject',
//       's3:GetObjectVersion',
//     ],
//     resources: [
//       `${backend.storage.resources.bucket.bucketArn}/*`,
//     ],
//   })
// );

// // Grant Rekognition analysis function access to S3 and Rekognition
// backend.rekognitionAnalysis.resources.lambda.addToRolePolicy(
//   new PolicyStatement({
//     effect: Effect.ALLOW,
//     actions: [
//       's3:GetObject',
//       's3:GetObjectVersion',
//     ],
//     resources: [
//       `${backend.storage.resources.bucket.bucketArn}/*`,
//     ],
//   })
// );

// backend.rekognitionAnalysis.resources.lambda.addToRolePolicy(
//   new PolicyStatement({
//     effect: Effect.ALLOW,
//     actions: [
//       'rekognition:DetectLabels',
//       'rekognition:DetectFaces',
//       'rekognition:DetectText',
//     ],
//     resources: ['*'],
//   })
// );

// // Add S3 triggers for both functions
// backend.storage.resources.bucket.addEventNotification(
//   EventType.OBJECT_CREATED,
//   new LambdaDestination(backend.exifExtraction.resources.lambda),
//   {
//     prefix: 'contest-submissions/',
//     suffix: '.jpg',
//   }
// );

// backend.storage.resources.bucket.addEventNotification(
//   EventType.OBJECT_CREATED,
//   new LambdaDestination(backend.exifExtraction.resources.lambda),
//   {
//     prefix: 'contest-submissions/',
//     suffix: '.jpeg',
//   }
// );

// backend.storage.resources.bucket.addEventNotification(
//   EventType.OBJECT_CREATED,
//   new LambdaDestination(backend.exifExtraction.resources.lambda),
//   {
//     prefix: 'contest-submissions/',
//     suffix: '.png',
//   }
// );

// backend.storage.resources.bucket.addEventNotification(
//   EventType.OBJECT_CREATED,
//   new LambdaDestination(backend.rekognitionAnalysis.resources.lambda),
//   {
//     prefix: 'contest-submissions/',
//     suffix: '.jpg',
//   }
// );

// backend.storage.resources.bucket.addEventNotification(
//   EventType.OBJECT_CREATED,
//   new LambdaDestination(backend.rekognitionAnalysis.resources.lambda),
//   {
//     prefix: 'contest-submissions/',
//     suffix: '.jpeg',
//   }
// );

// backend.storage.resources.bucket.addEventNotification(
//   EventType.OBJECT_CREATED,
//   new LambdaDestination(backend.rekognitionAnalysis.resources.lambda),
//   {
//     prefix: 'contest-submissions/',
//     suffix: '.png',
//   }
// );
