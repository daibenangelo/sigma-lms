import { notFound } from "next/navigation";
import { getEntriesByContentType } from "@/lib/contentful";
import { Quiz } from "@/components/quiz";

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
  const { slug } = params;
  
  // First try to find a quiz with this slug
  const quizItems = await getEntriesByContentType<{
    title?: string;
    slug?: string;
    questions?: any;
  }>("quiz", { limit: 1, "fields.slug": slug, include: 10 });

  let quiz = quizItems[0];
  
  // If no direct quiz found, try to find a module with this slug that contains quiz data
  if (!quiz) {
    const moduleItems = await getEntriesByContentType<{
      title?: string;
      slug?: string;
      quiz?: any;
    }>("module", { limit: 1, "fields.slug": slug, include: 10 });
    
    const module = moduleItems[0];
    if (module && (module.fields as any).quiz) {
      // Convert module to quiz format
      quiz = {
        fields: {
          title: (module.fields as any).title || 'Quiz',
          slug: (module.fields as any).slug,
          questions: (module.fields as any).quiz
        }
      } as any;
    }
  }

  if (!quiz) {
    notFound();
  }

  // Process quiz questions
  const questions = (quiz.fields as any).questions?.map((q: any, index: number) => {
    // Extract options and correct answer from linked Quiz Answer entries
    const answers: any[] = Array.isArray(q.fields?.answers) ? q.fields.answers : [];
    const options = answers.map((ans: any) => richTextToPlainText(ans.fields?.answer));
    const correctIndex = Math.max(0, answers.findIndex((ans: any) => ans.fields?.isCorrect === true));
    const correctExp = answers[correctIndex]?.fields?.explanation;
    const explanation = richTextToPlainText(correctExp);
    
    return {
      id: `q${index}`,
      question: q.fields?.quesionText || q.fields?.questionText || '',
      options: options.length > 0 ? options : ['Answer A', 'Answer B', 'Answer C', 'Answer D'],
      correctAnswer: correctIndex,
      explanation: explanation || 'Explanation not available'
    };
  }) || [];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{(quiz.fields as any).title}</h1>
      <p className="text-gray-600 mb-6">Software Development Programme · Module: Web Foundations</p>
      
      {questions.length > 0 ? (
        <Quiz 
          questions={questions} 
          title={(quiz.fields as any).title || 'Quiz'} 
        />
      ) : (
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <p className="text-gray-700">No quiz questions found.</p>
        </div>
      )}
    </div>
  );
}
