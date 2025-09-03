import React, { useState, useCallback, useEffect } from 'react';
import { analyzeData } from '../services/geminiService';
import { getSheetData, getFormByUrl } from '../services/googleApiService';
import Loader from './Loader';
import { Sparkles, Clipboard, BarChart3, FileQuestion, UploadCloud, Link } from 'lucide-react';
import type { FormMetadata } from '../types';

interface FormAnalysisDetailProps {
  form: FormMetadata;
  onSaveAnalysis: (formId: string, responseData: string, analysisResult: string) => void;
}

const FormAnalysisDetail: React.FC<FormAnalysisDetailProps> = ({ form, onSaveAnalysis }) => {
  const [data, setData] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('Summarize the key findings and provide 3 actionable recommendations.');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [formUrl, setFormUrl] = useState<string>('');
  
  useEffect(() => {
    setData(form.responseData || '');
    setAnalysisResult(form.analysisResult || '');
  }, [form]);

  const handleImportData = useCallback(async () => {
    if (!formUrl.trim() || !sheetUrl.trim()) {
      setError('Please enter both the Google Form and Google Sheet URLs.');
      return;
    }
    setIsImporting(true);
    setError(null);
    try {
      const [formResult, sheetData] = await Promise.all([
        getFormByUrl(formUrl),
        getSheetData(sheetUrl)
      ]);

      const { questions } = formResult;
      const questionsText = "--- SURVEY QUESTIONS ---\n" +
        questions.map((q, i) => `${i + 1}. ${q.questionText}`).join('\n') +
        "\n\n--- RESPONSE DATA (TSV format) ---\n";

      const combinedData = questionsText + sheetData;
      setData(combinedData);

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during import.';
      setError(`Import failed: ${errorMessage}`);
    } finally {
      setIsImporting(false);
    }
  }, [formUrl, sheetUrl]);

  const handleAnalyze = useCallback(async () => {
    if (!data.trim()) {
      setError('Please paste or import some data to analyze.');
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt for the analysis.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult('');
    
    try {
      const result = await analyzeData(data, prompt);
      setAnalysisResult(result);
      onSaveAnalysis(form.id, data, result);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during analysis.';
      setError(errorMessage);
      setAnalysisResult('');
      onSaveAnalysis(form.id, data, ''); // Clear previous result on error
    } finally {
      setIsLoading(false);
    }
  }, [data, prompt, form.id, onSaveAnalysis]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 h-full flex flex-col space-y-4">
       <div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white truncate" title={form.title}>Analysis for: {form.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Import your form's questions and response data from Google to get started.</p>
       </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow min-h-0">
        <div className="flex flex-col space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700 space-y-3">
              <h4 className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                <UploadCloud className="w-4 h-4 mr-2" />
                Import Data for Analysis
              </h4>
              <div>
                <label htmlFor="formUrl" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Google Form URL (for questions)</label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    id="formUrl"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="Paste Google Form link here"
                    className="w-full pl-9 pr-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
               <div>
                <label htmlFor="sheetUrl" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Google Sheet URL (for responses)</label>
                 <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    id="sheetUrl"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="Paste Google Sheet link here"
                    className="w-full pl-9 pr-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={handleImportData}
                disabled={isImporting}
                className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center justify-center"
              >
                {isImporting ? <Loader /> : 'Import Data'}
              </button>
            </div>

            <div>
              <label htmlFor="data" className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                <Clipboard className="w-4 h-4 mr-2" />
                Combined Data (Read-only)
              </label>
              <textarea
                id="data"
                readOnly
                value={data}
                placeholder="Your combined questions and response data will appear here after importing."
                className="w-full flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 cursor-not-allowed text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition h-24 lg:h-auto"
                />
            </div>
            <div>
                <label htmlFor="prompt" className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    <FileQuestion className="w-4 h-4 mr-2" />
                    Analysis Prompt
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., 'What is the main feedback? Compare responses between different user groups.'"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition h-24"
                  rows={3}
                />
            </div>
            <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="w-full flex items-center justify-center bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition"
                >
                {isLoading ? <Loader /> : <> <Sparkles className="w-5 h-5 mr-2" /> <span>Analyze</span></>}
            </button>
            {error && <p className="text-red-500 text-center text-sm">{error}</p>}
        </div>

        <div className="flex flex-col min-h-0">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center">
                <BarChart3 className="w-4 h-4 mr-2 text-blue-500"/>
                Analysis Report
            </h4>
             <div className="prose prose-sm dark:prose-invert max-w-none flex-grow overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <Loader />
                        <p className="mt-4 text-gray-500 dark:text-gray-400">AI is analyzing...</p>
                    </div>
                ) : analysisResult ? (
                    <div className="whitespace-pre-wrap font-sans">{analysisResult}</div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                        <Sparkles className="w-10 h-10 mb-2 text-gray-400"/>
                        <p>Your AI-generated report will appear here.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default FormAnalysisDetail;