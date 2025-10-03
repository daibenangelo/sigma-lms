"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function ProgramsPage() {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    console.log('🚪 PROGRAMS: Starting logout');
    await signOut();
    console.log('🚪 PROGRAMS: Logout complete, redirecting');
    window.location.href = '/auth/login';
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Programs</h1>
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Logged in as: {user.email}</span>
              <Button 
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          )}
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


