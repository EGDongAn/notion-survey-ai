import { Client } from '@notionhq/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Notion client with server-side API key
const notion = new Client({
    auth: process.env.NOTION_API_KEY,
});

// CORS headers for browser requests
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        Object.entries(corsHeaders).forEach(([key, value]) => {
            res.setHeader(key, value);
        });
        return res.status(200).end();
    }

    // Set CORS headers for all responses
    Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    try {
        const { method, body, query } = req;
        const path = (query.path as string) || '';

        console.log('Notion API Request:', { 
            method, 
            path, 
            databaseId: query.databaseId,
            pageId: query.pageId,
            blockId: query.blockId,
            bodyKeys: body ? Object.keys(body) : [] 
        });

        // Check if Notion API key is configured
        if (!process.env.NOTION_API_KEY) {
            console.error('Notion API key not configured');
            return res.status(500).json({
                error: 'Notion API key not configured. Please set NOTION_API_KEY environment variable in Vercel.'
            });
        }

        // Route handlers based on path
        switch (path) {
            case 'databases':
            case 'database': // Support both for backward compatibility
                if (method === 'POST') {
                    try {
                        // Validate request body
                        if (!body || !body.parent || !body.properties) {
                            console.error('Invalid request body:', body);
                            return res.status(400).json({
                                error: 'Invalid request body. Missing parent or properties.'
                            });
                        }
                        
                        console.log('Creating database with:', JSON.stringify(body, null, 2));
                        
                        // Create a new database
                        const database = await notion.databases.create(body);
                        return res.status(200).json(database);
                    } catch (error: any) {
                        console.error('Notion API error when creating database:', error);
                        
                        // Provide specific error messages
                        if (error.code === 'object_not_found') {
                            return res.status(404).json({
                                error: 'Parent page not found. Please check that the page ID is correct and the integration has access to it.'
                            });
                        } else if (error.code === 'unauthorized') {
                            return res.status(403).json({
                                error: 'Unauthorized. Please ensure your Notion integration has access to the parent page.'
                            });
                        } else if (error.code === 'validation_error') {
                            return res.status(400).json({
                                error: `Validation error: ${error.message}`
                            });
                        } else if (error.code === 'duplicate_property_name') {
                            return res.status(400).json({
                                error: 'A database with the same name already exists. Try with a different name or the system will add a timestamp automatically.'
                            });
                        } else if (error.message?.includes('duplicate')) {
                            return res.status(409).json({
                                error: 'Database name conflict. The system will automatically add a timestamp to make it unique.'
                            });
                        }
                        
                        return res.status(500).json({
                            error: error.message || 'Failed to create database',
                            code: error.code,
                            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
                        });
                    }
                } else if (method === 'GET' && query.databaseId) {
                    try {
                        // Get database schema
                        const databaseId = query.databaseId as string;
                        console.log('Retrieving database schema for:', databaseId);
                        const database = await notion.databases.retrieve({
                            database_id: databaseId
                        });
                        return res.status(200).json(database);
                    } catch (error: any) {
                        console.error('Error retrieving database:', error);
                        return res.status(error.status || 500).json({
                            error: error.message || 'Failed to retrieve database',
                            code: error.code
                        });
                    }
                } else {
                    console.error('Invalid request for databases endpoint:', { method, hasDbId: !!query.databaseId });
                    return res.status(405).json({
                        error: `Method ${method} not allowed for ${path} endpoint. Expected POST for creation or GET with databaseId for retrieval.`
                    });
                }
                break;

            case 'pages':
                if (method === 'POST') {
                    try {
                        // Create a new page (for form responses)
                        console.log('Creating page with:', JSON.stringify(body, null, 2));
                        const page = await notion.pages.create(body);
                        return res.status(200).json(page);
                    } catch (error: any) {
                        console.error('Error creating page:', error);
                        return res.status(error.status || 500).json({
                            error: error.message || 'Failed to create page',
                            code: error.code
                        });
                    }
                } else {
                    return res.status(405).json({
                        error: `Method ${method} not allowed for pages endpoint`
                    });
                }
                break;

            case 'query':
                if (method === 'POST' && query.databaseId) {
                    // Query database for responses
                    const databaseId = query.databaseId as string;
                    const response = await notion.databases.query({
                        database_id: databaseId,
                        ...body
                    });
                    return res.status(200).json(response);
                } else {
                    return res.status(405).json({
                        error: `Method ${method} not allowed for query endpoint`
                    });
                }
                break;


            case 'update-database':
                if (method === 'PATCH' && query.databaseId) {
                    // Update database properties
                    const databaseId = query.databaseId as string;
                    const database = await notion.databases.update({
                        database_id: databaseId,
                        ...body
                    });
                    return res.status(200).json(database);
                }
                break;

            case 'page':
                if (method === 'GET' && query.pageId) {
                    // Get page content
                    const pageId = query.pageId as string;
                    const page = await notion.pages.retrieve({
                        page_id: pageId
                    });
                    return res.status(200).json(page);
                }
                break;

            case 'blocks':
                if (method === 'GET' && query.blockId) {
                    // Get block children
                    const blockId = query.blockId as string;
                    const blocks = await notion.blocks.children.list({
                        block_id: blockId
                    });
                    return res.status(200).json(blocks);
                } else if (method === 'PATCH' && query.blockId) {
                    // Append blocks
                    const blockId = query.blockId as string;
                    const blocks = await notion.blocks.children.append({
                        block_id: blockId,
                        children: body.children
                    });
                    return res.status(200).json(blocks);
                }
                break;

            default:
                console.error('Unknown API path:', path);
                return res.status(404).json({
                    error: `API endpoint not found: ${path}. Available paths: databases, pages, query, update-database, page, blocks`
                });
        }

        // This should never be reached as all cases should return
        return res.status(500).json({
            error: 'Unexpected error in API routing'
        });

    } catch (error: any) {
        console.error('Notion API error:', {
            message: error.message,
            code: error.code,
            status: error.status,
            stack: error.stack
        });
        return res.status(error.status || 500).json({
            error: error.message || 'Internal server error',
            code: error.code,
            path: path,
            method: method
        });
    }
}