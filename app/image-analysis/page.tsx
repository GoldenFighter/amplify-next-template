'use client';

import ImageAnalyzer from '../components/ImageAnalyzer';
import { Authenticator } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

// Configure Amplify at the page level
if (!Amplify.getConfig().Auth) {
  console.log("Configuring Amplify in image-analysis page...");
  Amplify.configure(outputs);
  console.log("Amplify configured successfully in image-analysis page");
}

export default function ImageAnalysisPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Authenticator>
        <ImageAnalyzer />
      </Authenticator>
    </div>
  );
}
