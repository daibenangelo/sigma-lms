import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getEntriesByContentType } from "@/lib/contentful";
import { StrictQuiz } from "@/components/strict-quiz";
import QuizLastScore from "@/components/quiz-last-score";
import CompletionIndicator from "@/components/CompletionIndicator";

// Helper function to convert rich text to plain text
function richTextToPlainText(doc: any): string {
  if (!doc) return "";
  try {
    const walk = (node: any): string => {
      if (!node) return "";
      if (typeof node === "string") return node;
      const nodeType = node.nodeType;
      if (nodeType === 'text') return node.value || '';
      const children = Array.isArray(node.content) ? node.content.map(walk).join("") : "";
      return children;
    };
    return walk(doc).replace(/\s+/g, ' ').trim();
  } catch {
    return "";
  }
}

type Params = {
  params: { slug: string };
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  try {
    const chapterQuizItems = await getEntriesByContentType<{
      title?: string;
      slug?: string;
      quiz?: any[];
    }>("moduleQuiz", { limit: 1, "fields.slug": slug, include: 10 });

    const chapterQuiz = chapterQuizItems[0];
    if (!chapterQuiz) {
      return {
        title: "Quiz Not Found | Sigma LMS",
        description: "The requested quiz could not be found.",
      };
    }

    const title = (chapterQuiz.fields as any)?.title || "Quiz";
    const questions = Array.isArray((chapterQuiz.fields as any).quiz) ? (chapterQuiz.fields as any).quiz : [];
    const questionCount = questions.length;

    return {
      title: `${title} | Sigma LMS`,
      description: `Test your knowledge with this ${questionCount}-question quiz. Part of the Software Development Programme.`,
      keywords: ["quiz", "assessment", "programming", "software development", "learning", title.toLowerCase()],
      openGraph: {
        title: `${title} | Sigma LMS`,
        description: `Test your knowledge with this ${questionCount}-question quiz. Part of the Software Development Programme.`,
        type: "website",
      },
      twitter: {
        card: "summary",
        title: `${title} | Sigma LMS`,
        description: `Test your knowledge with this ${questionCount}-question quiz.`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for quiz:", error);
    return {
      title: "Quiz | Sigma LMS",
      description: "Interactive programming quizzes and assessments.",
    };
  }
}

export default async function QuizPage({ params, searchParams }: any) {
  const { slug } = await params;
  const sp = await searchParams;
  const course = typeof sp?.course === 'string' ? sp.course : null;

  // Fetch Chapter Quiz (moduleQuiz) by slug
  const chapterQuizItems = await getEntriesByContentType<{
    title?: string;
    slug?: string;
    quiz?: any[];
  }>("moduleQuiz", { limit: 1, "fields.slug": slug, include: 10 });

  const chapterQuiz = chapterQuizItems[0];
  if (!chapterQuiz) {
    notFound();
  }

  // Convert Chapter Quiz linked entries into questions
  const linkedQuestions: any[] = Array.isArray((chapterQuiz.fields as any).quiz)
    ? (chapterQuiz.fields as any).quiz
    : [];

  const questions = linkedQuestions.map((q: any, index: number) => {
    const answers: any[] = Array.isArray(q.fields?.answers) ? q.fields.answers : [];
    const options = answers.map((ans: any) => richTextToPlainText(ans.fields?.answer));
    
    // Find all correct answers
    const correctIndices = answers
      .map((ans: any, idx: number) => ans.fields?.isCorrect === true ? idx : -1)
      .filter(idx => idx !== -1);
    
    const isMultipleChoice = correctIndices.length > 1;
    const correctAnswer = isMultipleChoice ? correctIndices : correctIndices[0] || 0;
    
    // Get explanation from first correct answer
    const firstCorrectAnswer = answers[correctIndices[0]];
    const explanation = richTextToPlainText(firstCorrectAnswer?.fields?.explanation);

    return {
      id: `q${index}`,
      question: q.fields?.quesionText || q.fields?.questionText || '',
      options: options.length > 0 ? options : ['Answer A', 'Answer B', 'Answer C', 'Answer D'],
      correctAnswer: correctAnswer,
      explanation: explanation || 'Explanation not available',
      isMultipleChoice: isMultipleChoice,
    };
  });

  const title = (chapterQuiz.fields as any)?.title || 'Quiz';

  return (
    <div className="max-w-4xl mx-auto pb-[30vh]">
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-gray-600 mb-4">Software Development Programme · Course</p>
      <CompletionIndicator type="quiz" slug={slug} course={course} />
      <QuizLastScore quizSlug={slug} />
      <div className="h-2" />
      {questions.length > 0 ? (
        <StrictQuiz questions={questions} title={title} quizSlug={slug} />
      ) : (
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <p className="text-gray-700">No quiz questions found.</p>
        </div>
      )}
    </div>
  );
}
