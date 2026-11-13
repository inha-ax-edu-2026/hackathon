interface ImportMetaEnv {
  /** 백엔드 API 주소 (예: http://localhost:8000) */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
