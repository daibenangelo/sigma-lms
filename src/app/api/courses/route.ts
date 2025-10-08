import { NextResponse } from "next/server";
import { getEntriesByContentType } from "@/lib/contentful";
import { CourseFields } from "@/lib/contentful-types";
import { unstable_cache } from 'next/cache';

// Cached function to get course content counts
const getCachedCourseContent = (courseSlug: string) => unstable_cache(
  async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/lessons?course=${courseSlug}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        return { quizCount: 0, tutorialCount: 0, challengeCount: 0 };
      }
      
      const data = await response.json();
      return {
        quizCount: data.quizzes?.length || 0,
        tutorialCount: data.tutorials?.length || 0,
        challengeCount: data.challenges?.length || 0
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
