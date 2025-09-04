import React, { useState, useEffect } from 'react';
import { X, Plus, Mail, Clock, Star } from 'lucide-react';
import { getFrequentEmails } from '../services/emailStorageService';

interface NotificationEmailManagerProps {
  emails: string[];
  onEmailsChange: (emails: string[]) => void;
  required?: boolean;
}

const NotificationEmailManager: React.FC<NotificationEmailManagerProps> = ({ 
  emails, 
  onEmailsChange,
  required = false 
}) => {
  const [inputEmail, setInputEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [frequentEmails, setFrequentEmails] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    // Load frequently used emails on mount
    setFrequentEmails(getFrequentEmails());
  }, []);

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const addEmail = () => {
    const trimmedEmail = inputEmail.trim().toLowerCase();
    
    if (!trimmedEmail) {
      setEmailError('이메일을 입력해주세요.');
      return;
    }
    
    if (!validateEmail(trimmedEmail)) {
      setEmailError('올바른 이메일 형식이 아닙니다.');
      return;
    }
    
    if (emails.includes(trimmedEmail)) {
      setEmailError('이미 추가된 이메일입니다.');
      return;
    }
    
    onEmailsChange([...emails, trimmedEmail]);
    setInputEmail('');
    setEmailError('');
    setShowSuggestions(false);
  };

  const removeEmail = (emailToRemove: string) => {
    onEmailsChange(emails.filter(email => email !== emailToRemove));
  };

  const addFrequentEmail = (email: string) => {
    if (!emails.includes(email)) {
      onEmailsChange([...emails, email]);
    }
    setShowSuggestions(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    }
  };

  // Filter suggestions based on input
  const filteredSuggestions = frequentEmails.filter(
    email => !emails.includes(email) && 
    (inputEmail === '' || email.toLowerCase().includes(inputEmail.toLowerCase()))
  );

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        <Mail className="w-4 h-4 inline mr-2" />
        알림 이메일 {required && <span className="text-red-500">*</span>}
      </label>
      
      {/* Email input field */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="email"
            value={inputEmail}
            onChange={(e) => {
              setInputEmail(e.target.value);
              setEmailError('');
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyPress={handleKeyPress}
            placeholder="알림 받을 이메일 주소"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addEmail}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        {/* Email suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
            <div className="p-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                자주 사용하는 이메일
              </div>
              {filteredSuggestions.map((email) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => addFrequentEmail(email)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center"
                >
                  <Star className="w-3 h-3 mr-2 text-yellow-500" />
                  <span className="text-sm">{email}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {emailError && (
        <p className="text-sm text-red-500">{emailError}</p>
      )}
      
      {/* Added emails list */}
      {emails.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            추가된 이메일 ({emails.length}개)
          </p>
          <div className="flex flex-wrap gap-2">
            {emails.map((email) => (
              <div
                key={email}
                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
              >
                <Mail className="w-3 h-3" />
                {email}
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Helper text */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {emails.length === 0 
          ? '새로운 응답이 제출되면 이 이메일들로 알림을 받습니다. 여러 개 추가 가능합니다.'
          : `${emails.length}개의 이메일이 알림을 받게 됩니다.`}
      </p>
    </div>
  );
};

export default NotificationEmailManager;