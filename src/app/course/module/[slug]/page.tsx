import { notFound } from "next/navigation";
import { CourseSidebar } from "@/components/course-sidebar";

type Params = {
  params: Promise<{ slug: string }>;
};

type ContentItem = {
  title: string;
  slug: string;
  type: 'lesson' | 'quiz' | 'tutorial' | 'challenge';
};

type ApiResponse = {
  lessons: ContentItem[];
  tutorials: ContentItem[];
  quizzes: ContentItem[];
  challenges: ContentItem[];
  allContent: ContentItem[];
  courseName: string;
};

export default async function ModulePage({ params }: Params) {
  const { slug } = await params;
  
  // Fetch content from the API endpoint that properly filters by course
  let apiData: ApiResponse | null = null;
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/lessons?course=${encodeURIComponent(slug)}`, {
      cache: 'no-store' // Ensure fresh data
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        notFound();
      }
      throw new Error(`API request failed: ${response.status}`);
    }
    
    apiData = await response.json();
  } catch (e) {
    console.error("Failed to fetch course content:", e);
    notFound();
  }

  if (!apiData) {
    notFound();
  }

  const { allContent, courseName } = apiData;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{courseName}</h1>
          <p className="text-gray-600">
            This course contains {allContent.length} items including chapters, tutorials, quizzes, and challenges.
          </p>
        </div>

        <div className="space-y-4">
          {allContent.map((item, index) => {
            const isLesson = item.type === 'lesson';
            const isTutorial = item.type === 'tutorial';
            const isQuiz = item.type === 'quiz';
            const isChallenge = item.type === 'challenge';
            
            const href = isQuiz ? `/quiz/${item.slug}?course=${slug}` : 
                        isTutorial ? `/tutorial/${item.slug}?course=${slug}` : 
                        isChallenge ? `/challenge/${item.slug}?course=${slug}` : 
                        `/lesson/${item.slug}?course=${slug}`;

            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {isLesson ? (
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">L</span>
                        </div>
                      ) : isTutorial ? (
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-semibold text-sm">T</span>
                        </div>
                      ) : isQuiz ? (
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          <span className="text-yellow-600 font-semibold text-sm">Q</span>
                        </div>
                      ) : isChallenge ? (
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-red-600 font-semibold text-sm">C</span>
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-500">
                        {isLesson ? 'Chapter' : isTutorial ? 'Tutorial' : isQuiz ? 'Quiz' : 'Challenge'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isChallenge && (
                      <span className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                        Challenge
                      </span>
                    )}
                    <a
                      href={href}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View →
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
