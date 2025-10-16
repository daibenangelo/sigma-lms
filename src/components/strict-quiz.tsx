"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Play, CheckSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { validateQuizAttempt } from "@/lib/localStorage-validator";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number | number[]; // Support single or multiple correct answers
  explanation: string;
  isMultipleChoice?: boolean; // Flag to indicate if multiple answers are allowed
}

interface StrictQuizProps {
  questions: QuizQuestion[];
  title?: string;
  quizSlug?: string;
}

type QuizState = 'not-started' | 'in-progress' | 'submitted';

export function StrictQuiz({ questions, title = "Quiz", quizSlug }: StrictQuizProps) {
  const [quizState, setQuizState] = useState<QuizState>('not-started');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | number[])[]>(new Array(questions.length).fill(-1));
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastAttempt, setLastAttempt] = useState<{ score: number; total: number; percentage: number; passed: boolean; when?: string } | null>(null);
  const [hasPerfectScore, setHasPerfectScore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { user } = useAuth();

  const currentQ = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;
  const isFirstQuestion = currentQuestion === 0;
  const allQuestionsAnswered = selectedAnswers.every(answer => {
    if (Array.isArray(answer)) {
      return answer.length > 0; // Multiple choice questions must have at least one selection
    }
    return answer !== -1; // Single choice questions
  });
  // Load last attempt and check for perfect score on mount
  useEffect(() => {
    const loadLastAttempt = async () => {
      try {
        if (!quizSlug || !user) {
          setIsLoading(false);
          return;
        }

        // Check localStorage for perfect score and latest attempt
        const keys = Object.keys(localStorage);
        const attemptKeys = keys.filter(key => key.startsWith(`quiz-${quizSlug}-`));

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

        console.log('[StrictQuiz] Local storage check:', { localPerfect, attemptCount: attemptKeys.length });

        // Validate localStorage data against database
        const validation = await validateQuizAttempt(quizSlug, localLatestAttempt);

        console.log('[StrictQuiz] Database validation result:', validation);

        if (validation.shouldUseDatabase && validation.databaseData) {
          // Use database data (most accurate)
          const dbPerfect = validation.databaseData.score_percentage === 100 || validation.databaseData.passed === true;
          setHasPerfectScore(dbPerfect);

          setLastAttempt({
            score: validation.databaseData.score ?? 0,
            total: validation.databaseData.total_questions ?? questions.length,
            percentage: validation.databaseData.score_percentage ?? 0,
            passed: validation.databaseData.passed ?? false,
            when: validation.databaseData.completed_at || undefined
          });

          // Update localStorage with database data for consistency
          if (typeof window !== 'undefined') {
            const latestKey = `quiz-last-${quizSlug}`;
            localStorage.setItem(latestKey, JSON.stringify(validation.databaseData));
          }

          console.log('[StrictQuiz] Using database data:', { dbPerfect });
        } else if (validation.shouldUseLocal && validation.localData) {
          // Use localStorage data (database unavailable or no database data)
          setHasPerfectScore(localPerfect);
          setLastAttempt({
            score: validation.localData.score ?? 0,
            total: validation.localData.total_questions ?? questions.length,
            percentage: validation.localData.score_percentage ?? 0,
            passed: validation.localData.passed ?? false,
            when: validation.localData.completed_at || undefined
          });

          console.log('[StrictQuiz] Using localStorage data:', { localPerfect });
        } else {
          // No data available
          setHasPerfectScore(false);
          setLastAttempt(null);
        }
      } catch (e) {
        console.error('[StrictQuiz] Error loading last attempt:', e);
        // Fallback to localStorage only
        setHasPerfectScore(localPerfect);
        if (localLatestAttempt) {
          setLastAttempt({
            score: localLatestAttempt.score ?? 0,
            total: localLatestAttempt.total_questions ?? questions.length,
            percentage: localLatestAttempt.score_percentage ?? 0,
            passed: localLatestAttempt.passed ?? false,
            when: localLatestAttempt.completed_at || undefined
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadLastAttempt();
  }, [quizSlug, questions.length, user]);


  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (quizState === 'in-progress' && startTime) {
      interval = setInterval(() => {
        setTimeSpent(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [quizState, startTime]);

  const handleStartQuiz = () => {
    setQuizState('in-progress');
    setStartTime(new Date());
    setCurrentQuestion(0);
    setSelectedAnswers(new Array(questions.length).fill(-1));
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (quizState !== 'in-progress') return;
    
    const newAnswers = [...selectedAnswers];
    const currentAnswer = newAnswers[currentQuestion];
    
    if (currentQ.isMultipleChoice) {
      // Multiple choice: toggle selection
      if (Array.isArray(currentAnswer)) {
        const newSelection = currentAnswer.includes(answerIndex)
          ? currentAnswer.filter(i => i !== answerIndex)
          : [...currentAnswer, answerIndex];
        newAnswers[currentQuestion] = newSelection.length > 0 ? newSelection : -1;
      } else {
        newAnswers[currentQuestion] = [answerIndex];
      }
    } else {
      // Single choice: replace selection
      newAnswers[currentQuestion] = answerIndex;
    }
    
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    setQuizState('submitted');
    setEndTime(new Date());
    await saveQuizResults();

    // Dispatch custom event to notify other components that quiz is completed
    if (typeof window !== 'undefined') {
      console.log('[StrictQuiz] Dispatching quiz-completed event');
      window.dispatchEvent(new CustomEvent('quiz-completed'));
    }
  };

  const getScore = () => {
    return questions.reduce((score, q, index) => {
      const selectedAnswer = selectedAnswers[index];
      const correctAnswer = q.correctAnswer;
      
      if (Array.isArray(correctAnswer)) {
        // Multiple correct answers: check if all correct answers are selected and no incorrect ones
        if (Array.isArray(selectedAnswer)) {
          const correctAnswersSet = new Set(correctAnswer);
          const selectedAnswersSet = new Set(selectedAnswer);
          
          // Check if all correct answers are selected and no extra incorrect answers
          const allCorrectSelected = correctAnswer.every(ans => selectedAnswer.includes(ans));
          const noIncorrectSelected = selectedAnswer.every(ans => correctAnswer.includes(ans));
          
          return score + (allCorrectSelected && noIncorrectSelected ? 1 : 0);
        }
        return score; // No selection for multiple choice question
      } else {
        // Single correct answer
        return score + (selectedAnswer === correctAnswer ? 1 : 0);
      }
    }, 0);
  };

  const getScorePercentage = () => {
    return Math.round((getScore() / questions.length) * 100);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const saveQuizResults = async () => {
    if (!user || !quizSlug) {
      console.warn('User not authenticated or quiz slug not provided');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const score = getScore();
      const percentage = getScorePercentage();
      const passed = percentage === 100;

      // Prepare answers data with question details
      const answersData = questions.map((question, index) => ({
        questionId: question.id,
        question: question.question,
        userAnswer: selectedAnswers[index],
        correctAnswer: question.correctAnswer,
        isCorrect: selectedAnswers[index] === question.correctAnswer,
        explanation: question.explanation
      }));

      // Prefer saving via API route (RLS-safe and SSR-aware)
      const session = (await supabase.auth.getSession()).data.session;
      const authHeader = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined;
      const apiRes = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader || {})
        },
        body: JSON.stringify({
          quizSlug,
          quizTitle: title,
          answers: answersData,
          score,
          totalQuestions: questions.length,
          scorePercentage: percentage,
          passed,
          timeSpentSeconds: timeSpent,
          completedAt: new Date().toISOString()
        })
      });

      if (apiRes.ok) {
        const body = await apiRes.json().catch(() => ({}));
        if (!body?.ok) {
          console.warn('Quiz results not stored in DB (but continuing):', body?.error);
        } else {
          console.log('Quiz results saved successfully via', body?.stored);
        }

        // If perfect score, mark item as completed in sidebar
        if (percentage === 100 && typeof window !== 'undefined') {
          // Dispatch event to mark item as completed in sidebar
          window.dispatchEvent(new CustomEvent('item-completed', { detail: { slug: quizSlug } }));
          console.log('[StrictQuiz] Perfect score achieved, marking item as completed');
        }
      } else {
        console.warn('Quiz save HTTP failure (continuing UI flow)');
      }

      // Always persist latest attempt locally for UI display
      try {
        const localAttempt = {
          score,
          total_questions: questions.length,
          score_percentage: percentage,
          passed,
          completed_at: new Date().toISOString()
        };
        // Save to localStorage for UI display and counting
        try {
          const timestamp = Date.now();
          const attemptKey = `quiz-${quizSlug}-${timestamp}`;
          const latestKey = `quiz-last-${quizSlug}`;

          console.log('[StrictQuiz] Saving quiz attempt to localStorage:', {
            quizSlug,
            timestamp,
            attemptKey,
            latestKey,
            attemptData: localAttempt
          });

          localStorage.setItem(attemptKey, JSON.stringify(localAttempt));
          localStorage.setItem(latestKey, JSON.stringify(localAttempt));

          // Debug: Check what keys exist in localStorage after saving
          const allKeys = Object.keys(localStorage);
          const quizKeys = allKeys.filter(key => key.includes(quizSlug));
          console.log('[StrictQuiz] Quiz attempt saved to localStorage');
          console.log('[StrictQuiz] localStorage keys after save:', quizKeys);
          console.log('[StrictQuiz] Saved data verification:', {
            attemptKey: localStorage.getItem(attemptKey) ? 'EXISTS' : 'MISSING',
            latestKey: localStorage.getItem(latestKey) ? 'EXISTS' : 'MISSING'
          });

          // Dispatch events to update other components (small delay to ensure localStorage is updated)
          if (typeof window !== 'undefined') {
            console.log('[StrictQuiz] Dispatching quiz-completed event');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('quiz-completed'));
            }, 10);
          }
        } catch (localStorageError) {
          console.error('[StrictQuiz] Failed to save to localStorage:', localStorageError);
        }
      } catch {}
    } catch (error) {
      console.error('Error saving quiz results:', error);
      setSaveError('An error occurred while saving quiz results.');
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading while checking for perfect score
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // Show explanations if user has already achieved perfect score
  if (hasPerfectScore) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-green-800">Quiz Already Completed!</h2>
          </div>
          <p className="text-green-700 mb-4">
            Congratulations! You've already achieved a perfect score on this quiz. Here are the correct answers and explanations:
          </p>
        </div>

        {/* Quiz Review (showing all answers since they got perfect score) */}
        <div className="space-y-8">
          {questions.map((question, index) => {
            const isCorrect = true; // Since they got perfect score, all answers are correct

            return (
              <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Question {index + 1}
                  </h3>
                  <div className="flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Correct
                  </div>
                </div>

                <p className="text-gray-700 mb-4">{question.question}</p>

                <div className="space-y-2 mb-4">
                  {question.options.map((option, optionIndex) => {
                    const isCorrectAnswer = question.correctAnswer === optionIndex;

                    return (
                      <div
                        key={optionIndex}
                        className={`p-3 rounded-lg border-2 ${
                          isCorrectAnswer
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="font-medium mr-3">
                            {String.fromCharCode(65 + optionIndex)}.
                          </span>
                          <span className={isCorrectAnswer ? 'text-green-800 font-medium' : ''}>
                            {option}
                          </span>
                          {isCorrectAnswer && (
                            <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Explanation:</h4>
                  <p className="text-blue-800">{question.explanation}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Not started state
  if (quizState === 'not-started') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          {/* Removed redundant per-quiz title and subtitle (already shown on page header) */}
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">Quiz Instructions</h2>
            <ul className="text-left text-blue-800 space-y-2">
              <li>• This quiz contains <strong>{questions.length} questions</strong></li>
              <li>• You must answer all questions before submitting</li>
              <li>• Once you start, you cannot pause or restart</li>
              <li>• Your answers will be saved automatically</li>
              <li>• You can review and change answers before submitting</li>
            </ul>
          </div>

          <Button 
            onClick={handleStartQuiz}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            <Play className="h-5 w-5 mr-2" />
            Start Quiz
          </Button>
        </div>
      </div>
    );
  }

  // In progress state
  if (quizState === 'in-progress') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Quiz Header */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  Question {currentQuestion + 1} of {questions.length}
                </p>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatTime(timeSpent)}
                </div>
                <div>
                  {selectedAnswers.filter(a => a !== -1).length} / {questions.length} answered
                </div>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">
              {currentQ.question}
            </h2>

            <div className="space-y-3">
              {currentQ.isMultipleChoice && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Multiple Choice:</strong> Select all correct answers by clicking on them.
                  </p>
                </div>
              )}
              {currentQ.options.map((option, index) => {
                const currentAnswer = selectedAnswers[currentQuestion];
                const isSelected = Array.isArray(currentAnswer) 
                  ? currentAnswer.includes(index)
                  : currentAnswer === index;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="font-medium mr-3">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <span>{option}</span>
                      {currentQ.isMultipleChoice && (
                        <div className="ml-auto">
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-gray-300 rounded" />
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex justify-between items-center">
              <Button
                onClick={handlePrevious}
                disabled={isFirstQuestion}
                variant="outline"
              >
                Previous
              </Button>

              <div className="flex space-x-2">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={`w-8 h-8 rounded-full text-sm font-medium ${
                      index === currentQuestion
                        ? 'bg-blue-600 text-white'
                        : (() => {
                            const answer = selectedAnswers[index];
                            if (Array.isArray(answer)) {
                              return answer.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600';
                            }
                            return answer !== -1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600';
                          })()
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              {isLastQuestion ? (
                <Button
                  onClick={handleSubmitQuiz}
                  disabled={!allQuestionsAnswered}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Finish and Submit Quiz
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={(() => {
                    const currentAnswer = selectedAnswers[currentQuestion];
                    if (Array.isArray(currentAnswer)) {
                      return currentAnswer.length === 0;
                    }
                    return currentAnswer === -1;
                  })()}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Submitted state - Show results
  if (quizState === 'submitted') {
    const score = getScore();
    const percentage = getScorePercentage();
    const passed = percentage === 100;

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Results Header */}
          <div className="border-b border-gray-200 p-6">
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                passed ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {passed ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-600" />
                )}
              </div>
              {/* Removed redundant per-quiz title; main page already shows the quiz name */}
              <p className="text-gray-600 mb-4">
                You scored {score} out of {questions.length} questions ({percentage}%)
              </p>
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                passed 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {passed ? 'Passed' : 'Failed'} (100% required to pass)
              </div>
              
              {/* Save Status */}
              {isSaving && (
                <div className="mt-4 text-blue-600 text-sm">
                  Saving your results...
                </div>
              )}
              {saveError && (
                <div className="mt-4 text-red-600 text-sm">
                  {saveError}
                </div>
              )}
              {!isSaving && !saveError && user && (
                <div className="mt-4 text-green-600 text-sm">
                  ✓ Results saved to your profile
                </div>
              )}
            </div>
          </div>

          {/* Quiz Review (only when perfect score) */}
          {passed ? (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Quiz Review</h2>
              <div className="space-y-8">
                {questions.map((question, index) => {
                  const userAnswer = selectedAnswers[index];
                  const isCorrect = userAnswer === question.correctAnswer;

                  return (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          Question {index + 1}
                        </h3>
                        <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          isCorrect 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {isCorrect ? 'Correct' : 'Incorrect'}
                        </div>
                      </div>

                      <p className="text-gray-700 mb-4">{question.question}</p>

                      <div className="space-y-2 mb-4">
                        {question.options.map((option, optionIndex) => {
                          const isUserAnswer = userAnswer === optionIndex;
                          const isCorrectAnswer = question.correctAnswer === optionIndex;
                          
                          return (
                            <div
                              key={optionIndex}
                              className={`p-3 rounded-lg border-2 ${
                                isCorrectAnswer
                                  ? 'border-green-500 bg-green-50'
                                  : isUserAnswer && !isCorrectAnswer
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-center">
                                <span className="font-medium mr-3">
                                  {String.fromCharCode(65 + optionIndex)}.
                                </span>
                                <span className={isCorrectAnswer ? 'text-green-800 font-medium' : ''}>
                                  {option}
                                </span>
                                {isCorrectAnswer && (
                                  <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />
                                )}
                                {isUserAnswer && !isCorrectAnswer && (
                                  <XCircle className="h-5 w-5 text-red-600 ml-auto" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Explanation:</h4>
                        <p className="text-blue-800">{question.explanation}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 mb-4">
                To view the correct answers and explanations, you need a perfect score. Please retake the quiz.
              </div>
              <div className="text-center">
                <Button onClick={handleStartQuiz} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Retake Quiz
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
