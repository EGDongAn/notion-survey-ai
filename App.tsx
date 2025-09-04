
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import NotionFormGenerator from './components/NotionFormGenerator';
import Dashboard from './components/Dashboard';
import type { View } from './types';
import { isNotionConfigured } from './services/notionService';
import { isGeminiConfigured } from './services/geminiService';
import { AlertTriangle, Terminal } from 'lucide-react';

interface ConfigurationErrorProps {
    missingVars: string[];
}

const ConfigurationError: React.FC<ConfigurationErrorProps> = ({ missingVars }) => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-red-500/30 text-center">
                <AlertTriangle className="mx-auto w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Configuration Required
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    This application requires Notion and AI API configurations to function properly.
                </p>
                <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-4 text-left font-mono text-sm space-y-2">
                     <p className="flex items-center font-semibold">
                        <Terminal className="w-4 h-4 mr-2 text-red-400" />
                        Missing Environment Variables:
                    </p>
                    {missingVars.map(varName => (
                         <p key={varName} className="pl-6">
                            - <strong className="text-red-500 dark:text-red-400">{varName}</strong>
                         </p>
                    ))}
                </div>
                <div className="mt-6 text-left text-sm text-gray-700 dark:text-gray-400 space-y-2">
                    <p><strong>If you are the developer of this application:</strong></p>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Create a Notion Integration at notion.so/my-integrations and get your API key.</li>
                        <li>Share a Notion page with your integration and get the page ID.</li>
                        <li>Get your Gemini API key from Google AI Studio.</li>
                        <li>In your Vercel project settings, add these environment variables.</li>
                        <li>Redeploy your application for the changes to take effect.</li>
                    </ol>
                </div>
                 <a href="https://vercel.com/docs/projects/environment-variables" target="_blank" rel="noopener noreferrer" className="inline-block mt-6 text-blue-600 dark:text-blue-400 hover:underline">
                    Learn more about Environment Variables on Vercel
                </a>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('create');
  const [selectedFormIdForDashboard, setSelectedFormIdForDashboard] = useState<string | null>(null);
  const [missingVars, setMissingVars] = useState<string[]>([]);
  const [isCheckingConfig, setIsCheckingConfig] = useState<boolean>(true);


  useEffect(() => {
    const checkConfig = () => {
        const missing: string[] = [];
        if (!isNotionConfigured()) {
            missing.push('VITE_NOTION_PARENT_PAGE_ID (or VITE_NOTION_DATABASE_ID for legacy)');
            missing.push('NOTION_API_KEY (server-side in Vercel)');
        }
        if (!isGeminiConfigured()) {
            missing.push('VITE_API_KEY');
        }
        setMissingVars(missing);
        setIsCheckingConfig(false);
    };
    // Give a brief moment for env vars to be available
    setTimeout(checkConfig, 10);
  }, []);

  if (isCheckingConfig) {
    return <div className="min-h-screen bg-gray-100 dark:bg-gray-900" />; // Render nothing or a loader
  }

  if (missingVars.length > 0) {
    return <ConfigurationError missingVars={missingVars} />;
  }

  const renderContent = () => {
    switch (activeView) {
      case 'create':
        return <NotionFormGenerator setActiveView={setActiveView} setSelectedFormId={setSelectedFormIdForDashboard} />;
      case 'dashboard':
        return <Dashboard selectedFormId={selectedFormIdForDashboard} setSelectedFormId={setSelectedFormIdForDashboard} />;
      default:
        return <NotionFormGenerator setActiveView={setActiveView} setSelectedFormId={setSelectedFormIdForDashboard} />;
    }
  };

  return (
    <div id="formulate-ai-widget-container" className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <Header activeView={activeView} setActiveView={setActiveView} />
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
