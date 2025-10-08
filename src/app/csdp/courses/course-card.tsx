"use client";

import Link from "next/link";
import { BookOpen, HelpCircle, Circle, Swords } from "lucide-react";
import { useCourseProgress } from "@/hooks/use-course-progress";
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
  const { progress } = useCourseProgress(course.slug);
  const [actualContentCount, setActualContentCount] = useState<number>(0);

  // Fetch actual content count from API (same as sidebar)
  useEffect(() => {
    const fetchContentCount = async () => {
      try {
        const response = await fetch(`/api/lessons?course=${course.slug}`);
        const data = await response.json();
        if (data && data.allContent) {
          setActualContentCount(data.allContent.length);
        }
      } catch (error) {
        console.error('Failed to fetch content count:', error);
        // Fallback to calculated count
        setActualContentCount(course.chapters.length + course.quizCount + course.tutorialCount + course.challengeCount);
      }
    };

    fetchContentCount();
  }, [course.slug, course.chapters.length, course.quizCount, course.tutorialCount, course.challengeCount]);

  // Listen for progress updates and re-fetch content count
  useEffect(() => {
    const handleProgressUpdate = () => {
      // Re-fetch content count when progress updates
      const fetchContentCount = async () => {
        try {
          const response = await fetch(`/api/lessons?course=${course.slug}`);
          const data = await response.json();
          if (data && data.allContent) {
            setActualContentCount(data.allContent.length);
          }
        } catch (error) {
          console.error('Failed to fetch content count on progress update:', error);
        }
      };
      fetchContentCount();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('item-completed', handleProgressUpdate);
      return () => window.removeEventListener('item-completed', handleProgressUpdate);
    }
  }, [course.slug]);
  
  // Use the same total count as sidebar (content.length from lessons API)
  const totalContent = actualContentCount;
  // Use database progress if available, otherwise use sessionStorage fallback like sidebar
  const dbCompletedCount = progress?.completed_items?.length || 0;
  const sessionCompletedItems = typeof window !== 'undefined' ?
    new Set(JSON.parse(sessionStorage.getItem(`completedItems_${course.slug}`) || '[]')) : new Set();
  const sessionCompletedCount = sessionCompletedItems.size;
  const completedCount = dbCompletedCount > 0 ? dbCompletedCount : sessionCompletedCount;
  const progressPercentage = totalContent > 0 ? Math.round((completedCount / totalContent) * 100) : 0;

  // Check if there's any progress (database or sessionStorage)
  const hasProgress = progressPercentage > 0;
  const buttonText = hasProgress ? "Continue" : "Start Learning";

  // Debug logging
  console.log(`[CourseCard] ${course.slug}:`, {
    actualContentCount,
    totalContent,
    dbCompletedCount,
    sessionCompletedCount,
    completedCount,
    progressPercentage,
    completedItems: progress?.completed_items,
    sessionStorageItems: Array.from(sessionCompletedItems)
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
            {isCompact ? (
              <div className="flex items-center space-x-2">
                {course.chapters.length > 0 && (
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full">
                    <span className="text-xs font-medium text-blue-600">{course.chapters.length}</span>
                  </div>
                )}
                {course.quizCount > 0 && (
                  <div className="flex items-center justify-center w-6 h-6 bg-yellow-100 rounded-full">
                    <span className="text-xs font-medium text-yellow-600">{course.quizCount}</span>
                  </div>
                )}
                {course.tutorialCount > 0 && (
                  <div className="flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                    <span className="text-xs font-medium text-green-600">{course.tutorialCount}</span>
                  </div>
                )}
                {course.challengeCount > 0 && (
                  <div className="flex items-center justify-center w-6 h-6 bg-red-100 rounded-full">
                    <span className="text-xs font-medium text-red-600">{course.challengeCount}</span>
                  </div>
                )}
              </div>
            ) : (
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
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-600 font-medium">
                {progressPercentage}%
              </span>
            </div>
          )}
          
          <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700">
            {buttonText}
            <svg className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
