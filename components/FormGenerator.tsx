import React, { useState, useCallback } from 'react';
import { generateFormQuestions, refineFormQuestions } from '../services/geminiService';
import { createGoogleAppsScript } from '../utils/scriptGenerator';
import { createAndRunAppsScript, createAppsScriptProject, getFormByUrl, updateAppsScript } from '../services/googleApiService';
import { ArrowRight, Redo, Wand2, Mail, Settings, PlusCircle, Trash2, Sparkles, UploadCloud, FileJson, CheckCircle, ExternalLink, AlertTriangle, LogIn, Link, BookOpen, Edit } from 'lucide-react';
import type { Question, FormMetadata, View } from '../types';
import { FormStep, QuestionType } from '../types';
import Loader from './Loader';
import CodeBlock from './CodeBlock';
import QuestionPreview from './QuestionPreview';
import { saveFormMetadata } from '../services/storageService';

const PREDEFINED_EMAILS = [
  'project-manager@example.com',
  'sales-team@example.com',
  'support-desk@example.com',
];

const EXPORT_SCRIPT = `/**
 * This script exports the structure of the active Google Form to JSON.
 * It now supports standard questions, flattens Grid questions, and provides detailed logs for unsupported item types.
 * To use it:
 * 1. Make sure your Google Form has a title and at least one question. Save your form.
 * 2. Open the form, then go to Extensions > Apps Script.
 * 3. Paste this entire script into the editor, replacing any existing code.
 * 4. Click "Run" (the play icon). You may need to authorize the script the first time.
 * 5. Check the execution log (View > Logs or Ctrl+Enter) to find detailed information and the JSON output.
 * 6. Copy the entire JSON object (from '{' to '}') and paste it into Formulate AI.
 */
function exportFormToJson() {
  try {
    var form = FormApp.getActiveForm();

    if (!form || !form.getId()) {
      Logger.log('ERROR: Script must be run from a saved Google Form. Please save your form and try again.');
      return;
    }
    
    var formTitle = form.getTitle();
    var items = form.getItems();

    if (!formTitle && items.length === 0) {
      Logger.log('ERROR: Your form is empty. Please add a title and at least one question before exporting.');
      return;
    }

    var questions = [];
    var skippedItems = [];

    items.forEach(function(item) {
      var itemType = item.getType();
      var question;

      switch (itemType) {
        case FormApp.ItemType.TEXT:
          var textItem = item.asTextItem();
          question = {
            questionText: textItem.getTitle(),
            type: 'TEXT',
            isRequired: textItem.isRequired(),
            options: []
          };
          questions.push(question);
          break;

        case FormApp.ItemType.PARAGRAPH_TEXT:
          var paraItem = item.asParagraphTextItem();
          question = {
            questionText: paraItem.getTitle(),
            type: 'PARAGRAPH_TEXT',
            isRequired: paraItem.isRequired(),
            options: []
          };
          questions.push(question);
          break;

        case FormApp.ItemType.MULTIPLE_CHOICE:
          var mcItem = item.asMultipleChoiceItem();
          question = {
            questionText: mcItem.getTitle(),
            type: 'MULTIPLE_CHOICE',
            isRequired: mcItem.isRequired(),
            options: mcItem.getChoices().map(function(c) { return c.getValue(); })
          };
          questions.push(question);
          break;
        
        case FormApp.ItemType.LIST: // Treat Dropdown as Multiple Choice
          var listItem = item.asListItem();
          question = {
            questionText: listItem.getTitle(),
            type: 'MULTIPLE_CHOICE',
            isRequired: listItem.isRequired(),
            options: listItem.getChoices().map(function(c) { return c.getValue(); })
          };
          questions.push(question);
          break;

        case FormApp.ItemType.CHECKBOX:
          var cbItem = item.asCheckboxItem();
          question = {
            questionText: cbItem.getTitle(),
            type: 'CHECKBOX',
            isRequired: cbItem.isRequired(),
            options: cbItem.getChoices().map(function(c) { return c.getValue(); })
          };
          questions.push(question);
          break;

        case FormApp.ItemType.SCALE:
          var scaleItem = item.asScaleItem();
          question = {
            questionText: scaleItem.getTitle(),
            type: 'SCALE',
            isRequired: scaleItem.isRequired(),
            options: [String(scaleItem.getUpperBound())]
          };
          questions.push(question);
          break;

        case FormApp.ItemType.DATE:
          var dateItem = item.asDateItem();
          question = {
            questionText: dateItem.getTitle(),
            type: 'DATE',
            isRequired: dateItem.isRequired(),
            options: []
          };
          questions.push(question);
          break;

        case FormApp.ItemType.TIME:
          var timeItem = item.asTimeItem();
          question = {
            questionText: timeItem.getTitle(),
            type: 'TIME',
            isRequired: timeItem.isRequired(),
            options: []
          };
          questions.push(question);
          break;

        case FormApp.ItemType.GRID:
        case FormApp.ItemType.CHECKBOX_GRID:
          var gridItem = (itemType === FormApp.ItemType.GRID) ? item.asGridItem() : item.asCheckboxGridItem();
          var gridTitle = gridItem.getTitle();
          var rows = gridItem.getRows();
          var columns = gridItem.getColumns();
          
          rows.forEach(function(row) {
            questions.push({
              questionText: gridTitle ? gridTitle + ' - ' + row : row,
              type: (itemType === FormApp.ItemType.GRID) ? 'MULTIPLE_CHOICE' : 'CHECKBOX',
              isRequired: gridItem.isRequired(),
              options: columns
            });
          });
          break;

        default:
          // Handles non-question items like PAGE_BREAK, IMAGE, VIDEO, SECTION_HEADER
          skippedItems.push({ title: item.getTitle() || '[Untitled Item]', type: item.getType().toString() });
          break;
      }
    });
    
    // After the loop, log details about any skipped items for user feedback
    if (skippedItems.length > 0) {
      Logger.log('--- SKIPPED ITEMS ---');
      Logger.log('INFO: Some items were not imported because their type is not a question (e.g., Page Break, Image).');
      skippedItems.forEach(function(skipped) {
        Logger.log('- Title: "' + skipped.title + '", Type: ' + skipped.type);
      });
       Logger.log('---------------------');
    }
    
    if (items.length > 0 && questions.length === 0) {
      Logger.log('WARNING: Your form contains items, but none were of a supported question type that could be imported. The export will be empty.');
    }

    var exportData = {
      title: formTitle || 'Untitled Form',
      questions: questions
    };
    
    Logger.log('--- FORMULATE AI EXPORT DATA ---');
    Logger.log('Copy the JSON object below and paste it into the application.');
    Logger.log(JSON.stringify(exportData, null, 2));
    Logger.log('--- END OF EXPORT DATA ---');
    
  } catch (e) {
    Logger.log('An unexpected error occurred: ' + e.toString());
  }
}`;


