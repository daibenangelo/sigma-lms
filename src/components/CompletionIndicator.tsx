"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { validateQuizAttempt } from "@/lib/localStorage-validator";

type Props = {
  type: "challenge" | "quiz" | "moduleQuiz" | "moduleProject" | "moduleReview";
  slug: string;
  course?: string | null;
  module?: string | null;
};

export default function CompletionIndicator({ type, slug, course, module }: Props) {
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

      // For moduleProject and moduleReview, just check if viewed (since they're content pages)
      if (type === 'moduleProject' || type === 'moduleReview') {
        if (!module || !user) {
          setCompleted(false);
          setLoading(false);
          return;
        }

        // Check if item is in viewed items for this module
        const viewedStorageKey = `viewedItems_${user.id}_${module}`;
        const storedViewed = typeof window !== "undefined" ? sessionStorage.getItem(viewedStorageKey) : null;

        if (storedViewed) {
          try {
            const viewedItems = JSON.parse(storedViewed);
            const isViewed = Array.isArray(viewedItems) ? viewedItems.includes(slug) : false;
            setCompleted(isViewed);
            console.log(`[CompletionIndicator] ${type} viewed check:`, { slug, module, isViewed });
          } catch (e) {
            console.warn(`[CompletionIndicator] Failed to parse viewed items for module ${module}:`, e);
            setCompleted(false);
          }
        } else {
          setCompleted(false);
        }
        setLoading(false);
        return;
      }

      // quiz or moduleQuiz
      if (type === 'quiz' || type === 'moduleQuiz') {
        if (!user) {
          setCompleted(false);
          setLoading(false);
          return;
        }

        // For moduleQuiz, we don't need course parameter
        if (type === 'moduleQuiz' && !course) {
          // Module quiz uses module slug as course for progress tracking
          // We'll use the slug directly as the course identifier
        }

        // Check localStorage for perfect score first
        if (typeof window !== 'undefined') {
          const keys = Object.keys(localStorage);
          const attemptKeys = keys.filter(key =>
            key.startsWith(`quiz-${slug}-`) ||
            key.startsWith(`module-quiz-${slug}-`)
          );

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
        const apiUrl = type === 'moduleQuiz'
          ? `/api/quiz-attempts?quizSlug=${encodeURIComponent(slug)}`
          : course ? `/api/quiz-attempts?quizSlug=${encodeURIComponent(slug)}&courseSlug=${encodeURIComponent(course)}`
                  : `/api/quiz-attempts?quizSlug=${encodeURIComponent(slug)}`;
        const res = await fetch(apiUrl);
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
  }, [type, slug, course, module, user]);

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
          : type === "moduleProject"
          ? completed
            ? "Module project viewed"
            : slug.includes('placeholder')
            ? "Module project not available yet"
            : "Module project not viewed"
          : type === "moduleReview"
          ? completed
            ? "Module review viewed"
            : "Module review not viewed"
          : completed
            ? "Quiz completed (perfect score)"
            : "Quiz not completed (perfect score required)"}
      </span>
    </div>
  );
}


