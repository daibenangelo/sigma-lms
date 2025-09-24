import { NextResponse } from "next/server";
import { getEntriesByContentType, contentfulClient } from "@/lib/contentful";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const courseParam = (url.searchParams.get("course") || "").toLowerCase();

    // Fetch lessons (chapters)
    const lessonItems = await getEntriesByContentType<{ title?: string; slug?: string; content?: any }>(
      "lesson",
      { limit: 1000, include: 10 }
    );

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

    // Process Chapter Quizzes (moduleQuiz content type)
    const chapterQuizDerived: any[] = [];
    console.log("[api/lessons] Chapter Quiz items found:", chapterQuizItems.length);
    try {
      chapterQuizItems.forEach((chapterQuiz: any, index: number) => {
        console.log(`[api/lessons] Processing Chapter Quiz ${index}:`, chapterQuiz?.fields?.title);
        const quizLinks = Array.isArray(chapterQuiz?.fields?.quiz) ? chapterQuiz.fields.quiz : [];
        console.log(`[api/lessons] Quiz links in Chapter Quiz ${index}:`, quizLinks.length);
        quizLinks.forEach((q: any, qIndex: number) => {
          const title = q?.fields?.title;
          const slug = q?.fields?.slug;
          console.log(`[api/lessons] Quiz ${qIndex}: title="${title}", slug="${slug}"`);
          if (title && slug) {
            chapterQuizDerived.push({ title, slug, type: 'quiz' });
          }
        });
      });
      console.log("[api/lessons] Total quizzes derived:", chapterQuizDerived.length);
    } catch (e) {
      console.warn("[api/lessons] processing Chapter Quizzes failed (continuing):", e);
    }

    // Derive tutorials from chapters (lessons) themselves
    const lessonDerivedTutorials: any[] = [];
    try {
      lessonItems.forEach((lesson: any) => {
        const tutorialLinks = Array.isArray(lesson?.fields?.tutorial) ? lesson.fields.tutorial : [];
        tutorialLinks.forEach((t: any) => {
          const title = t?.fields?.topic || t?.fields?.title;
          const slug = t?.fields?.slug;
          if (title && slug) lessonDerivedTutorials.push({ title, slug, type: 'tutorial' });
        });
      });
    } catch (e) {
      console.warn("[api/lessons] deriving tutorials from lessons failed (continuing):", e);
    }

    // Build ordered content per chapter: Chapter → Quiz(es) → Tutorial(s) → Challenge(s)
    const chapters: any[] = [];
    const perChapterContent: any[] = [];
    
    // Optional course-level filtering heuristic
    const filteredLessons = [...lessonItems].filter((l: any) => {
      if (!courseParam) return true;
      const title = (l.fields?.title || "").toString().toLowerCase();
      const slug = (l.fields?.slug || "").toString().toLowerCase();
      // Heuristic: include when it matches the course keyword, exclude obvious others
      if (courseParam === "html") {
        // Exclude CSS-specific items
        if (title.includes("css") || slug.includes("css")) return false;
        return true;
      }
      return title.includes(courseParam) || slug.includes(courseParam);
    });

    // Sort lessons by the chapter number parsed from the title (Chapter N: ...)
    const getChapterIndex = (title: string, slug: string) => {
      const m = (title || '').match(/chapter\s*(\d+)/i);
      if (m && m[1]) return parseInt(m[1], 10);
      // fallback: try to extract number from slug if present
      const ms = (slug || '').match(/(\d+)/);
      return ms && ms[1] ? parseInt(ms[1], 10) : Number.MAX_SAFE_INTEGER;
    };
    const sortedLessons = filteredLessons.sort((a: any, b: any) => {
      const ai = getChapterIndex(a.fields?.title || '', a.fields?.slug || '');
      const bi = getChapterIndex(b.fields?.title || '', b.fields?.slug || '');
      if (ai !== bi) return ai - bi;
      return (a.fields?.title || '').localeCompare(b.fields?.title || '');
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

      // Collect quizzes linked on this chapter (preferred source) – place directly below chapter
      const quizLinks = Array.isArray(lesson?.fields?.lessonQuiz) ? lesson.fields.lessonQuiz : [];
      quizLinks.forEach((q: any) => {
        const title = q?.fields?.title;
        const slug = q?.fields?.slug;
        if (title && slug) {
          perChapterContent.push({ title, slug, type: 'quiz' as const, chapterSlug });
        }
      });

      // Then collect tutorials linked on this chapter (after quiz)
      const tutorialLinks = Array.isArray(lesson?.fields?.tutorial) ? lesson.fields.tutorial : [];
      tutorialLinks.forEach((t: any) => {
        const title = t?.fields?.topic || t?.fields?.title;
        const slug = t?.fields?.slug;
        if (title && slug) {
          perChapterContent.push({ title, slug, type: 'tutorial' as const, chapterSlug });
        }
      });

      // Finally collect challenges linked on this chapter
      const challengeLinks = Array.isArray(lesson?.fields?.challenge) ? lesson.fields.challenge : [];
      challengeLinks.forEach((c: any) => {
        const title = c?.fields?.title || c?.fields?.name;
        const slug = c?.fields?.slug;
        if (title && slug) {
          perChapterContent.push({ title, slug, type: 'challenge' as const, chapterSlug });
        }
      });

      // Note: Chapter Quiz entries (moduleQuiz) are handled globally below if present
    });

    const tutorials = tutorialItems
      .map((item: any) => ({
        title: item.fields?.topic || item.fields?.title || item.fields?.name,
        slug: item.fields?.slug || item.fields?.urlSlug,
        type: 'tutorial' as const
      }))
      .filter((t) => {
        if (!t.title || !t.slug) return false;
        if (!courseParam) return true;
        const title = t.title.toLowerCase();
        const slug = t.slug.toLowerCase();
        if (courseParam === "html") {
          if (title.includes("css") || slug.includes("css")) return false;
          return true;
        }
        return title.includes(courseParam) || slug.includes(courseParam);
      });
    // Use quizzes derived from per-chapter links
    const quizzes: any[] = perChapterContent.filter(i => i.type === 'quiz').map(({ title, slug }) => ({ title, slug, type: 'quiz' as const }));

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
      // Preserve the order of links as defined on the chapter (no sorting)
      const items = (chapterSlugToItems[chapter.slug] || []);
      allContent.push(...items);
    });

    const finalLessons = allContent.filter(item => item.type === 'chapter');
    const finalTutorials = allContent.filter(item => item.type === 'tutorial');
    const finalQuizzes = allContent.filter(item => item.type === 'quiz');
    const finalChallenges = allContent.filter(item => item.type === 'challenge');
    
    console.log("[api/lessons] Final response - Lessons:", finalLessons.length, "Tutorials:", finalTutorials.length, "Quizzes:", finalQuizzes.length, "Challenges:", finalChallenges.length);
    console.log("[api/lessons] Final quizzes:", finalQuizzes);
    
    return NextResponse.json({ 
      lessons: finalLessons,
      tutorials: finalTutorials,
      quizzes: finalQuizzes,
      challenges: finalChallenges,
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


