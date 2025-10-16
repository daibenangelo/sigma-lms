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
  ChevronDown,
  Activity,
  User,
  LogOut,
  LogIn
} from "lucide-react";
import { useApiCounter } from "@/contexts/api-counter-context";
import { useLessonsFetch } from "@/hooks/use-cached-fetch";
import { useAuth } from "@/contexts/auth-context";

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
  const { stats } = useApiCounter();
  const { fetchLessons } = useLessonsFetch();
  const { user, signOut, session, loading } = useAuth();

  // Debug auth state
  useEffect(() => {
    console.log('🔍 NAVBAR: Auth state:', {
      user: user?.email || 'No user',
      session: session?.user?.email || 'No session',
      loading,
      hasAccessToken: !!session?.access_token
    });
  }, [user, session, loading]);

  // Removed navbar-level auth checking - middleware handles this

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

    fetchLessons(course)
      .then((data) => {
        if (!data) {
          setContent([]);
          return;
        }
        const combined = Array.isArray(data.allContent) ? data.allContent : [];
        setContent(combined);
        
        if (data.courseName) {
          setCourseName(data.courseName);
        } else if (data.allContent && data.allContent.length > 0) {
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
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Sigma School
            </Link>
            {isClient && currentCourse && (
              <>
                <span className="ml-4 text-sm text-gray-500">
                  {courseName}
                </span>
                <Link
                  href={`/csdp/courses?course=${currentCourse}`}
                  className="ml-2 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Back to Course
                </Link>
              </>
            )}
            {/* API Counter */}
            <div className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1 bg-blue-50 rounded-full border border-blue-200">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                API Calls: {stats.totalCalls}
              </span>
            </div>
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
                          className="flex items-center space-x-3 p-3"
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

            {/* Auth Section */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{user.user_metadata?.full_name || user.email}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={async () => {
                      console.log('🚪 NAVBAR: Starting logout')
                      await signOut()
                      console.log('🚪 NAVBAR: Logout complete, redirecting')
                      window.location.href = '/auth/login'
                    }}
                    className="flex items-center space-x-2 text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  <Link href="/auth/login" className="flex items-center space-x-2">
                    <LogIn className="h-4 w-4" />
                    <span>Sign in</span>
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/signup">Sign up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile API Counter */}
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full border border-blue-200">
              <Activity className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">
                {stats.totalCalls}
              </span>
            </div>
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
                    className="flex items-center space-x-3 p-3 rounded-lg transition-colors"
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

              {/* Mobile Back to Course */}
              {isClient && currentCourse && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <Link
                    href={`/csdp/courses?course=${currentCourse}`}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-blue-600"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>← Back to {courseName}</span>
                  </Link>
                </div>
              )}

              {/* Mobile Auth Section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                {user ? (
                  <div className="space-y-2">
                    <div className="px-3 py-2 text-sm text-gray-600">
                      Signed in as {user.user_metadata?.full_name || user.email}
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                    <button
                      onClick={async () => {
                        await signOut()
                        setIsMobileMenuOpen(false)
                        window.location.href = '/auth/login'
                      }}
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-red-600 w-full text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      href="/auth/login"
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <LogIn className="h-4 w-4" />
                      <span>Sign in</span>
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      <span>Sign up</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}