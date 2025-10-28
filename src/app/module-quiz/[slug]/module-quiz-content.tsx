"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { StrictQuiz } from "@/components/strict-quiz";
import QuizLastScore from "@/components/quiz-last-score";
import CompletionIndicator from "@/components/CompletionIndicator";

interface ModuleQuizContentProps {
  moduleQuizData: {
    questions: any[];
    title: string;
    moduleTitle: string;
  };
  slug: string;
}

export default function ModuleQuizContent({ moduleQuizData, slug }: ModuleQuizContentProps) {
  const { user } = useAuth();

  console.log(`[ModuleQuizContent] Received data:`, {
    slug,
    title: moduleQuizData.title,
    questionsCount: moduleQuizData.questions?.length || 0,
    moduleTitle: moduleQuizData.moduleTitle,
    hasError: !!moduleQuizData.error
  });

  useEffect(() => {
    // Track this module quiz as viewed when the component mounts
    if (user && typeof window !== 'undefined') {
      const moduleSlug = new URLSearchParams(window.location.search).get('module') || slug;

      // Update viewed items in sessionStorage
      const viewedStorageKey = `viewedItems_${user.id}_${moduleSlug}`;
      const completedStorageKey = `completedItems_${user.id}_${moduleSlug}`;

      try {
        const viewedStored = sessionStorage.getItem(viewedStorageKey);
        const completedStored = sessionStorage.getItem(completedStorageKey);

        const viewedItems = viewedStored ? JSON.parse(viewedStored) : [];
        const completedItems = completedStored ? JSON.parse(completedStored) : [];

        // Add current timestamp for last viewed tracking
        const now = new Date().toISOString();

        // Update last viewed items (keep only recent 20 items)
        const lastViewedKey = `lastViewedItems_${user.id}_${moduleSlug}`;
        const lastViewedStored = sessionStorage.getItem(lastViewedKey);
        let lastViewedItems = lastViewedStored ? JSON.parse(lastViewedStored) : [];

        // Remove this item if it already exists, then add it to the front
        lastViewedItems = lastViewedItems.filter((item: any) => item.slug !== slug);
        lastViewedItems.unshift({
          slug,
          title: moduleQuizData.title,
          type: 'moduleQuiz',
          course: moduleSlug,
          viewedAt: now
        });

        // Keep only the 20 most recent items
        lastViewedItems = lastViewedItems.slice(0, 20);

        sessionStorage.setItem(lastViewedKey, JSON.stringify(lastViewedItems));

        // Also mark as viewed in the regular viewed items array
        if (!viewedItems.includes(slug)) {
          viewedItems.push(slug);
          sessionStorage.setItem(viewedStorageKey, JSON.stringify(viewedItems));
        }

        console.log(`[ModuleQuizContent] Marked module quiz ${slug} as viewed at ${now}`);
      } catch (error) {
        console.warn('[ModuleQuizContent] Failed to update viewed items:', error);
      }
    }
  }, [user, slug, moduleQuizData.title]);

  // If no questions, show a message
  if (!moduleQuizData.questions || moduleQuizData.questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto pb-[30vh]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{moduleQuizData.title}</h1>
          <p className="text-gray-600 mb-2">Software Development Programme · Module Quiz</p>
          <p className="text-gray-600 mb-4">No questions available for this module quiz yet.</p>
        </div>
        <div className="text-center py-12">
          <div className="text-gray-500">
            <p>This module quiz will be available once content is added to the module.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-[30vh]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{moduleQuizData.title}</h1>
        <p className="text-gray-600 mb-2">Software Development Programme · {moduleQuizData.moduleTitle} Module Quiz</p>
        <p className="text-gray-600 mb-4">
          {moduleQuizData.questions.length} questions • All questions from {moduleQuizData.moduleTitle}
        </p>

        <CompletionIndicator type="moduleQuiz" slug={slug} />
      </div>

      <StrictQuiz
        questions={moduleQuizData.questions}
        title={moduleQuizData.title}
        quizSlug={slug}
        quizType="module"
      />

      <QuizLastScore quizSlug={slug} />
    </div>
  );
}
