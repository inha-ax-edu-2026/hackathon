interface ImportMetaEnv {
  /** 백엔드 API 주소 (예: http://localhost:8000) */
  readonly VITE_API_BASE_URL?: string
  /** 'true'면 MSW 목 API 사용 */
  readonly VITE_USE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
