"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { validateQuizAttempt, clearUserLocalStorage } from "@/lib/localStorage-validator";
import { supabase } from "@/lib/supabase";

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
  const { user } = useAuth();

  const fetchLast = async () => {
    console.log('[QuizLastScore] fetchLast called for quiz:', quizSlug);

    // Get localStorage data first
    const latestKey = `quiz-last-${quizSlug}`;
    const localData = typeof window !== 'undefined' ? localStorage.getItem(latestKey) : null;
    let localAttempt: any = null;

    try {
      if (!user) {
        console.log('[QuizLastScore] No user found, cannot fetch quiz data');
        setLoaded(true);
        return;
      }

      if (localData) {
        try {
          localAttempt = JSON.parse(localData);
          console.log('[QuizLastScore] Found localStorage data:', localAttempt);
        } catch (parseError) {
          console.error('[QuizLastScore] Failed to parse localStorage data:', parseError);
        }
      }

      // Validate localStorage data against database
      const validation = await validateQuizAttempt(quizSlug, localAttempt);

      console.log('[QuizLastScore] Validation result:', validation);

      if (validation.shouldUseDatabase && validation.databaseData) {
        // Use database data (most accurate)
        console.log('[QuizLastScore] Using database data:', validation.databaseData);
        setHasAttempt(true);
        setScore(null); // Score not available in database data
        setTotal(null); // Total questions not available in database data
        setPercentage(validation.databaseData.score_percentage ?? null);
        setPassed(validation.databaseData.passed ?? null);
        setWhen(validation.databaseData.completed_at ?? null);

        // Update localStorage with database data for consistency
        if (typeof window !== 'undefined') {
          localStorage.setItem(latestKey, JSON.stringify(validation.databaseData));
        }
      } else if (validation.shouldUseLocal && validation.localData) {
        // Use localStorage data (database unavailable or no database data)
        console.log('[QuizLastScore] Using localStorage data:', validation.localData);
        setHasAttempt(true);
        setScore(null); // Score not available in localStorage data
        setTotal(null); // Total questions not available in localStorage data
        setPercentage(validation.localData.score_percentage ?? null);
        setPassed(validation.localData.passed ?? null);
        setWhen(validation.localData.completed_at ?? null);
      } else {
        // No data available
        console.log('[QuizLastScore] No quiz data found');
        setHasAttempt(false);
        setScore(null);
        setTotal(null);
        setPercentage(null);
        setPassed(null);
        setWhen(null);
      }

      // Count total attempts from database or localStorage
      if (validation.shouldUseDatabase) {
        // Count from database
        const { data: allAttempts, error: countError } = await supabase
          .from('user_quiz_attempts')
          .select('id')
          .eq('user_id', user.id)
          .eq('quiz_slug', quizSlug);

        if (!countError && allAttempts) {
          setTotalAttempts(allAttempts.length);
          console.log('[QuizLastScore] Database attempt count:', allAttempts.length);
        } else {
          console.error('[QuizLastScore] Error counting database attempts:', countError);
          // Fallback to localStorage count
          if (typeof window !== 'undefined') {
            const keys = Object.keys(localStorage);
            const attemptKeys = keys.filter(key => key.startsWith(`quiz-${quizSlug}-`));
            setTotalAttempts(attemptKeys.length);
          }
        }
      } else {
        // Use localStorage count
        if (typeof window !== 'undefined') {
          const keys = Object.keys(localStorage);
          const attemptKeys = keys.filter(key => key.startsWith(`quiz-${quizSlug}-`));
          setTotalAttempts(attemptKeys.length);
          console.log('[QuizLastScore] localStorage attempt count:', attemptKeys.length);
        }
      }

    } catch (error) {
      console.error('[QuizLastScore] Error fetching quiz data:', error);
      // Fallback to localStorage only
      if (localAttempt) {
        setHasAttempt(true);
        setScore(null); // Score not available in localStorage data
        setTotal(null); // Total questions not available in localStorage data
        setPercentage(localAttempt.score_percentage ?? null);
        setPassed(localAttempt.passed ?? null);
        setWhen(localAttempt.completed_at ?? null);
      } else {
        setHasAttempt(false);
      }
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchLast();

    // Listen for database reset events
    const handleDatabaseReset = () => {
      console.log('[QuizLastScore] Database reset detected, clearing localStorage...');
      // Clear all quiz-related localStorage data
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).filter(k => k.includes('quiz')).forEach(k => {
          console.log('[QuizLastScore] Removing localStorage key:', k);
          localStorage.removeItem(k);
        });
      }
      // Refetch data after clearing
      setTimeout(() => fetchLast(), 100);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('database-reset', handleDatabaseReset);
      return () => {
        window.removeEventListener('database-reset', handleDatabaseReset);
      };
    }
  }, [quizSlug]);

  // Listen for quiz completion events
  useEffect(() => {
    const handleQuizCompleted = () => {
      console.log('[QuizLastScore] Received quiz-completed event, refreshing data...');
      console.log('[QuizLastScore] Current localStorage state before refresh:', {
        keys: Object.keys(localStorage).filter(k => k.includes('quiz')),
        quizSlug
      });

      // Re-fetch data when a quiz is completed (increased delay to ensure localStorage is updated)
      console.log('[QuizLastScore] About to set timeout for fetchLast...');
      setLoaded(false);
      setTimeout(() => {
        console.log('[QuizLastScore] Executing delayed fetchLast...');
        try {
          fetchLast();
        } catch (error) {
          console.error('[QuizLastScore] Error in delayed fetchLast:', error);
        }
      }, 200); // Increased delay to ensure localStorage operations complete
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


