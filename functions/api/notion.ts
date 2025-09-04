export interface Env {
  NOTION_API_KEY: string;
  NOTION_PARENT_PAGE_ID: string;
  NOTION_VERSION?: string;
}

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle OPTIONS requests for CORS
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
};

// Handle GET requests
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.searchParams.get('path');
  const databaseId = url.searchParams.get('databaseId');

  // Check environment variables
  if (!env.NOTION_API_KEY) {
    return new Response('Notion API key not configured', { 
      status: 500,
      headers: corsHeaders 
    });
  }

  try {
    let notionUrl = 'https://api.notion.com/v1/';
    
    if (path === 'databases' && databaseId) {
      notionUrl += `databases/${databaseId}`;
    } else {
      return new Response('Invalid request', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const response = await fetch(notionUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.NOTION_API_KEY}`,
        'Notion-Version': env.NOTION_VERSION || '2022-06-28',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Notion API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
};

// Handle POST requests
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.searchParams.get('path');
  const databaseId = url.searchParams.get('databaseId');

  // Check environment variables
  if (!env.NOTION_API_KEY) {
    return new Response('Notion API key not configured', { 
      status: 500,
      headers: corsHeaders 
    });
  }

  if (!env.NOTION_PARENT_PAGE_ID && path === 'databases') {
    return new Response('Notion parent page ID not configured', { 
      status: 500,
      headers: corsHeaders 
    });
  }

  try {
    const body = await request.json();
    let notionUrl = 'https://api.notion.com/v1/';
    let requestBody = body;

    // Route to appropriate Notion endpoint
    switch (path) {
      case 'databases':
        // Create a new database
        notionUrl += 'databases';
        // Ensure parent is set correctly
        requestBody = {
          ...body,
          parent: body.parent || {
            type: 'page_id',
            page_id: env.NOTION_PARENT_PAGE_ID.replace(/-/g, '')
          }
        };
        break;
        
      case 'pages':
        // Create a new page (survey response)
        notionUrl += 'pages';
        break;
        
      case 'query':
        // Query database
        if (!databaseId) {
          return new Response('Database ID required for query', { 
            status: 400,
            headers: corsHeaders 
          });
        }
        notionUrl += `databases/${databaseId}/query`;
        break;
        
      default:
        return new Response('Invalid path', { 
          status: 400,
          headers: corsHeaders 
        });
    }

    console.log(`Notion API Request: ${notionUrl}`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(notionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.NOTION_API_KEY}`,
        'Notion-Version': env.NOTION_VERSION || '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.text();
    
    if (!response.ok) {
      console.error('Notion API error response:', data);
    }

    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Notion API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
};

// Handle PATCH requests
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const databaseId = url.searchParams.get('databaseId');

  if (!env.NOTION_API_KEY) {
    return new Response('Notion API key not configured', { 
      status: 500,
      headers: corsHeaders 
    });
  }

  if (!databaseId) {
    return new Response('Database ID required', { 
      status: 400,
      headers: corsHeaders 
    });
  }

  try {
    const body = await request.json();
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${env.NOTION_API_KEY}`,
        'Notion-Version': env.NOTION_VERSION || '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Notion API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
};