import { notFound } from "next/navigation";
import { getEntriesByContentType } from "@/lib/contentful";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Circle, HelpCircle, Wrench, Swords, ArrowRight } from "lucide-react";

type Params = {
  params: { slug: string };
};

export default async function ModulePage({ params }: Params) {
  const { slug } = await params;
  
  // Since HTML is a course, not a module, we'll fetch all content and filter by course
  // For now, we'll assume all content belongs to the HTML course
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

  // Fetch all lessons, tutorials, and quizzes for the course
  const allLessons = await getEntriesByContentType<{
    title?: string;
    slug?: string;
    content?: any;
  }>("lesson", { limit: 1000, include: 10 });

  const allTutorials = await getEntriesByContentType<{
    topic?: string;
    slug?: string;
    preview?: any;
  }>("lessonTutorial", { limit: 1000, include: 10 });

  // Fetch Chapter Quizzes (moduleQuiz content type)
  let allChapterQuizzes: any[] = [];
  try {
    allChapterQuizzes = await getEntriesByContentType<{
      title?: string;
      slug?: string;
      quiz?: any[];
    }>("moduleQuiz", { limit: 1000, include: 10 });
  } catch (e) {
    console.warn("Could not fetch Chapter Quizzes:", e);
  }

  // Fetch Challenges
  let allChallenges: any[] = [];
  try {
    allChallenges = await getEntriesByContentType<{
      title?: string;
      slug?: string;
      preview?: any;
    }>("lessonChallenge", { limit: 1000, include: 10 });
  } catch (e) {
    console.warn("Could not fetch Challenges:", e);
  }

  // Filter content by course
  const courseLessons = allLessons.filter((lesson: any) => {
    const title = (lesson.fields?.title || "").toString().toLowerCase();
    const lessonSlug = (lesson.fields?.slug || "").toString().toLowerCase();
    
    // For HTML course, include web development intro lessons too
    if (slug === "html") {
      return title.includes("html") || lessonSlug.includes("html") || 
             title.includes("web development") || lessonSlug.includes("web-development") ||
             title.includes("introduction to web") || lessonSlug.includes("introduction-to-web");
    }
    
    // For other courses, use generic filtering
    return title.includes(slug) || lessonSlug.includes(slug);
  });

  const courseTutorials = allTutorials.filter((tutorial: any) => {
    const title = (tutorial.fields?.topic || tutorial.fields?.title || "").toString().toLowerCase();
    const tutorialSlug = (tutorial.fields?.slug || "").toString().toLowerCase();
    
    // For HTML course, include web development intro lessons too
    if (slug === "html") {
      return title.includes("html") || tutorialSlug.includes("html") || 
             title.includes("web development") || tutorialSlug.includes("web-development") ||
             title.includes("introduction to web") || tutorialSlug.includes("introduction-to-web");
    }
    
    // For other courses, use generic filtering
    return title.includes(slug) || tutorialSlug.includes(slug);
  });

  const courseChallenges = allChallenges.filter((challenge: any) => {
    const title = (challenge.fields?.title || "").toString().toLowerCase();
    const challengeSlug = (challenge.fields?.slug || "").toString().toLowerCase();
    
    // For HTML course, include web development intro lessons too
    if (slug === "html") {
      return title.includes("html") || challengeSlug.includes("html") || 
             title.includes("web development") || challengeSlug.includes("web-development") ||
             title.includes("introduction to web") || challengeSlug.includes("introduction-to-web");
    }
    
    // For other courses, use generic filtering
    return title.includes(slug) || challengeSlug.includes(slug);
  });
  
  // Extract quizzes from Chapter Quiz entries and filter by course
  const courseQuizzes: any[] = [];
  allChapterQuizzes.forEach((chapterQuiz: any) => {
    const quizLinks = Array.isArray(chapterQuiz?.fields?.quiz) ? chapterQuiz.fields.quiz : [];
    quizLinks.forEach((q: any) => {
      const title = q?.fields?.title;
      const quizSlug = q?.fields?.slug;
      if (title && quizSlug) {
        const titleLower = title.toLowerCase();
        const slugLower = quizSlug.toLowerCase();
        
        // Filter by course
        let shouldInclude = false;
        if (slug === "html") {
          shouldInclude = titleLower.includes("html") || slugLower.includes("html") || 
                         titleLower.includes("web development") || slugLower.includes("web-development") ||
                         titleLower.includes("introduction to web") || slugLower.includes("introduction-to-web");
        } else {
          shouldInclude = titleLower.includes(slug) || slugLower.includes(slug);
        }
        
        if (shouldInclude) {
          courseQuizzes.push({ title, slug: quizSlug, type: 'quiz' });
        }
      }
    });
  });

  // Combine all content for this course
  const allContent = [
    ...courseLessons.map(lesson => ({
      title: (lesson.fields as any)?.title || '',
      slug: (lesson.fields as any)?.slug || '',
      type: 'lesson' as const
    })),
    ...courseTutorials.map(tutorial => ({
      title: (tutorial.fields as any)?.topic || (tutorial.fields as any)?.title || '',
      slug: (tutorial.fields as any)?.slug || '',
      type: 'tutorial' as const
    })),
    ...courseChallenges.map(challenge => ({
      title: (challenge.fields as any)?.title || '',
      slug: (challenge.fields as any)?.slug || '',
      type: 'challenge' as const
    })),
    ...courseQuizzes
  ];

  // Sort content by logical order (similar to sidebar logic)
  const getContentIndex = (title: string, slug: string) => {
    const patterns = [
      /chapter\s*(\d+)/i, /lesson\s*(\d+)/i, /unit\s*(\d+)/i,
      /part\s*(\d+)/i, /section\s*(\d+)/i, /module\s*(\d+)/i, /step\s*(\d+)/i
    ];
    for (const pattern of patterns) {
      const m = (title || '').match(pattern);
      if (m && m[1]) return parseInt(m[1], 10);
    }
    const ms = (slug || '').match(/(\d+)/);
    return ms && ms[1] ? parseInt(ms[1], 10) : Number.MAX_SAFE_INTEGER;
  };
  
  const sortedContent = allContent.sort((a: any, b: any) => {
    const ai = getContentIndex(a.title || '', a.slug || '');
    const bi = getContentIndex(b.title || '', b.slug || '');
    if (ai !== bi) return ai - bi;
    return (a.title || '').localeCompare(b.title || '');
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{courseTitle}</h1>
        <p className="text-gray-600 mb-6">Software Development Programme · Course</p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Course Overview</h2>
          <p className="text-blue-800">
            This course contains {sortedContent.length} items including chapters, tutorials, quizzes, and challenges. 
            Complete them in order to master {courseTitle}.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Course Content</h2>
        
        {sortedContent.length > 0 ? (
          <div className="space-y-2">
            {sortedContent.map((item, index) => {
              const isQuiz = item.type === 'quiz';
              const isTutorial = item.type === 'tutorial';
              const isChallenge = item.type === 'challenge';
              const href = isQuiz ? `/quiz/${item.slug}?course=${slug}` : 
                          isTutorial ? `/tutorial/${item.slug}?course=${slug}` : 
                          isChallenge ? `/challenge/${item.slug}?course=${slug}` : 
                          `/lesson/${item.slug}?course=${slug}`;

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
                      <Badge variant="secondary" className="text-xs bg-rose-100 text-rose-600">
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
