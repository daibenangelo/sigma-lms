"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

export interface QuizAttempt {
  id: string;
  quiz_slug: string;
  quiz_title: string;
  score: number;
  total_questions: number;
  score_percentage: number;
  passed: boolean;
  time_spent_seconds: number;
  completed_at: string;
  answers: Array<{
    questionId: string;
    question: string;
    userAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    explanation: string;
  }>;
}

export function useQuizAttempts() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAttempts = async () => {
      try {
        const { data, error } = await supabase
          .from('user_quiz_attempts')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch quiz attempts:', error);
          setError('Failed to load quiz history');
          return;
        }

        setAttempts(data || []);
      } catch (err) {
        console.error('Error fetching quiz attempts:', err);
        setError('An error occurred while loading quiz history');
      } finally {
        setLoading(false);
      }
    };

    fetchAttempts();
  }, [user]);

  const getAttemptsByQuiz = (quizSlug: string) => {
    return attempts.filter(attempt => attempt.quiz_slug === quizSlug);
  };

  const getLatestAttempt = (quizSlug: string) => {
    const quizAttempts = getAttemptsByQuiz(quizSlug);
    return quizAttempts.length > 0 ? quizAttempts[0] : null;
  };

  const getBestScore = (quizSlug: string) => {
    const quizAttempts = getAttemptsByQuiz(quizSlug);
    if (quizAttempts.length === 0) return null;
    
    return quizAttempts.reduce((best, current) => 
      current.score_percentage > best.score_percentage ? current : best
    );
  };

  const getPassedAttempts = () => {
    return attempts.filter(attempt => attempt.passed);
  };

  const getFailedAttempts = () => {
    return attempts.filter(attempt => !attempt.passed);
  };

  const getTotalAttempts = () => {
    return attempts.length;
  };

  const getAverageScore = () => {
    if (attempts.length === 0) return 0;
    const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score_percentage, 0);
    return Math.round(totalScore / attempts.length);
  };

  return {
    attempts,
    loading,
    error,
    getAttemptsByQuiz,
    getLatestAttempt,
    getBestScore,
    getPassedAttempts,
    getFailedAttempts,
    getTotalAttempts,
    getAverageScore
  };
}
