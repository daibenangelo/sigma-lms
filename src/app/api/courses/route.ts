import { NextResponse } from "next/server";
import { getEntriesByContentType } from "@/lib/contentful";
import { CourseFields } from "@/lib/contentful-types";
import { unstable_cache } from 'next/cache';

// Cached function to get course content counts directly from Contentful
const getCachedCourseContent = (courseSlug: string) => unstable_cache(
  async () => {
    try {
      // First, find the course by slug
      const courses = await getEntriesByContentType<{ title?: string; slug?: string; chapters?: any[] }>(
        "course",
        { limit: 1, "fields.slug": courseSlug, include: 10 }
      );

      if (courses.length === 0) {
        return { quizCount: 0, tutorialCount: 0, challengeCount: 0 };
      }

      const course = courses[0];
      const courseChapters = course.fields?.chapters || [];

      if (!Array.isArray(courseChapters) || courseChapters.length === 0) {
        return { quizCount: 0, tutorialCount: 0, challengeCount: 0 };
      }

      // Extract chapter IDs from the course
      const chapterIds = courseChapters.map((chapter: any) => chapter.sys?.id).filter(Boolean);

      if (chapterIds.length === 0) {
        return { quizCount: 0, tutorialCount: 0, challengeCount: 0 };
      }

      // Fetch all lessons and filter by the chapter IDs from the course
      const allLessons = await getEntriesByContentType<{ title?: string; slug?: string; content?: any }>(
        "lesson",
        { limit: 1000, include: 10 }
      );

      // Filter lessons to only include those that are linked to this course
      const courseLessons = allLessons.filter((lesson: any) => {
        const lessonId = lesson.sys?.id;
        return chapterIds.includes(lessonId);
      });

      // Count different content types
      let quizCount = 0;
      let tutorialCount = 0;
      let challengeCount = 0;

      // Process each lesson to count linked content
      courseLessons.forEach((lesson: any) => {
        const lessonQuizLinks = Array.isArray(lesson?.fields?.lessonQuiz) ? lesson.fields.lessonQuiz : [];
        const tutorialLinks = Array.isArray(lesson?.fields?.tutorial) ? lesson.fields.tutorial : [];
        const challengeLinks = Array.isArray(lesson?.fields?.challenge) ? lesson.fields.challenge : [];

        quizCount += lessonQuizLinks.length;
        tutorialCount += tutorialLinks.length;
        challengeCount += challengeLinks.length;
      });

      return {
        quizCount,
        tutorialCount,
        challengeCount
      };
    } catch (error) {
      console.warn(`Failed to fetch content counts for course ${courseSlug}:`, error);
      return { quizCount: 0, tutorialCount: 0, challengeCount: 0 };
    }
  },
  ['course-content', courseSlug],
  {
    tags: ['course-content', `course-content-${courseSlug}`],
    revalidate: 300 // 5 minutes
  }
)();

// Cached function to get all courses
const getCachedCourses = unstable_cache(
  async () => {
    const courses = await getEntriesByContentType<CourseFields>("course");

    // Sort courses by creation date (oldest first) before transformation
    const sortedCourses = courses.sort((a, b) => {
      const dateA = new Date(a.sys.createdAt);
      const dateB = new Date(b.sys.createdAt);
      return dateA.getTime() - dateB.getTime(); // Oldest first
    });

    // Transform the data and get content counts for each course
    const transformedCourses = await Promise.all(
      sortedCourses.map(async (course) => {
        const courseSlug = course.fields.slug;
        if (!courseSlug || typeof courseSlug !== 'string') {
          return {
            id: course.sys.id,
            title: course.fields.title,
            slug: course.fields.slug,
            chapters: course.fields.chapters || [],
            quizCount: 0,
            tutorialCount: 0,
            challengeCount: 0,
            progressPercentage: 0
          };
        }
        const contentCounts = await getCachedCourseContent(courseSlug);

        return {
          id: course.sys.id,
          title: course.fields.title,
          slug: course.fields.slug,
          chapters: course.fields.chapters || [],
          quizCount: contentCounts.quizCount,
          tutorialCount: contentCounts.tutorialCount,
          challengeCount: contentCounts.challengeCount,
          progressPercentage: 0
        };
      })
    );

    return transformedCourses;
  },
  ['courses'],
  {
    tags: ['courses'],
    revalidate: 600 // 10 minutes
  }
);

export async function GET() {
  try {
    const courses = await getCachedCourses();
    return NextResponse.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}
