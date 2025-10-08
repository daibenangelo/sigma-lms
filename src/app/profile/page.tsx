"use client";

import { useAuth } from "@/contexts/auth-context";
import { User, Mail, Calendar, BookOpen, Trophy, Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

interface CourseProgress {
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
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  useEffect(() => {
    const fetchProgressData = async () => {
      try {
        // Fetch all courses
        const coursesRes = await fetch('/api/courses');
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();

          // For each course, fetch detailed progress data
          const coursesWithProgress = await Promise.all(
            coursesData.map(async (course: any) => {
              try {
                // Fetch lessons to get content counts and progress
                const lessonsRes = await fetch(`/api/lessons?course=${course.slug}`);
                if (lessonsRes.ok) {
                  const lessonsData = await lessonsRes.json();

                  // Calculate viewed and completed counts from user-specific localStorage
                  const viewedKeys = Object.keys(localStorage).filter(key =>
                    key.startsWith(`viewedItems_${user.id}_${course.slug}`)
                  );
                  const completedKeys = Object.keys(localStorage).filter(key =>
                    key.startsWith(`completedItems_${user.id}_${course.slug}`)
                  );

                  return {
                    id: course.id,
                    title: course.title,
                    slug: course.slug,
                    chapters: course.chapters?.length || 0,
                    quizCount: course.quizCount || 0,
                    tutorialCount: course.tutorialCount || 0,
                    challengeCount: course.challengeCount || 0,
                    progressPercentage: course.progressPercentage || 0,
                    completedCount: completedKeys.length,
                    viewedCount: viewedKeys.length
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

    if (user) {
      fetchProgressData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Logged In</h1>
          <p className="text-gray-600">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
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
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
              </h1>
            </div>
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
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="space-y-6">
        {/* Overall Statistics */}
        <div className="rounded-lg bg-white border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Learning Progress Overview
          </h2>

          {isLoadingCourses ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Items */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total Items</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {courses.reduce((sum, course) => sum + course.chapters + course.quizCount + course.tutorialCount + course.challengeCount, 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Completed Items */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600 font-medium">Completed</p>
                    <p className="text-2xl font-bold text-green-900">
                      {courses.reduce((sum, course) => sum + course.completedCount, 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Viewed Items */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Viewed</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {courses.reduce((sum, course) => sum + course.viewedCount, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Course Progress Details */}
        <div className="rounded-lg bg-white border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Course Progress</h2>

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
          ) : (
            <div className="space-y-6">
              {courses.map((course) => {
                const totalItems = course.chapters + course.quizCount + course.tutorialCount + course.challengeCount;

                return (
                  <div key={course.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{course.title}</h3>
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
          )}
        </div>
      </div>
    </div>
  );
}
