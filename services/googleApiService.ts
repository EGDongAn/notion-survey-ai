
// IMPORTANT: This CLIENT_ID is a placeholder. For a real application,
// you must create your own in the Google Cloud Console and configure its
// authorized JavaScript origins to include your application's URL.
import type { Question } from '../types';
import { QuestionType } from '../types';

// Use the VITE_ prefix for client-side environment variables
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID; 
// Comprehensive scopes for all Google APIs we use
const SCOPES = [
    'https://www.googleapis.com/auth/script.projects',      // Create/manage Apps Script projects
    'https://www.googleapis.com/auth/script.scriptapp',     // Execute Apps Script functions via API
    'https://www.googleapis.com/auth/script.deployments',    // Deploy Apps Script projects
    'https://www.googleapis.com/auth/drive.readonly',       // Read all files in Drive (needed for existing forms)
    'https://www.googleapis.com/auth/drive.file',           // Create/manage files created by this app
    'https://www.googleapis.com/auth/forms',                // Full Forms access
    'https://www.googleapis.com/auth/spreadsheets'          // Full Sheets access (create response sheets)
].join(' ');

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let gapiInited = false;
let gisInited = false;
let activeApis: Set<string> = new Set();


export const isGoogleClientConfigured = (): boolean => {
    return !!CLIENT_ID;
};

const gapiLoaded = new Promise<void>((resolve) => {
    if (typeof gapi !== 'undefined') {
        gapi.load('client', () => {
            gapiInited = true;
            resolve();
        });
    }
});

const gisLoaded = new Promise<void>((resolve) => {
    const checkGis = () => {
        if (typeof google !== 'undefined' && google.accounts) {
            gisInited = true;
            resolve();
        } else {
            setTimeout(checkGis, 100);
        }
    };
    checkGis();
});


export const initializeGoogleClient = async (): Promise<void> => {
    if (!isGoogleClientConfigured()) {
        // App.tsx handles the UI error state.
        return;
    }
    await Promise.all([gapiLoaded, gisLoaded]);
    
    // Initialize GAPI client with discovery documents for problematic APIs
    await gapi.client.init({
      discoveryDocs: [
        'https://script.googleapis.com/$discovery/rest?version=v1',
        'https://forms.googleapis.com/$discovery/rest?version=v1'
      ]
    });

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: () => {}, // Callback is handled by the promise in getToken
    });
};

// Add function to reset OAuth token
export const resetGoogleAuth = () => {
    if (tokenClient && gapi.client.getToken()) {
        google.accounts.oauth2.revoke(gapi.client.getToken().access_token, () => {
            console.log('OAuth token revoked');
        });
        gapi.client.setToken(null);
    }
};

