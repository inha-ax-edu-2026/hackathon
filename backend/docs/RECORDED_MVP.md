# SAFE-PATH · 녹음형 상담 모델 비교실

HTML에서 **녹음 → STT → 전사문 확인 → 두 상담 모델 비교 → 위험 신호 자동 보고 → 상담 요약·기록 저장**을 테스트하는 FastAPI 로컬 앱이다. 서로 다른 위험 발언 3회 또는 즉시 위험 발언 1회에 로컬 교사 확인함에 보고한다. 사용자와 정한 녹음형 범위에 맞춰 `backend/`에서 구현했다. 외부 이메일·문자·슈퍼스쿨 알림과 실시간 음성은 미연결이다.

## 실행

처음 한 번 필요한 패키지를 설치한 뒤 **`start_local.cmd`를 더블클릭**하면 서버를 시작하고 브라우저의 비교 화면을 연다. Python 가상환경 `.venv`가 있으면 그 환경을 우선 사용한다. 서버가 실행되는 창은 열어 두고, 종료할 때 Ctrl+C를 누른다.

```powershell
python -m pip install -r requirements.txt
python run_local.py
```

실행기는 로컬 통신이 차단된 환경에서 무한 대기하지 않고 오류 번호와 실행 안내를 표시한다. 이미 같은 포트의 현재 버전 SAFE-PATH 서버가 실행 중이면 그 화면을 연다. 이전 버전 서버가 있으면 Ctrl+C로 종료하고 다시 실행하도록 안내한다. **업데이트 후에는 기존 서버를 종료하고 재실행한 뒤 브라우저를 새로고침한다.** 포트를 바꿀 때는 `python run_local.py --port 8001`을 사용한다.

이 폴더(`backend`)의 PowerShell에서 실행한다. Python 3.10 이상이 필요하다.

```powershell
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

- 비교 화면: <http://127.0.0.1:8000/>
- 교사 확인함·상담 기록: <http://127.0.0.1:8000/teacher>
- API 명세: <http://127.0.0.1:8000/docs>
- 계약 JSON: <http://127.0.0.1:8000/openapi.json>
- 서버 상태: <http://127.0.0.1:8000/health>

HTML 파일을 직접 열지 않고 서버 주소로 접속한다. Chrome·Edge의 localhost에서는 마이크를 사용할 수 있다. 진행 중 세션 인증·모델 문맥은 프로세스 메모리 기반이므로 워커를 여러 개 실행하지 않는다. 보관 기록은 SQLite로 유지한다. 설정을 저장하는 동안 진행 중 세션이 끊길 수 있는 `--reload`는 기본 실행에서 사용하지 않는다.

## 어디에 무엇을 입력하나요?

오른쪽 위 **API 설정**에서 학교 API 키를 입력하고 저장한다. 기존 `.env`에 키가 있으면 재입력할 필요가 없다. 키를 비워 두고 저장하면 기존 값을 유지한다. 키는 서버 `.env`에만 저장하고 브라우저 저장소·API 응답에는 넣지 않는다. 키 존재 표시가 실제 인증 성공을 의미하지는 않는다.

**API 기본 주소**에는 학교 API 발급·설정 안내의 Base URL을 `/v1/gateway`까지 입력한다. 기존에 들어 있던 `https://api.baze.co/v1/gateway`는 실제 접속이 검증되지 않은 값이다. 공식 일반 문서의 예시는 `https://factchat-cloud.mindlogic.ai/v1/gateway`이며, 학교가 제공한 주소가 다르면 학교 안내를 우선한다. 주소는 자동 변경하지 않는다. 입력한 주소에 키가 전송되므로 서비스 안내와 일치하는지 확인한다.

**저장·연결 확인**은 저장된 키로 모델 목록을 조회하고 네 프리셋이 목록에 있는지 표시한다. 상담이나 음성을 생성하는 검증은 아니다. 조회가 성공한 뒤 설정창을 닫고 실행 모드를 **BAZE 실제**로 바꿔 새 상담을 시작한다. 이 버튼에서도 인증 실패·요청 제한·시간 초과·연결 실패를 구분해 보여준다.

모델은 이미 아래 기본값을 쓴다. 다른 모델로 비교할 때만 정확한 ID를 수정하고 저장한 뒤 **새 상담**을 시작한다. 진행 중 세션은 시작 당시 설정을 유지한다.

