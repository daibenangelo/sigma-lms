"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

type Course = {
  id: string;
  name: string;
  icon: string;
  totalSteps: number;
  completedSteps: number;
  description?: string;
  slug: string;
};

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  useEffect(() => {
    // Fetch modules from Contentful
    fetch("/api/modules")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch modules");
        }
        return response.json();
      })
      .then((data) => {
        console.log("[dashboard] modules response:", data);
        const modules = data.modules || [];
        
        // Convert modules to course format with appropriate icons
        const courseData = modules.map((module: any) => ({
          id: module.id || module.slug,
          name: module.title,
          icon: getModuleIcon(module.title),
          totalSteps: module.totalSteps || 0,
          completedSteps: module.completedSteps || 0,
          description: module.description || `Learn ${module.title} fundamentals`,
          slug: module.slug
        }));
        
        setCourses(courseData);
        setLoading(false);
      })
      .catch((error) => {
        console.error("[dashboard] Error fetching modules:", error);
        setLoading(false);
      });
  }, []);

  const getModuleIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('html')) return '5';
    if (lowerTitle.includes('css')) return '3';
    if (lowerTitle.includes('javascript') || lowerTitle.includes('js')) return 'JS';
    if (lowerTitle.includes('react')) return '⚛';
    if (lowerTitle.includes('python')) return '🐍';
    if (lowerTitle.includes('database') || lowerTitle.includes('sql')) return '🗄';
    if (lowerTitle.includes('node') || lowerTitle.includes('backend')) return 'JS';
    return '📚'; // Default icon
  };

  const toggleExpanded = (courseId: string) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
  };

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getIconStyle = (icon: string) => {
    if (icon === "5") {
      return "bg-orange-100 text-orange-600 text-lg font-bold";
    } else if (icon === "3") {
      return "bg-blue-100 text-blue-600 text-lg font-bold";
    } else if (icon === "JS") {
      return "bg-yellow-100 text-yellow-800 text-sm font-bold";
    } else if (icon === "⚛") {
      return "bg-cyan-100 text-cyan-600 text-lg";
    } else if (icon === "🐍") {
      return "bg-green-100 text-green-600 text-lg";
    } else if (icon === "🗄") {
      return "bg-purple-100 text-purple-600 text-lg";
    }
    return "bg-gray-100 text-gray-600 text-lg";
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Modules</h1>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">Loading modules...</div>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No modules found</div>
            <p className="text-sm text-gray-400">Make sure you have modules published in Contentful</p>
          </div>
        ) : (
          <div className="space-y-4">
          {courses.map((course) => {
            const progress = getProgressPercentage(course.completedSteps, course.totalSteps);
            const isExpanded = expandedCourse === course.id;
            
            return (
              <div
                key={course.id}
                className="bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => toggleExpanded(course.id)}
              >
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getIconStyle(course.icon)}`}>
                      {course.icon}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{course.name}</h2>
                      <p className="text-sm text-gray-600">{course.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {course.completedSteps} of {course.totalSteps} steps complete
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{progress}%</span>
                      </div>
                    </div>
                    
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="space-y-4">
                      <p className="text-gray-700">{course.description}</p>
                      <div className="flex space-x-4">
                        <Link
                          href={`/module/${course.slug}`}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Start Module
                        </Link>
                        <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                          View Progress
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
}
