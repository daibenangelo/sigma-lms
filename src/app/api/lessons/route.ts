import { NextResponse } from "next/server";
import { getEntriesByContentType, contentfulClient } from "@/lib/contentful";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const courseParam = (url.searchParams.get("course") || "").toLowerCase();

    // Fetch main content items (try multiple content types)
    let lessonItems: any[] = [];
    const mainContentTypeCandidates = ["lesson", "chapter", "Chapter", "unit", "Unit", "module", "Module", "section", "Section"];
    for (const typeId of mainContentTypeCandidates) {
      try {
        const res = await getEntriesByContentType<{ title?: string; slug?: string; content?: any }>(
          typeId,
          { limit: 1000, include: 10 }
        );
        if (Array.isArray(res) && res.length > 0) {
          lessonItems = res;
          console.log(`[api/lessons] Found ${res.length} lessons using content type '${typeId}'`);
          // Log the first lesson structure to see what fields are available
          if (res.length > 0) {
            console.log(`[api/lessons] First lesson structure:`, Object.keys(res[0].fields || {}));
            console.log(`[api/lessons] First lesson lessonQuiz field:`, res[0].fields?.lessonQuiz);
          }
          break;
        }
      } catch (e) {
        console.warn(`[api/lessons] '${typeId}' main content fetch failed (continuing):`, e);
      }
    }

    // Fetch Quiz content (try multiple content types)
    let chapterQuizItems: any[] = [];
    const quizTypeCandidates = ["moduleQuiz", "quiz", "Quiz", "chapterQuiz", "lessonQuiz"];
    for (const typeId of quizTypeCandidates) {
      try {
        const res = await getEntriesByContentType<{ title?: string; slug?: string; quiz?: any[] }>(
          typeId,
          { limit: 1000, include: 10 }
        );
        if (Array.isArray(res) && res.length > 0) {
          chapterQuizItems = res;
          break;
        }
      } catch (e) {
        console.warn(`[api/lessons] '${typeId}' quiz fetch failed (continuing):`, e);
      }
    }

    // Fetch tutorial content (try multiple content types)
    let tutorialItems: any[] = [];
    const tutorialTypeCandidates = [
      "lessonTutorial",
      "lesson-tutorial", 
      "lesson_tutorial",
      "LessonTutorial",
      "tutorial",
      "Tutorial",
      "exercise",
      "Exercise",
      "practice",
      "Practice"
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

    // Broad fallback: scan all entries and pick those whose contentType id contains tutorial-related terms
    if (tutorialItems.length === 0) {
      try {
        const all = await contentfulClient.getEntries<any>({ limit: 1000, include: 2 });
        const guess = all.items.filter((it: any) => {
          const id = it?.sys?.contentType?.sys?.id || "";
          return /tutorial|exercise|practice/i.test(id);
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

    // Fetch challenge content (try multiple content types)
    let challengeItems: any[] = [];
    const challengeTypeCandidates = ["lessonChallenge", "challenge", "Challenge", "exercise", "Exercise", "assignment", "Assignment"];
    for (const typeId of challengeTypeCandidates) {
      try {
        const res = await getEntriesByContentType<{ title?: string; slug?: string; content?: any }>(
          typeId,
          { limit: 1000, include: 10 }
        );
        if (Array.isArray(res) && res.length > 0) {
          challengeItems = res;
          break;
        }
      } catch (e) {
        console.warn(`[api/lessons] '${typeId}' challenge fetch failed (continuing):`, e);
      }
    }

    // Build ordered content per chapter: Chapter → Quiz(es) → Tutorial(s) → Challenge(s)
    const chapters: any[] = [];
    const perChapterContent: any[] = [];
    
    // Try to get course info from Contentful first
    let courseName = courseParam ? courseParam.charAt(0).toUpperCase() + courseParam.slice(1) : "Course";
    let courseDescription = "";
    
    if (courseParam) {
      try {
        // Try to find the course in Contentful
        const courseCandidates = ["course", "module", "program"];
        for (const contentType of courseCandidates) {
          try {
            const courseItems = await getEntriesByContentType<{
              title?: string;
              slug?: string;
              description?: string;
            }>(contentType, { limit: 1, "fields.slug": courseParam, include: 10 });
            
            if (courseItems.length > 0) {
              const course = courseItems[0];
              courseName = (course.fields as any)?.title || courseName;
              courseDescription = (course.fields as any)?.description || courseDescription;
              break;
            }
          } catch (e) {
            continue;
          }
        }
      } catch (e) {
        console.warn("[api/lessons] Could not fetch course info:", e);
      }
    }

    // Course-level filtering - completely generic
    const filteredLessons = [...lessonItems].filter((l: any) => {
      if (!courseParam) return true;
      const title = (l.fields?.title || "").toString().toLowerCase();
      const slug = (l.fields?.slug || "").toString().toLowerCase();
      
      // For HTML course, include web development intro lessons too.
      if (courseParam === "html") {
        return title.includes("html") || slug.includes("html") || 
               title.includes("web development") || slug.includes("web-development") ||
               title.includes("introduction to web") || slug.includes("introduction-to-web");
      }
      
      // Generic filtering - include if title or slug contains course keyword
      return title.includes(courseParam) || slug.includes(courseParam);
    });

    // Generic sorting - try to extract order from title or slug
    const getContentIndex = (title: string, slug: string) => {
      // Try common patterns: "Chapter N:", "Lesson N:", "Unit N:", "Part N:", "Section N:", etc.
      const patterns = [
        /chapter\s*(\d+)/i,
        /lesson\s*(\d+)/i, 
        /unit\s*(\d+)/i,
        /part\s*(\d+)/i,
        /section\s*(\d+)/i,
        /module\s*(\d+)/i,
        /step\s*(\d+)/i
      ];
      
      for (const pattern of patterns) {
        const m = (title || '').match(pattern);
        if (m && m[1]) return parseInt(m[1], 10);
      }
      
      // Fallback: try to extract number from slug
      const ms = (slug || '').match(/(\d+)/);
      return ms && ms[1] ? parseInt(ms[1], 10) : Number.MAX_SAFE_INTEGER;
    };
    
    const sortedLessons = filteredLessons.sort((a: any, b: any) => {
      const ai = getContentIndex(a.fields?.title || '', a.fields?.slug || '');
      const bi = getContentIndex(b.fields?.title || '', b.fields?.slug || '');
      if (ai !== bi) return ai - bi;
      return (a.fields?.title || '').localeCompare(b.fields?.title || '');
    });

    // Process lessons and collect all quiz IDs that need fetching
    const allQuizIdsToFetch: string[] = [];
    const quizData: { [key: string]: { title: string; slug: string } } = {};
    
    for (const lesson of sortedLessons) {
      const chapterTitle = lesson.fields?.title;
      const chapterSlug = lesson.fields?.slug;
      if (!chapterTitle || !chapterSlug) continue;

      // Push the chapter item
      chapters.push({
        title: chapterTitle,
        slug: chapterSlug,
        type: 'chapter' as const,
      });

      // Collect quizzes linked on this chapter (try multiple field names)
      const quizFieldNames = ['lessonQuiz', 'quiz', 'quizzes', 'assessment', 'test'];
      for (const fieldName of quizFieldNames) {
        const quizLinks = Array.isArray(lesson?.fields?.[fieldName]) ? lesson.fields[fieldName] : [];
        
        quizLinks.forEach((q: any) => {
          const title = q?.fields?.title || q?.fields?.name;
          const slug = q?.fields?.slug;
          
          if (title && slug) {
            // Quiz data is already available
            quizData[q.sys.id] = { title, slug };
          } else {
            // Need to fetch this quiz separately
            allQuizIdsToFetch.push(q.sys.id);
          }
        });
      }

      // Collect tutorials linked on this chapter (try multiple field names)
      const tutorialFieldNames = ['tutorial', 'tutorials', 'exercise', 'exercises', 'practice', 'practices'];
      for (const fieldName of tutorialFieldNames) {
        const tutorialLinks = Array.isArray(lesson?.fields?.[fieldName]) ? lesson.fields[fieldName] : [];
        tutorialLinks.forEach((t: any) => {
          const title = t?.fields?.topic || t?.fields?.title || t?.fields?.name;
          const slug = t?.fields?.slug;
          if (title && slug) {
            perChapterContent.push({ title, slug, type: 'tutorial' as const, chapterSlug });
          }
        });
      }

      // Collect challenges linked on this chapter (try multiple field names)
      const challengeFieldNames = ['challenge', 'challenges', 'assignment', 'assignments', 'project', 'projects'];
      for (const fieldName of challengeFieldNames) {
        const challengeLinks = Array.isArray(lesson?.fields?.[fieldName]) ? lesson.fields[fieldName] : [];
        challengeLinks.forEach((c: any) => {
          const title = c?.fields?.title || c?.fields?.name;
          const slug = c?.fields?.slug;
          if (title && slug) {
            perChapterContent.push({ title, slug, type: 'challenge' as const, chapterSlug });
          }
        });
      }

      // Note: Chapter Quiz entries (moduleQuiz) are handled globally below if present
    }
    
    // Fetch all missing quiz entries in batch
    if (allQuizIdsToFetch.length > 0) {
      try {
        const quizEntries = await contentfulClient.getEntries({
          'sys.id[in]': allQuizIdsToFetch.join(','),
          include: 2
        });
        
        quizEntries.items.forEach((entry: any) => {
          const title = entry.fields?.title || entry.fields?.name;
          const slug = entry.fields?.slug;
          if (title && slug) {
            quizData[entry.sys.id] = { title, slug };
          }
        });
      } catch (e) {
        console.warn(`[api/lessons] Failed to fetch quiz entries:`, e);
      }
    }
    
    // Now process all lessons again to add quizzes with fetched data
    for (const lesson of sortedLessons) {
      const chapterTitle = lesson.fields?.title;
      const chapterSlug = lesson.fields?.slug;
      if (!chapterTitle || !chapterSlug) continue;

      // Collect quizzes linked on this chapter (try multiple field names)
      const quizFieldNames = ['lessonQuiz', 'quiz', 'quizzes', 'assessment', 'test'];
      for (const fieldName of quizFieldNames) {
        const quizLinks = Array.isArray(lesson?.fields?.[fieldName]) ? lesson.fields[fieldName] : [];
        
        // Add all quizzes to content
        quizLinks.forEach((q: any) => {
          const quizInfo = quizData[q.sys.id];
          if (quizInfo) {
            perChapterContent.push({ 
              title: quizInfo.title, 
              slug: quizInfo.slug, 
              type: 'quiz' as const, 
              chapterSlug 
            });
          }
        });
      }
    }

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
        // Generic filtering - include if title or slug contains course keyword
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
    
    return NextResponse.json({ 
      lessons: finalLessons,
      tutorials: finalTutorials,
      quizzes: finalQuizzes,
      challenges: finalChallenges,
      allContent,
      courseName,
      courseDescription
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


