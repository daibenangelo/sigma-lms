"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BookOpen, HelpCircle, Circle, Swords, ChevronLeft, FileText, PlayCircle, X, FolderOpen } from "lucide-react";
import { CourseCard } from "./course-card";
import { useCourseProgress } from "@/hooks/use-course-progress";
import { useModuleProgress } from "@/hooks/use-module-progress";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";

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

// Contentful course entry format
interface ContentfulCourseEntry {
  sys?: {
    id: string;
  };
  fields?: {
    title: string;
    slug: string;
    chapters: any[];
  };
}

interface Module {
  id: string;
  title: string;
  slug: string;
  courses: Course[] | ContentfulCourseEntry[];
  moduleQuiz: any[];
  moduleProject: any[];
  moduleReview: any;
}

interface ContentItem {
  title: string;
  slug: string;
  type: 'lesson' | 'quiz' | 'tutorial' | 'challenge' | 'chapter' | 'moduleReview' | 'moduleQuiz';
}

interface CourseContent {
  lessons: ContentItem[];
  tutorials: ContentItem[];
  quizzes: ContentItem[];
  challenges: ContentItem[];
  allContent: ContentItem[];
  courseName: string;
}

function FusedCourseContent({
  children,
  courses = [],
}: {
  children: React.ReactNode;
  courses?: Course[];
}) {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [courseContent, setCourseContent] = useState<CourseContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [modulesData, setModulesData] = useState<Module[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const hasFetchedModules = useRef(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseSlug = searchParams.get('course');
  const { user } = useAuth();

  // Module progress tracking
  const [moduleProgressData, setModuleProgressData] = useState<{[moduleSlug: string]: any}>({});
  
  // Get course progress for the selected course
  const { progress: courseProgress, isItemViewed: dbIsItemViewed } = useCourseProgress(selectedCourse?.slug);

  // Calculate progress for each module
  const calculateModuleProgress = async (modules: Module[]) => {
    if (!user) return;

    const progressData: {[moduleSlug: string]: any} = {};

    for (const module of modules) {
      const totalItems = [];
      const completedItems = [];

      // Add courses in this module
      if (Array.isArray(module.courses)) {
        for (const course of module.courses) {
          const courseData = convertToCourse(course);
          totalItems.push(courseData.slug);

          // Check if course is completed
          try {
            const response = await fetch(`/api/lessons?course=${courseData.slug}`);
            if (response.ok) {
              const data = await response.json();
              const courseTotalItems = data.allContent?.length || 0;

              // Check database progress first
              const { data: dbProgress } = await supabase
                .from('user_course_progress')
                .select('progress_percentage')
                .eq('user_id', user.id)
                .eq('course_slug', courseData.slug)
                .maybeSingle();

              // Check sessionStorage fallback
              const completedStorageKey = `completedItems_${user.id}_${courseData.slug}`;
              const storedCompleted = sessionStorage.getItem(completedStorageKey);
              let sessionCompletedCount = 0;

              if (storedCompleted) {
                try {
                  const completed = JSON.parse(storedCompleted);
                  sessionCompletedCount = Array.isArray(completed) ? completed.length : 0;
                } catch (e) {
                  console.warn(`Failed to parse completed items for course ${courseData.slug}:`, e);
                }
              }

              const dbProgressPercentage = dbProgress?.progress_percentage || 0;
              const sessionProgressPercentage = courseTotalItems > 0 ? Math.round((sessionCompletedCount / courseTotalItems) * 100) : 0;
              const effectiveProgress = Math.max(dbProgressPercentage, sessionProgressPercentage);

              if (effectiveProgress === 100) {
                completedItems.push(courseData.slug);
              }
            }
          } catch (error) {
            console.warn(`Failed to check progress for course ${courseData.slug}:`, error);
          }
        }
      }

      // Add module review if exists
      if (module.moduleReview?.fields?.slug) {
        totalItems.push(module.moduleReview.fields.slug);

        // Check if module review is viewed
        const viewedStorageKey = `viewedItems_${user.id}_${module.slug}`;
        const storedViewed = sessionStorage.getItem(viewedStorageKey);
        if (storedViewed) {
          try {
            const viewedItems = JSON.parse(storedViewed);
            if (Array.isArray(viewedItems) && viewedItems.includes(module.moduleReview.fields.slug)) {
              completedItems.push(module.moduleReview.fields.slug);
            }
          } catch (e) {
            console.warn(`Failed to parse viewed items for module ${module.slug}:`, e);
          }
        }
      }

      // Add module quiz if exists
      if (Array.isArray(module.moduleQuiz) && module.moduleQuiz.length > 0) {
        totalItems.push(module.slug); // Use module slug for module quiz

        // Check if module quiz is completed (perfect score)
        const quizStorageKeys = Object.keys(sessionStorage).filter(key =>
          key.startsWith(`module-quiz-${module.slug}-`) || key.startsWith(`quiz-${module.slug}-`)
        );

        let hasPerfectScore = false;
        for (const key of quizStorageKeys) {
          try {
            const attemptData = JSON.parse(sessionStorage.getItem(key) || '{}');
            if (attemptData.score_percentage === 100 || attemptData.passed === true) {
              hasPerfectScore = true;
              break;
            }
          } catch (e) {
            // Ignore malformed data
          }
        }

        if (hasPerfectScore) {
          completedItems.push(module.slug);
        }
      }

      // Add module projects if exist
      if (Array.isArray(module.moduleProject) && module.moduleProject.length > 0) {
        for (const project of module.moduleProject) {
          const projectSlug = project.fields?.slug || `${module.slug}-project-${module.moduleProject.indexOf(project)}`;
          totalItems.push(projectSlug);

          // Check if module project is viewed
          const viewedStorageKey = `viewedItems_${user.id}_${module.slug}`;
          const storedViewed = sessionStorage.getItem(viewedStorageKey);
          if (storedViewed) {
            try {
              const viewedItems = JSON.parse(storedViewed);
              if (Array.isArray(viewedItems) && viewedItems.includes(projectSlug)) {
                completedItems.push(projectSlug);
              }
            } catch (e) {
              console.warn(`Failed to parse viewed items for module ${module.slug}:`, e);
            }
          }
        }
      } else {
        // Add placeholder module project if none exist
        const placeholderSlug = `${module.slug}-project-placeholder`;
        totalItems.push(placeholderSlug);
        // Don't add placeholder to completed items since it's not a real item
      }

      // Calculate progress percentage
      const completedCount = completedItems.length;
      const totalCount = totalItems.length;
      const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      progressData[module.slug] = {
        completed: completedCount,
        total: totalCount,
        percentage: progressPercentage,
        completedItems,
        totalItems
      };

      console.log(`[Module Progress] ${module.title}:`, {
        completed: completedCount,
        total: totalCount,
        percentage: progressPercentage,
        completedItems,
        totalItems
      });
    }

    setModuleProgressData(progressData);
  };

  // Fetch modules
  useEffect(() => {
    if (!hasFetchedModules.current) {
      hasFetchedModules.current = true;
      setModulesLoading(true);
      fetch('/api/modules')
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          // Ensure data is an array
          const modulesArray = Array.isArray(data) ? data : [];
          console.log('Setting modules data:', modulesArray);
          setModulesData(modulesArray);
          setModulesLoading(false);

          // Calculate progress for each module
          if (modulesArray.length > 0 && user) {
            calculateModuleProgress(modulesArray);
          }
        })
        .catch(error => {
          console.error('Error fetching modules:', error);
          setModulesData([]);
          setModulesLoading(false);
        });
    }
  }, []);

  // Recalculate module progress when modules data or user changes
  useEffect(() => {
    if (modulesData.length > 0 && user) {
      calculateModuleProgress(modulesData);
    }
  }, [modulesData, user]);

  // Listen for progress updates to refresh module progress
  useEffect(() => {
    const handleProgressUpdate = () => {
      if (modulesData.length > 0 && user) {
        calculateModuleProgress(modulesData);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('item-completed', handleProgressUpdate);
      window.addEventListener('quiz-completed', handleProgressUpdate);
      return () => {
        window.removeEventListener('item-completed', handleProgressUpdate);
        window.removeEventListener('quiz-completed', handleProgressUpdate);
      };
    }
  }, [modulesData, user]);

  // Load course content when a course is selected
  useEffect(() => {
    if (courseSlug && Array.isArray(modulesData) && modulesData.length > 0) {
      // Find the course across all modules
      let foundCourse: Course | null = null;
      let foundModule: Module | null = null;

      for (const module of modulesData) {
        if (Array.isArray(module.courses)) {
          const course = module.courses.find(c => {
            const entrySlug = (c as any).fields?.slug || (c as any).slug;
            return entrySlug === courseSlug;
          });
      if (course) {
            foundCourse = convertToCourse(course);
            foundModule = module;
            break;
          }
        }
      }

      if (foundCourse && foundModule) {
        setSelectedCourse(foundCourse);
        setSelectedModule(foundModule);
        loadCourseContent(foundCourse.slug);
      }
    }
  }, [courseSlug, modulesData]);

  const loadCourseContent = async (slug: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/lessons?course=${slug}`);
      if (response.ok) {
        const data = await response.json();
        setCourseContent(data);
      }
    } catch (error) {
      console.error('Failed to load course content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    router.push(`/csdp/courses?course=${course.slug}`);
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
    setSelectedModule(null);
    setCourseContent(null);
    router.push('/csdp/courses');
  };

  const handleContentItemClick = (item: ContentItem) => {
    const courseSlug = selectedCourse?.slug;
    if (!courseSlug) return;

    const href = item.type === 'quiz' ? `/quiz/${item.slug}?course=${courseSlug}` : 
                item.type === 'tutorial' ? `/tutorial/${item.slug}?course=${courseSlug}` : 
                item.type === 'challenge' ? `/challenge/${item.slug}?course=${courseSlug}` : 
                `/lesson/${item.slug}?course=${courseSlug}`;
    
    router.push(href);
  };

  const handleModuleReviewClick = (reviewSlug: string, moduleSlug: string) => {
    router.push(`/module-review/${reviewSlug}?module=${moduleSlug}`);
  };

  const handleModuleQuizClick = (quizSlug: string, moduleSlug: string) => {
    router.push(`/module-quiz/${moduleSlug}`);
  };

  const handleModuleProjectClick = (projectSlug: string, moduleSlug: string) => {
    router.push(`/module-project/${projectSlug}?module=${moduleSlug}`);
  };

  // Helper function to convert Contentful course entry to Course format
  const convertToCourse = (entry: Course | ContentfulCourseEntry): Course => {
    if ('sys' in entry && 'fields' in entry) {
      // It's a Contentful entry
      const contentfulEntry = entry as ContentfulCourseEntry;
      return {
        id: contentfulEntry.sys?.id || '',
        title: contentfulEntry.fields?.title || 'Untitled Course',
        slug: contentfulEntry.fields?.slug || '',
        chapters: contentfulEntry.fields?.chapters || [],
        quizCount: 0,
        tutorialCount: 0,
        challengeCount: 0,
        progressPercentage: 0,
      };
    }
    // It's already in Course format
    return entry as Course;
  };

  // Get completion status for content items (matches sidebar logic)
  const getItemCompletionStatus = (itemSlug: string) => {
    if (!selectedCourse) return false;
    
    // Check database progress first (same as sidebar)
    const dbCompletedItems = courseProgress?.completed_items || [];
    if (dbCompletedItems.includes(itemSlug)) {
      return true;
    }
    
    // Check user-specific course sessionStorage (same as sidebar)
    if (typeof window !== 'undefined' && user) {
      const storageKey = `completedItems_${user.id}_${selectedCourse.slug}`;
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        try {
          const completed = JSON.parse(stored);
          return completed.includes(itemSlug);
        } catch (e) {
          console.warn(`Failed to parse completed items for course ${selectedCourse.slug}:`, e);
        }
      }
    }
    
    return false;
  };

  // Get viewed status for content items (matches sidebar logic)
  const getItemViewedStatus = (itemSlug: string) => {
    if (!selectedCourse) return false;
    
    // Check database first
    const dbViewed = dbIsItemViewed(itemSlug);
    if (dbViewed) return true;
    
    // Fallback to user-specific sessionStorage
    if (typeof window !== 'undefined' && user) {
      const storageKey = `viewedItems_${user.id}_${selectedCourse.slug}`;
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        try {
          const viewed = JSON.parse(stored);
          return viewed.includes(itemSlug);
        } catch (e) {
          console.warn(`Failed to parse viewed items for course ${selectedCourse.slug}:`, e);
        }
      }
    }
    
    return false;
  };

  // Get status icon (matches sidebar getStatusIcon function)
  const getStatusIcon = (itemSlug: string) => {
    const isCompleted = getItemCompletionStatus(itemSlug);
    const isViewed = getItemViewedStatus(itemSlug);

    // Find the item to determine its type
    const item = courseContent?.allContent.find(content => content.slug === itemSlug);
    const isContentPage = item?.type === 'lesson' || item?.type === 'chapter';

    if (isCompleted) {
      return <div className="w-2 h-2 bg-green-500 rounded-full" title="Completed" />;
    } else if (isContentPage && isViewed) {
      // Content pages (lessons/chapters) show green only when viewed
      return <div className="w-2 h-2 bg-green-500 rounded-full" title="Content viewed" />;
    } else if (isViewed) {
      return <div className="w-2 h-2 bg-blue-500 rounded-full" title="Viewed" />;
    } else {
      return <div className="w-2 h-2 bg-gray-300 rounded-full" title="Not viewed" />;
    }
  };

  // Listen for progress updates to refresh the right panel
  useEffect(() => {
    const handleProgressUpdate = () => {
      // Force re-render by updating a dummy state
      setCourseContent(prev => prev ? { ...prev } : null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('item-completed', handleProgressUpdate);
      return () => window.removeEventListener('item-completed', handleProgressUpdate);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Left Panel - Course Selection */}
        <div className={`${selectedCourse ? 'w-1/3' : 'w-full'} border-r border-gray-200 bg-white transition-all duration-300 flex flex-col`}>
          <div className="flex-shrink-0 p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedCourse ? 'Courses' : 'CSDP Modules'}
            </h1>
            {selectedCourse && (
              <button
                onClick={handleBackToCourses}
                className="mt-2 flex items-center text-blue-600 hover:text-blue-800"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to all courses
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {modulesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading modules...</span>
              </div>
            ) : !Array.isArray(modulesData) || modulesData.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No modules available</h3>
                <p className="text-gray-500">Check back later for new modules.</p>
              </div>
            ) : Array.isArray(modulesData) && modulesData.length > 0 ? (
              <div className="space-y-6">
                 {modulesData.map((module) => (
                   <div key={module.id} className="space-y-3">
                     {/* Module Title with Progress */}
                     <div className="flex items-center justify-between mb-3">
                       <div className="flex items-center gap-2">
                         <FolderOpen className="h-5 w-5 text-blue-600" />
                         <h2 className="text-lg font-semibold text-gray-900">{module.title}</h2>
                       </div>

                       {/* Module Progress Bar */}
                       {moduleProgressData[module.slug] && moduleProgressData[module.slug].total > 0 && (
                         <div className="flex items-center space-x-3 group">
                           <div className="relative">
                             <div className="w-32 bg-gray-200 rounded-full h-2">
                               <div
                                 className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                 style={{ width: `${moduleProgressData[module.slug].percentage}%` }}
                               />
                             </div>
                             {/* Progress breakdown tooltip */}
                             <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                               {moduleProgressData[module.slug].completed} of {moduleProgressData[module.slug].total} completed
                               <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                             </div>
                           </div>
                           <span className="text-sm text-gray-600 font-medium w-12 text-right">
                             {moduleProgressData[module.slug].percentage}%
                           </span>
                         </div>
                       )}
              </div>

                     {/* Courses in this module */}
                     <div className="space-y-3 ml-7">
                       {Array.isArray(module.courses) && module.courses.map((course) => {
                         const courseData = convertToCourse(course);
                         return (
                     <CourseCard 
                             key={courseData.id}
                             course={courseData}
                             isSelected={selectedCourse?.id === courseData.id}
                             onSelect={() => handleCourseSelect(courseData)}
                       isCompact={!!selectedCourse}
                     />
                         );
                       })}
                     </div>

                     {/* Module Quiz and Module Project */}
                     {!selectedCourse && (
                       <div className="space-y-2 ml-7">
                         {/* Module Review */}
                         {module.moduleReview && module.moduleReview.fields?.slug && (
                           <div
                             className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 py-3 px-4 border border-gray-200 hover:border-gray-300 cursor-pointer"
                             onClick={() => handleModuleReviewClick(module.moduleReview.fields.slug, module.slug)}
                           >
                             <div className="flex items-center justify-between">
                               <div className="flex items-center">
                                 <div className="p-2 rounded-lg mr-3 bg-purple-500">
                                   <BookOpen className="h-5 w-5 text-white" />
                                 </div>
                                 <div className="flex items-center space-x-3 flex-1 min-w-0">
                                   <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 truncate">
                                     {module.moduleReview.fields?.title || 'Module Review'}
                                   </h3>
                                   <span className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap bg-purple-100 text-purple-800">
                                     Review
                                   </span>
                                 </div>
                               </div>
                               <div className="flex items-center space-x-4">
                                 <div className="flex items-center space-x-2">
                                   {(() => {
                                     const reviewSlug = module.moduleReview.fields.slug;
                                     const isCompleted = moduleProgressData[module.slug]?.completedItems?.includes(reviewSlug);
                                     return (
                                       <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} title={isCompleted ? "Completed" : "Not viewed"} />
                                     );
                                   })()}
                                   <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700">
                                     View
                                     <svg className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                     </svg>
                                   </div>
                                 </div>
                               </div>
                             </div>
                           </div>
                         )}

                         {/* Module Quiz */}
                         {Array.isArray(module.moduleQuiz) && module.moduleQuiz.length > 0 && (
                           <div
                             className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 py-3 px-4 border border-gray-200 hover:border-gray-300 cursor-pointer"
                             onClick={() => handleModuleQuizClick(module.slug, module.slug)}
                           >
                           <div className="flex items-center justify-between">
                             <div className="flex items-center">
                               <div className="p-2 rounded-lg mr-3 bg-yellow-500">
                                 <Circle className="h-5 w-5 text-white" />
                               </div>
                               <div className="flex items-center space-x-3 flex-1 min-w-0">
                                 <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 truncate">
                                   Module Quiz
                                 </h3>
                                 <span className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap bg-yellow-100 text-yellow-800">
                                   Quiz
                                 </span>
                               </div>
                             </div>
                             <div className="flex items-center space-x-4">
                               <div className="flex items-center space-x-2">
                                 {(() => {
                                   const isCompleted = moduleProgressData[module.slug]?.completedItems?.includes(module.slug);
                                   return (
                                     <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} title={isCompleted ? "Completed (perfect score)" : "Not completed"} />
                                   );
                                 })()}
                                 <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700">
                                   Start
                                   <svg className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                   </svg>
                                 </div>
                               </div>
                             </div>
                           </div>
                         </div>
                         )}

                         {/* Module Project */}
                         {Array.isArray(module.moduleProject) && module.moduleProject.length > 0 && module.moduleProject.map((project: any, idx: number) => {
                           const projectSlug = project.fields?.slug || `${module.slug}-project-${idx}`;
                           return (
                             <div
                               key={idx}
                               className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 py-3 px-4 border border-gray-200 hover:border-gray-300 cursor-pointer"
                               onClick={() => handleModuleProjectClick(projectSlug, module.slug)}
                             >
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center">
                                   <div className="p-2 rounded-lg mr-3 bg-green-500">
                                     <Swords className="h-5 w-5 text-white" />
                                   </div>
                                   <div className="flex items-center space-x-3 flex-1 min-w-0">
                                     <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 truncate">
                                       {project.fields?.title || `Module Project ${idx + 1}`}
                                     </h3>
                                     <span className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap bg-green-100 text-green-800">
                                       Project
                                     </span>
                                   </div>
                                 </div>
                                 <div className="flex items-center space-x-4">
                                   <div className="flex items-center space-x-2">
                                     {(() => {
                                       const isCompleted = moduleProgressData[module.slug]?.completedItems?.includes(projectSlug);
                                       return (
                                         <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} title={isCompleted ? "Completed" : "Not viewed"} />
                                       );
                                     })()}
                                     <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700">
                                       Start
                                       <svg className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                       </svg>
                                     </div>
                                   </div>
                                 </div>
                               </div>
                             </div>
                           );
                         })}

                         {/* Placeholder Module Project if none exist */}
                         {(!Array.isArray(module.moduleProject) || module.moduleProject.length === 0) && (
                           <div className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 py-3 px-4 border border-gray-200 hover:border-gray-300 cursor-pointer opacity-75">
                             <div className="flex items-center justify-between">
                               <div className="flex items-center">
                                 <div className="p-2 rounded-lg mr-3 bg-green-500">
                                   <Swords className="h-5 w-5 text-white" />
                                 </div>
                                 <div className="flex items-center space-x-3 flex-1 min-w-0">
                                   <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 truncate">
                                     Module Project (Coming Soon)
                                   </h3>
                                   <span className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap bg-green-100 text-green-800">
                                     Project
                                   </span>
                                 </div>
                               </div>
                               <div className="flex items-center space-x-4">
                                 <div className="flex items-center space-x-2">
                                   <div className="w-2 h-2 bg-gray-300 rounded-full" title="Not available yet" />
                                   <div className="flex items-center text-gray-400 font-medium">
                                     Coming Soon
                                   </div>
                                 </div>
                               </div>
                             </div>
                           </div>
                         )}
              </div>
            )}
                   </div>
                 ))}
              </div>
            ) : null}
          </div>
        </div>

         {/* Right Panel - Course Content */}
         {selectedCourse && selectedModule && (
           <div className="w-2/3 bg-gray-50 flex flex-col">
             <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-white">
               <div className="flex items-center justify-between">
                 <div>
                   {/* Module Name */}
                   <div className="flex items-center gap-2 mb-1">
                     <FolderOpen className="h-4 w-4 text-blue-600" />
                     <span className="text-sm font-medium text-blue-600">{selectedModule.title}</span>
                   </div>
                   {/* Course Title */}
                   <h2 className="text-2xl font-bold text-gray-900">{selectedCourse.title}</h2>
                   <p className="text-gray-600 mt-2">
                     {courseContent ? `${courseContent.allContent.length} items` : 'Loading...'}
                   </p>
                 </div>
                 <button
                   onClick={handleBackToCourses}
                   className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                   title="Close course content"
                 >
                   <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                 </button>
               </div>
             </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading course content...</span>
                </div>
              ) : courseContent ? (
                <div className="space-y-2">
                  {/* Course Content Items */}
                  {courseContent.allContent.map((item, index) => {
                    const isLesson = item.type === 'lesson';
                    const isTutorial = item.type === 'tutorial';
                    const isQuiz = item.type === 'quiz';
                    const isChallenge = item.type === 'challenge';
                    
                    return (
                      <div 
                        key={index} 
                        className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 py-3 px-4 border border-gray-200 hover:border-gray-300 cursor-pointer"
                        onClick={() => handleContentItemClick(item)}
                      >
                         <div className="flex items-center justify-between">
                           <div className="flex items-center">
                             <div className={`p-2 rounded-lg mr-3 ${
                               isLesson ? 'bg-blue-500' : 
                               isTutorial ? 'bg-green-500' : 
                               isQuiz ? 'bg-yellow-500' : 
                               isChallenge ? 'bg-red-500' : 'bg-gray-500'
                             }`}>
                               {isLesson ? (
                                 <FileText className="h-5 w-5 text-white" />
                               ) : isTutorial ? (
                                 <PlayCircle className="h-5 w-5 text-white" />
                               ) : isQuiz ? (
                                 <Circle className="h-5 w-5 text-white" />
                               ) : isChallenge ? (
                                 <Swords className="h-5 w-5 text-white" />
                               ) : (
                                 <BookOpen className="h-5 w-5 text-white" />
                               )}
                             </div>
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 truncate">
                                {item.title}
                              </h3>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                                isLesson ? 'bg-blue-100 text-blue-800' :
                                isTutorial ? 'bg-green-100 text-green-800' :
                                isQuiz ? 'bg-yellow-100 text-yellow-800' :
                                isChallenge ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {isLesson ? 'Chapter' : isTutorial ? 'Tutorial' : isQuiz ? 'Quiz' : isChallenge ? 'Challenge' : 'Content'}
                              </span>
                            </div>
                          </div>
                           <div className="flex items-center space-x-4">
                             <div className="flex items-center space-x-2">
                               {/* Status indicator (matches sidebar logic) */}
                               {getStatusIcon(item.slug)}
                               <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700">
                                 Start
                                 <svg className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                 </svg>
                               </div>
                             </div>
                           </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Module Review */}
                  {selectedModule.moduleReview && (selectedModule.moduleReview.fields?.slug || selectedModule.moduleReview.slug) && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-purple-600" />
                        Module Review
                      </h3>
                      <div
                        className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 py-3 px-4 border border-gray-200 hover:border-gray-300 cursor-pointer"
                        onClick={() => handleModuleReviewClick(
                          selectedModule.moduleReview.fields?.slug || selectedModule.moduleReview.slug,
                          selectedModule.slug
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="p-2 rounded-lg mr-3 bg-purple-500">
                              <BookOpen className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 truncate">
                                {selectedModule.moduleReview.fields?.title || selectedModule.moduleReview.title || 'Module Review'}
                              </h3>
                              <span className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap bg-purple-100 text-purple-800">
                                Review
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-gray-300 rounded-full" title="Not viewed" />
                              <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700">
                                View
                                <svg className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Module Quiz */}
                  {selectedModule.moduleQuiz && Array.isArray(selectedModule.moduleQuiz) && selectedModule.moduleQuiz.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Circle className="h-5 w-5 text-yellow-600" />
                        Module Quiz
                      </h3>
                      <div
                        className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 py-3 px-4 border border-gray-200 hover:border-gray-300 cursor-pointer mb-2"
                        onClick={() => handleModuleQuizClick(selectedModule.slug, selectedModule.slug)}
                      >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="p-2 rounded-lg mr-3 bg-yellow-500">
                            <Circle className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 truncate">
                              Module Quiz
                            </h3>
                            <span className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap bg-yellow-100 text-yellow-800">
                              Quiz
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gray-300 rounded-full" title="Not viewed" />
                            <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700">
                              Start
                              <svg className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Module Project */}
                  {Array.isArray(selectedModule.moduleProject) && selectedModule.moduleProject.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Swords className="h-5 w-5 text-green-600" />
                        Module Project
                      </h3>
                      {selectedModule.moduleProject.map((project: any, idx: number) => (
                        <div key={idx} className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 py-3 px-4 border border-gray-200 hover:border-gray-300 cursor-pointer mb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="p-2 rounded-lg mr-3 bg-green-500">
                                <Swords className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 truncate">
                                  {project.fields?.title || `Module Project ${idx + 1}`}
                                </h3>
                                <span className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap bg-green-100 text-green-800">
                                  Project
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-gray-300 rounded-full" title="Not viewed" />
                                <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700">
                                  Start
                                  <svg className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No content available</h3>
                  <p className="text-gray-500">This course doesn't have any content yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FusedCourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading courses...</p>
        </div>
      </div>
    }>
      <FusedCourseContent>
        {children}
      </FusedCourseContent>
    </Suspense>
  );
}
