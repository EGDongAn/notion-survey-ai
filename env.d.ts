/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
  // Parent page ID where survey databases will be created
  readonly VITE_NOTION_PARENT_PAGE_ID: string
  // Legacy support for old environment variable name
  readonly VITE_NOTION_DATABASE_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}