const getToken = async (): Promise<google.accounts.oauth2.TokenResponse> => {
    if (!isGoogleClientConfigured()) {
        throw new Error("Cannot authenticate with Google. The VITE_GOOGLE_CLIENT_ID has not been configured by the application developer.");
    }

    if (!tokenClient) {
      await initializeGoogleClient();
    }

    return new Promise((resolve, reject) => {
        if (!tokenClient) {
          return reject(new Error("Google Identity Services client failed to initialize."));
        }
        
        tokenClient.callback = (resp) => {
            if (resp.error) {
                // If user denies new permissions, suggest clearing cache
                if (resp.error === 'access_denied') {
                    return reject(new Error('Permission denied. Please clear your browser cache and try again to grant the new permissions.'));
                }
                return reject(resp);
            }
            gapi.client.setToken({ access_token: resp.access_token });
            resolve(resp);
        };
        
        // Force consent screen to show new scopes
        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
};

const loadApi = async (apiName: 'forms' | 'sheets' | 'drive' | 'script') => {
    if (activeApis.has(apiName)) {
        return;
    }
    await gapiLoaded;

    try {
        // Check if API is already loaded through discovery docs
        if (apiName === 'forms' && gapi.client.forms) {
            console.log('Forms API already loaded via discovery docs');
            activeApis.add(apiName);
            return;
        }
        if (apiName === 'script' && gapi.client.script) {
            console.log('Script API already loaded via discovery docs');
            activeApis.add(apiName);
            return;
        }
        
        if (apiName === 'forms') {
            // Forms API should be loaded via discovery doc in init
            console.log('Loading Forms API...');
            // Try to load again if not already loaded
            if (!gapi.client.forms) {
                await gapi.client.load('https://forms.googleapis.com/$discovery/rest?version=v1');
            }
        } else if (apiName === 'sheets') {
            console.log('Loading Sheets API v4');
            await gapi.client.load('sheets', 'v4');
        } else if (apiName === 'drive') {
            console.log('Loading Drive API v3');
            await gapi.client.load('drive', 'v3');
        } else if (apiName === 'script') {
            // Script API should be loaded via discovery doc in init
            console.log('Loading Script API...');
            // Try to load again if not already loaded
            if (!gapi.client.script) {
                await gapi.client.load('https://script.googleapis.com/$discovery/rest?version=v1');
            }
        }
        
        activeApis.add(apiName);
    } catch (error) {
        const apiDisplayName = {
            'forms': 'Google Forms API',
            'sheets': 'Google Sheets API',
            'drive': 'Google Drive API',
            'script': 'Apps Script API'
        }[apiName] || `${apiName} API`;
        
        console.error(`Failed to load ${apiDisplayName}:`, error);
        throw new Error(`Failed to load ${apiDisplayName}. Please enable "${apiDisplayName}" in Google Cloud Console at https://console.cloud.google.com/apis/library`);
    }
}


// --- URL IMPORT LOGIC ---

const transformGoogleFormToQuestions = (form: GAPI.Forms.Form): Question[] => {
    const questions: Question[] = [];
    if (!form.items) return questions;

    for (const item of form.items) {
        const questionItem = item.questionItem;
        if (!questionItem || !questionItem.question) continue;

        const q = questionItem.question;
        let question: Question | null = null;

        if (q.textQuestion) {
            question = {
                questionText: item.title || '',
                type: q.textQuestion.paragraph ? QuestionType.PARAGRAPH_TEXT : QuestionType.TEXT,
                isRequired: q.required || false,
                options: [],
            };
        } else if (q.choiceQuestion) {
            question = {
                questionText: item.title || '',
                type: q.choiceQuestion.type === 'CHECKBOX' ? QuestionType.CHECKBOX : QuestionType.MULTIPLE_CHOICE,
                isRequired: q.required || false,
                options: q.choiceQuestion.options.map(opt => opt.value),
            };
        } else if (q.scaleQuestion) {
            question = {
                questionText: item.title || '',
                type: QuestionType.SCALE,
                isRequired: q.required || false,
                options: [String(q.scaleQuestion.high)]
            };
        } else if (q.dateQuestion) {
             question = {
                questionText: item.title || '',
                type: QuestionType.DATE,
                isRequired: q.required || false,
                options: []
            };
        } else if (q.timeQuestion) {
             question = {
                questionText: item.title || '',
                type: QuestionType.TIME,
                isRequired: q.required || false,
                options: []
            };
        }

        if (question) {
            questions.push(question);
        }
    }
    return questions;
};


export const getFormByUrl = async (url: string): Promise<{ title: string; questions: Question[] }> => {
    // Support both edit and view URLs
    // View/Published: https://docs.google.com/forms/d/e/{formId}/viewform
    // Edit: https://docs.google.com/forms/d/{formId}/edit
    
    let formId: string | null = null;
    
    // IMPORTANT: Check /d/e/ pattern FIRST to avoid matching 'e' as the form ID
    const publishedMatch = /\/forms\/d\/e\/([a-zA-Z0-9-_]+)/.exec(url);
    if (publishedMatch) {
        formId = publishedMatch[1];
    } else {
        // Then check regular edit URL pattern
        const editMatch = /\/forms\/d\/([a-zA-Z0-9-_]+)(?:\/|$)/.exec(url);
        if (editMatch && editMatch[1] !== 'e') {  // Extra safety check
            formId = editMatch[1];
        }
    }
    
    if (!formId) {
        throw new Error("Invalid Google Form URL. Could not find a Form ID. Please use a URL like: https://docs.google.com/forms/d/{formId}/edit or https://docs.google.com/forms/d/e/{formId}/viewform");
    }
    
    console.log('Extracted Form ID:', formId);

    await getToken();
    await loadApi('forms');

    try {
        const response = await gapi.client.forms.forms.get({ formId });
        const form = response.result;
        
        const title = form.info?.title || 'Untitled Form';
        const questions = transformGoogleFormToQuestions(form);

        return { title, questions };
    } catch (err: any) {
        console.error("Google Forms API error:", err);
        if (err.status === 403) {
             throw new Error("Permission denied. Make sure you have access to this form and have granted the necessary permissions.");
        }
        if (err.status === 404) {
             throw new Error("Form not found. Please check the URL and try again.");
        }
        throw new Error("Failed to fetch form data from Google. " + (err.result?.error?.message || ''));
    }
};

// --- DATA IMPORT FROM GOOGLE SHEETS ---

export const getSheetData = async (url: string): Promise<string> => {
    const match = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(url);
    if (!match || !match[1]) {
        throw new Error("Invalid Google Sheet URL. Could not find a Spreadsheet ID.");
    }
    const spreadsheetId = match[1];
    
    await getToken();
    await loadApi('sheets');

    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'A1:ZZ', // Read all available data
        });

        const values = response.result.values;
        if (!values || values.length === 0) {
            return '';
        }

        // Convert 2D array to TSV string
        return values.map(row => row.join('\t')).join('\n');
    } catch (err: any) {
        console.error("Google Sheets API error:", err);
        throw new Error("Failed to fetch data from Google Sheet. " + (err.result?.error?.message || ''));
    }
};


