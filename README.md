# Formulate AI - Notion Survey Generator with Gemini AI

🚀 Generate surveys automatically using AI and store them in Notion databases for easy management and analysis.

## Features

- 🤖 **AI-Powered Question Generation**: Generate relevant survey questions using Google's Gemini AI
- 📊 **Notion Database Integration**: Create structured databases in Notion for survey responses
- 📝 **Response Collection**: Store survey responses directly in Notion
- 📈 **Data Analysis**: AI-powered analysis of survey responses
- 🔄 **Real-time Sync**: All data stored and managed in your Notion workspace

## Prerequisites

1. **Notion Integration Setup**
   - Go to [Notion Integrations](https://www.notion.so/my-integrations)
   - Create a new integration and get your API key
   - Share a Notion page with your integration (this will be the parent page for surveys)

2. **Gemini API Key**
   - Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/google-form-notion.git
cd google-form-notion
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` with your credentials:
```env
# Notion Parent Page ID (where survey databases will be created)
VITE_NOTION_PARENT_PAGE_ID=your_notion_parent_page_id_here

# Google Gemini API Key (for AI question generation)
VITE_API_KEY=your_gemini_api_key_here

# Legacy support (deprecated, use VITE_NOTION_PARENT_PAGE_ID instead)
# VITE_NOTION_DATABASE_ID=your_notion_parent_page_id_here
```

## Development

Run the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Deployment on Vercel

### Step 1: Deploy to Vercel

1. Fork this repository
2. Import to [Vercel](https://vercel.com/new)
3. Deploy the project

### Step 2: Configure Environment Variables

In your Vercel project dashboard, go to Settings > Environment Variables and add:

#### Client-side Variables:
- `VITE_NOTION_PARENT_PAGE_ID`: Your Notion parent page ID (where databases will be created)
- `VITE_API_KEY`: Your Gemini API Key
- `VITE_NOTION_DATABASE_ID`: (Deprecated) Legacy support, use VITE_NOTION_PARENT_PAGE_ID instead

#### Server-side Variable:
- `NOTION_API_KEY`: Your Notion Integration Token (keep this server-side only for security)

### Step 3: Notion Setup

1. **Create an Integration**:
   - Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
   - Click "New integration"
   - Give it a name (e.g., "Notion Survey AI")
   - Select the workspace
   - Copy the "Internal Integration Token"

2. **Prepare Your Notion Structure**:
   - Create a main page (e.g., "Notion Survey AI")
   - Share this page with your integration
   - Click "..." menu → "Add connections" → Select your integration
   - Copy the page ID from the URL: `https://notion.so/Your-Page-Name-{PAGE_ID}`
   
3. **Survey Organization**:
   Surveys will be created with categories for better organization:
   - 체험단 (Product Testing)
   - 고객만족도 (Customer Satisfaction)
   - 서비스 피드백 (Service Feedback)
   - 이벤트 (Events)
   - 기타 (Others)
   
   Each survey database will be prefixed with `[Category]` for easy filtering.

3. **Configure Permissions**:
   - Ensure your integration has these capabilities:
     - Read content
     - Update content
     - Insert content
     - Read comments (optional)

## Usage

1. **Generate New Survey**:
   - Enter a topic
   - Let AI generate questions
   - Customize as needed
   - Click "Create in Notion"

2. **View Responses**:
   - Access your Notion workspace
   - Navigate to the created database
   - View and analyze responses

3. **AI Analysis**:
   - Use the dashboard to analyze responses
   - Get AI-powered insights from collected data

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **AI**: Google Gemini AI
- **Database**: Notion API
- **Deployment**: Vercel
- **Styling**: Tailwind CSS

## API Architecture

The application uses Vercel serverless functions to securely communicate with Notion API:

```
Client (Browser) → Vercel Function (/api/notion) → Notion API
```

This architecture ensures:
- API keys remain secure on the server
- No CORS issues
- Scalable serverless infrastructure

## Security Notes

- Notion API key is kept server-side only
- All API calls go through Vercel serverless functions
- Client-side only has access to public page IDs
- Sensitive data is never exposed to the browser

## Troubleshooting

**Notion API Issues**:
- Ensure your integration has proper permissions
- Check that the page is shared with your integration
- Verify the page ID is correct

**Environment Variables**:
- In Vercel, ensure variables are set for the correct environment (Production/Preview/Development)
- Redeploy after adding environment variables

**API Errors**:
- Check Vercel Function logs for detailed error messages
- Ensure all required environment variables are set
- Verify Notion API key is valid and active

## License

MIT

## Author

Your Name