import { notFound } from "next/navigation";
import { getEntriesByContentType } from "@/lib/contentful";
import { StrictQuiz } from "@/components/strict-quiz";

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

export default async function QuizPage({ params }: Params) {
  const { slug } = await params;

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
    const correctIndex = Math.max(0, answers.findIndex((ans: any) => ans.fields?.isCorrect === true));
    const explanation = richTextToPlainText(answers[correctIndex]?.fields?.explanation);

    return {
      id: `q${index}`,
      question: q.fields?.quesionText || q.fields?.questionText || '',
      options: options.length > 0 ? options : ['Answer A', 'Answer B', 'Answer C', 'Answer D'],
      correctAnswer: correctIndex,
      explanation: explanation || 'Explanation not available',
    };
  });

  const title = (chapterQuiz.fields as any)?.title || 'Quiz';

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-gray-600 mb-6">Software Development Programme · Course</p>
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
