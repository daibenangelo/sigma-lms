"use client";

import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  HelpCircle,
  Circle
} from "lucide-react";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type LessonMeta = {
  title: string | null;
  slug: string | null;
  course: string | null;
  program: string | null;
};

type ContentItem = {
  title: string;
  slug: string;
  type: 'lesson' | 'quiz' | 'module-quiz' | 'tutorial' | 'challenge';
};

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [meta, setMeta] = useState<LessonMeta | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [courseName, setCourseName] = useState<string>("Course");

  useEffect(() => {
    // Determine course from current pathname, URL params, or stored context
    let course = "html"; // default
    console.log("[navbar] Current pathname:", pathname);
    
    // First check if course is in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const courseParam = urlParams.get('course');
    if (courseParam) {
      course = courseParam;
      sessionStorage.setItem('currentCourse', course);
    } else if (pathname?.includes("/module/")) {
      // Check if we're on a module page
      const match = pathname.match(/\/module\/([^\/]+)/);
      if (match) {
        course = match[1];
        // Store the course context for navigation
        sessionStorage.setItem('currentCourse', course);
      }
    } else {
      // Try to get course from session storage first
      const storedCourse = sessionStorage.getItem('currentCourse');
      if (storedCourse) {
        course = storedCourse;
      } else {
        // Fallback: try to extract course from lesson slug by looking for common course patterns
        const lessonMatch = pathname?.match(/\/lesson\/(.+)$/);
        if (lessonMatch) {
          const lessonSlug = lessonMatch[1];
          // Try to extract course from slug by looking for common patterns
          // This is a heuristic - in a real system, you'd want to store course info in the lesson data
          const coursePatterns = ['html', 'css', 'javascript', 'react', 'python', 'java', 'sql', 'node', 'vue', 'angular'];
          for (const pattern of coursePatterns) {
            if (lessonSlug.includes(pattern)) {
              course = pattern;
              sessionStorage.setItem('currentCourse', course);
              break;
            }
          }
        }
      }
    }
    
    console.log("[navbar] Detected course:", course);
    
    // Load content list for the detected course
    fetch(`/api/lessons?course=${encodeURIComponent(course)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok) {
          console.error("[navbar] /api/lessons error status:", r.status, body);
          return null;
        }
        return body;
      })
             .then((data) => {
               console.log("[navbar] /api/lessons response:", data);
               if (!data) {
                 setContent([]);
                 return;
               }
               const combined = Array.isArray(data.allContent) ? data.allContent : [];
               console.log("[navbar] combined content:", combined);
               setContent(Array.isArray(combined) ? combined : []);
               
               // Set course name from API response
               if (data.courseName) {
                 setCourseName(data.courseName);
               }
             })
      .catch((e) => {
        console.error("[navbar] /api/lessons fetch failed:", e);
        setContent([]);
      });
  }, [pathname]);

  useEffect(() => {
    const lessonMatch = pathname?.match(/^\/chapter\/(.+)$/) || pathname?.match(/^\/lesson\/(.+)$/);
    const quizMatch = pathname?.match(/^\/quiz\/(.+)$/);
    const tutorialMatch = pathname?.match(/^\/tutorial\/(.+)$/);
    const challengeMatch = pathname?.match(/^\/challenge\/(.+)$/);
    const slug = lessonMatch?.[1] || quizMatch?.[1] || tutorialMatch?.[1] || challengeMatch?.[1];
    
    if (!slug) {
      setMeta(null);
      setCurrentIndex(-1);
      return;
    }

    // Find current content index
    const index = content.findIndex(item => item.slug === slug);
    setCurrentIndex(index);

    // Only fetch chapter meta for chapter pages; others use content list
    if (lessonMatch) {
      fetch(`/api/lesson-meta?slug=${encodeURIComponent(slug)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setMeta(data))
        .catch(() => setMeta(null));
    } else {
      // For quizzes/tutorials/challenges, set basic meta
      const currentItem = content.find(item => item.slug === slug);
      setMeta({
        title: currentItem?.title || null,
        slug: currentItem?.slug || null,
        course: courseName,
        program: 'Software Development'
      });
    }
  }, [pathname, content]);

  const programLabel = meta?.program || "Software Development";
  const courseLabel = courseName; // Use dynamic course name from API
  
  const lessonLabel = meta?.title || "Chapter";

  const navigateToContent = (direction: 'prev' | 'next') => {
    if (content.length === 0 || currentIndex === -1) return;

    let newIndex = currentIndex;
    if (direction === 'prev') {
      newIndex = Math.max(0, currentIndex - 1);
    } else {
      newIndex = Math.min(content.length - 1, currentIndex + 1);
    }

    if (newIndex !== currentIndex) {
      const item = content[newIndex];
      const href = item.type === 'quiz' || item.type === 'module-quiz' 
        ? `/quiz/${item.slug}` 
        : item.type === 'tutorial'
        ? `/tutorial/${item.slug}`
        : item.type === 'challenge'
        ? `/challenge/${item.slug}`
        : `/lesson/${item.slug}`;
      router.push(href);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Logo and Breadcrumbs */}
        <div className="flex items-center space-x-6">
          {/* Logo placeholder */}
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">Σ</span>
          </div>
          
          {/* Breadcrumbs */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/programs" className="text-gray-600 hover:text-gray-900">
                  {programLabel}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/csdp/courses" className="text-gray-600 hover:text-gray-900">
                  Courses
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/module/${pathname?.match(/\/module\/([^\/]+)/)?.[1] || "html"}`} className="text-gray-600 hover:text-gray-900">
                  {courseLabel}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <span className="text-gray-900 font-medium">{lessonLabel}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Center - Course Outline Controls */}
        <div className="flex items-center">
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-none border-r border-gray-300"
                  onClick={() => navigateToContent('prev')}
                  disabled={currentIndex <= 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="rounded-none border-r border-gray-300 px-4">
                  <Menu className="h-4 w-4 mr-2" />
                  Course Outline
                </Button>
              </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-64 max-h-80 overflow-y-auto">
                          {content.map((item, index) => {
                      const isQuiz = item.type === 'quiz' || item.type === 'module-quiz';
                      const isTutorial = item.type === 'tutorial';
                      const isChallenge = item.type === 'challenge';
                      const href = isQuiz ? `/quiz/${item.slug}` : isTutorial ? `/tutorial/${item.slug}` : isChallenge ? `/challenge/${item.slug}` : `/lesson/${item.slug}`;
                      
                      return (
                        <DropdownMenuItem
                          key={`${item.type}-${item.slug}`}
                          onClick={() => router.push(href)}
                          className={`cursor-pointer ${index === currentIndex ? 'bg-blue-50 text-blue-700' : ''}`}
                        >
                          <div className="flex items-center space-x-2 w-full">
                            <div className="flex items-center space-x-1 flex-1">
                              <div className="w-5 flex items-center justify-center flex-shrink-0">
                                {isQuiz ? (
                                  <HelpCircle className="h-3 w-3 text-orange-500" />
                                ) : isTutorial ? (
                                  <span className="block h-3 w-3 bg-purple-500 rounded-full" />
                                ) : isChallenge ? (
                                  <span className="block h-3 w-3 bg-rose-500 rounded-full" />
                                ) : (
                                  <Circle className="h-3 w-3 text-gray-400" />
                                )}
                              </div>
                              <span className="truncate">{item.title}</span>
                            </div>
                            {isQuiz && (
                              <span className="text-xs text-orange-600 bg-orange-100 px-1 rounded">Quiz</span>
                            )}
                            {isTutorial && (
                              <span className="text-xs text-purple-700 bg-purple-100 px-1 rounded">Tutorial</span>
                            )}
                            {isChallenge && (
                              <span className="text-xs text-rose-700 bg-rose-100 px-1 rounded">Challenge</span>
                            )}
                            {index === currentIndex && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                    {content.length === 0 && (
                      <DropdownMenuItem disabled>
                        <span className="text-gray-500">No content available</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-none"
              onClick={() => navigateToContent('next')}
              disabled={currentIndex >= content.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

      </div>
    </header>
  );
}