| 화면 입력란 | 기본값 | `.env` 이름 | 역할 |
| --- | --- | --- | --- |
| API 키 | 발급받은 값 | `BAZE_API_KEY` | 학교 게이트웨이 인증 |
| 고품질형 상담 모델 | `claude-opus-5-5` | `BAZE_QUALITY_MODEL` | 왼쪽 상담·연결 권고 |
| 가성비형 상담 모델 | `gpt-6-luna` | `BAZE_ECONOMY_MODEL` | 오른쪽 상담·연결 권고 |
| STT 모델 | `stt-async-v6` | `BAZE_STT_MODEL` | 녹음 → 한국어 텍스트 |
| TTS 모델 | `gemini-3.8-flash-tts` | `BAZE_TTS_MODEL` | 답변 → 음성 |

**기존 `BAZE_MODEL`은 단일 연결 점검 API용이므로 두 모델 비교 화면에서는 비워 둬도 된다.** 고품질형·가성비형은 비교 후보 명칭이며 학교폭력 상담에서 검증된 성능 순위는 아니다.

학교 목록에는 STT v6가 있지만 공개 문서는 v5만 설명한다. v6 호출이 거절되면 STT 설정을 `stt-async-v5`로 바꾸고 새 상담을 시작해 확인한다. 오류 시 다른 모델로 자동 교체하지 않는다.

API 기본 주소·키·모델은 화면에서 저장해 새 세션부터 적용한다. 그 밖의 다음 설정은 `.env`에서 변경하고 서버를 재시작한다. 비어 있으면 기본값을 사용한다. 시스템 환경변수는 파일보다 우선한다.

| 설정 | 기본값 |
| --- | --- |
| `BAZE_BASE_URL` | 초기 미검증 값 `https://api.baze.co/v1/gateway`. 학교 안내의 실제 Base URL로 설정 |
| `BAZE_CHAT_PATH` | `/chat/completions/` |
| `BAZE_TIMEOUT_SECONDS` | `60` |
| `BAZE_TTS_VOICE` | `Sulafat` |
| `AI_MODE` | 기존 단일 API 기본 모드 `mock`. 비교실 모드는 화면에서 명시적으로 선택 |
| `TEACHER_ACCESS_TOKEN` | 비어 있으면 서버 첫 실행 시 무작위 접근키를 생성해 `.env`에 저장. 교사 확인함에서 이 값을 입력 |
| `COUNSEL_DATABASE_PATH` | `data/safepath.sqlite3`. `backend/` 안의 경로만 허용 |

## 사용하는 순서

1. **실행 모드 선택**: 데모는 외부 API 호출 없이 고정된 예시 답변과 규칙 기반 위험 탐지·자동 보고를 시연한다. 교사 확인함에도 데모로 표시된다. 실제 STT·Gemini 음성 합성은 하지 않는다. BAZE 모드는 키가 있어야 시작되고 실제 사용량이 발생한다.
2. **안내 확인·상담 시작**: 대화·요약 보관과 자동 교사 보고 안내에 동의한다. 실명·학번·연락처 대신 가상 사례로 테스트한다.
3. **입력**: 마이크로 최대 2분 녹음하거나 WAV를 불러오거나 텍스트를 직접 쓴다. 녹음은 16kHz 모노 16비트 WAV로 변환한다. 업로드는 12MB 이하, 0.2~120초 모노 16비트 WAV만 받는다.
4. **전사문 확인**: 실제 모드는 녹음 종료 후 STT를 시작한다. 10초 간격으로 최대 5분 조회한다. 인식된 문장을 수정한 뒤 전송한다. 파일 불러오기는 전사 버튼을 누른다. 전사문 확인 전에 원음이 STT 제공사에 전달된다는 점을 안내한다.
5. **두 모델에 보내기**: 확인한 발언을 먼저 저장·위험 검사한 뒤 두 모델에 동시에 전달한다. 즉시 위험 발언은 모델 응답을 기다리지 않고 보고한다. 모델별 이전 답변은 각각의 문맥으로 유지하므로 여러 턴 뒤에는 다른 대화 흐름이 될 수 있다.
6. **답변 듣기**: 선택한 답변만 음성으로 만든다. 데모는 브라우저 읽어주기로 명시한다. 실제 모드는 Gemini TTS를 사용하고 PCM을 WAV로 변환한다. 최근 네 개 서버 음성 캐시가 제거되면 다시 요청할 때 재합성 비용이 생길 수 있다.
7. **상담 마무리**: 두 모델의 누적 요약과 연결 권고를 비교하고 상담 기록에 저장한다. 이전 높은 연결 신호를 별도 유지한다. 수동 전달문 미리보기는 자동 보고와 별도이며 외부에 발송하지 않는다.
8. **교사 확인·화면 닫기**: 교사 확인함에서 보고·누적 요약·대화·근거를 열고 확인 상태를 남긴다. 화면 닫기·새 상담은 진행 중 세션과 음성 캐시만 정리하며 저장 기록은 유지한다. 30분 미사용 세션도 보관 기록을 남긴다.

