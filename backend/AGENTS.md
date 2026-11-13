# Backend 개발 지침

루트 `AGENTS.md`를 함께 따른다. 작업 범위는 `backend/`다.

## 현재 상태

- 주제 확정 전이다. 현재 구현은 주제와 무관한 AI 연결 및 로컬 시연 기반이다.
- Python 3.10 이상, FastAPI, HTTPX를 사용한다.
- BAZE 공식 설정 문서의 인증·경로·요청 형식은 아직 확인하지 못했다. 현재 어댑터는 OpenAI Chat Completions 호환 형식을 가정한다.
- BAZE 실서버 접속은 아직 검증하지 않았다. `/health`의 `baze_configured`는 필수 설정 입력 여부만 뜻한다.

## 실행 및 확인

- 이 폴더에서 `python -m pip install -r requirements.txt`
- 이 폴더에서 `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`
- `python check_ai.py`로 로컬 서버와 현재 모드의 AI 응답을 확인한다.
- API 계약 및 설정 방법은 `README.md`, 기계가 읽는 계약은 `/openapi.json`이다.

## 구현 원칙

- 주제별 지침은 `AI_SYSTEM_PROMPT` 또는 이를 확장한 백엔드 코드에 둔다. 모델·키·접속 주소는 설정에서 읽는다.
- API 키는 `.env`에만 저장하고 응답·로그·예외 메시지에 넣지 않는다.
- `.env.example`에는 설정 이름과 빈 값만 남긴다.
- `mock` 모드와 `baze` 모드는 명시적으로 선택한다. 실제 API 오류를 모의 성공 응답으로 바꾸지 않는다.
- 외부 오류 본문과 Authorization 헤더를 프론트엔드로 전달하지 않는다.
- 외부 호출 어댑터를 수정할 때는 정상 응답 외에 인증 실패·요청 제한·시간 초과·잘못된 응답을 확인한다.
