# 공유 백엔드 · 접속키 없음

프로젝트 루트의 일반 PowerShell에서 실행한다.

```powershell
.\backend\start_shared.cmd
```

일반 모드·공유 모드 모두 프론트 연동키와 교사 접속키를 사용하지 않는다. 실행기가 별도 접근키를 만들지 않으며 교사 확인함과 서류 작업실도 바로 열린다. BAZE_API_KEY는 backend/.env에 유지한다. 실제 상담은 고성능 모델 한 개를 사용한다.

실행기는 공식 cloudflared를 SHA256 검증 후 실행하고, 8001 포트의 백엔드와 임시 HTTPS 주소를 연결한다. 공개 /health·상담 목록·서류 목록의 응답을 확인한 뒤 주소를 출력한다. 이 점검에는 AI 추론 호출이 없다.

검증에 성공하면 새 백엔드 주소를 담은 프론트 테스트 링크를 자동으로 연다. 사용자가 주소·접속키를 입력하지 않아도 된다. --no-browser 옵션으로 자동 열기를 끌 수 있다.

서버 창과 PC를 켜둔 동안 사용할 수 있다. Ctrl+C로 종료하고 새로 실행하면 임시 주소가 바뀔 수 있다. 기본 DB는 backend/data/shared.sqlite3이며 기존 로컬 data/safepath.sqlite3와 분리한다. 기록을 삭제하거나 인증 제거 때문에 기존 데이터를 초기화하지 않는다.

프론트는 현재 기본 주소로 자동 연결한다. 새 주소가 발급되면 프론트 **연결 설정**에서 한 번 변경하거나 VITE_API_BASE_URL·src/lib/api.ts의 기본값을 갱신한다. [프론트 연결 안내](../../frontend/API_CONNECTION.md)를 따른다.

| 기능 | 경로 |
| --- | --- |
| 서버 상태 | /health |
| API 문서 | /docs |
| 상담 | /api/student/counsel/*, /api/teacher/counsel/* |
| 교사 기록 | /api/teacher/reports, /api/teacher/conversations |
| 보고서·면담 전사 | /api/teacher/document-drafts, /api/teacher/interview-transcriptions |
| 보고서 화면 | /document-demo |
| 교사 확인함 | /teacher |

모든 위 경로는 접속키 없이 사용한다. 공개된 서버의 가상 자료는 주소를 아는 사람이 조회·변경할 수 있고 실제 모델 요청에는 사용량이 발생한다. 실제 학생 정보 대신 가상 자료를 사용한다.

공유 앱은 로컬 API 설정 변경·범용 생성·두 모델 비교 API를 계속 공개하지 않는다. CORS와 허용 호스트·같은 출처 쓰기 제한은 유지한다. 인증 제거는 공급사 BAZE 키·개별 상담 세션의 내부 토큰을 제거한다는 뜻이 아니다.

Docker 배포는 기존 Dockerfile을 사용한다. 서버 환경에는 BAZE_API_KEY·공개 HTTPS 주소·FRONTEND_AI_MODE=baze·영속 DB 경로를 설정한다. FRONTEND_ACCESS_TOKEN과 TEACHER_ACCESS_TOKEN은 더 이상 필요 없다.
