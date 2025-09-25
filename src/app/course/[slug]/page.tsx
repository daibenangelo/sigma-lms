import { notFound } from "next/navigation";

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

export default async function CoursePage({ params }: Params) {
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{courseName}</h1>
          <p className="text-xl text-gray-600">
            This course contains {allContent.length} items including chapters, tutorials, quizzes, and challenges.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:scale-105">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {isLesson ? (
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-lg">L</span>
                      </div>
                    ) : isTutorial ? (
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold text-lg">T</span>
                      </div>
                    ) : isQuiz ? (
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-yellow-600 font-bold text-lg">Q</span>
                      </div>
                    ) : isChallenge ? (
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 font-bold text-lg">C</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-lg mb-2 leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {isLesson ? 'Chapter' : isTutorial ? 'Tutorial' : isQuiz ? 'Quiz' : 'Challenge'}
                    </p>
                    <div className="flex items-center justify-between">
                      {isChallenge && (
                        <span className="text-xs text-red-700 bg-red-100 px-3 py-1 rounded-full font-medium">
                          Challenge
                        </span>
                      )}
                      <a
                        href={href}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 font-semibold text-sm"
                      >
                        Start →
                      </a>
                    </div>
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