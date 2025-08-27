"use client"

import { Authenticator } from "@aws-amplify/ui-react";
import { PicFightThemeProvider } from "../lib/ThemeContext";

export default function AuthenticatorWrapper({
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
        
        console.log('AuthenticatorWrapper - User:', user);
        console.log('AuthenticatorWrapper - Extracted email:', userEmail);
        
        return (
          <PicFightThemeProvider userEmail={userEmail}>
            {children}
          </PicFightThemeProvider>
        );
      }}
    </Authenticator>
  );
}
