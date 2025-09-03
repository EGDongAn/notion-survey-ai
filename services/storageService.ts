import type { FormMetadata } from '../types';

const STORAGE_KEY = 'formulateAiForms';
const RECENT_EMAILS_KEY = 'formulateAiRecentEmails';

/**
 * Retrieves all form metadata from localStorage, sorted by most recent.
 * @returns {FormMetadata[]} An array of form metadata objects.
 */
export const getFormsMetadata = (): FormMetadata[] => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      const forms = JSON.parse(storedData) as FormMetadata[];
      // Sort by creation date descending to ensure order
      return forms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  } catch (error) {
    console.error("Failed to retrieve form metadata from localStorage:", error);
    // In case of parsing error, clear the corrupted data
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
};

/**
 * Saves a new form's metadata to localStorage.
 * @param {FormMetadata} newForm - The new form metadata to save.
 */
export const saveFormMetadata = (newForm: FormMetadata): void => {
  try {
    const existingForms = getFormsMetadata();
    // Prepend the new form and remove any potential duplicates
    const updatedForms = [newForm, ...existingForms.filter(f => f.id !== newForm.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedForms));
  } catch (error) {
    console.error("Failed to save form metadata to localStorage:", error);
  }
};

/**
 * Updates the analysis data for a specific form in localStorage.
 * @param {string} formId - The ID of the form to update.
 * @param {string} responseData - The raw response data.
 * @param {string} analysisResult - The AI-generated analysis result.
 */
export const updateFormAnalysis = (formId: string, responseData: string, analysisResult: string): void => {
  try {
    const forms = getFormsMetadata();
    const formIndex = forms.findIndex(f => f.id === formId);
    if (formIndex !== -1) {
      forms[formIndex].responseData = responseData;
      forms[formIndex].analysisResult = analysisResult;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(forms));
    }
  } catch (error) {
    console.error("Failed to update form analysis in localStorage:", error);
  }
};

/**
 * Email Management Functions
 */

/**
 * Gets the list of recently used email addresses.
 * @returns {string[]} Array of email addresses.
 */
export const getRecentEmails = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_EMAILS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to retrieve recent emails:", error);
    return [];
  }
};

/**
 * Adds an email to the recent emails list.
 * Moves it to the top if it already exists.
 * @param {string} email - The email address to add.
 */
export const addRecentEmail = (email: string): void => {
  if (!email || !email.includes('@')) return;
  
  try {
    const emails = getRecentEmails();
    // Remove if already exists (to move to top)
    const filtered = emails.filter(e => e.toLowerCase() !== email.toLowerCase());
    // Add to beginning
    filtered.unshift(email);
    // Keep only last 10
    const limited = filtered.slice(0, 10);
    
    localStorage.setItem(RECENT_EMAILS_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error("Failed to save recent email:", error);
  }
};

/**
 * Removes an email from the recent emails list.
 * @param {string} email - The email address to remove.
 */
export const removeRecentEmail = (email: string): void => {
  try {
    const emails = getRecentEmails();
    const filtered = emails.filter(e => e.toLowerCase() !== email.toLowerCase());
    localStorage.setItem(RECENT_EMAILS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to remove recent email:", error);
  }
};
