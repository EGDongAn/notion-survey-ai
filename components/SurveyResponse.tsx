import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Send, Loader, LogIn } from 'lucide-react';
import type { Question } from '../types';
import { QuestionType } from '../types';
import { submitNotionResponse, getNotionDatabaseSchema } from '../services/notionService';
import GoogleAuth from './GoogleAuth';

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
  const [currentStep, setCurrentStep] = useState(0); // 0 = respondent info, 1+ = questions
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Sanitize property names (same as in notionService)
  const sanitizePropertyName = (name: string): string => {
    return name.replace(/,/g, ';');
  };

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
    const key = `Q${questionIndex + 1}: ${sanitizePropertyName(question.questionText)}`;
    setResponses(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const validateRespondentInfo = (): boolean => {
    const errors = [];
    if (!responses.respondentName || responses.respondentName.trim() === '') {
      errors.push('이름을 입력해주세요.');
    }
    if (!responses.respondentEmail || responses.respondentEmail.trim() === '') {
      errors.push('이메일 주소를 입력해주세요.');
    } else if (!validateEmail(responses.respondentEmail)) {
      errors.push('올바른 이메일 형식이 아닙니다.');
    }
    if (!responses.respondentPhone || responses.respondentPhone.trim() === '') {
      errors.push('전화번호를 입력해주세요.');
    } else if (!validatePhone(responses.respondentPhone)) {
      errors.push('올바른 휴대폰 번호를 입력해주세요. (01X-XXXX-XXXX)');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Remove all non-digits and check if it's a valid Korean mobile number
    const normalized = phone.replace(/\D/g, '');
    return /^01[0-9]\d{7,8}$/.test(normalized);
  };

  const formatPhone = (phone: string): string => {
    const normalized = phone.replace(/\D/g, '');
    if (normalized.length === 10) {
      return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
    } else if (normalized.length === 11) {
      return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`;
    }
    return phone;
  };

  const handleNextStep = () => {
    if (currentStep === 0) {
      // Validate respondent info
      if (validateRespondentInfo()) {
        setCurrentStep(1);
        setValidationErrors([]);
      }
    } else {
      // Validate current question if required
      const questionIndex = currentStep - 1;
      if (questionIndex < questions.length) {
        const question = questions[questionIndex];
        if (question.isRequired) {
          const key = `Q${questionIndex + 1}: ${sanitizePropertyName(question.questionText)}`;
          const value = responses[key];
          if (!value || (Array.isArray(value) && value.length === 0)) {
            setValidationErrors(['이 질문은 필수입니다.']);
            return;
          }
        }
        setValidationErrors([]);
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setValidationErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields one more time
    if (!validateRespondentInfo()) {
      setCurrentStep(0);
      return;
    }

    const missingRequired = questions.filter((q, i) => {
      if (!q.isRequired) return false;
      const key = `Q${i + 1}: ${sanitizePropertyName(q.questionText)}`;
      return !responses[key] || (Array.isArray(responses[key]) && responses[key].length === 0);
    });

    if (missingRequired.length > 0) {
      setErrorMessage('모든 필수 질문에 답변해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      
      // Prepare final responses object with only the survey answers
      const finalResponses: Record<string, any> = {};
      
      // Add respondent information with proper field names
      finalResponses['Name'] = responses.respondentName;
      finalResponses['Email'] = responses.respondentEmail;
      finalResponses['Phone'] = formatPhone(responses.respondentPhone);
      
      // Add all question responses (already in correct format Q1:, Q2:, etc.)
      Object.keys(responses).forEach(key => {
        if (key.startsWith('Q') && key.includes(':')) {
          finalResponses[key] = responses[key];
        }
      });

      console.log('Final responses to submit:', finalResponses);
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
    const key = `Q${index + 1}: ${sanitizePropertyName(question.questionText)}`;
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
            감사합니다!
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            설문 응답이 성공적으로 제출되었습니다.
          </p>
          <button
            onClick={() => {
              setSubmitStatus('idle');
              setResponses({});
              setCurrentStep(0);
            }}
            className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            다른 응답 제출하기
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
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>진행률</span>
              <span>{Math.round(((currentStep) / (questions.length + 1)) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep) / (questions.length + 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              {validationErrors.map((error, idx) => (
                <div key={idx} className="text-red-700 dark:text-red-300 text-sm">
                  • {error}
                </div>
              ))}
            </div>
          )}

          {/* Step 0: Respondent Information */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                응답자 정보 (필수)
              </h2>
              
              {/* Google Login Option */}
              <div className="mb-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">간편 로그인</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <GoogleAuth
                    onSuccess={(userData) => {
                      setResponses(prev => ({
                        ...prev,
                        respondentName: userData.name,
                        respondentEmail: userData.email,
                        // Phone number will still need to be entered manually
                      }));
                    }}
                    onError={() => {
                      setValidationErrors(['Google 로그인에 실패했습니다. 수동으로 입력해주세요.']);
                    }}
                  />
                </div>
                
                <div className="relative mt-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">또는 직접 입력</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={responses.respondentName || ''}
                  onChange={(e) => setResponses(prev => ({ ...prev, respondentName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="홍길동"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={responses.respondentEmail || ''}
                  onChange={(e) => setResponses(prev => ({ ...prev, respondentEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="example@email.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  전화번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={responses.respondentPhone || ''}
                  onChange={(e) => setResponses(prev => ({ ...prev, respondentPhone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="010-1234-5678"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  하이픈(-) 없이 입력해도 됩니다 (예: 01012345678)
                </p>
              </div>
            </div>
          )}

          {/* Survey Questions - Show one at a time */}
          {currentStep > 0 && currentStep <= questions.length && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                질문 {currentStep} / {questions.length}
              </h2>
              {(() => {
                const questionIndex = currentStep - 1;
                const question = questions[questionIndex];
                return (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {question.questionText}
                      {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderQuestionInput(question, questionIndex)}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Review Section - Show all responses before submit */}
          {currentStep > questions.length && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                응답 확인
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">이름: <span className="text-gray-900 dark:text-white font-medium">{responses.respondentName}</span></p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">이메일: <span className="text-gray-900 dark:text-white font-medium">{responses.respondentEmail}</span></p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">전화번호: <span className="text-gray-900 dark:text-white font-medium">{responses.respondentPhone}</span></p>
                </div>
                {questions.map((question, index) => {
                  const key = `Q${index + 1}: ${sanitizePropertyName(question.questionText)}`;
                  const value = responses[key];
                  return (
                    <div key={index} className="text-sm">
                      <p className="text-gray-600 dark:text-gray-400">
                        {index + 1}. {question.questionText}
                      </p>
                      <p className="text-gray-900 dark:text-white font-medium mt-1">
                        {Array.isArray(value) ? value.join(', ') : value || '(응답 없음)'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="pt-6 flex justify-between">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePreviousStep}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                이전
              </button>
            )}
            
            <div className="ml-auto">
              {currentStep <= questions.length ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-2 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors"
                >
                  {currentStep === 0 ? '시작하기' : '다음'}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      제출 중...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      제출하기
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SurveyResponse;