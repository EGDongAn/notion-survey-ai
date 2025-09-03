
import React from 'react';
import { FileText, LayoutDashboard, BotMessageSquare } from 'lucide-react';
import type { View } from '../types';

interface HeaderProps {
  activeView: View;
  setActiveView: (view: View) => void;
}

const NavItem: React.FC<{
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
        isActive
          ? 'bg-blue-600 text-white shadow-md'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      <Icon className="w-5 h-5 mr-2" />
      {label}
    </button>
  );
};

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView }) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button 
            onClick={() => setActiveView('create')}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
             <BotMessageSquare className="h-8 w-8 text-blue-600" />
            <h1 className="ml-3 text-2xl font-bold text-gray-800 dark:text-white cursor-pointer">Formulate AI</h1>
          </button>
          <nav className="flex items-center space-x-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
            <NavItem
              icon={FileText}
              label="Create Form"
              isActive={activeView === 'create'}
              onClick={() => setActiveView('create')}
            />
            <NavItem
              icon={LayoutDashboard}
              label="Dashboard & Analysis"
              isActive={activeView === 'dashboard'}
              onClick={() => setActiveView('dashboard')}
            />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;