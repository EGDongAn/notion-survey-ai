# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Formulate AI is a web application that generates surveys using Google's Gemini AI and stores them in Notion databases. It allows users to:
- Generate survey questions with AI
- Create Notion databases for survey responses
- Store and manage survey data in Notion
- Analyze responses with AI
- Export data for further analysis

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite
- **AI Service**: Google Gemini AI (@google/genai)
- **Database**: Notion API (@notionhq/client)
- **Serverless**: Vercel Functions
- **Styling**: Tailwind CSS (inline classes)

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (default port 5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Configuration

Required environment variables:

### Client-side (in `.env.local`):
```
VITE_NOTION_DATABASE_ID=your_notion_parent_page_id
VITE_API_KEY=your_gemini_api_key
```

### Server-side (in Vercel):
```
NOTION_API_KEY=your_notion_integration_token
```

### Notion Setup Requirements
1. Create integration at notion.so/my-integrations
2. Share a Notion page with the integration
3. Get page ID from the URL
4. Set appropriate permissions (read, update, insert content)

## Architecture

### Application Flow
1. User enters topic → AI generates questions via Gemini
2. Questions are customizable in the UI
3. Notion database is created with survey structure
4. Form page is created in Notion
5. Database and page URLs are returned to the user

### Core Services

**`services/notionService.ts`**
- Notion database creation for surveys
- Response submission to databases
- Data retrieval from Notion
- Schema conversion between app and Notion formats

**`services/geminiService.ts`**
- Question generation with structured schema
- Question refinement based on user prompts
- Response data analysis
- JSON parsing with error recovery

**`api/notion.ts`** (Vercel Function)
- Proxy for Notion API calls
- Handles authentication server-side
- CORS configuration
- Error handling and logging

### Component Structure
- `App.tsx`: Main app with view routing and config validation
- `NotionFormGenerator`: Question generation and Notion database creation
- `Dashboard`: Survey management and response analysis
- `DataAnalyzer`: AI-powered response analysis
- All components use TypeScript interfaces from `types.ts`

### State Management
- Local React state with hooks
- Browser localStorage for form persistence
- No global state management library

## Key Implementation Details

### Notion API Integration
- Server-side API calls through Vercel Functions
- Client communicates with `/api/notion` endpoint
- CORS handled by serverless function
- API key kept secure on server

### Database Structure
- Each survey creates a new Notion database
- Questions mapped to Notion property types:
  - TEXT → rich_text
  - MULTIPLE_CHOICE → select
  - CHECKBOX → multi_select
  - SCALE → number
  - DATE → date

### Error Handling
- Configuration validation on app startup
- Graceful degradation for missing environment variables
- User-friendly error messages with actionable instructions
- API error handling with detailed logging

### Security
- Notion API key never exposed to client
- All sensitive operations server-side
- Page IDs validated before operations
- Rate limiting handled by Vercel

## Project Structure
```
/
├── api/              # Vercel serverless functions
│   └── notion.ts     # Notion API proxy endpoint
├── components/       # React UI components
├── services/         # Notion and Gemini AI integration
├── types.ts          # TypeScript type definitions
├── App.tsx           # Main application component
├── index.tsx         # Application entry point
├── vite.config.ts    # Build configuration
└── .env.local        # Environment variables (not in git)
```