학습 데이터셋을 입력할 필요는 없다. ‘확인한 이야기’에 가상 학생의 발언을 넣는다. 기본 사례 버튼으로 친구 관계·학교생활·부정 표현을 확인할 수 있다. 예비교사 검토용 추가 시드는 `docs/DEMO_SEEDS.json`을 참고한다.

## 연결 권고와 오류

매 응답은 `reply`, `assessment`로 구성한다. 권고는 `none / check / recommended / urgent`, 긴급성은 `normal / soon / immediate`다. 요약·판단 근거·확인 질문·학생 발언 인용을 함께 요구한다. 인용이 실제 학생 발언에 포함되는지와 JSON·긴급성 일관성을 검증한다. 실패하면 판단 오류로 표시한다. 이 검증이 분류의 정확성을 보장하지는 않는다.

위험 탐지는 정규화한 문장의 규칙 검사와 모델의 문맥 판단을 함께 사용한다. 모델은 **현재 발언 안의 인용 근거**로만 새 위험 횟수를 올릴 수 있다. 두 모델·선검사·재시도는 같은 발언 ID를 한 번만 센다. 부정·과거·인용을 구분하는 보조 규칙이 있으나 오탐·미탐 가능성은 남는다. 임박한 위험 신호는 상담 종료 전에도 사람의 도움 안내로 표시한다. AI의 권고와 관계없이 ‘선생님 도움 요청’을 열 수 있다.

## 위험 언어 자동 보고와 교사 화면

| 조건 | 동작 |
| --- | --- |
| 같은 상담에서 서로 다른 위험 발언 1~2회 | 횟수·근거 저장, 상담 화면에 누적 횟수 표시 |
| 서로 다른 위험 발언 3회 이상 | 교사 확인함에 보고 등록. 같은 상담의 후속 신호는 같은 보고에 누적 |
| “나 지금 죽을 거야” 같은 즉시 위험 표현 1회 | 횟수·상담 마무리·LLM 응답을 기다리지 않고 긴급 보고 등록 |
| 모델이 현재 발언을 즉시 위험으로 판단 | 해당 모델 응답 도착 즉시 보고. 다른 모델의 완료를 기다리지 않음 |
| 확인된 보고 뒤 새 즉시 위험 발언 | 같은 보고를 긴급·미확인 상태로 다시 표시 |

3회 기준은 사용자가 요청한 제품 동작이며 임상적 위험도 기준이 아니다. 즉시 위험 상황은 교사의 화면 확인을 기다리지 않고 가까운 사람에게 즉시 도움을 요청하도록 안내한다. 자동 보고는 **이 PC의 교사 확인함에 기록되었다는 뜻**이다. 이메일·문자 전송이나 교사 확인 완료를 뜻하지 않는다.

서버를 시작한 후 `backend/.env`의 **`TEACHER_ACCESS_TOKEN` 값**을 교사 화면의 ‘교사 접속키’에 넣는다. API 키와 다른 값이며 16자 이상이다. 비어 있으면 서버 시작 시 생성한다. 접근키는 교사에게만 공유하고 학생 화면에 넣지 않는다. 교사 화면은 3초마다 보고 목록을 갱신하며 ‘미확인’과 ‘확인함’을 구분한다. 확인 처리는 상담 해결 완료를 뜻하지 않는다.

저장 기록에는 익명 별칭만 있어 실명·담임 연결은 할 수 없다. 실제 학교 적용 시 담당 교사 계정·학생 식별·보관 정책·외부 통지 채널 연동이 별도로 필요하다. 상세 구현과 시연 절차는 [보고·기록 사용법](docs/REPORTING_AND_ARCHIVE.md)을 따른다.

한 모델만 실패하면 다른 결과는 유지하고 실패 모델만 재시도할 수 있다. 같은 발언 ID의 완료 결과를 재사용한다. 인증·크레딧·한도·시간 초과·잘못된 응답을 구분하며, 실패를 모의 성공으로 바꾸지 않는다. 공급사 오류 본문·키·검증 실패 원문은 반환하지 않는다. 요청 취소나 네트워크 유실 시 공급사 중복 과금 방지를 보장할 수는 없다.

응답 시간·토큰·차감 크레딧은 공급사 반환값만 표시한다. 값이 없으면 미제공으로 표시하며 임의 금액을 계산하지 않는다.

