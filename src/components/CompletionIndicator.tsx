"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

type Props = {
  type: "challenge" | "quiz";
  slug: string;
  course?: string | null;
};

export default function CompletionIndicator({ type, slug, course }: Props) {
  const [completed, setCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkStatus = async () => {
    try {
      if (type === "challenge") {
        const key = `challenge-completed-${slug}`;
        const ok = typeof window !== "undefined" && localStorage.getItem(key) === "true";
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

    if (typeof window !== 'undefined') {
      window.addEventListener('item-completed', handleItemCompleted);
      return () => window.removeEventListener('item-completed', handleItemCompleted);
    }
  }, [slug]);

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


