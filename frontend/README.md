# Frontend

2026 INHA AX-EDU 해커톤 출품작의 사용자 화면입니다. (React + TypeScript + Vite)

## 요구 사항

- Node.js 20.19+ (개발 환경: Node 26)
- npm

## 실행 방법

```bash
cd frontend
npm install
cp .env.example .env   # 필요한 값 입력
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다.

## 환경변수

| 키                  | 설명            |
| ------------------- | --------------- |
| `VITE_API_BASE_URL` | 백엔드 API 주소 |

## 포맷·린트 (Biome)

```bash
npm run check       # 검사
npm run check:fix   # 자동 수정
```

## 빌드

```bash
npm run build
npm run preview
```
