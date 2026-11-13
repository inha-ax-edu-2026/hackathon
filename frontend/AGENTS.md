# frontend/AGENTS.md

사용자 화면(시연의 주 무대). 공통 방향성·폴더 경계는 루트 `AGENTS.md`를 따르고, 이 파일은 frontend 전용 스택·명령어·컨벤션의 단일 출처다.

## 스택

- React 19 + TypeScript + Vite
- 포맷·린트: Biome (`biome.json`) — Prettier·ESLint 대신 사용. 2칸 들여쓰기, 작은따옴표, 세미콜론 생략, 줄 너비 100
- 서버 상태·API 호출: TanStack Query v5 (+ 개발 모드 Devtools)
- 패키지 매니저: npm (`package-lock.json` 커밋)

## 명령어

모두 `frontend/` 안에서 실행한다.

| 명령                | 용도                                |
| ------------------- | ----------------------------------- |
| `npm install`       | 의존성 설치                         |
| `npm run dev`       | 개발 서버 (http://localhost:5173)   |
| `npm run build`     | 타입 체크(`tsc -b`) + 프로덕션 빌드 |
| `npm run lint`      | Biome 린트                          |
| `npm run format`    | Biome 포맷 적용                     |
| `npm run check`     | 포맷·린트·import 정렬 검사          |
| `npm run check:fix` | 위 항목 자동 수정                   |
| `npm run preview`   | 빌드 결과 미리보기                  |

커밋 전 `npm run check`와 `npm run build`가 통과해야 한다. 파일을 수정한 뒤에는 `npm run check:fix`로 정리한다.

## 구조

```
src/
├── main.tsx   # 진입점
├── App.tsx    # 최상위 컴포넌트
├── lib/
│   ├── api.ts          # apiFetch: 백엔드 호출 공통 fetch 래퍼
│   └── queryClient.ts  # QueryClient 기본 옵션
└── assets/    # 이미지 등 정적 에셋
```

## 컨벤션

- 컴포넌트는 함수형 + named props 타입. 파일명은 PascalCase(`AttendanceList.tsx`).
- 환경변수는 `VITE_` 접두사만 브라우저에 노출된다. 키 이름은 `.env.example`에 추가하고 실제 값은 `.env`에 둔다.
- API 호출은 컴포넌트에서 `fetch`를 직접 쓰지 않고 `useQuery`·`useMutation` + `apiFetch`로 한다.
  기능별 쿼리 훅은 `src/api/{도메인}.ts`에 모으고, query key는 `['도메인', ...파라미터]` 배열로 쓴다.
- API 스펙은 `backend/`가 단일 출처다. 응답 형식은 backend 정의를 읽어 맞춘다.
- 백엔드 장애에 대비해 데모 경로에는 목(mock) 데이터 폴백을 둔다.
- 사용자 대상 문구는 한국어로 작성한다.
