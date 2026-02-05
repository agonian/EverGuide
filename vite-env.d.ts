
interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_GOOGLE_ADS_ID: string
  readonly VITE_ADMIN_PASSWORD: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
