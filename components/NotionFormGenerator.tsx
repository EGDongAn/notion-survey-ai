import React, { useState, useCallback } from 'react';
import { generateFormQuestions, refineFormQuestions } from '../services/geminiService';
import { createNotionSurveyDatabase, createNotionFormPage } from '../services/notionService';
import { ArrowRight, Redo, Wand2, Settings, PlusCircle, Trash2, Sparkles, CheckCircle, ExternalLink, AlertTriangle, Edit } from 'lucide-react';
import type { Question, FormMetadata, View } from '../types';
import { FormStep, QuestionType } from '../types';
import Loader from './Loader';
import QuestionPreview from './QuestionPreview';
import { saveFormMetadata } from '../services/storageService';

interface NotionFormGeneratorProps {
  setActiveView: (view: View) => void;
  setSelectedFormId: (id: string) => void;
}

const NotionFormGenerator: React.FC<NotionFormGeneratorProps> = ({ setActiveView, setSelectedFormId }) => {
  const [formStep, setFormStep] = useState<FormStep>(FormStep.INPUT);
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ databaseId: string; formUrl: string; databaseUrl: string } | null>(null);
  const [draftName, setDraftName] = useState('');
  const [refinementPrompt, setRefinementPrompt] = useState('');

  const generateQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const generatedQuestions = await generateFormQuestions(topic);
      setQuestions(generatedQuestions);
      setFormStep(FormStep.PREVIEW);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [topic]);

  const refineQuestions = useCallback(async () => {
    if (!refinementPrompt.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const refinedQuestions = await refineFormQuestions(questions, refinementPrompt);
      setQuestions(refinedQuestions);
      setRefinementPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [questions, refinementPrompt]);

  const handleQuestionChange = useCallback((index: number, field: keyof Question, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  }, [questions]);

  const addQuestion = useCallback(() => {
    const newQuestion: Question = {
      questionText: 'New Question',
      type: QuestionType.TEXT,
      isRequired: false,
      options: []
    };
    setQuestions([...questions, newQuestion]);
  }, [questions]);

  const removeQuestion = useCallback((index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  }, [questions]);

  const processFormWithNotion = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const formTitle = draftName || `Survey - ${topic}`;
      
      // Create Notion database for the survey
      const { databaseId, url: databaseUrl } = await createNotionSurveyDatabase(formTitle, questions);
      
      // Create a form page in Notion
      const { pageId, url: formUrl } = await createNotionFormPage(formTitle, questions, databaseId);

      // Save form metadata
      const metadata: FormMetadata = {
        id: databaseId,
        title: formTitle,
        questionCount: questions.length,
        createdAt: new Date().toISOString(),
        editUrl: databaseUrl,
        publishedUrl: formUrl
      };
      saveFormMetadata(metadata);

      setSuccess({
        databaseId,
        databaseUrl,
        formUrl
      });
      setFormStep(FormStep.SUCCESS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create form in Notion');
    } finally {
      setIsLoading(false);
    }
  }, [draftName, topic, questions]);

  const resetForm = () => {
    setFormStep(FormStep.INPUT);
    setTopic('');
    setQuestions([]);
    setDraftName('');
    setRefinementPrompt('');
    setError(null);
    setSuccess(null);
  };

  const renderInputStep = () => (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Create a Survey with AI</h2>
        <p className="text-gray-600 dark:text-gray-300">Enter a topic and let AI generate questions for your Notion survey.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-500 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <p className="text-red-700 dark:text-red-300 font-medium">Error</p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Survey Topic
          </label>
          <textarea
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            rows={4}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Customer satisfaction for our new mobile app..."
          />
        </div>

        <button
          onClick={generateQuestions}
          disabled={!topic.trim() || isLoading}
          className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <Loader />
          ) : (
            <>
              <Wand2 className="w-5 h-5 mr-2" />
              Generate Questions with AI
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Review & Edit Questions</h2>
          <p className="text-gray-600 dark:text-gray-300">Customize your survey questions before creating it in Notion.</p>
        </div>

        <div className="space-y-6">
          {questions.map((question, index) => (
            <QuestionPreview
              key={index}
              question={question}
              index={index}
              onChange={handleQuestionChange}
              onRemove={removeQuestion}
            />
          ))}

          <button
            onClick={addQuestion}
            className="flex items-center px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Add Question
          </button>
        </div>

        <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Refine Questions with AI</h3>
          <div className="flex space-x-4">
            <input
              type="text"
              value={refinementPrompt}
              onChange={(e) => setRefinementPrompt(e.target.value)}
              placeholder="e.g., Add a question about pricing preferences"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={refineQuestions}
              disabled={!refinementPrompt.trim() || isLoading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isLoading ? (
                <Loader />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Refine
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <button
            onClick={() => setFormStep(FormStep.INPUT)}
            className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => setFormStep(FormStep.SETTINGS)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            Next: Settings
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderSettingsStep = () => (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Form Settings</h2>
        <p className="text-gray-600 dark:text-gray-300">Configure your survey before creating it in Notion.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Settings className="w-4 h-4 inline mr-2" />
            Survey Name
          </label>
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder={`Survey - ${topic}`}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-500 rounded-lg flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-red-700 dark:text-red-300 font-medium">Error</p>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <button
            onClick={() => setFormStep(FormStep.PREVIEW)}
            className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Back
          </button>
          <button
            onClick={processFormWithNotion}
            disabled={isLoading}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-lg hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
          >
            {isLoading ? (
              <Loader />
            ) : (
              <>
                Create in Notion
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Survey Created Successfully!</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">Your survey has been created in Notion.</p>
        
        {success && (
          <div className="space-y-4 text-left bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Database URL:</p>
              <a
                href={success.databaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-blue-600 dark:text-blue-400 hover:underline break-all"
              >
                <ExternalLink className="w-4 h-4 mr-2 flex-shrink-0" />
                {success.databaseUrl}
              </a>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Form Page URL:</p>
              <a
                href={success.formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-blue-600 dark:text-blue-400 hover:underline break-all"
              >
                <ExternalLink className="w-4 h-4 mr-2 flex-shrink-0" />
                {success.formUrl}
              </a>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Next Steps:</strong> Share the form page with respondents or embed a custom form on your website that submits to the Notion database.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={resetForm}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Create Another Survey
          </button>
          <button
            onClick={() => {
              if (success) {
                setSelectedFormId(success.databaseId);
                setActiveView('dashboard');
              }
            }}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            View Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {formStep === FormStep.INPUT && renderInputStep()}
      {formStep === FormStep.PREVIEW && renderPreviewStep()}
      {formStep === FormStep.SETTINGS && renderSettingsStep()}
      {formStep === FormStep.SUCCESS && renderSuccessStep()}
    </div>
  );
};

export default NotionFormGenerator;