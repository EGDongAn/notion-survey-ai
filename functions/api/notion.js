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

  // Health check endpoint
  if (path === 'health') {
    return new Response(JSON.stringify({
      status: 'ok',
      environment: {
        hasNotionKey: !!env.NOTION_API_KEY,
        hasParentId: !!env.NOTION_PARENT_PAGE_ID,
        hasVersion: !!env.NOTION_VERSION,
        notionVersion: env.NOTION_VERSION || '2022-06-28',
        // Debug info
        envVarCount: Object.keys(env).length,
        envKeys: Object.keys(env).filter(k => !k.toLowerCase().includes('key') && !k.toLowerCase().includes('secret'))
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  // Check environment variables
  if (!env.NOTION_API_KEY) {
    return new Response(JSON.stringify({
      error: 'Notion API key not configured',
      debug: 'Set NOTION_API_KEY in Cloudflare Pages environment variables',
      availableKeys: Object.keys(env).length
    }), { 
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
}

// Handle POST requests
export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.searchParams.get('path');
  const databaseId = url.searchParams.get('databaseId');

  // Debug logging
  console.log('POST request:', {
    path,
    hasApiKey: !!env.NOTION_API_KEY,
    hasParentId: !!env.NOTION_PARENT_PAGE_ID,
    envKeys: Object.keys(env)
  });

  // Check environment variables
  if (!env.NOTION_API_KEY) {
    return new Response(JSON.stringify({ 
      error: 'Notion API key not configured',
      debug: 'Please set NOTION_API_KEY in Cloudflare Pages environment variables',
      hint: 'Make sure to add it in Settings > Environment variables > Production'
    }), { 
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  if (!env.NOTION_PARENT_PAGE_ID && path === 'databases') {
    return new Response(JSON.stringify({ 
      error: 'Notion parent page ID not configured',
      debug: 'Please set NOTION_PARENT_PAGE_ID in Cloudflare Pages environment variables'
    }), { 
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
        const parentPageId = env.NOTION_PARENT_PAGE_ID.replace(/-/g, '');
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
        return new Response('Invalid path', { 
          status: 400,
          headers: corsHeaders 
        });
    }

    console.log(`Calling Notion API: ${notionUrl}`);

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
      console.error('Notion API error:', {
        status: response.status,
        data: data
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

// Handle PATCH requests
export async function onRequestPatch(context) {
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
}