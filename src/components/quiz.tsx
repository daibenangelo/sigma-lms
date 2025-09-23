"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, XCircle } from "lucide-react";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizProps {
  questions: QuizQuestion[];
  title?: string;
}

export function Quiz({ questions, title = "Quiz" }: QuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const currentQ = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;
  const isFirstQuestion = currentQuestion === 0;

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResults) return;
    
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
    
    // Show explanation immediately after selecting an answer
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setShowResults(true);
    } else {
      setCurrentQuestion(prev => prev + 1);
      setShowExplanation(false);
    }
  };

  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentQuestion(prev => prev - 1);
      setShowExplanation(false);
    }
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  const handleReset = () => {
    setCurrentQuestion(0);
    setSelectedAnswers(new Array(questions.length).fill(-1));
    setShowResults(false);
    setShowExplanation(false);
  };

  const getScore = () => {
    return questions.reduce((score, q, index) => {
      return score + (selectedAnswers[index] === q.correctAnswer ? 1 : 0);
    }, 0);
  };

  const getAnswerIcon = (optionIndex: number) => {
    if (!showResults && !showExplanation) {
      return selectedAnswers[currentQuestion] === optionIndex ? (
        <CheckCircle className="h-4 w-4 text-blue-600" />
      ) : (
        <Circle className="h-4 w-4 text-gray-400" />
      );
    }

    if (optionIndex === currentQ.correctAnswer) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (optionIndex === selectedAnswers[currentQuestion] && optionIndex !== currentQ.correctAnswer) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    } else {
      return <Circle className="h-4 w-4 text-gray-300" />;
    }
  };

  const getAnswerStyle = (optionIndex: number) => {
    if (!showResults && !showExplanation) {
      return selectedAnswers[currentQuestion] === optionIndex
        ? "bg-blue-50 border-blue-300 text-blue-900"
        : "hover:bg-gray-50 border-gray-200";
    }

    // Show correct/incorrect styling when explanation is shown or results are displayed
    if (optionIndex === currentQ.correctAnswer) {
      return "bg-green-50 border-green-300 text-green-900";
    } else if (optionIndex === selectedAnswers[currentQuestion] && optionIndex !== currentQ.correctAnswer) {
      return "bg-red-50 border-red-300 text-red-900";
    } else {
      return "border-gray-200 text-gray-500";
    }
  };

  if (showResults) {
    const score = getScore();
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 my-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{title} Complete!</h3>
          <div className="text-3xl font-bold text-blue-600 mb-2">{score}/{questions.length}</div>
          <div className="text-lg text-gray-600">{percentage}%</div>
        </div>
        
        <div className="space-y-4 mb-6">
          {questions.map((q, index) => (
            <div key={q.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                {selectedAnswers[index] === q.correctAnswer ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-2">{q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={`p-2 rounded border text-sm ${getAnswerStyle(optionIndex)}`}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <Button onClick={handleReset} variant="outline">
            Retake Quiz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 my-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <Badge variant="outline" className="text-xs">
          Question {currentQuestion + 1} of {questions.length}
        </Badge>
      </div>

      <div className="mb-6">
        <p className="text-gray-900 font-medium mb-4">{currentQ.question}</p>
        <div className="space-y-2">
          {currentQ.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              className={`w-full p-3 rounded border text-left transition-colors ${getAnswerStyle(index)}`}
            >
              <div className="flex items-center space-x-3">
                {getAnswerIcon(index)}
                <span>{option}</span>
              </div>
            </button>
          ))}
        </div>
        
        {/* Show explanation after answer is selected */}
        {showExplanation && selectedAnswers[currentQuestion] !== -1 && currentQ.explanation && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-start space-x-2">
              {selectedAnswers[currentQuestion] === currentQ.correctAnswer ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium text-gray-900 mb-1">
                  {selectedAnswers[currentQuestion] === currentQ.correctAnswer ? 'Correct!' : 'Incorrect'}
                </p>
                <p className="text-sm text-gray-700">{currentQ.explanation}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button
          onClick={handlePrevious}
          disabled={isFirstQuestion}
          variant="outline"
        >
          Previous
        </Button>
        
        <div className="flex space-x-2">
          {isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={selectedAnswers[currentQuestion] === -1}
            >
              Submit Quiz
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
  );
}
