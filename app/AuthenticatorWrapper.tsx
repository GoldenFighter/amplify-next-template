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
      {({ user }) => (
        <PicFightThemeProvider userEmail={(user as any)?.attributes?.email || ''}>
          {children}
        </PicFightThemeProvider>
      )}
    </Authenticator>
  );
}
