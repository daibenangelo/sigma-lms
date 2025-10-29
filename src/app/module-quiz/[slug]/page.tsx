import { notFound } from "next/navigation";
import { Metadata } from "next";
import { StrictQuiz } from "@/components/strict-quiz";
import QuizLastScore from "@/components/quiz-last-score";
import CompletionIndicator from "@/components/CompletionIndicator";
import ModuleQuizContent from "./module-quiz-content";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;

  try {
    // Module quizzes are identified by module slug, not quiz slug
    // The slug parameter here is actually the module slug
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const moduleQuizData = await fetch(`${baseUrl}/api/module-quiz?module=${slug}`, {
      cache: 'no-store'
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .catch(error => {
        console.error('Failed to fetch module quiz for metadata:', error);
        return { questions: [], title: 'Module Quiz' };
      });

    // Only return not found if there's an explicit error, not just empty questions
    if (moduleQuizData.error) {
      return {
        title: "Module Quiz Not Found | Sigma LMS",
        description: "The requested module quiz could not be found.",
      };
    }

    const title = moduleQuizData.title || "Module Quiz";
    const questionCount = moduleQuizData.questions?.length || 0;

    return {
      title: `${title} | Sigma LMS`,
      description: `Test your knowledge with this ${questionCount}-question module quiz. Part of the Software Development Programme.`,
      keywords: ["module quiz", "assessment", "programming", "software development", "learning", title.toLowerCase()],
      openGraph: {
        title: `${title} | Sigma LMS`,
        description: `Test your knowledge with this ${questionCount}-question module quiz. Part of the Software Development Programme.`,
        type: "website",
      },
      twitter: {
        card: "summary",
        title: `${title} | Sigma LMS`,
        description: `Test your knowledge with this ${questionCount}-question module quiz.`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for module quiz:", error);
    return {
      title: "Module Quiz | Sigma LMS",
      description: "Interactive programming module quizzes and assessments.",
    };
  }
}

export default async function ModuleQuizPage({ params }: Params) {
  const { slug } = await params;

  console.log(`[ModuleQuizPage] Received slug: ${slug}`);

  // Build absolute URL for API call (required in server components)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const apiUrl = `${baseUrl}/api/module-quiz?module=${slug}`;
  
  console.log(`[ModuleQuizPage] Fetching from URL: ${apiUrl}`);

  // Fetch module quiz data using absolute URL
  const moduleQuizData = await fetch(apiUrl, {
    cache: 'no-store' // Don't cache since we removed caching
  })
    .then(res => {
      console.log(`[ModuleQuizPage] Response status: ${res.status}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      console.log(`[ModuleQuizPage] Received data:`, {
        title: data.title,
        questionsCount: data.questions?.length || 0,
        moduleTitle: data.moduleTitle,
        hasError: !!data.error
      });
      return data;
    })
    .catch(error => {
      console.error('Failed to fetch module quiz:', error);
      return { questions: [], title: 'Module Quiz' };
    });

  // Only call notFound if we got an explicit error, not just empty questions
  if (moduleQuizData.error) {
    notFound();
  }

  return <ModuleQuizContent moduleQuizData={moduleQuizData} slug={slug} />;
}
