"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  Circle,
  BookOpen,
  HelpCircle,
  Wrench,
  Swords
} from "lucide-react";
import { useLessonsFetch } from "@/hooks/use-cached-fetch";
import { useCourseProgress } from "@/hooks/use-course-progress";

type ContentItem = {
  title: string;
  slug: string;
  type: 'lesson' | 'quiz' | 'module-quiz' | 'tutorial' | 'challenge';
};

export function CourseSidebar() {
  const pathname = usePathname();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [courseName, setCourseName] = useState<string>("Course");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(320);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const isResizingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(320);
  const { fetchLessons } = useLessonsFetch();
  
  // Get current course from URL
  const getCurrentCourse = () => {
    if (typeof window === 'undefined') return '';
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('course') || '';
  };
  
  const currentCourse = getCurrentCourse();
  console.log("[sidebar] Current course:", currentCourse);
  
  const { 
    progress, 
    markItemCompleted, 
    isItemCompleted, 
    saveProgress 
  } = useCourseProgress(currentCourse);

  // Calculate progress - prioritize database progress, use sessionStorage as fallback
  const dbCompletedCount = progress?.completed_items?.length || 0;
  const sessionCompletedCount = completedItems.size;
  
  // Use database progress if available, otherwise use sessionStorage
  const completedCount = dbCompletedCount > 0 ? dbCompletedCount : sessionCompletedCount;
  
  // Use the actual content length as total count
  const totalCount = content.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  console.log("[sidebar] Progress calculation:", {
    currentCourse,
    dbCompletedCount,
    sessionCompletedCount,
    completedCount,
    totalCount,
    progressPercentage,
    contentLength: content.length,
    usingDatabase: dbCompletedCount > 0
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = e.clientX - startXRef.current;
      const next = Math.min(480, Math.max(240, startWidthRef.current + delta));
      setSidebarWidth(next);
    };
    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Load completed items from sessionStorage for current course
  useEffect(() => {
    if (!currentCourse) {
      setCompletedItems(new Set());
      return;
    }
    
    const storageKey = `completedItems_${currentCourse}`;
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      try {
        const completed = JSON.parse(stored);
        setCompletedItems(new Set(completed));
        console.log(`[sidebar] Loaded completed items for course ${currentCourse}:`, completed);
      } catch (e) {
        console.warn(`[sidebar] Failed to parse completed items for course ${currentCourse}:`, e);
        setCompletedItems(new Set());
      }
    } else {
      setCompletedItems(new Set());
    }
  }, [currentCourse]);

  // Track current page as completed
  useEffect(() => {
    const currentSlug = pathname?.match(/\/(lesson|quiz|tutorial|challenge)\/(.+)$/)?.[2];
    if (currentSlug && totalCount > 0 && currentCourse) {
      // Update sessionStorage for current course
      setCompletedItems(prevCompleted => {
        if (!prevCompleted.has(currentSlug)) {
          const newCompleted = new Set(prevCompleted);
          newCompleted.add(currentSlug);
          const storageKey = `completedItems_${currentCourse}`;
          sessionStorage.setItem(storageKey, JSON.stringify([...newCompleted]));
          console.log(`[sidebar] Marked ${currentSlug} as completed for course ${currentCourse}`);
          return newCompleted;
        }
        return prevCompleted;
      });
      
      // Update database
      markItemCompleted(currentSlug, totalCount);
    }
  }, [pathname, totalCount, markItemCompleted, currentCourse]);


  // Fetch content when pathname changes
  useEffect(() => {
    const course = getCurrentCourse();
    if (!course) {
      setContent([]);
      setCourseName("Course");
      return;
    }

    fetchLessons(course)
      .then((data) => {
        console.log("[sidebar] /api/lessons response:", data);
        if (!data) {
          setContent([]);
          return;
        }
        // Keep nested order: chapter followed by its items
        const combined = Array.isArray(data.allContent) ? data.allContent : [];
        console.log("[sidebar] combined content:", combined);
        console.log("[sidebar] Content breakdown:", {
          lessons: (data as any).lessons?.length || 0,
          tutorials: (data as any).tutorials?.length || 0,
          quizzes: (data as any).quizzes?.length || 0,
          challenges: (data as any).challenges?.length || 0,
          allContent: combined.length
        });
        setContent(combined);
        
        // Extract course name from the course data or use a default
        if (data.courseName) {
          setCourseName(data.courseName);
        } else if (data.allContent && data.allContent.length > 0) {
          // Fallback: use course parameter with proper formatting
          setCourseName(`${course.charAt(0).toUpperCase() + course.slice(1)} Course`);
        } else {
          setCourseName("Course");
        }
      })
      .catch((e) => {
        console.error("[sidebar] /api/lessons fetch failed:", e);
        setContent([]);
      });
  }, [pathname]);

  const currentSlug = pathname?.match(/\/(lesson|quiz|tutorial|challenge)\/(.+)$/)?.[2];

  const getIcon = (type: string) => {
    switch (type) {
      case 'lesson':
        return <BookOpen className="h-4 w-4" />;
      case 'tutorial':
        return <HelpCircle className="h-4 w-4" />;
      case 'quiz':
        return <Circle className="h-4 w-4" />;
      case 'challenge':
        return <Swords className="h-4 w-4" />;
      default:
        return <Wrench className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (slug: string) => {
    const isCompleted = isItemCompleted(slug) || completedItems.has(slug);
    return isCompleted ? (
      <div className="w-2 h-2 bg-green-500 rounded-full" />
    ) : (
      <div className="w-2 h-2 bg-gray-300 rounded-full" />
    );
  };

  return (
    <div 
      className="bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 h-screen z-10"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 truncate">{courseName}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* Progress Counter */}
        {totalCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">Progress</span>
              <span className="text-sm font-bold text-blue-700">
                {completedCount}/{totalCount}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="text-xs text-blue-700 mt-1">
              {progressPercentage}% Complete
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isExpanded && (
          <div className="p-4 space-y-2">
            {content.map((item, index) => {
              const isLesson = item.type === 'lesson';
              const isTutorial = item.type === 'tutorial';
              const isQuiz = item.type === 'quiz';
              const isChallenge = item.type === 'challenge';
              const isModuleQuiz = item.type === 'module-quiz';
              
              const href = isQuiz ? `/quiz/${item.slug}?course=${currentCourse}` : 
                          isTutorial ? `/tutorial/${item.slug}?course=${currentCourse}` : 
                          isChallenge ? `/challenge/${item.slug}?course=${currentCourse}` : 
                          `/lesson/${item.slug}?course=${currentCourse}`;

              const isActive = currentSlug === item.slug;
              const isCompleted = completedItems.has(item.slug);

              return (
                <div key={index} className="space-y-1">
                  <Link
                    href={href}
                    className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">
                        {isLesson ? 'Chapter' : 
                         isTutorial ? 'Tutorial' : 
                         isQuiz ? 'Quiz' : 
                         isChallenge ? 'Challenge' : 
                         'Content'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(item.slug)}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="w-1 bg-gray-200 hover:bg-gray-300 cursor-col-resize transition-colors"
        onMouseDown={(e) => {
          isResizingRef.current = true;
          startXRef.current = e.clientX;
          startWidthRef.current = sidebarWidth;
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
        }}
      />
    </div>
  );
}