### Claude 고품질형에서 HTTP 400이 발생할 때

Claude는 구조화된 출력 스키마의 `minLength`, `maxLength`, `maxItems` 같은 제약을 직접 받지 않는다. 초기 구현은 Pydantic 스키마를 그대로 보내 이 제약이 포함되는 호환성 문제가 있었다. 현재 어댑터는 Claude 요청에서만 해당 제약을 필드 설명으로 옮기고, 필드·필수 항목·enum·추가 필드 금지는 유지한다. 응답은 원래 Pydantic 모델로 검증하므로 서버의 길이·개수·인용 검증은 계속 적용한다. Claude 요청에는 `max_tokens=8192`를 명시한다.

400 오류는 외부 오류 본문을 공개하지 않고 JSON 스키마·출력 토큰·기타 요청 형식 오류로 구분한다. 이 수정이 화면에 반영되려면 서버를 재시작하고 브라우저를 새로고침한 뒤 새 상담을 시작한다. 오류 화면만으로 학교 게이트웨이의 실제 거절 원인이 확정되는 것은 아니며, 수정 후 실제 재시도 결과를 확인해야 한다.

## 구현된 API

세션 생성 응답의 `session_id`는 URL에, `session_token`은 이후 요청의 `X-Session-Token` 헤더에 넣는다. 토큰은 브라우저 메모리에만 둔다. 세션 최대 발언 40회, 미사용 만료 30분이다.

| 메서드 | 경로 | 용도 |
| --- | --- | --- |
| GET / POST | `/api/local/settings` | 키 존재 여부·설정 조회 / 같은 PC·같은 출처에서 설정 저장 |
| POST | `/api/local/verify` | 저장된 키로 모델 목록 조회·선택한 모델 포함 여부. 실제 생성은 별도 검증 |
| POST | `/api/counsel/sessions` | `{mode, consent:true, notice_version:"archive-report-v1"}`로 보관·보고 안내에 동의한 비교 세션 시작 |
| POST / GET | `/api/counsel/sessions/{sid}/safety` | `{text,request_id}` 선검사·저장 / 누적 위험·보고 상태 조회 |
| POST | `/api/counsel/sessions/{sid}/transcriptions` | 원시 `audio/wav` 본문 수신, 외부에는 multipart 전송 |
| GET | `/api/counsel/sessions/{sid}/transcriptions/{job_id}` | 전사 상태·텍스트 조회 |
| POST | `/api/counsel/sessions/{sid}/messages` | `{text, request_id, retry_failed?}`로 두 모델 호출 |
| POST | `/api/counsel/sessions/{sid}/speech` | `{variant, request_id}`에 대한 WAV 음성 |
| POST | `/api/counsel/sessions/{sid}/finish` | 요약·권고 비교 및 기록 정리·보관. 반복 호출은 같은 결과 |
| POST | `/api/counsel/sessions/{sid}/handoff-preview` | `{variant, teacher, summary, consent:true}`. 발송 안 함 |
| DELETE | `/api/counsel/sessions/{sid}` | 진행 중 메모리 세션 닫기. 보관 기록과 보고 유지 |
| GET | `/api/teacher/reports` | 교사 접근키로 보고 목록 조회 |
| GET | `/api/teacher/reports/{id}` | 보고 근거·모델별 요약·대화 조회 |
| POST | `/api/teacher/reports/{id}/acknowledge` | 교사 확인 상태 기록 |
| GET | `/api/teacher/conversations` | 보관된 상담 목록 조회 |
| GET | `/api/teacher/conversations/{sid}` | 보관된 상담 상세 조회 |
| POST | `/api/ai/generate` | 기존 단일 모델 점검. 별도 `BAZE_MODEL` 사용 |

기계가 읽는 API 계약은 `/openapi.json`이 단일 출처다. 비교실은 같은 서버의 HTML을 사용하므로 별도 프론트 빌드가 없다. 별도 프론트에서의 쓰기 요청은 담당자와 계약을 맞춘 뒤 연결한다.

교사 API에는 `X-Teacher-Key`가 필요하다. 학생 세션 토큰으로는 교사 기록을 읽을 수 없다. 선검사를 생략하고 `/messages`를 호출해도 서버가 동일한 저장·위험 검사를 수행한다. `safety.delivery`는 `local_teacher_inbox` 또는 `not_reported`, `external_sent`는 현재 항상 `false`다. `/health`의 `counsel_contract=archive-report-v1`로 새 서버 실행 여부를 확인한다.

## 데이터 처리

