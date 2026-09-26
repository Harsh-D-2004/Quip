/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Overrides the GitHub Release download link — see src/site.config.ts. */
  readonly VITE_DOWNLOAD_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
