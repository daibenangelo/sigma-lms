"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Play, CheckSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
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
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const { user } = useAuth();

  const currentQ = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;
  const isFirstQuestion = currentQuestion === 0;
  const allQuestionsAnswered = selectedAnswers.every(answer => answer !== -1);

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
    newAnswers[currentQuestion] = answerIndex;
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
  };

  const getScore = () => {
    return questions.reduce((score, q, index) => {
      return score + (selectedAnswers[index] === q.correctAnswer ? 1 : 0);
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
      const passed = percentage >= 70;

      // Prepare answers data with question details
      const answersData = questions.map((question, index) => ({
        questionId: question.id,
        question: question.question,
        userAnswer: selectedAnswers[index],
        correctAnswer: question.correctAnswer,
        isCorrect: selectedAnswers[index] === question.correctAnswer,
        explanation: question.explanation
      }));

      const { error } = await supabase
        .from('user_quiz_attempts')
        .insert({
          user_id: user.id,
          quiz_slug: quizSlug,
          quiz_title: title,
          answers: answersData,
          score: score,
          total_questions: questions.length,
          score_percentage: percentage,
          passed: passed,
          time_spent_seconds: timeSpent,
          completed_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to save quiz results:', error);
        setSaveError('Failed to save quiz results. Please try again.');
      } else {
        console.log('Quiz results saved successfully');
      }
    } catch (error) {
      console.error('Error saving quiz results:', error);
      setSaveError('An error occurred while saving quiz results.');
    } finally {
      setIsSaving(false);
    }
  };

  // Not started state
  if (quizState === 'not-started') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-600">Software Development Programme · Quiz</p>
          </div>
          
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
                <h1 className="text-xl font-semibold">{title}</h1>
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
              {currentQ.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    selectedAnswers[currentQuestion] === index
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="font-medium mr-3">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span>{option}</span>
                  </div>
                </button>
              ))}
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
                        : selectedAnswers[index] !== -1
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
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
                  disabled={selectedAnswers[currentQuestion] === -1}
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
    const passed = percentage >= 70;

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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Completed!</h1>
              <p className="text-gray-600 mb-4">
                You scored {score} out of {questions.length} questions ({percentage}%)
              </p>
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                passed 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {passed ? 'Passed' : 'Failed'} (70% required to pass)
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

          {/* Quiz Review */}
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
        </div>
      </div>
    );
  }

  return null;
}
