import { NextResponse } from "next/server";
import { getEntriesByContentType, contentfulClient } from "@/lib/contentful";

export async function GET() {
  try {
    // Fetch lessons
    const lessonItems = await getEntriesByContentType<{ title?: string; slug?: string; content?: any }>(
      "lesson",
      { limit: 1000, include: 10 }
    );

    // Fetch tutorials (tolerate missing content type, try common variants)
    let tutorialItems: any[] = [];
    const tutorialTypeCandidates = [
      "lessonTutorial",
      "lesson-tutorial",
      "lesson_tutorial",
      "LessonTutorial",
      "tutorial",
      "Tutorial"
    ];
    for (const typeId of tutorialTypeCandidates) {
      try {
        const res = await getEntriesByContentType<{ title?: string; slug?: string; content?: any; body?: any }>(
          typeId,
          { limit: 1000, include: 10 }
        );
        if (Array.isArray(res) && res.length > 0) {
          tutorialItems = res;
          break;
        }
      } catch (e) {
        console.warn(`[api/lessons] '${typeId}' tutorials fetch failed (continuing):`, e);
      }
    }

    // Broad fallback: scan all entries and pick those whose contentType id contains 'tutorial'
    if (tutorialItems.length === 0) {
      try {
        const all = await contentfulClient.getEntries<any>({ limit: 1000, include: 2 });
        const guess = all.items.filter((it: any) => {
          const id = it?.sys?.contentType?.sys?.id || "";
          return /tutorial/i.test(id);
        });
        if (guess.length > 0) {
          tutorialItems = guess;
        }
      } catch (e) {
        console.warn("[api/lessons] broad tutorial scan failed (continuing):", e);
      }
    }

    // Derive quizzes and tutorials from chapters (lessons) themselves
    const lessonDerivedQuizzes: any[] = [];
    const lessonDerivedTutorials: any[] = [];
    try {
      lessonItems.forEach((lesson: any) => {
        const quizLinks = Array.isArray(lesson?.fields?.lessonQuiz) ? lesson.fields.lessonQuiz : [];
        quizLinks.forEach((q: any) => {
          const title = q?.fields?.title;
          const slug = q?.fields?.slug;
          if (title && slug) lessonDerivedQuizzes.push({ title, slug, type: 'quiz' });
        });

        const tutorialLinks = Array.isArray(lesson?.fields?.tutorial) ? lesson.fields.tutorial : [];
        tutorialLinks.forEach((t: any) => {
          const title = t?.fields?.topic || t?.fields?.title;
          const slug = t?.fields?.slug;
          if (title && slug) lessonDerivedTutorials.push({ title, slug, type: 'tutorial' });
        });
      });
    } catch (e) {
      console.warn("[api/lessons] deriving quizzes/tutorials from lessons failed (continuing):", e);
    }

    // Build ordered content per chapter: Chapter → Tutorials → Quizzes
    const chapters: any[] = [];
    const perChapterContent: any[] = [];
    
    // Sort lessons by slug to keep a consistent order
    const sortedLessons = [...lessonItems].sort((a: any, b: any) => {
      const as = (a.fields?.slug || "").toString();
      const bs = (b.fields?.slug || "").toString();
      return as.localeCompare(bs);
    });

    sortedLessons.forEach((lesson: any) => {
      const chapterTitle = lesson.fields?.title;
      const chapterSlug = lesson.fields?.slug;
      if (!chapterTitle || !chapterSlug) return;

      // Push the chapter item
      chapters.push({
        title: chapterTitle,
        slug: chapterSlug,
        type: 'chapter' as const,
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

      // Collect quizzes linked on this chapter
      const quizLinks = Array.isArray(lesson?.fields?.lessonQuiz) ? lesson.fields.lessonQuiz : [];
      quizLinks.forEach((q: any) => {
        const title = q?.fields?.title;
        const slug = q?.fields?.slug;
        if (title && slug) {
          perChapterContent.push({ title, slug, type: 'quiz' as const, chapterSlug });
        }
      });
    });

    const tutorials = tutorialItems
      .map((item: any) => ({
        title: item.fields?.topic || item.fields?.title || item.fields?.name,
        slug: item.fields?.slug || item.fields?.urlSlug,
        type: 'tutorial' as const
      }))
      .filter((t) => t.title && t.slug);
    // Use quizzes derived from lessons (do not include module-based quizzes)
    const quizzes: any[] = [...lessonDerivedQuizzes];

    // Combine and sort all content
    // Build final ordered content: for each chapter, include its tutorial/quiz items
    const chapterSlugToItems = perChapterContent.reduce((acc: Record<string, any[]>, item: any) => {
      const key = item.chapterSlug;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    const allContent: any[] = [];
    chapters.forEach((chapter) => {
      allContent.push(chapter);
      const items = (chapterSlugToItems[chapter.slug] || []).sort((a, b) => a.slug.localeCompare(b.slug));
      allContent.push(...items);
    });

    return NextResponse.json({ 
      lessons: allContent.filter(item => item.type === 'chapter'),
      tutorials: allContent.filter(item => item.type === 'tutorial'),
      quizzes: allContent.filter(item => item.type === 'quiz'),
      allContent 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

function hasQuizContent(content: any): boolean {
  if (!content || !content.content) return false;

  return content.content.some((node: any) => {
    if (node.nodeType === "embedded-entry-block") {
      const contentType = node.data?.target?.sys?.contentType?.sys?.id;
      return contentType === "quiz" || contentType === "Quiz" || contentType?.toLowerCase().includes("quiz") || contentType === "module";
    }
    return false;
  });
}


