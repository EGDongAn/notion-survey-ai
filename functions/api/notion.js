// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle OPTIONS requests for CORS
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Handle GET requests
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.searchParams.get('path');
  const databaseId = url.searchParams.get('databaseId');

  // Get environment variables with fallbacks for VITE_ prefix
  const NOTION_API_KEY = env.NOTION_API_KEY;
  const NOTION_PARENT_PAGE_ID = env.NOTION_PARENT_PAGE_ID || env.VITE_NOTION_PARENT_PAGE_ID;
  const NOTION_VERSION = env.NOTION_VERSION || '2022-06-28';

  // Health check endpoint with detailed debugging
  if (path === 'health') {
    // Check all possible ways environment variables might be available
    const envCheck = {
      direct: {
        NOTION_API_KEY: !!NOTION_API_KEY,
        NOTION_PARENT_PAGE_ID: !!NOTION_PARENT_PAGE_ID,
        NOTION_VERSION: !!env.NOTION_VERSION,
      },
      count: Object.keys(env || {}).length,
      keys: Object.keys(env || {}).filter(k => 
        !k.toLowerCase().includes('key') && 
        !k.toLowerCase().includes('secret') &&
        !k.toLowerCase().includes('token')
      ),
      context: {
        hasEnv: !!env,
        envType: typeof env,
      }
    };

    return new Response(JSON.stringify({
      status: 'ok',
      environment: {
        hasNotionKey: !!NOTION_API_KEY,
        hasParentId: !!NOTION_PARENT_PAGE_ID,
        hasVersion: !!env.NOTION_VERSION,
        notionVersion: NOTION_VERSION
      },
      debug: envCheck,
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  // Check environment variables
  if (!NOTION_API_KEY) {
    return new Response(JSON.stringify({
      error: 'Notion API key not configured',
      debug: {
        message: 'Set NOTION_API_KEY in Cloudflare Pages environment variables',
        hasEnv: !!env,
        envKeys: Object.keys(env || {}),
        help: 'Go to Cloudflare Dashboard > Workers & Pages > Your Project > Settings > Environment variables'
      }
    }, null, 2), { 
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
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
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': NOTION_VERSION,
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
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

// Handle POST requests
export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.searchParams.get('path');
  const databaseId = url.searchParams.get('databaseId');

  // Get environment variables with fallbacks for VITE_ prefix
  const NOTION_API_KEY = env.NOTION_API_KEY;
  const NOTION_PARENT_PAGE_ID = env.NOTION_PARENT_PAGE_ID || env.VITE_NOTION_PARENT_PAGE_ID;
  const NOTION_VERSION = env.NOTION_VERSION || '2022-06-28';

  // Debug logging
  console.log('POST request environment check:', {
    path,
    hasApiKey: !!NOTION_API_KEY,
    hasParentId: !!NOTION_PARENT_PAGE_ID,
    envCount: Object.keys(env || {}).length
  });

  // Check environment variables with detailed error
  if (!NOTION_API_KEY) {
    return new Response(JSON.stringify({ 
      error: 'Notion API key not configured',
      debug: {
        message: 'NOTION_API_KEY is missing from environment variables',
        instructions: [
          '1. Go to Cloudflare Dashboard',
          '2. Navigate to Workers & Pages > notion-survey-ai',
          '3. Go to Settings > Environment variables',
          '4. Add NOTION_API_KEY in both Production and Preview',
          '5. Save and redeploy'
        ],
        currentEnv: {
          hasEnv: !!env,
          keyCount: Object.keys(env || {}).length,
          availableKeys: Object.keys(env || {}).filter(k => !k.includes('KEY'))
        }
      }
    }, null, 2), { 
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  if (!NOTION_PARENT_PAGE_ID && path === 'databases') {
    return new Response(JSON.stringify({ 
      error: 'Notion parent page ID not configured',
      debug: {
        message: 'NOTION_PARENT_PAGE_ID is missing',
        instructions: 'Add NOTION_PARENT_PAGE_ID to environment variables'
      }
    }, null, 2), { 
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
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
        const parentPageId = NOTION_PARENT_PAGE_ID.replace(/-/g, '');
        requestBody = {
          ...body,
          parent: body.parent || {
            type: 'page_id',
            page_id: parentPageId
          }
        };
        console.log('Creating database with parent:', parentPageId);
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
        return new Response(JSON.stringify({
          error: 'Invalid path',
          validPaths: ['databases', 'pages', 'query', 'health']
        }), { 
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
    }

    console.log(`Calling Notion API: ${notionUrl}`);

    const response = await fetch(notionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.text();
    
    if (!response.ok) {
      console.error('Notion API error:', {
        status: response.status,
        data: data.substring(0, 500) // First 500 chars for debugging
      });
    }

    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3) // First 3 lines of stack
    }, null, 2), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

// Handle PATCH requests
export async function onRequestPatch(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const databaseId = url.searchParams.get('databaseId');

  // Get environment variables with fallbacks for VITE_ prefix
  const NOTION_API_KEY = env.NOTION_API_KEY;
  const NOTION_VERSION = env.NOTION_VERSION || '2022-06-28';

  if (!NOTION_API_KEY) {
    return new Response(JSON.stringify({
      error: 'Notion API key not configured'
    }), { 
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
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
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': NOTION_VERSION,
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
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}