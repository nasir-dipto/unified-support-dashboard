/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string | undefined;
  readonly VITE_DEFAULT_ORG_ID: string | undefined;
  readonly VITE_SHOW_DEMO_HINTS: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
