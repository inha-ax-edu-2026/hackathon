interface ImportMetaEnv {
  /** 백엔드 API 주소 (예: http://localhost:8000) */
  readonly VITE_API_BASE_URL?: string
  /** 'true'면 MSW 목 API 사용, 'false'면 끔. 비우면 VITE_API_BASE_URL이 없을 때만 사용 */
  readonly VITE_USE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
