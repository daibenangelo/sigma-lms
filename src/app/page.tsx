import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sigma LMS - Interactive Learning Management System",
  description: "Learn software development with interactive courses, tutorials, quizzes, and coding challenges. Start your programming journey today.",
  keywords: ["learning management system", "LMS", "software development", "programming", "coding", "tutorials", "courses"],
  openGraph: {
    title: "Sigma LMS - Interactive Learning Management System",
    description: "Learn software development with interactive courses, tutorials, quizzes, and coding challenges. Start your programming journey today.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sigma LMS - Interactive Learning Management System",
    description: "Learn software development with interactive courses, tutorials, quizzes, and coding challenges.",
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Welcome to Sigma LMS
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your learning management system for software development
          </p>
          <div className="space-x-4">
            <Link
              href="/course/html"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Start Learning
            </Link>
            <Link
              href="/programs"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              View Programs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

