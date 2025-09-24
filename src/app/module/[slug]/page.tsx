import { notFound, redirect } from "next/navigation";
import { getEntriesByContentType } from "@/lib/contentful";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Circle, HelpCircle, Wrench, ArrowRight, Swords } from "lucide-react";

type Params = {
  params: { slug: string };
};

export default async function CoursePage({ params }: Params) {
  const { slug } = await params;
  
  // Fetch course info and associated content
  let courseTitle = "HTML";
  let courseDescription = "HTML Course";
  
  // Try to find a course or module with this slug, but don't fail if not found
  let course = null;
  try {
    // Try different content types that might represent courses
    const courseCandidates = ["course", "module", "program"];
    for (const contentType of courseCandidates) {
      try {
        const items = await getEntriesByContentType<{
          title?: string;
          slug?: string;
          description?: string;
        }>(contentType, { limit: 1, "fields.slug": slug, include: 10 });
        
        if (items.length > 0) {
          course = items[0];
          courseTitle = (course.fields as any)?.title || courseTitle;
          courseDescription = (course.fields as any)?.description || courseDescription;
          break;
        }
      } catch (e) {
        // Continue to next content type
        continue;
      }
    }
  } catch (e) {
    console.warn("Could not fetch course info, using defaults:", e);
  }

  // Fetch all chapters for building course content
  const allLessons = await getEntriesByContentType<{
    title?: string;
    slug?: string;
    content?: any;
    tutorial?: any[];
    lessonQuiz?: any[];
    challenge?: any[];
  }>("lesson", { limit: 1000, include: 10 });

  // Filter chapters by selected course (heuristic by slug/title matching)
  const courseKey = (slug || "").toLowerCase();
  console.log("[course] Filtering for course:", courseKey);
  console.log("[course] Total lessons found:", allLessons.length);
  
  const filteredLessons = allLessons.filter((lesson: any) => {
    const t = (lesson.fields?.title || "").toLowerCase();
    const s = (lesson.fields?.slug || "").toLowerCase();
    console.log("[course] Checking lesson:", { title: t, slug: s });
    
    if (courseKey === "html") {
      // HTML course: exclude CSS-only content
      const isHtml = !(t.includes("css") || s.includes("css"));
      console.log("[course] HTML filter result:", isHtml);
      return isHtml;
    }
    // Other courses: include if title or slug mentions the course key
    const matches = t.includes(courseKey) || s.includes(courseKey);
    console.log("[course] Other course filter result:", matches);
    return matches;
  });
  
  console.log("[course] Filtered lessons count:", filteredLessons.length);

  // Build ordered content per chapter: Chapter → Quiz(es) → Tutorial(s) → Challenge(s)
  const allContent: Array<{ title: string; slug: string; type: 'chapter' | 'quiz' | 'tutorial' | 'challenge' }> = [];
  filteredLessons.forEach((lesson: any) => {
    const chapterTitle = lesson.fields?.title;
    const chapterSlug = lesson.fields?.slug;
    if (!chapterTitle || !chapterSlug) return;
    allContent.push({ title: chapterTitle, slug: chapterSlug, type: 'chapter' });

    const quizLinks = Array.isArray(lesson.fields?.lessonQuiz) ? lesson.fields.lessonQuiz : [];
    quizLinks.forEach((q: any) => {
      const title = q?.fields?.title;
      const qslug = q?.fields?.slug;
      if (title && qslug) allContent.push({ title, slug: qslug, type: 'quiz' });
    });

    const tutorialLinks = Array.isArray(lesson.fields?.tutorial) ? lesson.fields.tutorial : [];
    tutorialLinks.forEach((t: any) => {
      const title = t?.fields?.topic || t?.fields?.title;
      const tslug = t?.fields?.slug;
      if (title && tslug) allContent.push({ title, slug: tslug, type: 'tutorial' });
    });

    const challengeLinks = Array.isArray(lesson.fields?.challenge) ? lesson.fields.challenge : [];
    challengeLinks.forEach((c: any) => {
      const title = c?.fields?.title;
      const cslug = c?.fields?.slug;
      if (title && cslug) allContent.push({ title, slug: cslug, type: 'challenge' });
    });
  });

    // Auto-redirect to first chapter if course is accessed directly
    console.log("[course] All content:", allContent);
    const firstChapter = allContent.find(item => item.type === 'chapter');
    console.log("[course] First chapter found:", firstChapter);
    
    if (firstChapter) {
      console.log("[course] Redirecting to:", `/lesson/${firstChapter.slug}`);
      // Store the course context before redirecting
      redirect(`/lesson/${firstChapter.slug}?course=${slug}`);
    } else {
      console.log("[course] No first chapter found, showing course overview");
    }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{courseTitle}</h1>
        <p className="text-gray-600 mb-6">Software Development Programme · Course</p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Course Overview</h2>
          <p className="text-blue-800">
            This course contains {allContent.length} items including chapters, tutorials, and quizzes. 
            Complete them in order to master {courseTitle}.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Course Content</h2>
        
        {allContent.length > 0 ? (
          <div className="space-y-2">
             {allContent.map((item, index) => {
               const isQuiz = item.type === 'quiz';
               const isTutorial = item.type === 'tutorial';
               const isChallenge = item.type === 'challenge';
               const href = isQuiz ? `/quiz/${item.slug}` : isTutorial ? `/tutorial/${item.slug}` : isChallenge ? `/challenge/${item.slug}` : `/lesson/${item.slug}`;

              return (
                <Link
                  key={`${item.type}-${item.slug}`}
                  href={href}
                  className="flex items-center space-x-4 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Badge
                    variant="outline"
                    className="text-xs px-2 py-1 bg-gray-50 text-gray-700 border-gray-200"
                  >
                    {index + 1}
                  </Badge>
                  
                  <div className="flex items-center space-x-3 flex-1">
                    {isQuiz ? (
                      <HelpCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    ) : isTutorial ? (
                      <Wrench className="h-5 w-5 text-purple-500 flex-shrink-0" />
                     ) : isChallenge ? (
                       <Swords className="h-5 w-5 text-rose-500 flex-shrink-0" />
                     ) : (
                      <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    )}
                    
                    <span className="text-gray-900 font-medium">{item.title}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isQuiz && (
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-600">
                        Quiz
                      </Badge>
                    )}
                     {isTutorial && (
                      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-600">
                        Tutorial
                      </Badge>
                    )}
                     {isChallenge && (
                       <Badge variant="secondary" className="text-xs bg-rose-100 text-rose-700">
                         Challenge
                       </Badge>
                     )}
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No content found for this course</div>
            <p className="text-sm text-gray-400">Content may be coming soon</p>
          </div>
        )}
      </div>

      {/* Course Assessment sections */}
      {course && (
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Course Assessment</h2>
          
          {(course.fields as any)?.moduleQuiz && (course.fields as any).moduleQuiz.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-semibold text-orange-900 mb-2">Course Quiz</h3>
              <p className="text-orange-800 text-sm mb-3">
                Test your knowledge with the course quiz
              </p>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                Take Course Quiz
              </Button>
            </div>
          )}
          
          {(course.fields as any)?.moduleReview && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">Course Review</h3>
              <p className="text-green-800 text-sm mb-3">
                Review key concepts and prepare for the next course
              </p>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                Start Review
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
