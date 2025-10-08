"use client";

import Link from "next/link";
import { BookOpen, HelpCircle, Circle, Swords } from "lucide-react";
import { useCourseProgress } from "@/hooks/use-course-progress";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect } from "react";

interface Course {
  id: string;
  title: string;
  slug: string;
  chapters: any[];
  quizCount: number;
  tutorialCount: number;
  challengeCount: number;
  progressPercentage: number;
}

interface CourseCardProps {
  course: Course;
  isSelected?: boolean;
  onSelect?: () => void;
  isCompact?: boolean;
}

export function CourseCard({ course, isSelected = false, onSelect, isCompact = false }: CourseCardProps) {
  const { user } = useAuth();
  const { progress, isItemViewed } = useCourseProgress(course.slug);
  const [courseContent, setCourseContent] = useState<any>(null);

  // Fetch course content to get actual items (same as sidebar)
  useEffect(() => {
    const fetchCourseContent = async () => {
      try {
        const response = await fetch(`/api/lessons?course=${course.slug}`);
        const data = await response.json();
        if (data && data.allContent) {
          setCourseContent(data);
        }
      } catch (error) {
        console.error('Failed to fetch course content:', error);
        // Fallback to calculated count
        setCourseContent({
          allContent: [],
          lessons: [],
          tutorials: [],
          quizzes: [],
          challenges: []
        });
      }
    };

    fetchCourseContent();
  }, [course.slug]);

  // Listen for progress updates and re-fetch content
  useEffect(() => {
    const handleProgressUpdate = () => {
      // Re-fetch content when progress updates
      const fetchCourseContent = async () => {
        try {
          const response = await fetch(`/api/lessons?course=${course.slug}`);
          const data = await response.json();
          if (data && data.allContent) {
            setCourseContent(data);
          }
        } catch (error) {
          console.error('Failed to fetch course content on progress update:', error);
        }
      };
      fetchCourseContent();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('item-completed', handleProgressUpdate);
      return () => window.removeEventListener('item-completed', handleProgressUpdate);
    }
  }, [course.slug]);
  
  // Use the same progress calculation logic as sidebar
  const totalContent = courseContent?.allContent?.length || 0;
  
  // Database progress (prioritized like sidebar)
  const dbCompletedCount = progress?.completed_items?.length || 0;
  const dbViewedCount = progress?.viewed_items?.length || 0;
  
  // User-specific sessionStorage fallback (same as sidebar)
  const sessionCompletedItems = typeof window !== 'undefined' && user ?
    new Set(JSON.parse(sessionStorage.getItem(`completedItems_${user.id}_${course.slug}`) || '[]')) : new Set();
  const sessionViewedItems = typeof window !== 'undefined' && user ?
    new Set(JSON.parse(sessionStorage.getItem(`viewedItems_${user.id}_${course.slug}`) || '[]')) : new Set();
  
  const sessionCompletedCount = sessionCompletedItems.size;
  const sessionViewedCount = sessionViewedItems.size;
  
  // Use database progress if available, otherwise use sessionStorage (same as sidebar)
  const completedCount = dbCompletedCount > 0 ? dbCompletedCount : sessionCompletedCount;
  const viewedCount = dbViewedCount > 0 ? dbViewedCount : sessionViewedCount;
  
  // Count content pages (lessons/chapters) as viewed since they don't need completion (same as sidebar)
  const contentPages = courseContent?.allContent?.filter((item: any) => item.type === 'lesson' || item.type === 'chapter') || [];
  const contentPagesViewed = contentPages.filter((item: any) => {
    const isViewed = isItemViewed(item.slug) || sessionViewedItems.has(item.slug);
    return isViewed;
  }).length;
  
  // Progress includes both completed items and viewed content pages (same as sidebar)
  const effectiveProgressCount = completedCount + contentPagesViewed;
  const progressPercentage = totalContent > 0 ? Math.round((effectiveProgressCount / totalContent) * 100) : 0;

  // Check if there's any progress (database or sessionStorage)
  const hasProgress = progressPercentage > 0;
  const buttonText = hasProgress ? "Continue" : "Start Learning";

  // Debug logging (matches sidebar format)
  console.log(`[CourseCard] ${course.slug}:`, {
    totalContent,
    dbCompletedCount,
    dbViewedCount,
    sessionCompletedCount,
    sessionViewedCount,
    completedCount,
    viewedCount,
    contentPagesCount: contentPages.length,
    contentPagesViewed,
    effectiveProgressCount,
    progressPercentage,
    completedItems: progress?.completed_items,
    viewedItems: progress?.viewed_items,
    sessionStorageCompleted: Array.from(sessionCompletedItems),
    sessionStorageViewed: Array.from(sessionViewedItems),
    localStorageKeys: {
      completed: `completedItems_${user?.id}_${course.slug}`,
      viewed: `viewedItems_${user?.id}_${course.slug}`
    },
    usingDatabase: dbCompletedCount > 0 || dbViewedCount > 0
  });

  const cardContent = (
    <div className={`group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-6 border ${
      isSelected 
        ? 'border-blue-300 bg-blue-50' 
        : 'border-gray-200 hover:border-gray-300'
    } ${onSelect ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-blue-500 p-3 rounded-lg mr-4">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600">
              {course.title}
            </h3>
            {isCompact ? null : (
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{course.chapters.length} chapter{course.chapters.length !== 1 ? 's' : ''}</span>
                {course.quizCount > 0 && (
                  <span className="flex items-center">
                    <Circle className="h-3 w-3 mr-1" />
                    {course.quizCount} quiz{course.quizCount !== 1 ? 'zes' : ''}
                  </span>
                )}
                {course.tutorialCount > 0 && (
                  <span className="flex items-center">
                    <HelpCircle className="h-3 w-3 mr-1" />
                    {course.tutorialCount} tutorial{course.tutorialCount !== 1 ? 's' : ''}
                  </span>
                )}
                {course.challengeCount > 0 && (
                  <span className="flex items-center">
                    <Swords className="h-3 w-3 mr-1" />
                    {course.challengeCount} challenge{course.challengeCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Progress bar */}
          {totalContent > 0 && (
            <div className="flex items-center space-x-3">
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-600 font-medium w-12 text-right">
                {progressPercentage}%
              </span>
            </div>
          )}
          
          <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700 w-32">
            <span className="truncate">{buttonText}</span>
            <svg className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );

  if (onSelect) {
    return (
      <div onClick={onSelect}>
        {cardContent}
      </div>
    );
  }

  return (
    <Link href={`/course/${course.slug}`}>
      {cardContent}
    </Link>
  );
}
