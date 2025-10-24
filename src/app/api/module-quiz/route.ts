import { NextResponse } from "next/server";
import { getEntriesByContentType } from "@/lib/contentful";

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

// Function to get module quiz questions (not cached due to large data size)
async function getModuleQuiz(moduleSlug: string) {
  try {
    // First, find the module by slug
    const modules = await getEntriesByContentType<{
      title?: string;
      slug?: string;
      courses?: any[];
    }>(
      "module",
      { limit: 1, "fields.slug": moduleSlug, include: 10 }
    );

    if (modules.length === 0) {
      return {
        error: "Module not found",
        questions: [],
        title: 'Module Quiz'
      };
    }

    const module = modules[0];
    const moduleCourses = module.fields?.courses || [];

    if (moduleCourses.length === 0) {
      return {
        questions: [],
        title: `${module.fields?.title || 'Module'} Quiz`,
        moduleTitle: module.fields?.title || 'Module'
      };
    }

    // Get all questions from the module's linked quizzes
    const allQuestions: any[] = [];

    // Get the moduleQuiz entries linked to this module
    const linkedModuleQuizzes = module.fields?.moduleQuiz;
    
    console.log(`[module-quiz] Module has ${Array.isArray(linkedModuleQuizzes) ? linkedModuleQuizzes.length : 0} linked moduleQuiz entries`);

    if (!linkedModuleQuizzes || !Array.isArray(linkedModuleQuizzes) || linkedModuleQuizzes.length === 0) {
      console.log(`[module-quiz] No moduleQuiz entries linked to module ${moduleSlug}`);
      return {
        questions: [],
        title: `${module.fields?.title || 'Module'} Quiz`,
        moduleTitle: module.fields?.title || 'Module'
      };
    }

    // Debug: Show what's in the linked quizzes
    linkedModuleQuizzes.forEach((mq: any, idx: number) => {
      console.log(`[module-quiz] Linked quiz ${idx}:`, {
        id: mq.sys?.id,
        title: mq.fields?.title,
        slug: mq.fields?.slug,
        allFields: Object.keys(mq.fields || {}),
        quizField: mq.fields?.quiz,
        quizCount: Array.isArray(mq.fields?.quiz) ? mq.fields.quiz.length : 0,
        hasQuiz: !!(mq.fields?.quiz && Array.isArray(mq.fields.quiz) && mq.fields.quiz.length > 0)
      });
    });

    // Process each linked moduleQuiz (Chapter Quiz) to extract questions
    // This follows the same pattern as src/app/quiz/[slug]/page.tsx
    for (const chapterQuiz of linkedModuleQuizzes) {
      console.log(`[module-quiz] Processing Chapter Quiz: ${chapterQuiz.fields?.title}`);
      console.log(`[module-quiz] Chapter Quiz has quiz field:`, !!chapterQuiz.fields?.quiz);
      console.log(`[module-quiz] Chapter Quiz quiz count:`, Array.isArray(chapterQuiz.fields?.quiz) ? chapterQuiz.fields.quiz.length : 0);

      // Each Chapter Quiz (moduleQuiz) has a 'quiz' field containing Quiz entries
      const linkedQuestions: any[] = Array.isArray(chapterQuiz.fields?.quiz)
        ? chapterQuiz.fields.quiz
        : [];

      console.log(`[module-quiz] Processing ${linkedQuestions.length} linked questions from ${chapterQuiz.fields?.title}`);

      // Convert each Quiz entry to a question
      linkedQuestions.forEach((q: any, index: number) => {
        const answers: any[] = Array.isArray(q.fields?.answers) ? q.fields.answers : [];
        
        console.log(`[module-quiz] Question ${index}: has ${answers.length} answers`);

        if (answers.length === 0) {
          console.log(`[module-quiz] Skipping question ${index} - no answers`);
          return;
        }

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

        const quizQuestion = {
          id: `q_${moduleSlug}_${chapterQuiz.fields?.slug}_${index}`,
          question: q.fields?.quesionText || q.fields?.questionText || 'Question not available',
          options: options.length > 0 ? options : ['Answer A', 'Answer B', 'Answer C', 'Answer D'],
          correctAnswer: correctAnswer,
          explanation: explanation || 'Explanation not available',
          isMultipleChoice: isMultipleChoice,
          moduleSlug,
          courseSlug: 'module',
          courseTitle: module.fields?.title || 'Module',
          lessonTitle: chapterQuiz.fields?.title || 'Module Quiz'
        };

        console.log(`[module-quiz] Added question:`, {
          id: quizQuestion.id,
          question: quizQuestion.question.substring(0, 50) + '...',
          optionsCount: quizQuestion.options.length,
          correctAnswer: quizQuestion.correctAnswer
        });

        allQuestions.push(quizQuestion);
      });
    }

    console.log(`[module-quiz] Extracted ${allQuestions.length} questions total`);

    // Limit to 100 questions max, equally distributed among chapter quizzes
    const MAX_QUESTIONS = 100;
    let finalQuestions: any[] = [];

    if (allQuestions.length <= MAX_QUESTIONS) {
      finalQuestions = allQuestions;
    } else {
      // Group questions by chapter quiz to distribute equally
      const questionsByQuiz: { [key: string]: any[] } = {};

      allQuestions.forEach(question => {
        const quizSlug = question.lessonTitle || 'unknown';
        if (!questionsByQuiz[quizSlug]) {
          questionsByQuiz[quizSlug] = [];
        }
        questionsByQuiz[quizSlug].push(question);
      });

      const quizCount = Object.keys(questionsByQuiz).length;
      const questionsPerQuiz = Math.floor(MAX_QUESTIONS / quizCount);

      console.log(`[module-quiz] Distributing ${MAX_QUESTIONS} questions among ${quizCount} quizzes (${questionsPerQuiz} per quiz)`);

      // Take questions from each quiz
      Object.entries(questionsByQuiz).forEach(([quizSlug, questions]) => {
        const questionsToTake = Math.min(questionsPerQuiz, questions.length);
        const selectedQuestions = questions
          .sort(() => Math.random() - 0.5) // Shuffle each quiz's questions
          .slice(0, questionsToTake); // Take first N after shuffle

        finalQuestions.push(...selectedQuestions);
        console.log(`[module-quiz] ${quizSlug}: ${questions.length} available, taking ${questionsToTake}`);
      });
    }

    console.log(`[module-quiz] Final question count: ${finalQuestions.length}`);

    // Final shuffle of all selected questions
    const shuffledQuestions = finalQuestions.sort(() => Math.random() - 0.5);

    return {
      questions: shuffledQuestions,
      title: `${module.fields?.title || 'Module'} Quiz`,
      moduleTitle: module.fields?.title || 'Module'
    };
  } catch (error) {
    console.warn(`Failed to fetch module quiz for ${moduleSlug}:`, error);
    return { questions: [], title: 'Module Quiz' };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleSlug = searchParams.get('module');

    console.log(`[module-quiz API] Received request for module: ${moduleSlug}`);
    console.log(`[module-quiz API] Full URL: ${request.url}`);

    if (!moduleSlug) {
      return NextResponse.json(
        { error: "Module slug is required" },
        { status: 400 }
      );
    }

    const result = await getModuleQuiz(moduleSlug);

    // If there's an error in the result, return it with appropriate status
    if (result.error) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching module quiz:", error);
    return NextResponse.json(
      { error: "Failed to fetch module quiz" },
      { status: 500 }
    );
  }
}
