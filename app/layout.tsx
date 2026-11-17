// app/layout.tsx: wraps every page: fonts, login provider (Clerk), page title.
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Fura: scripts in your own style",
  description: "Upload a few of your videos. Fura learns how you talk and writes scripts, hooks and ideas that sound like you.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{ variables: { colorPrimary: "#0e1116", borderRadius: "12px" } }}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
    >
      <html lang="en" className={`${sans.variable} ${mono.variable}`}>
        <body className="font-sans min-h-screen">{children}</body>
      </html>
    </ClerkProvider>
  );
}