interface FormGeneratorProps {
  setActiveView: (view: View) => void;
  setSelectedFormId: (id: string) => void;
}

const FormGenerator: React.FC<FormGeneratorProps> = ({ setActiveView, setSelectedFormId }) => {
  const [topic, setTopic] = useState<string>('Customer Satisfaction Survey');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<FormStep>(FormStep.INPUT);
  
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [customEmail, setCustomEmail] = useState<string>('');
  const [refinementPrompt, setRefinementPrompt] = useState<string>('');
  const [driveFolderId, setDriveFolderId] = useState<string>('');
  
  const [activeInputTab, setActiveInputTab] = useState<'ai' | 'import'>('ai');
  const [importJson, setImportJson] = useState<string>('');
  const [importUrl, setImportUrl] = useState<string>('');
  const [showLegacyImport, setShowLegacyImport] = useState<boolean>(false);
  const [creationMode, setCreationMode] = useState<'create' | 'update'>('create');
  
  const [createdFormUrls, setCreatedFormUrls] = useState<{ publishedUrl: string, editUrl: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');


  const handleGenerateQuestions = useCallback(async () => {
    if (!topic.trim()) {
      setError('Please enter a topic for your form.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const generatedQuestions = await generateFormQuestions(topic);
      setQuestions(generatedQuestions);
      setStep(FormStep.PREVIEW);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [topic]);

  const handleImportFromUrl = useCallback(async () => {
    if (!importUrl.trim()) {
      setError('Please enter a Google Form URL.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
        const { title, questions } = await getFormByUrl(importUrl);
        setTopic(title);
        setQuestions(questions);
        setStep(FormStep.PREVIEW);
        setCreationMode('update'); 
    } catch (e: any) {
        console.error("URL Import failed:", e);
        let errorMessage;
        if (e?.error === 'invalid_client') {
             errorMessage = `Google Auth Error (invalid_client):\nYour app's configuration is incorrect. Please check the following:\n\n1. The GOOGLE_CLIENT_ID in your Vercel settings is correct.\n\n2. The URL of this app (${window.location.origin}) is added to BOTH 'Authorized JavaScript origins' AND 'Authorized redirect URIs' in your Google Cloud Console.`;
        } else {
            errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during import.';
        }
       setError(`Failed to import from URL. ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  }, [importUrl]);
  
  const handleRefineQuestions = async () => {
    if (!refinementPrompt.trim()) {
      setError('Please enter a refinement instruction.');
      return;
    }
    setIsRefining(true);
    setError(null);
    try {
      const refined = await refineFormQuestions(questions, refinementPrompt);
      setQuestions(refined);
      setRefinementPrompt(''); // Clear prompt after use
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred during refinement.');
       console.error(e);
    } finally {
      setIsRefining(false);
    }
  };

  const handleImportFromJson = () => {
    if (!importJson.trim()) {
      setError('Please paste the JSON exported from your form.');
      return;
    }
    try {
      const parsed = JSON.parse(importJson);
      if (parsed.title && Array.isArray(parsed.questions)) {
        setTopic(parsed.title);
        setQuestions(parsed.questions);
        setError(null);
        setStep(FormStep.PREVIEW);
      } else {
        throw new Error("Invalid JSON structure. Make sure it has 'title' and 'questions' properties.");
      }
    } catch (e) {
      setError('Failed to parse JSON. Please check the format and copy it again.');
      console.error(e);
    }
  };

  const handleAddCustomEmail = () => {
    const trimmedEmail = customEmail.trim();
    if (trimmedEmail && !selectedEmails.includes(trimmedEmail)) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setSelectedEmails(prev => [...prev, trimmedEmail]);
        setCustomEmail('');
        setError(null);
      } else {
        setError('Please enter a valid email address.');
      }
    } else if (selectedEmails.includes(trimmedEmail)) {
      setError('This email address has already been added.');
    }
  };
  
  const handleRemoveEmail = (emailToRemove: string) => {
    setSelectedEmails(prev => prev.filter(email => email !== emailToRemove));
  };


  const handleCreateForm = async () => {
    setIsCreating(true);
    setError(null);
    try {
        if (creationMode === 'update' && !importUrl) {
            throw new Error("Cannot update a form without its original URL. Please go back and import a form first.");
        }

        let resultUrls: { publishedUrl: string; editUrl: string };
        let newFormId: string;

        if (creationMode === 'create') {
            const script = createGoogleAppsScript(questions, topic, selectedEmails, { mode: 'create', driveFolderId: driveFolderId });
            
            // Try to run the script automatically
            try {
                const result = await createAndRunAppsScript(script, topic);
                resultUrls = { editUrl: result.editUrl, publishedUrl: result.publishedUrl };
                setSuccessMessage('Your new Google Form is ready and saved in your Google Drive.');
            } catch (runError: any) {
                // If automatic execution fails (404 error), create the script and provide manual instructions
                console.log('Automatic execution failed, switching to manual mode:', runError);
                const scriptProject = await createAppsScriptProject(script, topic);
                
                // Store the script URL for the user to access
                resultUrls = {
                    editUrl: scriptProject.scriptUrl,
                    publishedUrl: scriptProject.scriptUrl
                };
                
                // Show manual execution instructions
                setSuccessMessage(`Script created! Please follow these steps to create your form:

1. Click the link below to open Google Apps Script editor
2. Click the "Run" button at the top
3. Select "createMyForm" function
4. Grant permissions when prompted
5. Check the Execution Log (View > Logs) for your form URLs

Script URL: ${scriptProject.scriptUrl}`);
            }
            newFormId = Date.now().toString();
        } else { // Update mode
            // Extract Form ID - handle both /d/e/ and /d/ patterns correctly
            let formIdMatch = /\/forms\/d\/e\/([a-zA-Z0-9-_]+)/.exec(importUrl);
            if (!formIdMatch) {
                formIdMatch = /\/forms\/d\/([a-zA-Z0-9-_]+)/.exec(importUrl);
            }
            if (!formIdMatch?.[1]) throw new Error("Could not extract Form ID from URL.");
            const formId = formIdMatch[1];
            
            const script = createGoogleAppsScript(questions, topic, selectedEmails, { mode: 'update', formId: formId });
            
            // Try to run the update script automatically
            try {
                resultUrls = await updateAppsScript(formId, script);
                setSuccessMessage('Your existing Google Form has been successfully updated with the new script.');
            } catch (runError: any) {
                // If automatic execution fails (404 error), create the script and provide manual instructions
                console.log('Automatic update failed, switching to manual mode:', runError);
                const scriptProject = await createAppsScriptProject(script, topic);
                
                // Store the script URL for the user to access
                resultUrls = {
                    editUrl: scriptProject.scriptUrl,
                    publishedUrl: scriptProject.scriptUrl
                };
                
                // Show manual execution instructions
                setSuccessMessage(`Script created! Please follow these steps to update your form:

1. Click the link below to open Google Apps Script editor
2. Click the "Run" button at the top
3. Select "updateMyForm" function
4. Grant permissions when prompted
5. Check the Execution Log (View > Logs) for confirmation

Script URL: ${scriptProject.scriptUrl}`);
            }
            newFormId = formId; 
        }

        const newFormMetadata: FormMetadata = {
            id: newFormId,
            title: topic,
            questionCount: questions.length,
            createdAt: new Date().toISOString(),
            responseData: '',
            analysisResult: '',
            editUrl: resultUrls.editUrl,
            publishedUrl: resultUrls.publishedUrl,
        };
        saveFormMetadata(newFormMetadata);
        setCreatedFormUrls(resultUrls);
        setSelectedFormId(newFormMetadata.id);
        setStep(FormStep.SUCCESS);

    } catch (e: any) {
        console.error("Form operation failed:", e);
        let errorMessage;
        if (e?.error === 'invalid_client') {
            errorMessage = `Google Auth Error (invalid_client):\nYour app's configuration is incorrect. Please check the following:\n\n1. The GOOGLE_CLIENT_ID in your Vercel settings is correct.\n\n2. The URL of this app (${window.location.origin}) is added to BOTH 'Authorized JavaScript origins' AND 'Authorized redirect URIs' in your Google Cloud Console.`;
        } else if (e instanceof Error) {
            errorMessage = e.message;
        } else if (typeof e?.error === 'string') {
           errorMessage = `Google API Error: ${e.error}. Please ensure pop-ups are not blocked and try again.`;
        } else {
           errorMessage = 'An unexpected error occurred.';
        }
        setError(`Failed to process form. ${errorMessage}`);
    } finally {
        setIsCreating(false);
    }
};
  
  const handleQuestionUpdate = (index: number, updatedQuestion: Question) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };
  
  const handleAddQuestion = () => {
    const newQuestion: Question = {
      questionText: 'New Question',
      type: QuestionType.TEXT,
      isRequired: false,
      options: [],
    };
    setQuestions([...questions, newQuestion]);
  };


  const resetAndGoToCreate = () => {
    setStep(FormStep.INPUT);
    setQuestions([]);
    setError(null);
    setSelectedEmails([]);
    setCustomEmail('');
    setTopic('Customer Satisfaction Survey');
    setCreatedFormUrls(null);
    setImportUrl('');
    setCreationMode('create');
  };
  
  const resetAndGoToDashboard = () => {
    resetAndGoToCreate();
    setActiveView('dashboard');
  };

  const renderAiTab = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Form Topic or Hint
        </label>
        <div className="relative">
          <Wand2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., 'New Product Feedback', 'Event Registration'"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
      </div>
      <button
        onClick={() => { setCreationMode('create'); handleGenerateQuestions(); }}
        disabled={isLoading}
        className="w-full flex items-center justify-center bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-transform transform hover:scale-105 duration-300 shadow-md"
      >
        {isLoading ? <Loader /> : <><span>Generate Questions</span><ArrowRight className="ml-2 w-5 h-5" /></>}
      </button>
      {error && <p className="text-red-500 text-center mt-4 whitespace-pre-wrap">{error}</p>}
    </div>
  );

  const renderImportTab = () => (
    <div className="space-y-6">
        <div>
            <label htmlFor="importUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Google Form URL
            </label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="url"
                id="importUrl"
                value={importUrl}
                onChange={(e) => { setImportUrl(e.target.value); setError(null); }}
                placeholder="https://docs.google.com/forms/d/e/.../viewform"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">You may need to sign in and grant permission to read the form.</p>
        </div>
         <button
            onClick={handleImportFromUrl}
            disabled={isLoading}
            className="w-full flex items-center justify-center bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-transform transform hover:scale-105 duration-300 shadow-md"
        >
            {isLoading ? <Loader /> : <><UploadCloud className="mr-2 w-5 h-5" /> Import Form</>}
        </button>
         
         <div className="text-center">
            <button onClick={() => setShowLegacyImport(!showLegacyImport)} className="text-xs text-gray-500 hover:underline">
                {showLegacyImport ? "Hide" : "Use old method (Apps Script)"}
            </button>
         </div>

        {showLegacyImport && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700 animate-fade-in">
                <h3 className="text-lg font-semibold mb-2">Import with Apps Script (Legacy)</h3>
                 <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                    <ol>
                        <li>Open your form and go to <strong>Extensions &gt; Apps Script</strong>.</li>
                        <li>Copy the script below and paste it into the editor.</li>
                        <li>Click <strong>Run</strong> and copy the JSON output from the execution log.</li>
                    </ol>
                </div>
                <CodeBlock script={EXPORT_SCRIPT} />
                <textarea
                    id="importJson"
                    value={importJson}
                    onChange={(e) => { setImportJson(e.target.value); setError(null); }}
                    placeholder='Paste the JSON from the script log here...'
                    className="w-full h-24 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={handleImportFromJson}
                    className="w-full flex items-center justify-center bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700"
                >
                    <FileJson className="mr-2 w-5 h-5" /> Import from JSON
                </button>
            </div>
        )}
         {error && <p className="text-red-500 text-center mt-4 whitespace-pre-wrap">{error}</p>}
    </div>
  );

  const renderInputStep = () => (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg animate-fade-in">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-2">Create Your Google Form</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">Generate questions with AI or import an existing form to get started.</p>
      
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button 
            onClick={() => setActiveInputTab('ai')}
            className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeInputTab === 'ai' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
            <Wand2 className="w-5 h-5 mr-2" /> Generate with AI
        </button>
        <button 
            onClick={() => setActiveInputTab('import')}
            className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeInputTab === 'import' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
            <UploadCloud className="w-5 h-5 mr-2" /> Import from Google Form
        </button>
      </div>

      {activeInputTab === 'ai' ? renderAiTab() : renderImportTab()}
    </div>
  );

  const renderEditStep = () => (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold mb-2">Edit & Refine Questions</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Here is the draft for your form. You can edit, add, or delete questions manually, or use AI to refine them all at once.</p>
      
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 mb-6">
        <label htmlFor="refinement" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Refine with AI</label>
        <div className="flex items-center space-x-2">
           <textarea
              id="refinement"
              value={refinementPrompt}
              onChange={(e) => setRefinementPrompt(e.target.value)}
              placeholder="e.g., 'Make all questions more professional', 'Add a question about pricing', 'Translate all questions to Korean'"
              rows={3}
              className="flex-grow w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            <button
              onClick={handleRefineQuestions}
              disabled={isRefining}
              className="flex items-center bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
            >
              {isRefining ? <Loader /> : <Sparkles className="w-5 h-5" />}
              <span className="ml-2 hidden sm:inline">Refine</span>
            </button>
        </div>
      </div>
      {error && <p className="text-red-500 text-center mb-4 whitespace-pre-wrap">{error}</p>}

      <div className="space-y-4">
        {questions.map((q, index) => (
          <QuestionPreview 
            key={index} 
            question={q} 
            index={index} 
            onUpdate={handleQuestionUpdate}
            onDelete={handleDeleteQuestion}
          />
        ))}
      </div>
      <div className="mt-6">
        <button 
            onClick={handleAddQuestion}
            className="flex items-center justify-center w-full text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900 py-2 px-4 rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-700 transition"
        >
            <PlusCircle className="mr-2 w-4 h-4" />
            Add Question
        </button>
      </div>
      <div className="flex justify-between items-center mt-8">
        <button
          onClick={() => setStep(FormStep.INPUT)}
          className="flex items-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          <Redo className="mr-2 w-4 h-4" />
          Back to Start
        </button>
        <button
          onClick={() => setStep(FormStep.SETTINGS)}
          className="flex items-center bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105"
        >
          Next: Configure Form
          <ArrowRight className="ml-2 w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderSettingsStep = () => (
     <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg animate-fade-in max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-2 flex items-center">
            <Settings className="w-7 h-7 mr-3 text-blue-500" />
            Form Settings & Creation
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Finalize notifications and create your form in Google Drive.</p>
        
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">NOTIFICATION RECIPIENTS (OPTIONAL)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 -mt-3 mb-3">Add email addresses that should be notified when a new response is submitted.</p>
            
            <div className="space-y-2">
              {selectedEmails.map(email => (
                <div key={email} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 animate-fade-in">
                  <div className="flex items-center min-w-0">
                    <Mail className="w-5 h-5 mr-3 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={email}>{email}</span>
                  </div>
                  <button onClick={() => handleRemoveEmail(email)} className="text-gray-400 hover:text-red-500 ml-2">
                      <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {selectedEmails.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No notification recipients added yet.</p>
              )}
            </div>
        </div>
        
        <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">ADD EMAIL</h3>
            <div className="flex items-center space-x-2">
                <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => {
                      setCustomEmail(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomEmail(); }}
                    placeholder="e.g., another-email@example.com"
                    className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                <button onClick={handleAddCustomEmail} className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900 transition">
                    <PlusCircle className="w-6 h-6" />
                </button>
            </div>
             {error && <p className="text-red-500 text-sm mt-2 whitespace-pre-wrap">{error}</p>}
        </div>
        
         <div className="mt-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">SUGGESTIONS</h3>
            <div className="flex flex-wrap gap-2">
                {PREDEFINED_EMAILS.map(email => (
                    <button 
                        key={email}
                        onClick={() => {
                            if (!selectedEmails.includes(email)) {
                                setSelectedEmails(prev => [...prev, email]);
                            }
                        }}
                        disabled={selectedEmails.includes(email)}
                        className="text-xs font-medium px-3 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:bg-gray-200 disabled:text-gray-500 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900 dark:disabled:bg-gray-700 dark:disabled:text-gray-400 transition"
                    >
                        {email}
                    </button>
                ))}
            </div>
        </div>


        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">ACTION</h3>
             <div className="flex rounded-lg bg-gray-100 dark:bg-gray-900 p-1">
                <button onClick={() => setCreationMode('create')} className={`flex-1 p-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center ${creationMode === 'create' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow' : 'text-gray-600 dark:text-gray-300'}`}>
                    <PlusCircle className="w-4 h-4 mr-2" /> Create New Form
                </button>
                <button onClick={() => setCreationMode('update')} disabled={!importUrl} className={`flex-1 p-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center ${creationMode === 'update' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow' : 'text-gray-600 dark:text-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                    <Edit className="w-4 h-4 mr-2" /> Update Existing Form
                </button>
            </div>
            {creationMode === 'update' && !importUrl && <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">To update a form, you must first import it using its URL.</p>}
        </div>

        {creationMode === 'create' && (
            <div className="mt-4 animate-fade-in">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">SAVE LOCATION (OPTIONAL)</h3>
                <label htmlFor="folderId" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Google Drive Folder ID</label>
                <input
                    type="text"
                    id="folderId"
                    value={driveFolderId}
                    onChange={(e) => setDriveFolderId(e.target.value)}
                    placeholder="e.g., 1a2b3c4d_5e6f7g8h9i0j"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                <p className="text-xs text-gray-500 mt-1">If provided, the form will be created inside this folder. Find the ID in the folder's URL.</p>
            </div>
        )}

        <div className="flex justify-between items-center mt-8">
            <button onClick={() => setStep(FormStep.PREVIEW)} className="font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition">
                Back
            </button>
            <button
                onClick={handleCreateForm}
                disabled={isCreating}
                className="flex items-center bg-green-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-transform transform hover:scale-105"
            >
                {isCreating ? <Loader /> : <LogIn className="mr-2 w-5 h-5" />}
                {isCreating ? (creationMode === 'create' ? 'Creating...' : 'Updating...') : (creationMode === 'create' ? 'Create Form' : 'Update Form')}
            </button>
      </div>
      {error && (
        <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 rounded-lg text-sm whitespace-pre-wrap">
            {error}
        </div>
      )}
    </div>
  );

  const renderSuccessStep = () => (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg animate-fade-in max-w-2xl mx-auto text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-2">Success!</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{successMessage}</p>
        <div className="space-y-3">
             <a 
                href={createdFormUrls?.publishedUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 duration-300 shadow-md"
            >
                View Live Form <ExternalLink className="ml-2 w-4 h-4" />
            </a>
            <a 
                href={createdFormUrls?.editUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
                Edit Form in Google Drive <ExternalLink className="ml-2 w-4 h-4" />
            </a>
        </div>
        <div className="mt-8 flex justify-center space-x-4">
            <button
                onClick={resetAndGoToCreate}
                className="flex items-center bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
                <Redo className="mr-2 w-4 h-4" />
                Create Another Form
            </button>
             <button
                onClick={resetAndGoToDashboard}
                className="flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold py-2 px-4 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition"
            >
                Go to Dashboard
                <ArrowRight className="ml-2 w-4 h-4" />
            </button>
        </div>
    </div>
  );


  switch (step) {
    case FormStep.INPUT:
      return renderInputStep();
    case FormStep.PREVIEW:
      return renderEditStep();
    case FormStep.SETTINGS:
      return renderSettingsStep();
    case FormStep.SUCCESS:
        return renderSuccessStep();
    default:
      return renderInputStep();
  }
};

export default FormGenerator;