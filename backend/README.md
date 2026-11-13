# SAFE-PATH · 녹음형 상담 모델 비교실

HTML에서 **녹음 → STT → 전사문 수정 → 두 상담 모델 동시 호출 → 답변 듣기 → 상담 요약·교사 연결 권고 비교**를 테스트하는 FastAPI 로컬 앱이다. 사용자와 정한 녹음형 범위에 맞춰 `backend/`에서 구현했다. 실시간 음성·실제 교사 발송·슈퍼스쿨 외부 API는 미연결이다.

## 실행

처음 한 번 필요한 패키지를 설치한 뒤 **`start_local.cmd`를 더블클릭**하면 서버를 시작하고 브라우저의 비교 화면을 연다. Python 가상환경 `.venv`가 있으면 그 환경을 우선 사용한다. 서버가 실행되는 창은 열어 두고, 종료할 때 Ctrl+C를 누른다.

```powershell
python -m pip install -r requirements.txt
python run_local.py
```

실행기는 로컬 통신이 차단된 환경에서 무한 대기하지 않고 오류 번호와 실행 안내를 표시한다. 이미 같은 포트의 SAFE-PATH 서버가 실행 중이면 그 화면을 연다. 포트를 바꿀 때는 `python run_local.py --port 8001`을 사용한다.

이 폴더(`backend`)의 PowerShell에서 실행한다. Python 3.10 이상이 필요하다.