// --- APPS SCRIPT CREATION & UPDATE LOGIC ---

interface ScriptRunResult {
    done: boolean;
    response?: {
        result: {
            publishedUrl: string;
            editUrl: string;
        }
    };
    error?: {
        details?: Array<{
            errorMessage: string;
        }>
    };
}

// Helper function to make direct API calls when gapi.client fails
const callAppsScriptAPI = async (endpoint: string, method: string, body?: any) => {
    const token = gapi.client.getToken();
    if (!token) {
        throw new Error('No authentication token available');
    }
    
    const url = `https://script.googleapis.com/v1/${endpoint}`;
    console.log(`Making direct API call to: ${url}`);
    
    const response = await fetch(url, {
        method: method,
        headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined
    });
    
    if (!response.ok) {
        const error = await response.json();
        console.error('API call failed:', error);
        throw new Error(error.error?.message || 'API call failed');
    }
    
    return response.json();
};

// Create Apps Script and return script URL for manual execution
export const createAppsScriptProject = async (scriptContent: string, formTitle: string): Promise<{ scriptUrl: string, scriptId: string, instructions: string }> => {
    await getToken();
    
    try {
        // Create project using direct API call
        const createResponse = await callAppsScriptAPI('projects', 'POST', {
            title: `Formulate AI - ${formTitle}`
        });
        
        const scriptId = createResponse.scriptId;
        if (!scriptId) {
            throw new Error("Failed to create Apps Script project.");
        }
        console.log(`Created script with ID: ${scriptId}`);
        
        // Update the project content
        await callAppsScriptAPI(`projects/${scriptId}/content`, 'PUT', {
            files: [{
                name: 'Code',
                type: 'SERVER_JS',
                source: scriptContent
            }, {
                name: 'appsscript',
                type: 'JSON',
                source: JSON.stringify({
                    "timeZone": "America/New_York",
                    "dependencies": {},
                    "exceptionLogging": "STACKDRIVER",
                    "runtimeVersion": "V8"
                })
            }]
        });
        console.log(`Updated script content for ID: ${scriptId}`);
        
        const scriptUrl = `https://script.google.com/d/${scriptId}/edit`;
        const instructions = `
1. Click the link above to open Google Apps Script editor
2. Click "Run" button at the top
3. Select "createMyForm" function
4. Grant permissions when prompted
5. Check the Execution Log for your form URLs
        `;
        
        return { scriptUrl, scriptId, instructions };
    } catch (error: any) {
        console.error('Failed to create Apps Script project:', error);
        throw error;
    }
};

