"use client";

import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
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
  Trophy,
  Globe,
  FileText,
  Video,
  Edit,
  Smartphone,
  AlertTriangle,
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
  type: 'lesson' | 'quiz' | 'module-quiz' | 'tutorial';
};

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [meta, setMeta] = useState<LessonMeta | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  useEffect(() => {
    // Load content list
    fetch("/api/lessons")
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
        const combined = data.allContent || [
          ...(data.lessons || []),
          ...(data.tutorials || []),
          ...(data.quizzes || [])
        ];
        console.log("[navbar] combined content:", combined);
        setContent(Array.isArray(combined) ? combined : []);
      })
      .catch((e) => {
        console.error("[navbar] /api/lessons fetch failed:", e);
        setContent([]);
      });
  }, []);

  useEffect(() => {
    const lessonMatch = pathname?.match(/^\/lesson\/(.+)$/);
    const quizMatch = pathname?.match(/^\/quiz\/(.+)$/);
    const slug = lessonMatch?.[1] || quizMatch?.[1];
    
    if (!slug) {
      setMeta(null);
      setCurrentIndex(-1);
      return;
    }

    // Find current content index
    const index = content.findIndex(item => item.slug === slug);
    setCurrentIndex(index);

    // Only fetch lesson meta for lessons, not quizzes
    if (lessonMatch) {
      fetch(`/api/lesson-meta?slug=${encodeURIComponent(slug)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setMeta(data))
        .catch(() => setMeta(null));
    } else {
      // For quizzes, set basic meta
      const currentItem = content.find(item => item.slug === slug);
      setMeta({
        title: currentItem?.title || null,
        slug: currentItem?.slug || null,
        course: 'HTML',
        program: 'Software Development'
      });
    }
  }, [pathname, content]);

  const programLabel = meta?.program || "Software Development";
  const courseLabel = meta?.course || "HTML";
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
                <BreadcrumbLink href="/courses/html" className="text-gray-600 hover:text-gray-900">
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
                  Module Outline
                </Button>
              </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-64 max-h-80 overflow-y-auto">
                    {[...content].reverse().map((item, index) => {
                      const isQuiz = item.type === 'quiz' || item.type === 'module-quiz';
                      const isTutorial = item.type === 'tutorial';
                      const href = isQuiz ? `/quiz/${item.slug}` : isTutorial ? `/tutorial/${item.slug}` : `/lesson/${item.slug}`;
                      
                      return (
                        <DropdownMenuItem
                          key={`${item.type}-${item.slug}`}
                          onClick={() => router.push(href)}
                          className={`cursor-pointer ${index === currentIndex ? 'bg-blue-50 text-blue-700' : ''}`}
                        >
                          <div className="flex items-center space-x-2 w-full">
                            <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
                            <div className="flex items-center space-x-1 flex-1">
                              {isQuiz ? (
                                <HelpCircle className="h-3 w-3 text-orange-500 flex-shrink-0" />
                              ) : isTutorial ? (
                                <span className="inline-block h-3 w-3 bg-purple-500 rounded-sm" />
                              ) : (
                                <Circle className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              )}
                              <span className="truncate">{item.title}</span>
                            </div>
                            {isQuiz && (
                              <span className="text-xs text-orange-600 bg-orange-100 px-1 rounded">Quiz</span>
                            )}
                            {isTutorial && (
                              <span className="text-xs text-purple-700 bg-purple-100 px-1 rounded">Tutorial</span>
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

        {/* Right side - Utility Icons */}
        <div className="flex items-center space-x-4">
          {/* Daily XP */}
          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium">Daily XP</span>
            <Badge variant="secondary" className="bg-pink-100 text-pink-600 rounded-full w-5 h-5 p-0 flex items-center justify-center text-xs">
              0
            </Badge>
          </div>

          {/* Language Selector */}
          <div className="flex items-center space-x-1">
            <Globe className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">EN</span>
          </div>

          {/* Status Indicator */}
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>

          {/* Action Icons */}
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <FileText className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Smartphone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
