# Edu 해커톤 백엔드

주제 확정 전의 공통 AI 연결 기반이다. Python 3.10 이상에서 실행한다.
FastAPI를 선택했으며 현재 환경에 설치된 버전을 `requirements.txt`에 고정했다.

## 설정 현황

- 게이트웨이 주소는 사용자가 제공한 `https://api.baze.co/v1/gateway`다.
- `.env`의 API 키와 모델 ID는 아직 입력되지 않았다.
- 기본 실행 모드는 `mock`이며, 모의 응답에 `[모의 응답]` 표시가 붙는다.
- BAZE 공식 안내 문서에 접속하지 못해 **실서버의 인증 방식, 요청 경로, 모델 ID와 호환 형식은 미검증**이다.
- 현재 어댑터는 OpenAI Chat Completions 형식과 Bearer 인증을 가정한다. 기본 요청 주소는 `https://api.baze.co/v1/gateway/chat/completions`다. 공식 안내에 맞춰 `BAZE_BASE_URL`, `BAZE_CHAT_PATH` 및 `app/ai.py`를 조정한 뒤 실호출을 확인해야 한다.

## 처음 실행하기

프로젝트 루트의 PowerShell에서 실행한다.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

`.env`가 없다면 한 번 복사한다. 기존 `.env`가 있으면 안의 값을 편집한다.

```powershell
if (-not (Test-Path -LiteralPath .env)) { Copy-Item -LiteralPath .env.example -Destination .env }
```

서버를 시작한다.

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

기본 Python에 필요한 패키지가 이미 설치돼 있다면 다음 명령으로도 실행할 수 있다.

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- 상태 확인은 `http://127.0.0.1:8000/health`다.
- API 문서는 `http://127.0.0.1:8000/docs`, 계약 JSON은 `/openapi.json`이다.
- Swagger UI는 외부 CDN을 사용하므로 인터넷 차단 시 `/openapi.json`과 아래 확인 명령을 사용한다.
- `.env`를 수정하면 서버를 재시작한다. 시스템 환경변수는 `.env`보다 우선한다.

다른 PowerShell에서 이 폴더로 이동한 뒤 확인한다.

```powershell
.\.venv\Scripts\python.exe check_ai.py
```

`mock` 모드에서는 외부 AI 요청을 보내지 않는다. `baze` 모드에서는 고정된 연결 확인 문장을 모델에 보내므로 API 사용량이 발생할 수 있다.

## 실제 BAZE 연결

`backend/.env`를 아래처럼 채운다. 모델 ID에는 학교가 제공한 정확한 문자열을 입력한다.

```dotenv
BAZE_BASE_URL=https://api.baze.co/v1/gateway
BAZE_CHAT_PATH=/chat/completions
BAZE_API_KEY=발급받은_API_키
BAZE_MODEL=학교에서_제공한_모델_ID
AI_MODE=baze
```

위 경로와 Bearer 인증은 현재의 호환 가정이다. 공식 문서 확인 후 확정한다. 게이트웨이가 기본 주소 자체에 POST를 받는다면 `BAZE_CHAT_PATH=/`로 설정한다.

서버를 재시작하고 `.\.venv\Scripts\python.exe check_ai.py`를 실행한다. 기본 Python으로 설치했다면 `python check_ai.py`를 사용한다. `mode=baze`에서 응답 수신이 확인돼야 실제 연결 성공이다. `/health`의 `baze_configured=true`는 필수 설정 입력 여부만 뜻한다.

인증 실패는 HTTP 502, 요청 제한은 503, 시간 초과는 504로 반환한다. 외부 오류 본문은 응답에 포함하지 않는다. 실제 호출이 실패하면 오류를 반환하며 모의 응답으로 자동 전환하지 않는다.

## 프론트엔드 연동 계약

팀원의 최신 `frontend/.env.example`에서 사용 중인 설정 이름은 `VITE_API_BASE_URL`이다. 프론트엔드 담당자가 여기에 `http://127.0.0.1:8000`을 설정하면 된다.
기본 CORS 허용 주소는 `http://localhost:5173`, `http://127.0.0.1:5173`이다. 다른 개발 주소를 쓰면 백엔드의 `CORS_ORIGINS`를 쉼표로 구분해 설정한다.

| 메서드 | 경로 | 용도 |
| --- | --- | --- |
| GET | `/health` | 실행 모드, 필수 설정 입력 여부 및 누락된 설정 이름 |
| POST | `/api/ai/generate` | 텍스트 요청 및 결과 반환 |

요청 JSON

```json
{"prompt": "연결을 확인해 주세요."}
```

모의 응답 JSON

```json
{"mode": "mock", "model": "mock", "text": "[모의 응답] 백엔드 연결이 정상입니다. 12자의 입력을 받았습니다."}
```

공백만 있는 입력이나 20,000자를 초과하는 입력은 HTTP 422를 반환한다. API 키는 요청에 넣지 않는다.

## 주제 확정 후 연결할 부분

- 키와 모델은 같은 `.env`에서 계속 읽는다.
- 간단한 역할 지침은 `AI_SYSTEM_PROMPT`에 설정한다. 여러 줄이면 dotenv의 큰따옴표 문법을 사용한다.
- 주제별 처리 흐름에서 `AIService.generate()`를 재사용하고, 필요한 데이터 처리와 엔드포인트를 이 폴더 안에 추가한다.

이 환경설정은 백엔드 앱이 BAZE를 호출하는 데 사용한다. 현재 Work 코딩 대화의 모델 제공자를 바꾸려면 해당 코딩 도구의 별도 설정이 필요하다.

## 현재 검증 범위

- Python 문법, 앱 import, OpenAPI 생성과 상태 확인 함수의 응답을 확인했다.
- 통신 없는 대체 클라이언트로 모의 모드, 입력 검증, 필수 설정 누락, 외부 요청 구성과 응답 파싱을 확인했다.
- 인증 실패, 요청 제한, 외부 오류, 리다이렉트, 잘못된 응답과 시간 초과에서 오류 처리를 확인했다. 상태·API 계약·오류 메시지에 테스트 키가 노출되지 않는지도 확인했다.
- 검증 환경에서 Windows `asyncio`의 내부 `socketpair` 연결이 대기한 채 진행되지 않았다. 실제 HTTP 서버 실행과 브라우저 CORS, 실서버 접속 검증은 미완료다.
- 사용자 PowerShell에서 위 실행 명령과 `check_ai.py`로 서버 동작을 확인할 수 있다.

## 개발 지침과 출처

- 공통 규칙은 루트 `AGENTS.md`, 백엔드 작업 방법은 이 폴더의 `AGENTS.md`를 따른다.
- [FastAPI](https://fastapi.tiangolo.com/tutorial/first-steps/), [CORS](https://fastapi.tiangolo.com/tutorial/cors/), [HTTPX](https://www.python-httpx.org/async/), [Chat Completions 형식](https://developers.openai.com/api/reference/resources/chat)을 참고했다.
- BAZE 설정 안내 주소는 `https://docs.factchat.kr/agent-setup/prompt.md`다. 본문 확보가 필요하다.
