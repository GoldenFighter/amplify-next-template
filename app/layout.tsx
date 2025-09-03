import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./app.css";
import AuthenticatorWrapper from "./AuthenticatorWrapper";
import "@aws-amplify/ui-react/styles.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PicFight - AI-Powered Contest Platform",
  description: "Create and participate in AI-judged contests with real-time scoring and rankings",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>      
        <AuthenticatorWrapper>
          {children}
        </AuthenticatorWrapper>
      </body>
    </html>
  );
}
