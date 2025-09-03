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
        return res.status(200).setHeaders(corsHeaders).end();
    }

    // Set CORS headers for all responses
    Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    try {
        const { method, body, query } = req;
        const path = (query.path as string) || '';

        // Check if Notion API key is configured
        if (!process.env.NOTION_API_KEY) {
            return res.status(500).json({
                error: 'Notion API key not configured'
            });
        }

        // Route handlers based on path
        switch (path) {
            case 'databases':
                if (method === 'POST') {
                    // Create a new database
                    const database = await notion.databases.create(body);
                    return res.status(200).json(database);
                }
                break;

            case 'pages':
                if (method === 'POST') {
                    // Create a new page (for form responses)
                    const page = await notion.pages.create(body);
                    return res.status(200).json(page);
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
                }
                break;

            case 'database':
                if (method === 'GET' && query.databaseId) {
                    // Get database schema
                    const databaseId = query.databaseId as string;
                    const database = await notion.databases.retrieve({
                        database_id: databaseId
                    });
                    return res.status(200).json(database);
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
                return res.status(404).json({
                    error: 'API endpoint not found'
                });
        }

        return res.status(405).json({
            error: 'Method not allowed'
        });

    } catch (error: any) {
        console.error('Notion API error:', error);
        return res.status(error.status || 500).json({
            error: error.message || 'Internal server error',
            code: error.code
        });
    }
}