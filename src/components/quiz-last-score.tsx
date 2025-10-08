"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

interface Props {
  quizSlug: string;
}

export default function QuizLastScore({ quizSlug }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [hasAttempt, setHasAttempt] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [percentage, setPercentage] = useState<number | null>(null);
  const [passed, setPassed] = useState<boolean | null>(null);
  const [when, setWhen] = useState<string | null>(null);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);

  const fetchLast = async () => {
    try {
      // Use localStorage for attempt tracking
      if (typeof window !== 'undefined') {
        const local = localStorage.getItem(`quiz-last-${quizSlug}`);
        if (local) {
          try {
            const attempt = JSON.parse(local);
            setHasAttempt(true);
            setScore(attempt.score ?? null);
            setTotal(attempt.total_questions ?? null);
            setPercentage(attempt.score_percentage ?? null);
            setPassed(attempt.passed ?? null);
            setWhen(attempt.completed_at ?? null);
            console.log('[QuizLastScore] Loaded latest attempt:', attempt);
          } catch {
            setHasAttempt(false);
          }
        } else {
          setHasAttempt(false);
        }

        // Count total attempts from localStorage keys
        const keys = Object.keys(localStorage);
        const attemptKeys = keys.filter(key => key.startsWith(`quiz-${quizSlug}-`));
        setTotalAttempts(attemptKeys.length);
        console.log('[QuizLastScore] Total attempts found:', attemptKeys.length, attemptKeys);
      }
    } catch {
      // ignore
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchLast();
  }, [quizSlug]);

  // Listen for quiz completion events
  useEffect(() => {
    const handleQuizCompleted = () => {
      console.log('[QuizLastScore] Received quiz-completed event, refreshing data...');
      // Re-fetch data when a quiz is completed
      setLoaded(false);
      setTimeout(() => fetchLast(), 100); // Small delay to ensure data is saved
    };

    const handleItemCompleted = (event: any) => {
      const { slug } = event.detail;
      console.log('[QuizLastScore] Received item-completed event for slug:', slug);
      // Re-fetch data when an item is completed
      setLoaded(false);
      setTimeout(() => fetchLast(), 100);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('quiz-completed', handleQuizCompleted);
      window.addEventListener('item-completed', handleItemCompleted);
      return () => {
        window.removeEventListener('quiz-completed', handleQuizCompleted);
        window.removeEventListener('item-completed', handleItemCompleted);
      };
    }
  }, [quizSlug]);

  if (!loaded) return null;

  if (!hasAttempt) {
    return (
      <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-gray-50 text-gray-700 border border-gray-200">
        <span>No attempts yet · Attempt {totalAttempts}</span>
      </div>
    );
  }

  if (score === null || total === null || percentage === null || passed === null) return null;

  const colorClasses = passed
    ? 'bg-green-50 text-green-800 border border-green-200'
    : 'bg-red-50 text-red-800 border border-red-200';

  return (
    <div className={`mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${colorClasses}`}>
      {passed ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      <span>Last score: {score}/{total} ({percentage}%) · Attempt {totalAttempts}</span>
      {when && <span className="ml-1 text-xs opacity-70">· {new Date(when).toLocaleString()}</span>}
    </div>
  );
}