원음은 서버 디스크에 쓰지 않고 전사 요청 동안 메모리에서 사용한다. 전송 전 초안·STT 작업·합성 음성 캐시도 메모리에서 관리한다. **전송해 확인한 학생 발언·모델 답변·누적 상담 요약·위험 감지 근거·보고와 교사 확인 상태는 `backend/data/safepath.sqlite3`에 저장한다.** 모델별 응답이 올 때마다 저장하며 마무리·닫기·만료 시 최종 정리한다. 모델 실패 시에도 이미 저장한 위험 보고와 학생 발언을 유지한다.

화면을 닫거나 서버를 재시작해도 저장 기록은 남고 교사 화면에서 다시 읽을 수 있다. 진행 중 세션 인증·이어 말하기는 재시작 후 복구하지 않는다. 키·세션 토큰·원음은 DB에 저장하지 않으며 `.env`·DB·실제 기록은 Git에서 제외한다. SQLite 파일은 암호화하지 않는 로컬 시연용 저장소이고 자동 보관 만료·영구 삭제 UI는 아직 없다. 실제 개인정보는 사용하지 않는다. 닫기·만료 후 도착한 모델 응답은 재저장하지 않는다.

외부 STT·상담·TTS 제공사의 보관은 별도 정책을 따른다. 우리 서버의 삭제가 외부 공급사 삭제를 뜻하지 않는다. 가상의 인물·상황으로 시연하며 실제 학생 상담 기록을 가져오지 않는다.

## 검증과 실행 환경의 제한

```powershell
python -m compileall -q app
node --check app/static/app.js
node --check app/static/teacher.js
python -m unittest discover -s tests -v
```

테스트는 ASGI 내부 요청과 대체 외부 응답으로 세션 격리·만료·삭제, 이력 분리, 요청 재사용, 부분 실패 재시도, 인용 검증, 전사 조회, PCM 변환·캐시, 오류·키 비노출을 검사한다.

이번 환경에서는 소켓을 사용하지 않는 검증 스케줄러로 ASGI·대체 응답 테스트 41개를 실행해 모두 통과했다. 즉시 위험 1회·누적 3회 보고, 중복 집계 방지, 과거 근거 재집계 금지, 모델 오류 중 보고 유지, 빠른 모델 결과 선반영, 교사 권한 분리, 재열기·데모 표시·교사키 비노출을 검증했다. 기존 Claude 스키마 호환·전사·음성·오류 비노출 회귀 검증도 유지한다. Python·JavaScript 문법과 화면 요소 연결을 확인했다. 이는 실제 BAZE 접속·브라우저 녹음·음성 왕복 검증을 대신하지 않는다.

현재 에이전트 실행 환경에서는 Windows 네트워크 권한 오류(WinError 10013)와 DNS 오류로 로컬 소켓·BAZE 실제 접속이 제한된다. Python 코드 import·문법·OpenAPI 생성과 실제 서버·외부 음성 왕복 검증은 구분한다. 사용자 PowerShell에서 위 실행 명령으로 서버를 시작해 브라우저·실제 API를 검증해야 한다. 키의 입력 여부는 확인됐지만 모델 인증·음질·실제 과금은 검증 전이다.

## 관련 자료와 출처

- [준비 자료·역할 분담](docs/REQUIRED_RESOURCES.md)
- [위험 보고·상담 기록 사용법](docs/REPORTING_AND_ARCHIVE.md)
- [시연용 가상 사례](docs/DEMO_SEEDS.json) — 예비교사 검토 전 초안
- [학교 모델 목록](docs/BAZE_MODEL_CATALOG.md)
- [기존 녹음형·실시간형 계획](docs/VOICE_IMPLEMENTATION_PLAN.md) — 당시 설계 보관본, 현재 구현 상태는 이 README 우선
- [BAZE Chat Completions](https://docs.mindlogic.ai/docs/general/api-gateway/reference/chat-completions)
- [BAZE 모델 조회·기본 주소 안내](https://docs.mindlogic.ai/docs/general/api-gateway/getting-started/models)
- [Claude 구조화된 출력·JSON 스키마 제한](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [BAZE STT](https://docs.mindlogic.ai/docs/general/api-gateway/reference/audio-stt)
- [BAZE TTS](https://docs.mindlogic.ai/docs/general/api-gateway/reference/audio-tts)
- [슈퍼스쿨 상담신청 안내](https://superschoolofficial.notion.site/326e90ac0a99801da465d501c50db881)

HTML·CSS·JavaScript는 직접 작성했으며 외부 에셋을 복사하지 않았다. 의존성 버전은 `requirements.txt`를 따른다. 각 패키지의 원 라이선스가 적용된다.
