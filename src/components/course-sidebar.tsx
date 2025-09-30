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

  // Load completed items from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('completedItems');
    if (stored) {
      try {
        const completed = JSON.parse(stored);
        setCompletedItems(new Set(completed));
      } catch (e) {
        console.warn("[sidebar] Failed to parse completed items from sessionStorage:", e);
      }
    }
  }, []);

  // Track current page as completed
  useEffect(() => {
    const currentSlug = pathname?.match(/\/(lesson|quiz|tutorial|challenge)\/(.+)$/)?.[2];
    if (currentSlug) {
      setCompletedItems(prevCompleted => {
        if (!prevCompleted.has(currentSlug)) {
          const newCompleted = new Set(prevCompleted);
          newCompleted.add(currentSlug);
          sessionStorage.setItem('completedItems', JSON.stringify([...newCompleted]));
          return newCompleted;
        }
        return prevCompleted;
      });
    }
  }, [pathname]);

  // Extract course from URL - with SSR safety
  const getCurrentCourse = () => {
    if (typeof window === 'undefined') return '';
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('course') || '';
  };

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
  const currentCourse = getCurrentCourse();

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
    return completedItems.has(slug) ? (
      <div className="w-2 h-2 bg-green-500 rounded-full" />
    ) : (
      <div className="w-2 h-2 bg-gray-300 rounded-full" />
    );
  };

  return (
    <div 
      className="bg-white border-r border-gray-200 flex flex-col"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
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
                      {isChallenge && (
                        <Badge variant="destructive" className="text-xs">
                          Challenge
                        </Badge>
                      )}
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