// Legacy function for backward compatibility
export const createAndRunAppsScript = async (scriptContent: string, formTitle: string): Promise<ScriptRunResult['response']['result']> => {
    await getToken();
    
    try {
        // Try using gapi.client first
        await loadApi('script');
        
        const createResponse = await gapi.client.script.projects.create({
            resource: {
                title: `Formulate AI - ${formTitle}`,
                files: [{
                    name: 'Code',
                    type: 'SERVER_JS',
                    source: scriptContent
                }]
            }
        });
        
        if (!createResponse.result.scriptId) {
            throw new Error("Failed to create Apps Script project.");
        }
        const scriptId = createResponse.result.scriptId;
        
        const runResponse = await gapi.client.script.scripts.run({
            scriptId: scriptId,
            resource: {
                function: 'createMyForm',
                devMode: true
            }
        });
        
        const result = runResponse.result as ScriptRunResult;
        
        if (result.error) {
            console.error('Apps Script execution error:', result.error);
            const errorMessage = result.error.details?.[0]?.errorMessage || "An unknown error occurred while running the script.";
            throw new Error(`Script execution failed: ${errorMessage}`);
        }
        
        if (result.response?.result) {
            return result.response.result;
        }
        
        throw new Error("Script executed but did not return the expected result.");
    } catch (error: any) {
        // If gapi.client fails (likely due to content-script issue), use direct API calls
        console.log('gapi.client failed, trying direct API calls:', error);
        
        // Create project using direct API call (only title and parentId)
        const createResponse = await callAppsScriptAPI('projects', 'POST', {
            title: `Formulate AI - ${formTitle}`
        });
        
        const scriptId = createResponse.scriptId;
        if (!scriptId) {
            throw new Error("Failed to create Apps Script project.");
        }
        console.log(`Created script with ID: ${scriptId}`);
        
        // Update the project content with the actual script
        await callAppsScriptAPI(`projects/${scriptId}/content`, 'PUT', {
            files: [{
                name: 'Code',
                type: 'SERVER_JS',
                source: scriptContent
            }, {
                name: 'appsscript',
                type: 'JSON',
                source: JSON.stringify({
                    "timeZone": "America/New_York",
                    "dependencies": {},
                    "exceptionLogging": "STACKDRIVER",
                    "runtimeVersion": "V8"
                })
            }]
        });
        console.log(`Updated script content for ID: ${scriptId}`);
        
        // Run the script in development mode (no deployment needed)
        console.log(`Running script in development mode (scriptId: ${scriptId})`);
        
        // Wait longer for the script to be fully ready (Google needs time to process)
        console.log('Waiting for script to be ready...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Try to get the script first to ensure it exists
        const token = gapi.client.getToken();
        
        // Verify the script exists before trying to run it
        const verifyUrl = `https://script.googleapis.com/v1/projects/${scriptId}`;
        console.log('Verifying script exists:', verifyUrl);
        
        const verifyResponse = await fetch(verifyUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token.access_token}`,
            }
        });
        
        if (!verifyResponse.ok) {
            console.error('Script verification failed:', await verifyResponse.text());
            throw new Error(`Script ${scriptId} not found or not accessible`);
        }
        
        console.log('Script verified, attempting to run...');
        
        // Use the correct endpoint format according to official documentation
        const runUrl = `https://script.googleapis.com/v1/scripts/${scriptId}:run`;
        
        console.log('Making direct API call to:', runUrl);
        const runResponse = await fetch(runUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                function: 'createMyForm',
                parameters: [],  // Add empty parameters array as per documentation
                devMode: true  // Run in development mode - works for script owner without deployment
            })
        });
        
        if (!runResponse.ok) {
            const errorText = await runResponse.text();
            console.error('Script execution failed:', errorText);
            throw new Error(`Script execution failed: ${runResponse.status} ${runResponse.statusText}`);
        }
        
        const runResult = await runResponse.json();
        
        if (runResult.error) {
            console.error('Apps Script execution error:', runResult.error);
            const errorMessage = runResult.error.details?.[0]?.errorMessage || "An unknown error occurred while running the script.";
            throw new Error(`Script execution failed: ${errorMessage}`);
        }
        
        if (runResult.response?.result) {
            return runResult.response.result;
        }
        
        throw new Error("Script executed but did not return the expected result.");
    }
};

