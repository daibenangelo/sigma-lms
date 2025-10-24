"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { User, Mail, Calendar, BookOpen, Trophy, Target, TrendingUp, Clock, PlayCircle, Circle, Swords } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface CourseProgressDisplay {
  id: string;
  title: string;
  slug: string;
  chapters: number;
  quizCount: number;
  tutorialCount: number;
  challengeCount: number;
  progressPercentage: number;
  completedCount: number;
  viewedCount: number;
  totalItems: number;
}

// Note: Metadata is handled by the root layout for client components

interface LastViewedItem {
  slug: string;
  title: string;
  type: string;
  course: string;
  viewedAt: string;
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<CourseProgressDisplay[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [lastViewedItems, setLastViewedItems] = useState<LastViewedItem[]>([]);
  const [isLoadingLastViewed, setIsLoadingLastViewed] = useState(true);

  const handleCourseClick = (courseSlug: string) => {
    router.push(`/csdp/courses?course=${courseSlug}`);
  };

  // Fetch last viewed items
  useEffect(() => {
    if (!user || typeof window === 'undefined' || isLoadingCourses || courses.length === 0) {
      setIsLoadingLastViewed(false);
      return;
    }

    try {
      // Get all last viewed items across all courses
      const allLastViewedItems: LastViewedItem[] = [];

      courses.forEach(course => {
        const lastViewedKey = `lastViewedItems_${user.id}_${course.slug}`;
        const lastViewedStored = sessionStorage.getItem(lastViewedKey);

        if (lastViewedStored) {
          try {
            const items = JSON.parse(lastViewedStored);
            if (Array.isArray(items)) {
              allLastViewedItems.push(...items.map((item: any) => ({
                slug: item.slug,
                title: item.title,
                type: item.type,
                course: course.slug,
                viewedAt: item.viewedAt
              })));
            }
          } catch (error) {
            console.warn(`Failed to parse last viewed items for course ${course.slug}:`, error);
          }
        }
      });

      // Sort by viewedAt (most recent first) and take top 10
      allLastViewedItems.sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());
      setLastViewedItems(allLastViewedItems.slice(0, 10));
    } catch (error) {
      console.warn('Error fetching last viewed items:', error);
    } finally {
      setIsLoadingLastViewed(false);
    }
  }, [user, courses, isLoadingCourses]);

