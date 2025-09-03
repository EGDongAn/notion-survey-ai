
import React from 'react';
import type { Question } from '../types';
import { QuestionType } from '../types';
import { Type, List, CheckSquare, Star, Calendar, Clock, PlusCircle, X, Trash2 } from 'lucide-react';

interface QuestionEditorProps {
  question: Question;
  index: number;
  onUpdate: (index: number, question: Question) => void;
  onDelete: (index: number) => void;
}

const QuestionIcon: React.FC<{ type: QuestionType }> = ({ type }) => {
  const iconProps = { className: "w-5 h-5 text-gray-400 dark:text-gray-500" };
  switch (type) {
    case QuestionType.TEXT: return <Type {...iconProps} />;
    case QuestionType.PARAGRAPH_TEXT: return <List {...iconProps} />;
    case QuestionType.MULTIPLE_CHOICE:
    case QuestionType.CHECKBOX: return <CheckSquare {...iconProps} />;
    case QuestionType.SCALE: return <Star {...iconProps} />;
    case QuestionType.DATE: return <Calendar {...iconProps} />;
    case QuestionType.TIME: return <Clock {...iconProps} />;
    default: return <Type {...iconProps} />;
  }
};

const QuestionPreview: React.FC<QuestionEditorProps> = ({ question, index, onUpdate, onDelete }) => {
  
  const handleFieldChange = (field: keyof Question, value: any) => {
    onUpdate(index, { ...question, [field]: value });
  };
  
  const handleOptionChange = (optionIndex: number, value: string) => {
    const newOptions = [...(question.options || [])];
    newOptions[optionIndex] = value;
    handleFieldChange('options', newOptions);
  };

  const addOption = () => {
    const newOptions = [...(question.options || []), `Option ${ (question.options?.length || 0) + 1 }`];
    handleFieldChange('options', newOptions);
  };

  const removeOption = (optionIndex: number) => {
    const newOptions = (question.options || []).filter((_, i) => i !== optionIndex);
    handleFieldChange('options', newOptions);
  };
  
  const renderOptionsEditor = () => {
    if (![QuestionType.MULTIPLE_CHOICE, QuestionType.CHECKBOX, QuestionType.SCALE].includes(question.type)) {
      return null;
    }
    
    if (question.type === QuestionType.SCALE) {
      return (
        <div className="mt-2 ml-8 flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Scale from 1 to</span>
            <input 
                type="number" 
                min="2"
                max="10"
                value={question.options?.[0] || '5'} 
                onChange={e => handleFieldChange('options', [e.target.value])}
                className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700"
            />
        </div>
      );
    }

    return (
      <div className="space-y-2 mt-3 ml-8">
        {(question.options || []).map((option, i) => (
          <div key={i} className="flex items-center space-x-2">
             <div className={`w-4 h-4 border ${question.type === QuestionType.MULTIPLE_CHOICE ? 'rounded-full' : 'rounded'} border-gray-400 dark:border-gray-500`}></div>
            <input
              type="text"
              value={option}
              onChange={(e) => handleOptionChange(i, e.target.value)}
              className="flex-grow text-sm p-1 border-b border-transparent focus:border-blue-500 bg-transparent focus:outline-none transition"
            />
            <button onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500">
                <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button onClick={addOption} className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2">
            <PlusCircle className="w-4 h-4 mr-1" />
            Add Option
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="flex items-start space-x-3">
        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-2">{index + 1}.</span>
        <div className="flex-grow">
            <input 
                type="text"
                value={question.questionText}
                onChange={e => handleFieldChange('questionText', e.target.value)}
                className="w-full text-base font-semibold p-1 border-b border-transparent focus:border-blue-500 bg-transparent focus:outline-none transition"
            />
        </div>
        <div className="flex-shrink-0">
             <select 
                value={question.type}
                onChange={e => handleFieldChange('type', e.target.value as QuestionType)}
                className="text-sm p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 focus:ring-1 focus:ring-blue-500"
             >
                {Object.values(QuestionType).map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
             </select>
        </div>
      </div>
      
      {renderOptionsEditor()}
      
      <div className="flex items-center justify-end space-x-4 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <label className="flex items-center cursor-pointer text-sm text-gray-600 dark:text-gray-300">
            <input 
                type="checkbox"
                checked={question.isRequired}
                onChange={e => handleFieldChange('isRequired', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2">Required</span>
        </label>
        <button onClick={() => onDelete(index)} className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition">
            <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default QuestionPreview;
