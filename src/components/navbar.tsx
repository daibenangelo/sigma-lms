"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  HelpCircle,
  Circle,
  Swords,
  Menu,
  X,
  ChevronDown
} from "lucide-react";

type ContentItem = {
  title: string;
  slug: string;
  type: 'lesson' | 'quiz' | 'module-quiz' | 'tutorial' | 'challenge';
};

export function Navbar() {
  const pathname = usePathname();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [courseName, setCourseName] = useState<string>("Course");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Handle hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Extract course from URL - with SSR safety
  const getCurrentCourse = () => {
    if (!isClient) return '';
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('course') || '';
  };

  // Fetch content when pathname changes
  useEffect(() => {
    if (!isClient) return;
    
    const course = getCurrentCourse();
    if (!course) {
      setContent([]);
      setCourseName("Course");
      return;
    }

    fetch(`/api/lessons?course=${encodeURIComponent(course)}`)
      .then(r => {
        if (r.status !== 200) {
          console.error("[navbar] /api/lessons error status:", r.status);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) {
          setContent([]);
          return;
        }
        const combined = Array.isArray(data.allContent) ? data.allContent : [];
        setContent(combined);
        
        if (data.courseName) {
          setCourseName(data.courseName);
        } else if (data.lessons && data.lessons.length > 0) {
          setCourseName(`${course.charAt(0).toUpperCase() + course.slice(1)} Course`);
        } else {
          setCourseName("Course");
        }
      })
      .catch((e) => {
        console.error("[navbar] /api/lessons fetch failed:", e);
        setContent([]);
      });
  }, [pathname, isClient]);

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
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'lesson':
        return 'Chapter';
      case 'tutorial':
        return 'Tutorial';
      case 'quiz':
        return 'Quiz';
      case 'challenge':
        return 'Challenge';
      default:
        return 'Content';
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              LMS
            </Link>
            {isClient && currentCourse && (
              <span className="ml-4 text-sm text-gray-500">
                {courseName}
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {isClient && content.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <span>Course Content</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                  {content.map((item, index) => {
                    const isLesson = item.type === 'lesson';
                    const isTutorial = item.type === 'tutorial';
                    const isQuiz = item.type === 'quiz';
                    const isChallenge = item.type === 'challenge';
                    
                    const href = isQuiz ? `/quiz/${item.slug}?course=${currentCourse}` : 
                                isTutorial ? `/tutorial/${item.slug}?course=${currentCourse}` : 
                                isChallenge ? `/challenge/${item.slug}?course=${currentCourse}` : 
                                `/lesson/${item.slug}?course=${currentCourse}`;

                    const isActive = currentSlug === item.slug;

                    return (
                      <DropdownMenuItem key={index} asChild>
                        <Link
                          href={href}
                          className={`flex items-center space-x-3 p-3 ${
                            isActive ? 'bg-blue-50 text-blue-700' : ''
                          }`}
                        >
                          <div className="flex-shrink-0">
                            {getIcon(item.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            <p className="text-xs text-gray-500">
                              {getTypeLabel(item.type)}
                            </p>
                          </div>
                          {isChallenge && (
                            <Badge variant="destructive" className="text-xs">
                              Challenge
                            </Badge>
                          )}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-2">
              {content.map((item, index) => {
                const isLesson = item.type === 'lesson';
                const isTutorial = item.type === 'tutorial';
                const isQuiz = item.type === 'quiz';
                const isChallenge = item.type === 'challenge';
                
                const href = isQuiz ? `/quiz/${item.slug}?course=${currentCourse}` : 
                            isTutorial ? `/tutorial/${item.slug}?course=${currentCourse}` : 
                            isChallenge ? `/challenge/${item.slug}?course=${currentCourse}` : 
                            `/lesson/${item.slug}?course=${currentCourse}`;

                const isActive = currentSlug === item.slug;

                return (
                  <Link
                    key={index}
                    href={href}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex-shrink-0">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">
                        {getTypeLabel(item.type)}
                      </p>
                    </div>
                    {isChallenge && (
                      <Badge variant="destructive" className="text-xs">
                        Challenge
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}