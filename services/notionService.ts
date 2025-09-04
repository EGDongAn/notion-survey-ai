import type { Question, FormMetadata } from '../types';
import { QuestionType } from '../types';

// Parent page ID where databases will be created
// Support both new and old environment variable names for backward compatibility
const NOTION_PARENT_PAGE_ID = import.meta.env.VITE_NOTION_PARENT_PAGE_ID || import.meta.env.VITE_NOTION_DATABASE_ID;

// API endpoint for Notion operations (Vercel serverless function)
const NOTION_API_URL = '/api/notion';

export const isNotionConfigured = (): boolean => {
    // Only check for parent page ID on client side
    // API key is checked on server side
    return !!NOTION_PARENT_PAGE_ID;
};

interface NotionProperty {
    [key: string]: any;
}

interface NotionPage {
    properties: NotionProperty;
}

// Convert our Question type to Notion database properties
const questionToNotionProperty = (question: Question): NotionProperty => {
    switch (question.type) {
        case QuestionType.TEXT:
        case QuestionType.PARAGRAPH_TEXT:
        case QuestionType.TIME: // Notion doesn't have time-only type
            return {
                type: 'rich_text',
                rich_text: {}
            };
        case QuestionType.MULTIPLE_CHOICE:
            return {
                type: 'select',
                select: {
                    options: (question.options || []).map(opt => ({
                        name: opt,
                        color: getRandomNotionColor()
                    }))
                }
            };
        case QuestionType.CHECKBOX:
            return {
                type: 'multi_select',
                multi_select: {
                    options: (question.options || []).map(opt => ({
                        name: opt,
                        color: getRandomNotionColor()
                    }))
                }
            };
        case QuestionType.SCALE:
            return {
                type: 'number',
                number: {
                    format: 'number'
                }
            };
        case QuestionType.DATE:
            return {
                type: 'date',
                date: {}
            };
        default:
            return {
                type: 'rich_text',
                rich_text: {}
            };
    }
};

// Helper function to get random Notion color
const getRandomNotionColor = (): string => {
    const colors = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];
    return colors[Math.floor(Math.random() * colors.length)];
};

// Helper function to format Notion ID (remove hyphens)
const formatNotionId = (id: string): string => {
    return id.replace(/-/g, '');
};

