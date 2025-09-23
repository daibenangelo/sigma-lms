import { notFound } from "next/navigation";
import { getEntriesByContentType } from "@/lib/contentful";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Circle, HelpCircle, Wrench, ArrowRight } from "lucide-react";

type Params = {
  params: { slug: string };
};

export default async function ModulePage({ params }: Params) {
  const { slug } = await params;
  
  // Fetch the specific module
  const moduleItems = await getEntriesByContentType<{
    title?: string;
    slug?: string;
    moduleReview?: any;
    moduleQuiz?: any[];
    moduleProject?: any[];
  }>("module", { limit: 1, "fields.slug": slug, include: 10 });

  const module = moduleItems[0];
  if (!module) {
    notFound();
  }

  // Fetch all lessons, tutorials, and quizzes to filter by module
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

  const allQuizzes = await getEntriesByContentType<{
    title?: string;
    slug?: string;
    questions?: any;
  }>("quiz", { limit: 1000, include: 10 });

  // Filter content that belongs to this module (you might need to adjust this logic based on your content structure)
  const moduleLessons = allLessons.filter(lesson => 
    (lesson.fields as any)?.slug?.toLowerCase().includes((module.fields as any)?.title?.toLowerCase() || '') ||
    (lesson.fields as any)?.title?.toLowerCase().includes((module.fields as any)?.title?.toLowerCase() || '')
  );

  const moduleTutorials = allTutorials.filter(tutorial => 
    (tutorial.fields as any)?.slug?.toLowerCase().includes((module.fields as any)?.title?.toLowerCase() || '') ||
    (tutorial.fields as any)?.topic?.toLowerCase().includes((module.fields as any)?.title?.toLowerCase() || '')
  );

  const moduleQuizzes = allQuizzes.filter(quiz => 
    (quiz.fields as any)?.slug?.toLowerCase().includes((module.fields as any)?.title?.toLowerCase() || '') ||
    (quiz.fields as any)?.title?.toLowerCase().includes((module.fields as any)?.title?.toLowerCase() || '')
  );

  // Combine all content for this module
  const allContent = [
    ...moduleLessons.map(lesson => ({
      title: (lesson.fields as any)?.title || '',
      slug: (lesson.fields as any)?.slug || '',
      type: 'lesson' as const
    })),
    ...moduleTutorials.map(tutorial => ({
      title: (tutorial.fields as any)?.topic || (tutorial.fields as any)?.title || '',
      slug: (tutorial.fields as any)?.slug || '',
      type: 'tutorial' as const
    })),
    ...moduleQuizzes.map(quiz => ({
      title: (quiz.fields as any)?.title || '',
      slug: (quiz.fields as any)?.slug || '',
      type: 'quiz' as const
    }))
  ].sort((a, b) => a.slug.localeCompare(b.slug));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{(module.fields as any).title}</h1>
        <p className="text-gray-600 mb-6">Software Development Programme · Module</p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Module Overview</h2>
          <p className="text-blue-800">
            This module contains {allContent.length} items including chapters, tutorials, and quizzes. 
            Complete them in order to master {(module.fields as any).title}.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Module Content</h2>
        
        {allContent.length > 0 ? (
          <div className="space-y-2">
            {allContent.map((item, index) => {
              const isQuiz = item.type === 'quiz';
              const isTutorial = item.type === 'tutorial';
              const href = isQuiz ? `/quiz/${item.slug}` : isTutorial ? `/tutorial/${item.slug}` : `/lesson/${item.slug}`;

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
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No content found for this module</div>
            <p className="text-sm text-gray-400">Content may be coming soon</p>
          </div>
        )}
      </div>

      {/* Module Review and Quiz sections */}
      {((module.fields as any).moduleReview || (module.fields as any).moduleQuiz?.length > 0) && (
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Module Assessment</h2>
          
          {(module.fields as any).moduleQuiz && (module.fields as any).moduleQuiz.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-semibold text-orange-900 mb-2">Module Quiz</h3>
              <p className="text-orange-800 text-sm mb-3">
                Test your knowledge with the module quiz
              </p>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                Take Module Quiz
              </Button>
            </div>
          )}
          
          {(module.fields as any).moduleReview && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">Module Review</h3>
              <p className="text-green-800 text-sm mb-3">
                Review key concepts and prepare for the next module
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
