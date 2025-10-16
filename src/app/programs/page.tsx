"use client";

import Link from "next/link";

// Note: Metadata is handled by the root layout for client components

export default function ProgramsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Programs</h1>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login" className="text-sm text-blue-600 hover:text-blue-700">
              Sign In to Work on Code
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <Link
            href="/csdp/courses"
            className="block border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Complete Software Development Programme</h2>
                <p className="text-sm text-gray-600 mt-1">Foundations to advanced topics, step-by-step</p>
              </div>
              <div className="text-sm text-gray-500">View courses →</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}


