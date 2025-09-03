// Fix: Replaced missing type references with ambient declarations for GAPI and GIS
// to resolve TypeScript compilation errors.
// This file provides minimal type declarations for the Google API Client Library (GAPI)
// and Google Identity Services (GIS) to satisfy the TypeScript compiler.
// These are not exhaustive and are tailored to the usage within this project.

// --- Google Forms API Response Types (for URL Import) ---
declare namespace GAPI.Forms {
  interface Form {
    formId: string;
    info: {
      title: string;
      documentTitle: string;
    };
    items: FormItem[];
    linkedSheetId?: string;
  }

  interface FormItem {
    itemId: string;
    title: string;
    questionItem?: {
      question: Question;
    };
  }
  
  interface Question {
     questionId: string;
     required: boolean;
     choiceQuestion?: {
        type: 'RADIO' | 'CHECKBOX' | 'DROP_DOWN';
        options: { value: string }[];
     };
     textQuestion?: {
       paragraph: boolean;
     };
     scaleQuestion?: {
       low: number;
       high: number;
     };
     dateQuestion?: {};
     timeQuestion?: {};
  }
}


// --- GSI / GAPI Client Types ---
declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenResponse {
        access_token: string;
        expires_in: number;
        scope: string;
        token_type: string;
        error?: string;
        error_description?: string;
        error_uri?: string;
      }

      interface TokenClient {
        callback: (resp: TokenResponse) => void;
        requestAccessToken(options: { prompt: string }): void;
      }

      function initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
      }): TokenClient;
      
      function revoke(token: string, callback?: () => void): void;
    }
  }
}

declare namespace gapi {
  function load(
    apiName: 'client',
    callback: () => void
  ): void;

  namespace client {
    function init(args: {
      discoveryDocs?: string[];
      apiKey?: string;
    }): Promise<void>;

    function load(apiName: 'forms' | 'sheets' | 'drive' | 'script', version: 'v1' | 'v4' | 'v3'): Promise<void>;
    function load(url: string): Promise<void>;


    function setToken(token: object | null): void;
    function getToken(): { access_token: string } | null;
    
    const script: {
      projects: {
        create(resource: {
          resource: {
            title: string;
            files: {
              name: string;
              type: string;
              source: string;
            }[];
          };
        }): Promise<{ result: { scriptId: string } }>;
        updateContent(resource: {
           scriptId: string;
           resource: {
             files: {
                name: string;
                type: 'SERVER_JS';
                source: string;
             }[];
           };
        }): Promise<any>;
      };
      scripts: {
        run(resource: {
          scriptId: string;
          resource: {
            function: string;
            devMode: boolean;
          };
        }): Promise<{ result: any }>;
      };
    };
    
    const forms: {
       forms: {
           get(params: { formId: string }): Promise<{ result: GAPI.Forms.Form }>;
       }
    }

    const sheets: {
      spreadsheets: {
        values: {
          get(params: {
            spreadsheetId: string;
            range: string;
          }): Promise<{ result: { values: any[][] } }>;
        };
      };
    };

     const drive: {
      files: {
        get(params: {
          fileId: string;
          fields: string;
        }): Promise<{ result: { scriptId?: string; name: string; } }>;
      }
    }
  }
}