  useEffect(() => {
    if (!user) {
      setCourses([]);
      setIsLoadingCourses(false);
      return;
    }

    const fetchProgressData = async () => {
      try {
        // Fetch all courses
        const coursesRes = await fetch('/api/courses');
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();

          // For each course, fetch detailed progress data using the same logic as CSDP
          const coursesWithProgress = await Promise.all(
            coursesData.map(async (course: any) => {
              try {
                // Fetch lessons to get content counts and total items (same as CSDP courses)
                const lessonsRes = await fetch(`/api/lessons?course=${course.slug}`);
                if (lessonsRes.ok) {
                  const lessonsData = await lessonsRes.json();

                  // Use the same total count as CSDP courses (allContent.length)
                  const totalItems = lessonsData.allContent?.length || 0;

                  // Calculate progress using the exact same method as CSDP course cards
                  let completedCount = 0;
                  let viewedCount = 0;
                  let progressPercentage = 0;

                  if (user && typeof window !== 'undefined') {
                    // Get content pages (lessons/chapters) to determine which count as completed when viewed
                    const lessonChapterItems = lessonsData.allContent
                      ?.filter((item: any) => item.type === 'lesson' || item.type === 'chapter')
                      ?.map((item: any) => item.slug) || [];

                    // Database progress (prioritized like course card)
                    let dbCompletedCount = 0;
                    let dbViewedCount = 0;
                    let dbProgress = null;

                    try {
                      // Check database progress first (same as course card)
                      const { data: progressData } = await supabase
                        .from('user_course_progress')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('course_slug', course.slug)
                        .maybeSingle();

                      if (progressData) {
                        dbProgress = progressData;
                        dbCompletedCount = progressData.completed_items?.length || 0;
                        dbViewedCount = progressData.viewed_items?.length || 0;
                      }
                    } catch (error) {
                      console.warn(`Error fetching DB progress for ${course.slug}:`, error);
                    }

                    // User-specific sessionStorage fallback (same as course card)
                    const sessionCompletedItems = new Set(JSON.parse(sessionStorage.getItem(`completedItems_${user.id}_${course.slug}`) || '[]'));
                    const sessionViewedItems = new Set(JSON.parse(sessionStorage.getItem(`viewedItems_${user.id}_${course.slug}`) || '[]'));

                    const sessionCompletedCount = sessionCompletedItems.size;
                    const sessionViewedCount = sessionViewedItems.size;

                    // Use database progress if available, otherwise use sessionStorage (same as course card)
                    completedCount = dbCompletedCount > 0 ? dbCompletedCount : sessionCompletedCount;
                    viewedCount = dbViewedCount > 0 ? dbViewedCount : sessionViewedCount;

                    // Count content pages (lessons/chapters) as viewed since they don't need completion (same as course card)
                    // Check both database and sessionStorage for viewed status
                    const contentPagesViewed = lessonsData.allContent
                      ?.filter((item: any) => lessonChapterItems.includes(item.slug))
                      ?.filter((item: any) => {
                        // Check database first
                        if (dbProgress?.viewed_items?.includes(item.slug)) {
                          return true;
                        }
                        // Fallback to sessionStorage
                        return sessionViewedItems.has(item.slug);
                      })
                      ?.length || 0;

                    // Progress includes both completed items and viewed content pages (same as course card)
                    const effectiveProgressCount = completedCount + contentPagesViewed;
                    progressPercentage = totalItems > 0 ? Math.round((effectiveProgressCount / totalItems) * 100) : 0;

                    console.log(`[Profile] Progress calculation for ${course.slug}:`, {
                      totalItems,
                      dbCompletedCount,
                      dbViewedCount,
                      sessionCompletedCount,
                      sessionViewedCount,
                      contentPagesViewed,
                      effectiveProgressCount,
                      progressPercentage,
                      usingDatabase: dbCompletedCount > 0 || dbViewedCount > 0
                    });
                  }

                  return {
                    id: course.id,
                    title: course.title,
                    slug: course.slug,
                    chapters: course.chapters?.length || 0,
                    quizCount: course.quizCount || 0,
                    tutorialCount: course.tutorialCount || 0,
                    challengeCount: course.challengeCount || 0,
                    progressPercentage: progressPercentage,
                    completedCount: completedCount,
                    viewedCount: viewedCount,
                    totalItems: totalItems
                  };
                }
              } catch (error) {
                console.error(`Error fetching progress for course ${course.slug}:`, error);
              }

              return {
                id: course.id,
                title: course.title,
                slug: course.slug,
                chapters: course.chapters?.length || 0,
                quizCount: course.quizCount || 0,
                tutorialCount: course.tutorialCount || 0,
                challengeCount: course.challengeCount || 0,
                progressPercentage: 0,
                completedCount: 0,
                viewedCount: 0
              };
            })
          );

          setCourses(coursesWithProgress);
        }
      } catch (error) {
        console.error('Error fetching progress data:', error);
      } finally {
        setIsLoadingCourses(false);
      }
    };

    fetchProgressData();
  }, [user]);

  if (authLoading || isLoadingCourses) {
    return (
      <div className="max-w-4xl mx-auto pt-8 pb-16">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto pt-8 pb-16 space-y-8">
      {/* Profile Header */}
      <div className="rounded-lg bg-white border border-gray-200 p-6">
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24 bg-blue-100 rounded-lg flex items-center justify-center border-2 border-white shadow-sm">
              <div className="w-16 h-16 bg-blue-200 rounded-lg flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {user ? (user.user_metadata?.full_name || user.email?.split('@')[0] || 'User') : 'Profile'}
              </h1>
              {user && (
                <Link href="/auth/login" className="text-sm text-blue-600 hover:text-blue-700">
                  {user ? 'Sign Out' : 'Sign In'}
                </Link>
              )}
            </div>
            {user && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{user.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Member since {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
            {!user && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Sign in to track your progress and save your work.
                </p>
                <Link href="/auth/login" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700">
                  Sign In to Work on Code
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Programme Progress Summary */}
      <div className="space-y-6">

        {/* Last Viewed Section */}
        <div className="rounded-lg bg-white border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Last Viewed
          </h2>

          {isLoadingLastViewed ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : lastViewedItems.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recently viewed items yet.</p>
              <p className="text-sm text-gray-400 mt-2">Start exploring courses to see your viewing history here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lastViewedItems.map((item, index) => {
                const getItemIcon = (type: string) => {
                  switch (type) {
                    case 'lesson':
                    case 'chapter':
                      return <BookOpen className="w-4 h-4 text-blue-500" />;
                    case 'tutorial':
                      return <PlayCircle className="w-4 h-4 text-green-500" />;
                    case 'quiz':
                      return <Circle className="w-4 h-4 text-yellow-500" />;
                    case 'challenge':
                      return <Swords className="w-4 h-4 text-red-500" />;
                    case 'moduleReview':
                      return <BookOpen className="w-4 h-4 text-purple-500" />;
                    case 'moduleQuiz':
                      return <Circle className="w-4 h-4 text-yellow-500" />;
                    default:
                      return <BookOpen className="w-4 h-4 text-gray-500" />;
                  }
                };

                const getItemPath = (type: string, slug: string, course: string) => {
                  switch (type) {
                    case 'lesson':
                    case 'chapter':
                      return `/lesson/${slug}?course=${course}`;
                    case 'tutorial':
                      return `/tutorial/${slug}?course=${course}`;
                    case 'quiz':
                      return `/quiz/${slug}?course=${course}`;
                    case 'challenge':
                      return `/challenge/${slug}?course=${course}`;
                    case 'moduleReview':
                      return `/module-review/${slug}?module=${course}`;
                    case 'moduleQuiz':
                      return `/module-quiz/${course}`;
                    default:
                      return `/lesson/${slug}?course=${course}`;
                  }
                };

                return (
                  <Link
                    key={`${item.course}-${item.slug}-${index}`}
                    href={getItemPath(item.type, item.slug, item.course)}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      {getItemIcon(item.type)}
                      <div>
                        <p className="font-medium text-gray-900 group-hover:text-blue-600">
                          {item.title}
                        </p>
                        <p className="text-sm text-gray-500 capitalize">
                          {item.type} • {new Date(item.viewedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400 group-hover:text-blue-600">
                      Continue →
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Programme Progress Details */}
        <div className="rounded-lg bg-white border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Programme Progress</h2>

          {/* CSDP Programme Section */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Complete Software Development Programme (CSDP)
            </h3>

            {isLoadingCourses ? (
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No courses available yet.</p>
              </div>
            ) : user ? (
              <div className="space-y-4">
                {courses.map((course) => {
                  // Use the same total count as CSDP courses
                  const totalItems = course.totalItems;

                  return (
                    <div
                      key={course.id}
                      className="group border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      onClick={() => handleCourseClick(course.slug)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">{course.title}</h3>
                        <span className="text-sm text-gray-600">
                          {course.completedCount}/{totalItems} completed
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">{course.progressPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${course.progressPercentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-blue-500" />
                          <span className="text-gray-600">{course.chapters} chapters</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-green-500" />
                          <span className="text-gray-600">{course.quizCount} quizzes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-purple-500" />
                          <span className="text-gray-600">{course.tutorialCount} tutorials</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-orange-500" />
                          <span className="text-gray-600">{course.challengeCount} challenges</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">View Programme Progress</h3>
                <p className="text-gray-600 mb-4">Sign in to track your progress and save your work.</p>
                <Link href="/auth/login" className="inline-flex items-center text-blue-600 hover:text-blue-700">
                  Sign In to Work on Code
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
