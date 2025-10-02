"use client";

import { useQuizAttempts, QuizAttempt } from "@/hooks/use-quiz-attempts";
import { CheckCircle, XCircle, Clock, Trophy, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuizHistoryProps {
  quizSlug?: string;
  showAll?: boolean;
}

export function QuizHistory({ quizSlug, showAll = false }: QuizHistoryProps) {
  const { 
    attempts, 
    loading, 
    error, 
    getAttemptsByQuiz, 
    getLatestAttempt, 
    getBestScore,
    getTotalAttempts,
    getAverageScore 
  } = useQuizAttempts();

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const displayAttempts = quizSlug ? getAttemptsByQuiz(quizSlug) : attempts;
  const latestAttempt = quizSlug ? getLatestAttempt(quizSlug) : null;
  const bestScore = quizSlug ? getBestScore(quizSlug) : null;

  if (displayAttempts.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No quiz attempts found.</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {quizSlug && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quiz Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {latestAttempt && (
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{latestAttempt.score_percentage}%</div>
                <div className="text-sm text-gray-600">Latest Score</div>
              </div>
            )}
            {bestScore && (
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{bestScore.score_percentage}%</div>
                <div className="text-sm text-gray-600">Best Score</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{displayAttempts.length}</div>
              <div className="text-sm text-gray-600">Total Attempts</div>
            </div>
          </div>
        </div>
      )}

      {/* Attempt History */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {quizSlug ? 'Quiz Attempts' : 'All Quiz History'}
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {displayAttempts.map((attempt, index) => (
            <div key={attempt.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-medium text-gray-900">
                      {attempt.quiz_title}
                    </h4>
                    {attempt.passed ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Trophy className="h-4 w-4 mr-1" />
                      {attempt.score_percentage}% ({attempt.score}/{attempt.total_questions})
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatTime(attempt.time_spent_seconds)}
                    </div>
                    <div>
                      {formatDate(attempt.completed_at)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    attempt.passed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {attempt.passed ? 'Passed' : 'Failed'}
                  </div>
                  
                  {index === 0 && (
                    <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      Latest
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overall Stats (only show if showing all attempts) */}
      {showAll && attempts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{getTotalAttempts()}</div>
              <div className="text-sm text-gray-600">Total Attempts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{getAverageScore()}%</div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {attempts.filter(a => a.passed).length}
              </div>
              <div className="text-sm text-gray-600">Passed Quizzes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {attempts.filter(a => !a.passed).length}
              </div>
              <div className="text-sm text-gray-600">Failed Quizzes</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
