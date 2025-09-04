// Email history management service
const EMAIL_HISTORY_KEY = 'notion_survey_email_history';
const MAX_EMAIL_HISTORY = 10;

export interface EmailHistoryItem {
  email: string;
  lastUsed: string;
  frequency: number;
}

// Get email history from localStorage
export const getEmailHistory = (): EmailHistoryItem[] => {
  try {
    const stored = localStorage.getItem(EMAIL_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading email history:', error);
  }
  return [];
};

// Save email to history
export const saveEmailToHistory = (emails: string[]): void => {
  try {
    const history = getEmailHistory();
    const now = new Date().toISOString();
    
    emails.forEach(email => {
      const existingIndex = history.findIndex(h => h.email === email);
      
      if (existingIndex >= 0) {
        // Update existing email
        history[existingIndex].lastUsed = now;
        history[existingIndex].frequency++;
      } else {
        // Add new email
        history.push({
          email,
          lastUsed: now,
          frequency: 1
        });
      }
    });
    
    // Sort by frequency and recency
    history.sort((a, b) => {
      // First sort by frequency
      if (b.frequency !== a.frequency) {
        return b.frequency - a.frequency;
      }
      // Then by last used date
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    });
    
    // Keep only top emails
    const trimmed = history.slice(0, MAX_EMAIL_HISTORY);
    
    localStorage.setItem(EMAIL_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error saving email history:', error);
  }
};

// Get frequently used emails
export const getFrequentEmails = (limit: number = 5): string[] => {
  const history = getEmailHistory();
  return history.slice(0, limit).map(h => h.email);
};

// Clear email history
export const clearEmailHistory = (): void => {
  try {
    localStorage.removeItem(EMAIL_HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing email history:', error);
  }
};