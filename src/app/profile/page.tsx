"use client";

import { useAuth } from "@/contexts/auth-context";
import { User, Mail, Calendar } from "lucide-react";

export default function ProfilePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Logged In</h1>
          <p className="text-gray-600">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Profile Header */}
      <div className="rounded-lg bg-white border border-gray-200 p-6">
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24 bg-blue-100 rounded-lg flex items-center justify-center border-2 border-white shadow-sm">
              <div className="w-16 h-16 bg-blue-200 rounded-lg flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
              </h1>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">{user.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Member since {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div className="space-y-6">
        <div className="rounded-lg bg-white border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">freeCodeCamp Certifications</h2>
          <div className="space-y-3">
            <button className="w-full text-left p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
              <span className="text-gray-900 font-medium">View Responsive Web Design Certification</span>
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-white border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Legacy Certifications</h2>
          <div className="space-y-3">
            <button className="w-full text-left p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
              <span className="text-gray-900 font-medium">View Legacy JavaScript Algorithms and Data Structures Certification</span>
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-lg bg-white border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Timeline</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Challenge</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Solution</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Completed</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <a href="#" className="text-blue-600 hover:text-blue-800 underline">
                    Build a Curriculum Outline - Step 1
                  </a>
                </td>
                <td className="py-3 px-4 text-gray-500">-</td>
                <td className="py-3 px-4 text-gray-600">Sep 12, 2025</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <a href="#" className="text-blue-600 hover:text-blue-800 underline">
                    Introduction: Elements of Python
                  </a>
                </td>
                <td className="py-3 px-4 text-gray-500">-</td>
                <td className="py-3 px-4 text-gray-600">Jul 10, 2020</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <a href="#" className="text-blue-600 hover:text-blue-800 underline">
                    Iterations: Definite Loops
                  </a>
                </td>
                <td className="py-3 px-4 text-gray-500">-</td>
                <td className="py-3 px-4 text-gray-600">Jul 10, 2020</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <a href="#" className="text-blue-600 hover:text-blue-800 underline">
                    Python Functions
                  </a>
                </td>
                <td className="py-3 px-4 text-gray-500">-</td>
                <td className="py-3 px-4 text-gray-600">Jul 10, 2020</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
