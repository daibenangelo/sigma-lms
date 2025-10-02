"use client";

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BookOpen, HelpCircle, Circle, Swords, ChevronLeft, FileText, PlayCircle, X } from "lucide-react";
import { CourseCard } from "./course-card";
import { useCourseProgress } from "@/hooks/use-course-progress";

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

interface ContentItem {
  title: string;
  slug: string;
  type: 'lesson' | 'quiz' | 'tutorial' | 'challenge';
}

interface CourseContent {
  lessons: ContentItem[];
  tutorials: ContentItem[];
  quizzes: ContentItem[];
  challenges: ContentItem[];
  allContent: ContentItem[];
  courseName: string;
}

export default function FusedCourseLayout({
  children,
  courses = [],
}: {
  children: React.ReactNode;
  courses?: Course[];
}) {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseContent, setCourseContent] = useState<CourseContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [coursesData, setCoursesData] = useState<Course[]>(courses);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const hasFetchedCourses = useRef(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseSlug = searchParams.get('course');

  // Fetch courses if not provided
  useEffect(() => {
    if ((!courses || courses.length === 0) && !hasFetchedCourses.current) {
      hasFetchedCourses.current = true;
      setCoursesLoading(true);
      fetch('/api/courses')
        .then(response => response.json())
        .then(data => {
          setCoursesData(data);
          setCoursesLoading(false);
        })
        .catch(error => {
          console.error('Error fetching courses:', error);
          setCoursesLoading(false);
        });
    }
  }, [courses]);

  // Load course content when a course is selected
  useEffect(() => {
    if (courseSlug && coursesData && coursesData.length > 0) {
      const course = coursesData.find(c => c.slug === courseSlug);
      if (course) {
        setSelectedCourse(course);
        loadCourseContent(course.slug);
      }
    }
  }, [courseSlug, coursesData]);

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

  // Get completion status for content items
  const getItemCompletionStatus = (itemSlug: string) => {
    if (!selectedCourse) return false;
    
    // Check sessionStorage first (for immediate feedback)
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('completedItems');
      if (stored) {
        try {
          const completed = JSON.parse(stored);
          return completed.includes(itemSlug);
        } catch (e) {
          console.warn('Failed to parse completed items from sessionStorage:', e);
        }
      }
    }
    
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Left Panel - Course Selection */}
        <div className={`${selectedCourse ? 'w-1/3' : 'w-full'} border-r border-gray-200 bg-white transition-all duration-300`}>
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedCourse ? 'Courses' : 'Available Courses'}
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
          
          <div className="p-6 overflow-y-auto h-full">
            {coursesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading courses...</span>
              </div>
            ) : !coursesData || coursesData.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No courses available</h3>
                <p className="text-gray-500">Check back later for new courses.</p>
              </div>
            ) : (
              <div className="space-y-4">
                 {coursesData.map((course) => (
                   <div key={course.id}>
                     <CourseCard 
                       course={course} 
                       isSelected={selectedCourse?.id === course.id}
                       onSelect={() => handleCourseSelect(course)}
                       isCompact={!!selectedCourse}
                     />
                   </div>
                 ))}
              </div>
            )}
          </div>
        </div>

         {/* Right Panel - Course Content */}
         {selectedCourse && (
           <div className="w-2/3 bg-gray-50">
             <div className="p-6 border-b border-gray-200 bg-white">
               <div className="flex items-center justify-between">
                 <div>
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
            
            <div className="p-6 overflow-y-auto h-full">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading course content...</span>
                </div>
              ) : courseContent ? (
                <div className="space-y-4">
                  {courseContent.allContent.map((item, index) => {
                    const isLesson = item.type === 'lesson';
                    const isTutorial = item.type === 'tutorial';
                    const isQuiz = item.type === 'quiz';
                    const isChallenge = item.type === 'challenge';
                    
                    return (
                      <div 
                        key={index} 
                        className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-6 border border-gray-200 hover:border-gray-300 cursor-pointer"
                        onClick={() => handleContentItemClick(item)}
                      >
                         <div className="flex items-center justify-between">
                           <div className="flex items-center">
                             <div className={`p-3 rounded-lg mr-4 ${
                               isLesson ? 'bg-blue-500' : 
                               isTutorial ? 'bg-green-500' : 
                               isQuiz ? 'bg-yellow-500' : 
                               isChallenge ? 'bg-red-500' : 'bg-gray-500'
                             }`}>
                               {isLesson ? (
                                 <FileText className="h-6 w-6 text-white" />
                               ) : isTutorial ? (
                                 <PlayCircle className="h-6 w-6 text-white" />
                               ) : isQuiz ? (
                                 <Circle className="h-6 w-6 text-white" />
                               ) : isChallenge ? (
                                 <Swords className="h-6 w-6 text-white" />
                               ) : (
                                 <BookOpen className="h-6 w-6 text-white" />
                               )}
                             </div>
                            <div>
                              <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                                {item.title}
                              </h3>
                              <p className="text-gray-500">
                                {isLesson ? 'Chapter' : isTutorial ? 'Tutorial' : isQuiz ? 'Quiz' : isChallenge ? 'Challenge' : 'Content'}
                              </p>
                            </div>
                          </div>
                           <div className="flex items-center space-x-4">
                             <div className="flex items-center space-x-2">
                               {/* Completion status indicator */}
                               {getItemCompletionStatus(item.slug) ? (
                                 <div className="w-2 h-2 bg-green-500 rounded-full" />
                               ) : (
                                 <div className="w-2 h-2 bg-gray-300 rounded-full" />
                               )}
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