// Create a new Notion database for a survey
export const createNotionSurveyDatabase = async (
    title: string,
    questions: Question[]
): Promise<{ databaseId: string; url: string }> => {
    if (!isNotionConfigured()) {
        throw new Error("Notion API is not configured. Please set up NOTION_API_KEY and NOTION_DATABASE_ID in environment variables.");
    }

    // Create properties schema from questions
    const properties: NotionProperty = {
        'Response ID': {
            type: 'title',
            title: {}
        },
        'Submitted At': {
            type: 'created_time',
            created_time: {}
        },
        'Email': {
            type: 'email',
            email: {}
        }
    };

    // Add each question as a property
    questions.forEach((question, index) => {
        const propertyName = `Q${index + 1}: ${question.questionText}`;
        properties[propertyName] = questionToNotionProperty(question);
    });

    try {
        // Format the page ID (remove hyphens)
        const formattedPageId = formatNotionId(NOTION_PARENT_PAGE_ID);
        
        console.log('Creating Notion database with parent page:', formattedPageId);
        
        const requestBody = {
            parent: {
                type: 'page_id',
                page_id: formattedPageId
            },
            title: [
                {
                    type: 'text',
                    text: {
                        content: title
                    }
                }
            ],
            properties: properties
        };
        
        console.log('Request body:', JSON.stringify(requestBody, null, 2));
        
        // Make API call to create database
        const response = await fetch(`${NOTION_API_URL}?path=databases`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            console.error('Notion API error response:', errorData);
            throw new Error(`Failed to create Notion database: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        return {
            databaseId: data.id,
            url: data.url
        };
    } catch (error) {
        console.error('Error creating Notion database:', error);
        throw new Error('Failed to create survey database in Notion');
    }
};

// Submit a response to the Notion database
export const submitNotionResponse = async (
    databaseId: string,
    responses: Record<string, any>
): Promise<string> => {
    if (!isNotionConfigured()) {
        throw new Error("Notion API is not configured.");
    }

    const properties: NotionProperty = {
        'Response ID': {
            title: [
                {
                    text: {
                        content: `Response-${Date.now()}`
                    }
                }
            ]
        },
        'Submitted At': {
            date: {
                start: new Date().toISOString()
            }
        }
    };

    // Map responses to Notion properties
    Object.entries(responses).forEach(([key, value]) => {
        if (typeof value === 'string') {
            properties[key] = {
                rich_text: [
                    {
                        text: {
                            content: value
                        }
                    }
                ]
            };
        } else if (typeof value === 'number') {
            properties[key] = {
                number: value
            };
        } else if (Array.isArray(value)) {
            properties[key] = {
                multi_select: value.map(v => ({ name: v }))
            };
        } else if (value instanceof Date) {
            properties[key] = {
                date: {
                    start: value.toISOString()
                }
            };
        }
    });

    try {
        const response = await fetch(`${NOTION_API_URL}?path=pages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                parent: {
                    database_id: databaseId
                },
                properties: properties
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to submit response: ${response.statusText}`);
        }

        const data = await response.json();
        return data.id;
    } catch (error) {
        console.error('Error submitting response to Notion:', error);
        throw new Error('Failed to submit survey response');
    }
};

// Fetch all responses from a Notion database
export const fetchNotionResponses = async (
    databaseId: string
): Promise<any[]> => {
    if (!isNotionConfigured()) {
        throw new Error("Notion API is not configured.");
    }

    try {
        const response = await fetch(`${NOTION_API_URL}?path=query&databaseId=${databaseId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sorts: [
                    {
                        property: 'Submitted At',
                        direction: 'descending'
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch responses: ${response.statusText}`);
        }

        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error('Error fetching Notion responses:', error);
        throw new Error('Failed to fetch survey responses');
    }
};

// Get database schema (questions) from Notion
export const getNotionDatabaseSchema = async (
    databaseId: string
): Promise<Question[]> => {
    if (!isNotionConfigured()) {
        throw new Error("Notion API is not configured.");
    }

    try {
        const response = await fetch(`${NOTION_API_URL}?path=database&databaseId=${databaseId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch database schema: ${response.statusText}`);
        }

        const data = await response.json();
        const questions: Question[] = [];

        // Convert Notion properties back to our Question format
        Object.entries(data.properties).forEach(([name, prop]: [string, any]) => {
            // Skip system properties
            if (name === 'Response ID' || name === 'Submitted At' || name === 'Email') {
                return;
            }

            const questionMatch = name.match(/^Q\d+: (.+)$/);
            const questionText = questionMatch ? questionMatch[1] : name;

            let type: QuestionType = QuestionType.TEXT;
            let options: string[] = [];

            switch (prop.type) {
                case 'rich_text':
                    type = QuestionType.TEXT;
                    break;
                case 'select':
                    type = QuestionType.MULTIPLE_CHOICE;
                    options = prop.select.options.map((opt: any) => opt.name);
                    break;
                case 'multi_select':
                    type = QuestionType.CHECKBOX;
                    options = prop.multi_select.options.map((opt: any) => opt.name);
                    break;
                case 'number':
                    type = QuestionType.SCALE;
                    break;
                case 'date':
                    type = QuestionType.DATE;
                    break;
                default:
                    type = QuestionType.TEXT;
            }

            questions.push({
                questionText,
                type,
                options,
                isRequired: false // We can't determine this from Notion schema
            });
        });

        return questions;
    } catch (error) {
        console.error('Error fetching database schema:', error);
        throw new Error('Failed to fetch survey structure from Notion');
    }
};

// Create a shareable form page in Notion
export const createNotionFormPage = async (
    title: string,
    questions: Question[],
    databaseId: string
): Promise<{ pageId: string; url: string }> => {
    if (!isNotionConfigured()) {
        throw new Error("Notion API is not configured.");
    }

    // Build the page content with form instructions
    const content = [
        {
            object: 'block',
            type: 'heading_1',
            heading_1: {
                rich_text: [
                    {
                        type: 'text',
                        text: {
                            content: title
                        }
                    }
                ]
            }
        },
        {
            object: 'block',
            type: 'paragraph',
            paragraph: {
                rich_text: [
                    {
                        type: 'text',
                        text: {
                            content: 'Please fill out this survey form. Your responses will be recorded in our database.'
                        }
                    }
                ]
            }
        },
        {
            object: 'block',
            type: 'divider',
            divider: {}
        }
    ];

    // Add questions to the page
    questions.forEach((question, index) => {
        content.push({
            object: 'block',
            type: 'heading_3',
            heading_3: {
                rich_text: [
                    {
                        type: 'text',
                        text: {
                            content: `Question ${index + 1}: ${question.questionText}${question.isRequired ? ' *' : ''}`
                        }
                    }
                ]
            }
        });

        if (question.options && question.options.length > 0) {
            content.push({
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: {
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: `Options: ${question.options.join(', ')}`
                            }
                        }
                    ]
                }
            });
        }

        content.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
                rich_text: [
                    {
                        type: 'text',
                        text: {
                            content: `Type: ${question.type}`
                        }
                    }
                ]
            }
        });
    });

    try {
        const formattedPageId = formatNotionId(NOTION_PARENT_PAGE_ID);
        
        const response = await fetch(`${NOTION_API_URL}?path=pages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                parent: {
                    page_id: formattedPageId
                },
                properties: {
                    title: [
                        {
                            text: {
                                content: `Survey Form: ${title}`
                            }
                        }
                    ]
                },
                children: content
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to create form page: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            pageId: data.id,
            url: data.url
        };
    } catch (error) {
        console.error('Error creating Notion form page:', error);
        throw new Error('Failed to create survey form page in Notion');
    }
};