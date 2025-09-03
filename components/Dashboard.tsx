
import React, { useState, useEffect, useMemo } from 'react';
import { getFormsMetadata, updateFormAnalysis } from '../services/storageService';
import type { FormMetadata } from '../types';
import { FileText, Database } from 'lucide-react';
import FormAnalysisDetail from './FormAnalysisDetail';

interface DashboardProps {
  selectedFormId: string | null;
  setSelectedFormId: (id: string | null) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ selectedFormId, setSelectedFormId }) => {
  const [forms, setForms] = useState<FormMetadata[]>([]);

  useEffect(() => {
    const updateForms = () => setForms(getFormsMetadata());
    window.addEventListener('storage', updateForms);
    updateForms(); // Initial load
    return () => window.removeEventListener('storage', updateForms);
  }, []);
  
  const selectedForm = useMemo(() => {
    return forms.find(f => f.id === selectedFormId) || null;
  }, [forms, selectedFormId]);

  const handleSaveAnalysis = (formId: string, responseData: string, analysisResult: string) => {
    updateFormAnalysis(formId, responseData, analysisResult);
    // Refresh local state to reflect the changes immediately
    setForms(getFormsMetadata());
  };
  
  if (forms.length === 0) {
    return (
        <div className="text-center py-20 animate-fade-in">
             <FileText className="mx-auto w-16 h-16 text-gray-400" />
            <h2 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white">No Forms Yet</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
                You haven't generated any forms. Go to the "Create Form" tab to get started!
            </p>
        </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-fade-in h-[calc(100vh-120px)]">
      {/* Left Panel: Form List */}
      <div className="md:w-1/3 lg:w-1/4 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 flex flex-col">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 border-b pb-2 dark:border-gray-700">Generated Forms</h2>
        <div className="overflow-y-auto space-y-2 flex-grow">
          {forms.map(form => (
            <button
              key={form.id}
              onClick={() => setSelectedFormId(form.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                selectedFormId === form.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <p className="font-semibold text-sm truncate" title={form.title}>{form.title}</p>
              <p className={`text-xs ${selectedFormId === form.id ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                {new Date(form.createdAt).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel: Analysis Workspace */}
      <div className="flex-grow">
        {selectedForm ? (
          <FormAnalysisDetail 
            key={selectedForm.id} // Re-mount component on form change
            form={selectedForm} 
            onSaveAnalysis={handleSaveAnalysis}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div>
              <Database className="mx-auto w-16 h-16 text-gray-400" />
              <h2 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white">Select a Form</h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Choose a form from the list on the left to view and analyze its data.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
