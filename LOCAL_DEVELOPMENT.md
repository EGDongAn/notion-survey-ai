# Local Development Guide

## Important Note

This application requires Notion API integration which **cannot run locally** without a backend server. The Notion API has CORS restrictions that prevent direct browser-to-API calls.

## Deployment Options

### Option 1: Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Import project to Vercel
3. Set environment variables in Vercel:
   - `NOTION_API_KEY`: Your Notion integration token
   - `VITE_NOTION_DATABASE_ID`: Parent page ID in Notion
   - `VITE_API_KEY`: Gemini AI API key

### Option 2: Local Development with Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Create `.env.local` file:
```env
NOTION_API_KEY=your_notion_integration_token
VITE_NOTION_DATABASE_ID=your_notion_parent_page_id
VITE_API_KEY=your_gemini_api_key
```

3. Run development server with Vercel:
```bash
vercel dev
```

This will run both the frontend and API functions locally.

### Option 3: Create a Local Backend Server

Create a separate Express server to handle Notion API calls:

```javascript
// server.js
const express = require('express');
const { Client } = require('@notionhq/client');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

app.post('/api/notion', async (req, res) => {
  // Handle Notion API calls
  // Copy logic from api/notion.ts
});

app.listen(3001, () => {
  console.log('Backend server running on port 3001');
});
```

## Why This Limitation?

- **CORS Policy**: Notion API doesn't allow direct browser requests
- **Security**: API keys should never be exposed in client-side code
- **Best Practice**: Sensitive operations should go through a backend

## Testing Without Notion

To test the UI without Notion integration:

1. Comment out the Notion API calls in `services/notionService.ts`
2. Return mock data instead
3. Focus on UI/UX development

## Production Deployment

For production, always use Vercel or another serverless platform that supports API functions.