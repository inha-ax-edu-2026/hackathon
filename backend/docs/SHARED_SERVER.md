# 백엔드 공유 서버

## 바로 실행 — Windows 팀 테스트

프로젝트 루트의 일반 PowerShell에서 실행한다. 기존 8000 로컬 서버는 켜둬도 된다.

```powershell
.\backend\start_shared.cmd
```

처음에는 `python -m pip install -r backend/requirements.txt`로 의존성을 설치한다. 기존 `backend/.env`의 BAZE_API_KEY와 고성능 모델 설정을 재사용한다. 공유 상담은 기본 `FRONTEND_AI_MODE=baze`이며 가성비 모델로 대체하지 않는다.

실행기가 수행하는 일:

1. `backend/.env.shared`에 별도 프론트 연동키·교사 접속키를 생성한다. 재실행해도 키를 유지하며 화면·로그에 값을 출력하지 않는다.
2. 공식 cloudflared Windows x64 2026.11.0을 내려받아 공식 릴리스의 SHA256과 대조한 뒤 실행한다. 설치 위치는 무시되는 `.runtime/cloudflared/`다. Cloudflare 계정·ngrok 계정·공유기 포트 개방은 필요 없다.
3. 새 HTTPS 임시 주소를 받고, 127.0.0.1:8001에서 공유 전용 앱을 시작한다.
4. 공개 /health, 미인증 차단, 프론트 연동키, 교사 접속키를 실제 요청으로 확인한 뒤 주소를 출력한다. 이 점검은 유료 AI 추론을 호출하지 않는다.

주소 예: `https://<매번 바뀌는 이름>.trycloudflare.com`. 성공한 실행의 주소는 `.runtime/shared/status.json`에도 저장한다. Ctrl+C로 실행기가 만든 서버와 터널만 종료한다. 공유기·방화벽·보안 프로그램 설정은 바꾸지 않는다.

**PC와 실행 창을 켜둔 동안만 사용할 수 있는 임시 개발 서버다.** 주소는 재실행할 때 바뀐다. 실패 시 창의 오류 번호와 `.runtime/shared/server.log`, `tunnel.log`를 확인한다. 자동 재부팅 서비스나 상시 클라우드 배포는 아니다.

## 접속키와 테스트 순서

접속키는 `backend/.env.shared`에서 확인하고 필요한 개발자에게 별도로 전달한다. BAZE_API_KEY는 전달하지 않는다.

