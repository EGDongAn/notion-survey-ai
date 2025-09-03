export type View = 'create' | 'dashboard';

export enum QuestionType {
  TEXT = 'TEXT',
  PARAGRAPH_TEXT = 'PARAGRAPH_TEXT',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  CHECKBOX = 'CHECKBOX',
  SCALE = 'SCALE',
  DATE = 'DATE',
  TIME = 'TIME',
}

export interface Question {
  questionText: string;
  type: QuestionType;
  options?: string[];
  isRequired: boolean;
}

export enum FormStep {
  INPUT,
  PREVIEW,
  SETTINGS,
  SUCCESS,
}

export interface FormMetadata {
  id: string;
  title: string;
  questionCount: number;
  createdAt: string; // ISO String
  responseData?: string;
  analysisResult?: string;
  editUrl?: string;
  publishedUrl?: string;
}
