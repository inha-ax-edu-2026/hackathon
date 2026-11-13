# Backend 개발 지침

루트 `AGENTS.md`를 함께 따른다. 작업 범위는 `backend/`다.

## 현재 상태

- 사용자가 요청한 SAFE-PATH 익명 녹음형 AI 사전 상담을 구현한다. 두 상담 모델 비교 HTML은 backend/app/static에 둔다.
- 서로 다른 위험 발언 3회 또는 즉시 위험 발언 1회에 교사 확인함(`/teacher`)으로 자동 보고한다. 원문·모델별 누적 요약·근거·보고 상태는 SQLite에 저장하며 화면 종료와 서버 재시작 후에도 유지한다.
- 교사 확인함은 로컬 테스트용 접근키로 보호한다. 외부 이메일·문자·슈퍼스쿨 발송과 학생 실명 식별은 미연결이다.
- Python 3.10 이상, FastAPI, HTTPX를 사용한다.
- BAZE 공식 문서의 Bearer 인증, 끝 슬래시 경로, 비동기 STT, 24kHz PCM TTS 규격을 확인했다. 학교 모델 목록과 공개 STT 문서의 v6/v5 차이는 실제 호출 검증이 필요하다.
- BAZE 실서버 접속은 아직 검증하지 않았다. `/health`의 `baze_configured`는 필수 설정 입력 여부만 뜻한다.

## 실행 및 확인

- 이 폴더에서 `python -m pip install -r requirements.txt`
- 이 폴더에서 `python run_local.py` 또는 `start_local.cmd`로 서버와 브라우저를 시작한다. 직접 실행은 `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log`다. 설정 저장 중 세션 유지를 위해 기본 실행에 `--reload`를 쓰지 않는다.
- `python check_ai.py`로 로컬 서버와 현재 모드의 AI 응답을 확인한다.
- `python -m unittest discover -s tests -v`로 통신 없는 ASGI·어댑터 계약을 검증한다. Windows 실행 환경의 소켓 차단과 실제 서버 검증은 구분해 보고한다.
- API 계약 및 설정 방법은 `README.md`, 기계가 읽는 계약은 `/openapi.json`이다.

## 구현 원칙

- 주제별 지침은 `AI_SYSTEM_PROMPT` 또는 이를 확장한 백엔드 코드에 둔다. 모델·키·접속 주소는 설정에서 읽는다.
- API 키는 `.env`에만 저장하고 응답·로그·예외 메시지에 넣지 않는다.
- 교사 접근키도 `.env`의 `TEACHER_ACCESS_TOKEN`으로 관리하며 학생 API·설정 API·로그에 노출하지 않는다. `data/`, SQLite 파일, 실제 상담 기록은 커밋하지 않는다.
- 저장·자동 보고 안내에 동의한 `notice_version=archive-report-v1` 세션만 시작한다. 위험 횟수는 세션·발언 ID로 중복 제거하며 모델 재시도나 두 모델 응답으로 늘리지 않는다. 명백한 즉시 위험 표현은 LLM 응답 전에 보고한다.
- 데모에서도 보고 규칙을 시연하되 기록·보고에 데모 표시를 유지한다. 저장 실패 시 보고 성공으로 표시하지 않는다. 원음은 서버 디스크에 저장하지 않는다.
- `.env.example`에는 설정 이름과 빈 값만 남긴다.
- `mock` 모드와 `baze` 모드는 명시적으로 선택한다. 실제 API 오류를 모의 성공 응답으로 바꾸지 않는다.
- 외부 오류 본문과 Authorization 헤더를 프론트엔드로 전달하지 않는다.
- 외부 호출 어댑터를 수정할 때는 정상 응답 외에 인증 실패·요청 제한·시간 초과·잘못된 응답을 확인한다.
