# frontend/AGENTS.md

사용자 화면(시연의 주 무대). 공통 방향성·폴더 경계는 루트 `AGENTS.md`를 따르고, 이 파일은 frontend 전용 스택·명령어·컨벤션의 단일 출처다.

## 스택

- React 19 + TypeScript + Vite
- 포맷·린트: Biome (`biome.json`) — Prettier·ESLint 대신 사용. 2칸 들여쓰기, 작은따옴표, 세미콜론 생략, 줄 너비 100
- 라우팅: React Router (`createBrowserRouter`, `src/router.tsx`)
- 서버 상태·API 호출: TanStack Query v5 (+ 개발 모드 Devtools)
- 목 API: MSW (`src/mocks/`). 화면에서 목 데이터 모드를 선택해 켜진다
- 스타일: Tailwind CSS v4 (`@tailwindcss/vite` 플러그인, 설정 파일 없이 `src/index.css`의 `@import 'tailwindcss'`로 로드). 커스텀 토큰은 같은 파일의 `@theme`에 추가한다
- UI 컴포넌트: shadcn/ui (Radix 기반, `components.json`). 아이콘은 `lucide-react`
- 패키지 매니저: npm (`package-lock.json` 커밋)

## 명령어

모두 `frontend/` 안에서 실행한다.