| 대상 | 주소 | 인증 |
| --- | --- | --- |
| 서버 상태 | /health | 없음 |
| API 문서·테스트 | /docs | Authorize에서 아래 키 입력 |
| 학생·교사 상담, 시드 초기화 | /api/student/counsel/*, /api/teacher/counsel/*, /api/demo/reset | X-Frontend-Access: FRONTEND_ACCESS_TOKEN |
| 교사 보고함·기록·학폭 서류·면담 전사 | /api/teacher/reports, conversations, document-drafts, interview-transcriptions | X-Teacher-Key: TEACHER_ACCESS_TOKEN |
| 서류 초안 작업실 | /document-demo | 화면에서 교사 접속키 입력 |
| 위험 보고 확인함 | /teacher | 화면에서 교사 접속키 입력 |

Swagger에서 상담 생성 → 반환한 case.id로 메시지 전송 → handoff → 교사 목록·요약 확인 순서로 테스트한다. 같은 request_id로 재요청하면 완료된 응답을 재사용한다. 문서 작업실의 기본 3종 자료는 가상 데이터다. 실제 모델 생성은 별도 외부 전송 확인이 필요하다.

공유 서버의 상담 API는 한 가상 시연 공간을 공유한다. 이 키는 실제 학생/교사별 로그인·권한이 아니다. 실제 학생 정보나 녹음을 올리지 않는다.

## 팀 React 프론트 연결

현재 디자인은 변경하지 않는다. 팀 프론트 담당자가 아래를 반영해야 한다.

```dotenv
VITE_API_BASE_URL=https://<실행기가 출력한 이름>.trycloudflare.com
VITE_USE_MOCK=false
```

주소 뒤에는 /api를 덧붙이지 않는다. 최신 프론트 API 함수가 /api/student/...를 붙인다. Vercel 환경변수 변경 후 재배포해야 한다. 공유 주소가 바뀌면 다시 변경한다.

- 프론트의 **연결 설정**에서 서버 주소·프론트 연동키를 입력하면 apiFetch가 X-Frontend-Access를 자동으로 붙인다. 선택한 교사키는 별도 교사 기록 API에 X-Teacher-Key로 붙인다. 키는 현재 탭 메모리에만 두며 새로고침·새 탭에서는 다시 입력한다. 현재 탭의 설정은 환경변수 기본값보다 우선한다. 운영용 사용자 인증·BFF 로그인은 별도 범위이며 키를 VITE_*에 넣지 않는다. 자세한 입력 위치와 검증은 [프론트 API 연결 안내](../../frontend/API_CONNECTION.md)를 따른다.
- 서류·면담 API를 React에서 직접 호출하려면 X-Teacher-Key도 별도로 붙이고 해당 출처를 명시적으로 허용해야 한다. 현재 Vercel 교차 출처 쓰기는 상담 계약과 데모 초기화에만 열려 있다. 우선 작업실 링크를 사용하면 같은 출처에서 동작한다.
- 허용 CORS: 기존 localhost:5173와 https://hackathon-tau-mocha.vercel.app. 임의 출처를 *로 열지 않는다.
- 새 1-3/2-4 서류는 기존 사후 서류 4종과 별도 API다. [프론트 대조 결과](FRONTEND_GAP_AUDIT.md)를 참고한다.

## 공개용 앱의 보호 범위

- 로컬 API 키·모델 설정 /api/local/*와 범용 /api/ai/generate를 차단하고 OpenAPI에서도 숨긴다.
- 두 모델 비교용 /api/counsel/*은 공유 앱에 등록하지 않는다.
- 프록시가 loopback 주소로 요청해도 프론트 키가 필요하다. X-Forwarded-*를 인증 근거로 쓰지 않는다.
- 교사 보고·문서·전사는 교사키로 보호한다. Swagger는 APIKeyHeader 인증을 제공한다.
- 공유 DB는 `backend/data/shared.sqlite3`. 기존 `data/safepath.sqlite3`를 공유 DB로 지정하면 시작을 거부한다. `data/`, `.env.shared`, 로그·바이너리는 Git에 올리지 않는다.

## 상시 클라우드 서버로 옮길 때

`backend/Dockerfile`은 같은 공유 앱을 실행한다. Docker 빌드 컨텍스트는 backend이며 허용 목록 방식으로 app과 requirements만 이미지에 넣는다. 기본 키 파일·DB는 이미지에 들어가지 않는다.

```powershell
docker build -t safepath-backend ./backend
```

호스팅 서비스에는 다음 환경변수를 서버 비밀값으로 등록한다. 이번 임시 테스트 서버 설정이 유료 호스팅 생성까지 수행하지는 않는다.

| 변수 | 설정 |
| --- | --- |
| BAZE_API_KEY | 이미 발급된 API 키 |
| BAZE_QUALITY_MODEL | claude-opus-5-5 또는 계정에서 검증한 고성능 모델 ID |
| FRONTEND_ACCESS_TOKEN | 새 임의 문자열 32바이트 이상 |
| TEACHER_ACCESS_TOKEN | 서로 다른 새 임의 문자열 32바이트 이상 |
| FRONTEND_AI_MODE | baze |
| PUBLIC_BASE_URL | 호스팅의 정확한 HTTPS 주소. Render에서는 RENDER_EXTERNAL_URL 자동 사용 가능 |
| COUNSEL_DATABASE_PATH | data/shared.sqlite3 |
| PORT | 호스팅이 지정하는 포트 |

`/app/data`에 UID 10001이 쓰기 가능한 영속 디스크를 연결하고 프로세스/인스턴스는 1개만 실행한다. 건강 확인 경로는 /health다. 일반 컨테이너 파일시스템만 사용하면 재배포 시 SQLite 기록이 사라질 수 있다. 실제 상시 배포에는 호스팅 계정과 영속 저장소 선택이 추가로 필요하다.

## 검증 범위

자동 검증은 프록시 주소 위장·키 누락·다른 키 사용·공개 설정 변경 차단·CORS·공유 DB 분리·비밀값 비노출을 포함한다. 터널 설치와 실제 HTTPS 접속은 실행 환경의 외부 DNS/소켓 권한이 필요하다. 단위 검증 통과만으로 공개 배포 성공으로 표시하지 않는다.


## 확인 결과와 공식 출처

- 통신 없는 ASGI·대체 응답 테스트 65개 통과. 현재 작업 환경에서는 소켓 권한 오류 10013과 외부 DNS 제한으로 터널 실행·공개 접속은 검증 전이다. 사용자 PowerShell에서 실행 시 실제 공개 점검을 수행한다.
- [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) — 임시 주소와 실행 수명.
- [고정한 공식 릴리스·SHA256](https://github.com/cloudflare/cloudflared/releases/tag/2026.11.0).
- [cloudflared 라이선스: Apache-2.0](https://github.com/cloudflare/cloudflared/blob/2026.11.0/LICENSE). 바이너리는 공식 서버에서 내려받으며 저장소에 재배포하지 않는다.
- [Render 기본 환경변수](https://render.com/docs/environment-variables), [영속 디스크](https://render.com/docs/disks).
