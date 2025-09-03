'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';
import { PicFightThemeProvider } from '../lib/ThemeContext';

// Configure Amplify on the client side (following Amplify quickstart pattern)
Amplify.configure(outputs);

export default function ClientRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Authenticator>
      {({ user }) => {
        // Extract email from different possible user object structures
        let userEmail = '';
        
        if (user) {
          // Try different possible email properties
          userEmail = (user as any)?.attributes?.email || 
                     (user as any)?.signInDetails?.loginId || 
                     (user as any)?.username || 
                     '';
        }
        
        console.log('ClientRoot - User:', user);
        console.log('ClientRoot - Extracted email:', userEmail);
        
        return (
          <PicFightThemeProvider userEmail={userEmail}>
            {children}
          </PicFightThemeProvider>
        );
      }}
    </Authenticator>
  );
}
