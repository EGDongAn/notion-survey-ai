import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Send, Loader } from 'lucide-react';
import type { Question } from '../types';
import { QuestionType } from '../types';
import { submitNotionResponse, getNotionDatabaseSchema } from '../services/notionService';

interface SurveyResponseProps {
  databaseId: string;
  title?: string;
}

const SurveyResponse: React.FC<SurveyResponseProps> = ({ databaseId, title }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadSurveyQuestions();
  }, [databaseId]);

  const loadSurveyQuestions = async () => {
    try {
      setIsLoading(true);
      const schema = await getNotionDatabaseSchema(databaseId);
      setQuestions(schema);
    } catch (error) {
      console.error('Error loading survey:', error);
      setErrorMessage('Failed to load survey questions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (questionIndex: number, value: any) => {
    const question = questions[questionIndex];
    const key = `Q${questionIndex + 1}: ${question.questionText}`;
    setResponses(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const missingRequired = questions.filter((q, i) => {
      if (!q.isRequired) return false;
      const key = `Q${i + 1}: ${q.questionText}`;
      return !responses[key] || (Array.isArray(responses[key]) && responses[key].length === 0);
    });

    if (missingRequired.length > 0) {
      setErrorMessage('Please answer all required questions');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      
      // Add email if provided
      const finalResponses = { ...responses };
      if (responses.email) {
        finalResponses['Email'] = responses.email;
      }

      await submitNotionResponse(databaseId, finalResponses);
      setSubmitStatus('success');
      setResponses({});
    } catch (error) {
      console.error('Error submitting response:', error);
      setSubmitStatus('error');
      setErrorMessage('Failed to submit response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestionInput = (question: Question, index: number) => {
    const key = `Q${index + 1}: ${question.questionText}`;
    const value = responses[key] || '';

    switch (question.type) {
      case QuestionType.TEXT:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(index, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            required={question.isRequired}
          />
        );

      case QuestionType.PARAGRAPH_TEXT:
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(index, e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            required={question.isRequired}
          />
        );

      case QuestionType.MULTIPLE_CHOICE:
        return (
          <div className="space-y-2">
            {question.options?.map((option, optionIndex) => (
              <label key={optionIndex} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name={`question-${index}`}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  className="text-blue-500 focus:ring-blue-500"
                  required={question.isRequired}
                />
                <span className="text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        );

      case QuestionType.CHECKBOX:
        return (
          <div className="space-y-2">
            {question.options?.map((option, optionIndex) => (
              <label key={optionIndex} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  value={option}
                  checked={(value || []).includes(option)}
                  onChange={(e) => {
                    const currentValues = value || [];
                    if (e.target.checked) {
                      handleInputChange(index, [...currentValues, option]);
                    } else {
                      handleInputChange(index, currentValues.filter((v: string) => v !== option));
                    }
                  }}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        );

      case QuestionType.SCALE:
        const scaleMin = question.scaleMin || 1;
        const scaleMax = question.scaleMax || 5;
        return (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">{scaleMin}</span>
            <input
              type="range"
              min={scaleMin}
              max={scaleMax}
              value={value || scaleMin}
              onChange={(e) => handleInputChange(index, parseInt(e.target.value))}
              className="flex-1"
              required={question.isRequired}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">{scaleMax}</span>
            <span className="ml-2 font-medium text-blue-600 dark:text-blue-400 min-w-[2rem] text-center">
              {value || scaleMin}
            </span>
          </div>
        );

      case QuestionType.DATE:
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleInputChange(index, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            required={question.isRequired}
          />
        );

      case QuestionType.TIME:
        return (
          <input
            type="time"
            value={value}
            onChange={(e) => handleInputChange(index, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            required={question.isRequired}
          />
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (submitStatus === 'success') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Thank You!
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Your response has been successfully submitted.
          </p>
          <button
            onClick={() => {
              setSubmitStatus('idle');
              setResponses({});
            }}
            className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          {title || 'Survey Form'}
        </h1>
        
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700 dark:text-red-300">{errorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Optional Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email (Optional)
            </label>
            <input
              type="email"
              value={responses.email || ''}
              onChange={(e) => setResponses(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="your.email@example.com"
            />
          </div>

          {/* Survey Questions */}
          {questions.map((question, index) => (
            <div key={index} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {question.questionText}
                {question.isRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderQuestionInput(question, index)}
            </div>
          ))}

          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center px-6 py-3 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Submit Response
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SurveyResponse;