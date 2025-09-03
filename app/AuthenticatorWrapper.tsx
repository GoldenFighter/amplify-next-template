"use client"

import { Authenticator } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import { PicFightThemeProvider } from "../lib/ThemeContext";

// Configure Amplify on the client side
if (!Amplify.getConfig().Auth) {
  console.log("Configuring Amplify in AuthenticatorWrapper...");
  Amplify.configure(outputs);
  console.log("Amplify configured successfully in AuthenticatorWrapper");
}

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
