import React, { useEffect, useState } from 'react';
import SurveyResponse from './components/SurveyResponse';
import { AlertTriangle } from 'lucide-react';

const PublicSurvey: React.FC = () => {
  const [databaseId, setDatabaseId] = useState<string | null>(null);
  const [surveyTitle, setSurveyTitle] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Get database ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const dbId = urlParams.get('id');
    const title = urlParams.get('title');
    
    if (!dbId) {
      setError('Survey ID not found. Please check the survey link.');
      return;
    }
    
    setDatabaseId(dbId);
    setSurveyTitle(title || 'Survey Form');
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Survey Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!databaseId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8">
      <SurveyResponse databaseId={databaseId} title={surveyTitle} />
    </div>
  );
};

export default PublicSurvey;