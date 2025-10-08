import { NextResponse } from "next/server";
import { getEntriesByContentType, contentfulClient } from "@/lib/contentful";
import { unstable_cache } from 'next/cache';

// Cached function to get lessons for a specific course
const getCachedLessonsForCourse = (courseParam: string) => unstable_cache(
  async () => {
    console.log(`[api/lessons] Cached fetch for course: ${courseParam}`);

    // First, find the course by slug
    let course = null;
    try {
      const courses = await getEntriesByContentType<{
        title?: string;
        slug?: string;
        chapters?: any[];
      }>("course", { limit: 1, "fields.slug": courseParam, include: 10 });

      if (courses.length === 0) {
        throw new Error("Course not found");
      }

      course = courses[0];
    } catch (e) {
      console.warn("[api/lessons] Course fetch failed:", e);
      throw new Error("Failed to fetch course");
    }

    const courseName = (course.fields as any)?.title || courseParam;
    const courseChapters = (course.fields as any)?.chapters || [];

    console.log(`[api/lessons] Found course: ${courseName} with ${courseChapters.length} chapters`);

    if (courseChapters.length === 0) {
      return {
        lessons: [],
        tutorials: [],
        quizzes: [],
        challenges: [],
        allContent: [],
        courseName
      };
    }

    // Extract chapter IDs from the course
    const chapterIds = courseChapters.map((chapter: any) => chapter.sys?.id).filter(Boolean);

    if (chapterIds.length === 0) {
      return {
        lessons: [],
        tutorials: [],
        quizzes: [],
        challenges: [],
        allContent: [],
        courseName
      };
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

    console.log(`[api/lessons] Found ${courseLessons.length} lessons for course ${courseParam}`);

    // Fetch Chapter Quizzes (moduleQuiz content type)
    let chapterQuizItems: any[] = [];
    try {
      chapterQuizItems = await getEntriesByContentType<{ title?: string; slug?: string; quiz?: any[] }>(
        "moduleQuiz",
        { limit: 1000, include: 10 }
      );
    } catch (e) {
      console.warn("[api/lessons] Chapter Quiz fetch failed (continuing):", e);
    }

    // Fetch tutorials (tolerate missing content type, try common variants)
    let tutorialItems: any[] = [];
    const tutorialTypeCandidates = [
      "lessonTutorial",
      "lesson-tutorial",
      "tutorial",
      "Tutorial"
    ];

    for (const type of tutorialTypeCandidates) {
      try {
        tutorialItems = await getEntriesByContentType<{ topic?: string; title?: string; slug?: string }>(
          type,
          { limit: 1000, include: 10 }
        );
        if (tutorialItems.length > 0) break;
      } catch (e) {
        console.warn(`[api/lessons] Tutorial type '${type}' failed (continuing):`, e);
      }
    }

    // Process Chapter Quizzes (moduleQuiz content type)
    const chapterQuizDerived: any[] = [];
    try {
      chapterQuizItems.forEach((chapterQuiz: any) => {
        const quizLinks = Array.isArray(chapterQuiz?.fields?.quiz) ? chapterQuiz.fields.quiz : [];
        quizLinks.forEach((q: any) => {
          const title = q?.fields?.title;
          const slug = q?.fields?.slug;
          if (title && slug) {
            chapterQuizDerived.push({ title, slug, type: 'quiz' });
          }
        });
      });
    } catch (e) {
      console.warn("[api/lessons] processing Chapter Quizzes failed (continuing):", e);
    }

    // Derive tutorials from chapters (lessons) themselves
    const lessonDerivedTutorials: any[] = [];
    try {
      courseLessons.forEach((lesson: any) => {
        const tutorialLinks = Array.isArray(lesson?.fields?.tutorial) ? lesson.fields.tutorial : [];
        tutorialLinks.forEach((t: any) => {
          const title = t?.fields?.topic || t?.fields?.title;
          const slug = t?.fields?.slug;
          if (title && slug) lessonDerivedTutorials.push({ title, slug, type: 'tutorial' });
        });
      });
    } catch (e) {
      console.warn("[api/lessons] processing lesson tutorials failed (continuing):", e);
    }

    const chapters: any[] = [];
    const perChapterContent: any[] = [];

    // Sort lessons by the chapter number parsed from the title (Chapter N: ...)
    const getChapterIndex = (title: string, slug: string) => {
      const m = (title || '').match(/chapter\s*(\d+)/i);
      if (m && m[1]) return parseInt(m[1], 10);
      // fallback: try to extract number from slug if present
      const ms = (slug || '').match(/(\d+)/);
      return ms && ms[1] ? parseInt(ms[1], 10) : Number.MAX_SAFE_INTEGER;
    };

    const sortedLessons = courseLessons.sort((a: any, b: any) => {
      const aIndex = getChapterIndex(a.fields?.title || "", a.fields?.slug || "");
      const bIndex = getChapterIndex(b.fields?.title || "", b.fields?.slug || "");
      return aIndex - bIndex;
    });

    // Build ordered content per chapter: Chapter → Quiz(es) → Tutorial(s) → Challenge(s)
    sortedLessons.forEach((lesson: any) => {
      const title = lesson.fields?.title || "";
      const slug = lesson.fields?.slug || "";
      const chapterSlug = slug;

      // Add the chapter itself
      chapters.push({ title, slug, type: 'chapter' as const });

      // Collect quizzes linked on this chapter - use lessonQuiz field
      const quizLinks = Array.isArray(lesson?.fields?.lessonQuiz) ? lesson.fields.lessonQuiz : [];
      quizLinks.forEach((q: any) => {
        const title = q?.fields?.title;
        const slug = q?.fields?.slug;
        if (title && slug) {
          perChapterContent.push({ title, slug, type: 'quiz' as const, chapterSlug });
        }
      });

      // Collect tutorials linked on this chapter
      const tutorialLinks = Array.isArray(lesson?.fields?.tutorial) ? lesson.fields.tutorial : [];
      tutorialLinks.forEach((t: any) => {
        const title = t?.fields?.topic || t?.fields?.title;
        const slug = t?.fields?.slug;
        if (title && slug) {
          perChapterContent.push({ title, slug, type: 'tutorial' as const, chapterSlug });
        }
      });

      // Collect challenges linked on this chapter
      const challengeLinks = Array.isArray(lesson?.fields?.challenge) ? lesson.fields.challenge : [];
      challengeLinks.forEach((c: any) => {
        const title = c?.fields?.title || c?.fields?.name;
        const slug = c?.fields?.slug;
        if (title && slug) {
          perChapterContent.push({ title, slug, type: 'challenge' as const, chapterSlug });
        }
      });
    });

    const tutorials = tutorialItems
      .map((item: any) => ({
        title: item.fields?.topic || item.fields?.title || item.fields?.name,
        slug: item.fields?.slug || item.fields?.urlSlug,
        type: 'tutorial' as const
      }))
      .filter((t) => {
        if (!t.title || !t.slug) return false;
        // Filter tutorials that are linked to course chapters
        const isLinkedToCourse = perChapterContent.some(item =>
          item.type === 'tutorial' && item.slug === t.slug
        );
        return isLinkedToCourse;
      });

    // Use quizzes derived from per-chapter links
    const quizzes: any[] = perChapterContent.filter(i => i.type === 'quiz').map(({ title, slug }) => ({ title, slug, type: 'quiz' as const }));

    // Combine and sort all content
    const chapterSlugToItems = perChapterContent.reduce((acc: Record<string, any[]>, item: any) => {
      const key = item.chapterSlug;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    const allContent: any[] = [];
    chapters.forEach((chapter) => {
      allContent.push(chapter);
      // Preserve the order of links as defined on the chapter (no sorting)
      const items = (chapterSlugToItems[chapter.slug] || []);
      allContent.push(...items);
    });

    const finalLessons = allContent.filter(item => item.type === 'chapter');
    const finalTutorials = allContent.filter(item => item.type === 'tutorial');
    const finalQuizzes = allContent.filter(item => item.type === 'quiz');
    const finalChallenges = allContent.filter(item => item.type === 'challenge');

    console.log("[api/lessons] Final response - Lessons:", finalLessons.length, "Tutorials:", finalTutorials.length, "Quizzes:", finalQuizzes.length, "Challenges:", finalChallenges.length);

    return {
      lessons: finalLessons,
      tutorials: finalTutorials,
      quizzes: finalQuizzes,
      challenges: finalChallenges,
      allContent,
      courseName
    };
  },
  ['lessons', courseParam],
  {
    tags: ['lessons', `lessons-${courseParam}`],
    revalidate: 600 // 10 minutes
  }
);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const courseParam = (url.searchParams.get("course") || "").toLowerCase();

    console.log(`[api/lessons] Request for course: ${courseParam}`);

    if (!courseParam) {
      console.log("[api/lessons] No course parameter provided");
      return NextResponse.json({ error: "Course parameter is required" }, { status: 400 });
    }

    // Use the cached function
    const result = await getCachedLessonsForCourse(courseParam)();

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[api/lessons] Error:", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