| 명령                | 용도                                                 |
| ------------------- | ---------------------------------------------------- |
| `npm install`       | 의존성 설치                                          |
| `npm run dev`       | 개발 서버 (http://localhost:5173)                    |
| `npm run build`     | 타입 체크(`tsc -b`) + 프로덕션 빌드                  |
| `npm run lint`      | Biome 린트                                           |
| `npm run format`    | Biome 포맷 적용                                      |
| `npm run check`     | 포맷·린트·import 정렬 검사                           |
| `npm run check:fix` | 위 항목 자동 수정                                    |
| `npm run preview`   | 빌드 결과 미리보기                                   |
| `npm test`          | Vitest 1회 실행 (상담·학교폭력 사안 API 계약 테스트) |

커밋 전 `npm run check`·`npm run build`·`npm test`가 통과해야 한다. 파일을 수정한 뒤에는 `npm run check:fix`로 정리한다.

## 구조

```
src/
├── main.tsx   # 진입점 (기본 서버 자동 연결, 목 모드 선택 시 MSW 시작)
├── App.tsx    # 셸 밖 페이지(시연 런처, 404)의 레이아웃
├── router.tsx # 경로 정의. 새 페이지는 알맞은 레이아웃의 children에 추가
├── pages/     # 경로 하나당 페이지 컴포넌트 하나
│   ├── DemoLauncherPage.tsx  # `/` 시연 런처(학생·교사 화면 열기, 시연 초기화)
│   ├── student/              # `/student/*` 내 상담, 챗봇 양식·대화, 개인상담 신청
│   └── teacher/              # `/teacher/*` 개인상담 관리 목록·상세
├── components/
│   ├── ui/      # shadcn/ui 컴포넌트 (CLI가 생성)
│   ├── shell/   # 슈퍼스쿨 셸(StudentShell·TeacherShell, LNB, 헤더, 종 버튼)
│   ├── counsel/ # 상담 화면 조각. 학생 챗봇(메시지 목록·입력창·마이크), 교사 목록·알림 시트,
│   │            #   detail/ 아래에 상담 건 상세 카드·사후 서류 카드
│   └── schoolViolence/ # 학교폭력 사안 화면 조각(접수 카드, 사안 정보·자료·서류 9종 체크리스트, 가상 사례 표시),
│                   #   form/ 아래에 서류 양식 표(FormView)·범례·근거 옆 패널·초안 진행 표시
├── api/       # 도메인별 API. counselTypes.ts(계약 타입), studentCounsel.ts·teacherCounsel.ts·demo.ts(쿼리·뮤테이션 훅),
│              #   schoolViolenceTypes.ts(사안 제안 계약 타입)·schoolViolence.ts(사안 훅, query key `['schoolViolence', ...]`)
├── hooks/     # 커스텀 훅 (useVoiceInput: 음성 입력, useHandoffToasts: 교사 전환 알림 토스트)
├── lib/
│   ├── counsel/        # 상담 화면 로직: 경로·라벨·양식 검증·시간 표기·교사용 가림·알림 계산·음성 오류·예시 문장
│   ├── schoolViolence/ # 사안 화면 로직: 경로·표기 라벨·날짜 표기, forms/ 아래에 서류 양식 레이아웃(102열 표)·체크 칸 선택지
│   ├── api.ts          # apiFetch: 백엔드 호출 공통 fetch 래퍼
│   ├── utils.ts        # cn(): Tailwind 클래스 병합
│   └── queryClient.ts  # QueryClient 기본 옵션
├── mocks/
│   ├── handlers.ts     # 목 핸들러 모음
│   ├── browser.ts·node.ts  # MSW 워커(브라우저)·서버(테스트)
│   ├── http.ts         # apiUrl 등 핸들러 공용 도우미
│   ├── counsel/        # 상담 목 API: 저장소(db, localStorage)·시드·학생/교사/시연 핸들러·목 챗봇(bot)·판단 규칙(judgment)·서류 초안
│   └── schoolViolence/ # 사안 목 API: 핸들러·시드(가상 사례)·사안 자료 원문·서류 9종 목록·응답 변환(store)·서류 집계(documents)·초안 생성기(drafts/). 사안 테이블은 counsel/db.ts의 Db에 있다
├── test/      # Vitest 테스트와 setup (메모리 Storage 주입)
└── assets/    # 이미지 등 정적 에셋
```

## 컨벤션

- 컴포넌트는 함수형 + named props 타입. 파일명은 PascalCase(`AttendanceList.tsx`).
- `src/` 아래 모듈은 상대 경로 대신 `@/` 별칭으로 import한다(예: `@/lib/api`). 같은 폴더 안의 파일만 `./`를 쓴다.
- 환경변수는 `VITE_` 접두사만 브라우저에 노출된다. 키 이름은 `.env.example`에 추가하고 실제 값은 `.env`에 둔다.
- API 호출은 컴포넌트에서 `fetch`를 직접 쓰지 않고 `useQuery`·`useMutation` + `apiFetch`로 한다.
  기능별 쿼리 훅은 `src/api/{도메인}.ts`에 모으고, query key는 `['도메인', ...파라미터]` 배열로 쓴다.
- API 스펙은 `backend/`가 단일 출처다. 응답 형식은 backend 정의를 읽어 맞춘다.
- 백엔드 장애에 대비해 데모 경로의 API는 `src/mocks/handlers.ts`에 목 응답을 둔다. 컴포넌트·쿼리 훅 코드는 목 여부를 몰라야 한다.
  핸들러가 없는 요청은 실제 백엔드로 그대로 간다. `public/mockServiceWorker.js`는 `msw init`이 만든 파일이라 손대지 않는다.
- 버튼·입력·다이얼로그 같은 기본 UI는 직접 만들지 않고 `npx shadcn@latest add <이름>`으로 추가한다.
  색은 `bg-primary`, `text-muted-foreground`처럼 `src/index.css`의 테마 토큰을 쓰고, 클래스를 조건부로 합칠 때는 `cn()`을 쓴다.
- 사용자 대상 문구는 한국어로 작성한다.
- 테스트는 상담 API와 학교폭력 사안 API 계약 이음매에만 건다(학교폭력 사안은 `schoolViolence.test.ts` 한 파일, 상담은 역할별 파일). `src/test/*.test.ts`에서 `apiFetch`로 계약 경로를 부르고 응답만 확인한다.
  목 저장소(`updateDb` 등)를 직접 만지지 않고, 준비 상태도 공개 API(접수 요청의 옵션 등)로 만든다.
  핸들러 내부 함수·저장소 키·컴포넌트 구조는 테스트하지 않는다. 저장소는 `setup.ts`가 테스트마다 `POST /api/demo/reset`으로 되돌린다.
