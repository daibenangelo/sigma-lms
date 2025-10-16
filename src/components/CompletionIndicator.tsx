"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { validateQuizAttempt } from "@/lib/localStorage-validator";

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
        const storedValue = typeof window !== "undefined" ? localStorage.getItem(key) : null;
        const ok = user && storedValue === "true";
        console.log('[CompletionIndicator] Checking challenge completion:', {
          slug,
          key,
          userId: user?.id,
          storedValue,
          ok,
          completedState: completed
        });
        setCompleted(!!ok);
        setLoading(false);
        return;
      }

      // quiz
      if (!course || !user) {
        setCompleted(false);
        setLoading(false);
        return;
      }

      // Check localStorage for perfect score first
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage);
        const attemptKeys = keys.filter(key => key.startsWith(`quiz-${slug}-`));

        console.log('[CompletionIndicator] Checking quiz completion:', {
          slug,
          keysFound: attemptKeys.length,
          keys: attemptKeys
        });

        let localPerfect = false;
        let localLatestAttempt = null;

        for (const key of attemptKeys) {
          try {
            const attemptData = JSON.parse(localStorage.getItem(key) || '{}');
            if (attemptData.score_percentage === 100 || attemptData.passed === true) {
              localPerfect = true;
            }
            // Keep track of the most recent attempt
            if (!localLatestAttempt || new Date(attemptData.completed_at) > new Date(localLatestAttempt.completed_at)) {
              localLatestAttempt = attemptData;
            }
          } catch (e) {
            // Ignore malformed data
          }
        }

        // Validate localStorage data against database
        const validation = await validateQuizAttempt(slug, localLatestAttempt);

        console.log('[CompletionIndicator] Validation result:', validation);

        if (validation.shouldUseDatabase && validation.databaseData) {
          // Use database data (most accurate)
          const dbPerfect = validation.databaseData.score_percentage === 100 || validation.databaseData.passed === true;
          setCompleted(dbPerfect);
          console.log('[CompletionIndicator] Using database data:', { dbPerfect });
        } else if (validation.shouldUseLocal && validation.localData) {
          // Use localStorage data (database unavailable or no database data)
          setCompleted(localPerfect);
          console.log('[CompletionIndicator] Using localStorage data:', { localPerfect });
        } else {
          // No data available
          setCompleted(false);
        }
      } else {
        // Fallback to API if localStorage is not available
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
      }
    } catch (error) {
      console.error('[CompletionIndicator] Error checking completion status:', error);
      setCompleted(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [type, slug, course, user]);

  // Listen for completion events to refresh status
  useEffect(() => {
    const handleItemCompleted = (event: any) => {
      const { slug: eventSlug } = event.detail;
      console.log('[CompletionIndicator] Received item-completed event:', {
        eventSlug,
        componentSlug: slug,
        matches: eventSlug === slug
      });

      if (eventSlug === slug) {
        console.log('[CompletionIndicator] Event slug matches component slug, updating status');
        // Small delay to ensure localStorage is updated
        setTimeout(() => {
          checkStatus();
        }, 50);
      } else {
        console.log('[CompletionIndicator] Event slug does not match component slug');
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
  }, [slug, type, user]);

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