```powershell
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

- 비교 화면: <http://127.0.0.1:8000/>
- API 명세: <http://127.0.0.1:8000/docs>
- 계약 JSON: <http://127.0.0.1:8000/openapi.json>
- 서버 상태: <http://127.0.0.1:8000/health>

HTML 파일을 직접 열지 않고 서버 주소로 접속한다. Chrome·Edge의 localhost에서는 마이크를 사용할 수 있다. 세션은 프로세스 메모리 기반이므로 워커를 여러 개 실행하지 않는다. 설정을 저장하는 동안 세션이 사라질 수 있는 `--reload`는 기본 실행에서 사용하지 않는다.

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

## 사용하는 순서

1. **실행 모드 선택**: 데모는 외부 API 호출 없이 고정된 예시 답변을 보여준다. 실제 위험도 판단·STT·Gemini 음성 합성은 하지 않는다. BAZE 모드는 키가 있어야 시작되고 실제 사용량이 발생한다.
2. **안내 확인·상담 시작**: 실명·학번·연락처 대신 가상 사례 사용 안내를 확인한다.
3. **입력**: 마이크로 최대 2분 녹음하거나 WAV를 불러오거나 텍스트를 직접 쓴다. 녹음은 16kHz 모노 16비트 WAV로 변환한다. 업로드는 12MB 이하, 0.2~120초 모노 16비트 WAV만 받는다.
4. **전사문 확인**: 실제 모드는 녹음 종료 후 STT를 시작한다. 10초 간격으로 최대 5분 조회한다. 인식된 문장을 수정한 뒤 전송한다. 파일 불러오기는 전사 버튼을 누른다. 전사문 확인 전에 원음이 STT 제공사에 전달된다는 점을 안내한다.
5. **두 모델에 보내기**: 같은 발언을 두 모델에 동시에 전달한다. 모델별 이전 답변은 각각의 문맥으로 유지하므로 여러 턴 뒤에는 다른 대화 흐름이 될 수 있다.
6. **답변 듣기**: 선택한 답변만 음성으로 만든다. 데모는 브라우저 읽어주기로 명시한다. 실제 모드는 Gemini TTS를 사용하고 PCM을 WAV로 변환한다. 최근 네 개 서버 음성 캐시가 제거되면 다시 요청할 때 재합성 비용이 생길 수 있다.
7. **상담 마무리**: 두 모델의 누적 요약과 연결 권고를 비교한다. 이전 높은 연결 신호를 별도 유지한다. 가상 담당 교사와 학생이 확인한 전달문을 입력해 미리보기를 만든다. **실제 발송하지 않는다.**
8. **정리**: 새 상담·세션 삭제로 화면과 서버 세션을 정리한다. 브라우저 종료 시에도 최선의 삭제 요청을 보내며, 실패에 대비해 30분 미사용 만료를 적용한다.

학습 데이터셋을 입력할 필요는 없다. ‘확인한 이야기’에 가상 학생의 발언을 넣는다. 기본 사례 버튼으로 친구 관계·학교생활·부정 표현을 확인할 수 있다. 예비교사 검토용 추가 시드는 `docs/DEMO_SEEDS.json`을 참고한다.

## 연결 권고와 오류

매 응답은 `reply`, `assessment`로 구성한다. 권고는 `none / check / recommended / urgent`, 긴급성은 `normal / soon / immediate`다. 요약·판단 근거·확인 질문·학생 발언 인용을 함께 요구한다. 인용이 실제 학생 발언에 포함되는지와 JSON·긴급성 일관성을 검증한다. 실패하면 판단 오류로 표시한다. 이 검증이 분류의 정확성을 보장하지는 않는다.

위험 단어만으로 자동 인계하지 않는다. 임박한 위험 신호는 상담 종료 전에도 사람의 도움 안내로 표시한다. AI의 권고와 관계없이 ‘선생님 도움 요청’을 열 수 있다. 실제 담당자·연결 기준은 예비교사와 확정해야 한다.

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
| POST | `/api/counsel/sessions` | `{mode, consent:true}`로 비교 세션 시작 |
| POST | `/api/counsel/sessions/{sid}/transcriptions` | 원시 `audio/wav` 본문 수신, 외부에는 multipart 전송 |
| GET | `/api/counsel/sessions/{sid}/transcriptions/{job_id}` | 전사 상태·텍스트 조회 |
| POST | `/api/counsel/sessions/{sid}/messages` | `{text, request_id, retry_failed?}`로 두 모델 호출 |
| POST | `/api/counsel/sessions/{sid}/speech` | `{variant, request_id}`에 대한 WAV 음성 |
| POST | `/api/counsel/sessions/{sid}/finish` | 요약·권고 비교. 반복 호출은 같은 결과 |
| POST | `/api/counsel/sessions/{sid}/handoff-preview` | `{variant, teacher, summary, consent:true}`. 발송 안 함 |
| DELETE | `/api/counsel/sessions/{sid}` | 세션 삭제 |
| POST | `/api/ai/generate` | 기존 단일 모델 점검. 별도 `BAZE_MODEL` 사용 |

기계가 읽는 API 계약은 `/openapi.json`이 단일 출처다. 비교실은 같은 서버의 HTML을 사용하므로 별도 프론트 빌드가 없다. 별도 프론트에서의 쓰기 요청은 담당자와 계약을 맞춘 뒤 연결한다.

## 데이터 처리

원음은 서버 디스크에 쓰지 않고 전사 요청 동안 메모리에서 사용한다. 대화·전사 결과·합성 음성도 서버 메모리에서 관리한다. 마무리하면 원대화·작업·음성 캐시를 비우고 요약만 유지한다. 서버 재시작 시 세션은 사라진다. 삭제·만료 후 도착한 응답은 재저장하지 않는다.

외부 STT·상담·TTS 제공사의 보관은 별도 정책을 따른다. 우리 서버의 삭제가 외부 공급사 삭제를 뜻하지 않는다. 가상의 인물·상황으로 시연하며 실제 학생 상담 기록을 가져오지 않는다.

## 검증과 실행 환경의 제한

```powershell
python -m compileall -q app
node --check app/static/app.js
python -m unittest discover -s tests -v
```

테스트는 ASGI 내부 요청과 대체 외부 응답으로 세션 격리·만료·삭제, 이력 분리, 요청 재사용, 부분 실패 재시도, 인용 검증, 전사 조회, PCM 변환·캐시, 오류·키 비노출을 검사한다.

이번 환경에서는 소켓을 사용하지 않는 검증 스케줄러로 ASGI·대체 응답 테스트 23개를 실행해 모두 통과했다. Python 문법·앱 import·OpenAPI 생성, JavaScript 문법, 가상 사례 JSON 파싱도 확인했다. 모델 목록 조회, 오류 비노출, 마무리 뒤 늦은 전사 폐기와 함께 Claude의 미지원 스키마 거절을 재현한 회귀 검증, 가성비형 요청 유지, Claude 응답의 서버 길이 검증, HTTP 400 오류 범주 구분을 확인했다. 이는 실제 BAZE 접속·브라우저 녹음·음성 왕복 검증을 대신하지 않는다.

현재 에이전트 실행 환경에서는 Windows 네트워크 권한 오류(WinError 10013)와 DNS 오류로 로컬 소켓·BAZE 실제 접속이 제한된다. Python 코드 import·문법·OpenAPI 생성과 실제 서버·외부 음성 왕복 검증은 구분한다. 사용자 PowerShell에서 위 실행 명령으로 서버를 시작해 브라우저·실제 API를 검증해야 한다. 키의 입력 여부는 확인됐지만 모델 인증·음질·실제 과금은 검증 전이다.

## 관련 자료와 출처

- [준비 자료·역할 분담](docs/REQUIRED_RESOURCES.md)
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
