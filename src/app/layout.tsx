import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/shell";
import { AuthProvider } from "@/contexts/auth-context";
import DatabaseResetHandler from "@/components/database-reset-handler";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Sigma LMS - Learning Management System",
    template: "%s | Sigma LMS"
  },
  description: "Interactive learning platform for software development courses, tutorials, quizzes, and coding challenges.",
  keywords: ["learning management system", "LMS", "software development", "coding courses", "programming tutorials", "web development"],
  authors: [{ name: "Sigma LMS" }],
  creator: "Sigma LMS",
  publisher: "Sigma LMS",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('http://localhost:3000'),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "http://localhost:3000",
    title: "Sigma LMS - Learning Management System",
    description: "Interactive learning platform for software development courses, tutorials, quizzes, and coding challenges.",
    siteName: "Sigma LMS",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sigma LMS - Learning Management System",
    description: "Interactive learning platform for software development courses, tutorials, quizzes, and coding challenges.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <DatabaseResetHandler />
          <Shell>{children}</Shell>
        </AuthProvider>
      </body>
    </html>
  );
}