export const updateAppsScript = async (formId: string, scriptContent: string): Promise<{ publishedUrl: string, editUrl: string }> => {
    // Validate formId to prevent common parsing errors
    if (!formId || formId === 'd' || formId === 'e' || formId.length < 10) {
        throw new Error(`Invalid Form ID: "${formId}". Please check the Google Form URL.`);
    }
    
    console.log('Updating Apps Script for Form ID:', formId);
    
    await getToken();
    await loadApi('forms');

    let formTitle = 'Untitled Form';
    
    try {
        // Get the form info using Forms API
        console.log('Getting form info for Form ID:', formId);
        const formResponse = await gapi.client.forms.forms.get({ formId });
        formTitle = formResponse.result.info?.title || 'Untitled Form';
        console.log('Form title:', formTitle);
    } catch (e: any) {
        console.error("Error accessing form:", e);
        const message = e.result?.error?.message || e.message || 'An unknown error occurred.';
        throw new Error(`Could not access the Google Form: ${message}`);
    }

    try {
        // Try using gapi.client first
        await loadApi('script');
        
        console.log("Creating a new standalone Apps Script project...");
        const createResponse = await gapi.client.script.projects.create({
            resource: {
                title: `Formulate AI Script - ${formTitle}`,
                files: [{
                    name: 'Code',
                    type: 'SERVER_JS',
                    source: scriptContent
                }]
            }
        });
        
        const scriptId = createResponse.result.scriptId;
        if (!scriptId) {
            throw new Error("Failed to create Apps Script project.");
        }
        console.log(`New script created with ID: ${scriptId}`);
        
        // Run the updateMyForm function
        const runResponse = await gapi.client.script.scripts.run({
            scriptId: scriptId,
            resource: {
                function: 'updateMyForm',
                devMode: true
            }
        });
        
        const result = runResponse.result as ScriptRunResult;
        
        if (result.error) {
            console.error('Apps Script execution error:', result.error);
            const errorMessage = result.error.details?.[0]?.errorMessage || "An unknown error occurred while running the update script.";
            throw new Error(`Script execution failed: ${errorMessage}`);
        }
        
        if (result.response?.result) {
            return result.response.result;
        }
        
        throw new Error("Script executed but did not return the expected URLs.");
    } catch (error: any) {
        // If gapi.client fails, use direct API calls
        console.log('gapi.client failed, trying direct API calls:', error);
        
        // Create project using direct API call (only title)
        const createResponse = await callAppsScriptAPI('projects', 'POST', {
            title: `Formulate AI Script - ${formTitle}`
        });
        
        const scriptId = createResponse.scriptId;
        if (!scriptId) {
            throw new Error("Failed to create Apps Script project.");
        }
        console.log(`Created script with ID: ${scriptId}`);
        
        // Update the project content with the actual script
        await callAppsScriptAPI(`projects/${scriptId}/content`, 'PUT', {
            files: [{
                name: 'Code',
                type: 'SERVER_JS',
                source: scriptContent
            }, {
                name: 'appsscript',
                type: 'JSON',
                source: JSON.stringify({
                    "timeZone": "America/New_York",
                    "dependencies": {},
                    "exceptionLogging": "STACKDRIVER",
                    "runtimeVersion": "V8"
                })
            }]
        });
        console.log(`Updated script content for ID: ${scriptId}`);
        
        // Run the script in development mode (no deployment needed)
        console.log(`Running script in development mode (scriptId: ${scriptId})`);
        
        // Wait longer for the script to be fully ready (Google needs time to process)
        console.log('Waiting for script to be ready...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Try to get the script first to ensure it exists
        const token = gapi.client.getToken();
        
        // Verify the script exists before trying to run it
        const verifyUrl = `https://script.googleapis.com/v1/projects/${scriptId}`;
        console.log('Verifying script exists:', verifyUrl);
        
        const verifyResponse = await fetch(verifyUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token.access_token}`,
            }
        });
        
        if (!verifyResponse.ok) {
            console.error('Script verification failed:', await verifyResponse.text());
            throw new Error(`Script ${scriptId} not found or not accessible`);
        }
        
        console.log('Script verified, attempting to run...');
        
        // Use the correct endpoint format according to official documentation
        const runUrl = `https://script.googleapis.com/v1/scripts/${scriptId}:run`;
        
        console.log('Making direct API call to:', runUrl);
        const runResponse = await fetch(runUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                function: 'updateMyForm',
                parameters: [],  // Add empty parameters array as per documentation
                devMode: true  // Run in development mode - works for script owner without deployment
            })
        });
        
        if (!runResponse.ok) {
            const errorText = await runResponse.text();
            console.error('Script execution failed:', errorText);
            throw new Error(`Script execution failed: ${runResponse.status} ${runResponse.statusText}`);
        }
        
        const runResult = await runResponse.json();
        
        if (runResult.error) {
            console.error('Apps Script execution error:', runResult.error);
            const errorMessage = runResult.error.details?.[0]?.errorMessage || "An unknown error occurred while running the update script.";
            throw new Error(`Script execution failed: ${errorMessage}`);
        }
        
        if (runResult.response?.result) {
            return runResult.response.result;
        }
        
        throw new Error("Script executed but did not return the expected URLs.");
    }
};
