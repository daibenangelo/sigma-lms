"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

type Props = {
  type: "challenge" | "quiz";
  slug: string;
  course?: string | null;
};

export default function CompletionIndicator({ type, slug, course }: Props) {
  const [completed, setCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();

  const checkStatus = async () => {
    try {
      if (type === "challenge") {
        const key = `challenge-completed-${user?.id}-${slug}`;
        const ok = typeof window !== "undefined" && user && localStorage.getItem(key) === "true";
        setCompleted(!!ok);
        setLoading(false);
        return;
      }

      // quiz
      if (!course) {
        setCompleted(false);
        setLoading(false);
        return;
      }

      // Check localStorage for perfect score (same logic as StrictQuiz)
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage);
        const attemptKeys = keys.filter(key => key.startsWith(`quiz-${slug}-`));

        console.log('[CompletionIndicator] Checking quiz completion:', {
          slug,
          keysFound: attemptKeys.length,
          keys: attemptKeys
        });

        let hasPerfect = false;
        for (const key of attemptKeys) {
          try {
            const attemptData = JSON.parse(localStorage.getItem(key) || '{}');
            if (attemptData.score_percentage === 100 || attemptData.passed === true) {
              hasPerfect = true;
              console.log('[CompletionIndicator] Found perfect score in key:', key);
              break;
            }
          } catch (e) {
            // Ignore malformed data
          }
        }

        if (hasPerfect) {
          setCompleted(true);
          setLoading(false);
          return;
        }
      }

      // Fallback to API if no perfect score found in localStorage
      const res = await fetch(`/api/quiz-attempts?quizSlug=${encodeURIComponent(slug)}&courseSlug=${encodeURIComponent(course)}`);
      if (!res.ok) {
        setCompleted(false);
        setLoading(false);
        return;
      }
      const data = await res.json();
      const hasPerfect = Array.isArray(data.attempts)
        ? data.attempts.some((a: any) => a?.score_percentage === 100)
        : !!data.hasPerfectScore;
      setCompleted(hasPerfect);
    } catch {
      setCompleted(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [type, slug, course]);

  // Listen for completion events to refresh status
  useEffect(() => {
    const handleItemCompleted = (event: any) => {
      const { slug: eventSlug } = event.detail;
      if (eventSlug === slug) {
        console.log('[CompletionIndicator] Received item-completed event for:', slug);
        checkStatus();
      }
    };

    const handleQuizCompleted = () => {
      if (type === 'quiz') {
        console.log('[CompletionIndicator] Received quiz-completed event');
        checkStatus();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('item-completed', handleItemCompleted);
      window.addEventListener('quiz-completed', handleQuizCompleted);
      return () => {
        window.removeEventListener('item-completed', handleItemCompleted);
        window.removeEventListener('quiz-completed', handleQuizCompleted);
      };
    }
  }, [slug, type]);

  if (loading) return null;

  return (
    <div className={`mb-4 flex items-center gap-2 rounded-md border px-3 py-2 ${completed ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
      {completed ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}
      <span className="text-sm font-medium">
        {type === "challenge"
          ? completed
            ? "Challenge completed"
            : "Challenge not completed"
          : completed
            ? "Quiz completed (perfect score)"
            : "Quiz not completed (perfect score required)"}
      </span>
    </div>
  );
}


