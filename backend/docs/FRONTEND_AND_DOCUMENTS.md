# 배포 프론트 연동·학교폭력 서류 초안 데모

## 현재 연결 범위

프론트 기준 소스는 `inha-ax-edu-2026/hackathon`의 `7086c0ee4caf6d1147fd4e90223e534698bf83db`이다. 배포 주소는 https://hackathon-tau-mocha.vercel.app/ 이며 이 버전은 백엔드 주소가 없으면 MSW 모의 API를 사용한다. 이 문서는 배포 설정을 변경했다는 의미가 아니다.

백엔드에는 프론트의 `counselTypes.ts`, `studentCounsel.ts`, `teacherCounsel.ts`와 맞는 **독립 데모 API**를 추가했다. 고정 가상 학생 김하늘·고정 가상 교사 1명 시연이며 실제 학생 로그인·교사 권한을 구현한 API가 아니다. 실제 기록을 처리하는 기존 `/api/counsel/*`, `/api/teacher/reports`, `/api/teacher/conversations`와 분리한다. `FRONTEND_AI_MODE=mock`은 고정 예시·발췌, `baze`는 고성능 모델 하나로 실제 상담·누적 요약을 생성한다. 실제 모드에서 가성비 모델이나 모의 응답으로 자동 대체하지 않는다. 기존 데이터는 시작 당시 모드를 유지하므로 설정 변경 후 새 상담을 만든다.

`FRONTEND_DEMO_ENABLED=true`로 켜며 기본값은 꺼짐이다. 상태는 `/health`의 `frontend_demo_enabled`, `integration_contract=document-demo-v1`로 확인한다. 데모 초기화는 데모 테이블만 초기화하고 기존 상담 기록·위험 보고·학교폭력 서류 초안은 지우지 않는다.

## 로컬 실행

1. 기존 서버 창에서 Ctrl+C로 종료한다.
2. `backend`에서 `python run_local.py` 또는 `start_local.cmd`를 실행한다.
3. 교사 확인함: http://127.0.0.1:8000/teacher
4. 학교폭력 서류 초안: http://127.0.0.1:8000/document-demo
5. 교사 확인함과 서류 작업실은 접속키 없이 바로 열린다.

서류 작업실에는 키를 입력해 접속한다. 초안 작업실의 실제 AI 모드는 고성능 단일 모델을 사용하며 외부 전송 안내 동의 후 실행한다. 원문 발췌 데모를 선택하면 생성 AI를 호출하지 않는다. 프론트의 BAZE 상담·실제 AI 초안·실제 STT에는 사용량이 발생한다. 외부 호출 오류를 데모 성공으로 바꾸지 않는다.

## 고성능 단일 모델 설정

`BAZE_QUALITY_MODEL=claude-opus-5-5`, `FRONTEND_AI_MODE=baze`, `FRONTEND_DEMO_ENABLED=true`로 설정하고 서버를 재시작한다. 상담마다 대화 이력을 보내고 현재 발언의 위험 근거를 검증한다. 요청 ID 재시도는 이미 완료된 응답을 재사용한다. 오류 후 수락한 발언·보고는 유지하며 같은 ID로 재시도해도 위험 횟수가 늘지 않는다.

`chat_open`은 학생의 대화 종료 여부다. 위험 감지 자동 보고 후에도 true로 남고 학생이 종료·교사 상담 버튼을 눌렀을 때 false가 된다. 교사의 승인 상태는 대화 닫기와 별개다. 즉시 위험은 모델 응답을 기다리지 않고 보고한 다음 고정 안전 안내를 돌려준다. 그 응답의 모델 표시는 `immediate-safety-rule`이며 유료 AI 호출을 하지 않는다.

2026-11-14 로컬 UI에서 저장된 키의 인증·목록 조회, `claude-opus-5-5` 실제 가상 상담 응답 및 JSON·인용 검증이 성공했다. 이는 상담 정확성이나 임상 안전성, STT/TTS 음성 왕복의 검증을 뜻하지 않는다.

API 설정의 ‘저장된 고성능 모델 응답 확인’ 또는 `POST /api/local/verify-quality`는 고성능 모델 한 개로 고정 가상 문장을 확인한다. 유료 사용량이 발생한다. 기존 A/B 비교실은 내부 점검 도구이며 서비스 프론트의 단일 모델 경로와 분리된다.

## 배포 프론트의 실제 호출 전환에 필요한 설정

현재 Vercel 앱은 모의 API가 응답하므로 백엔드만 수정해도 배포 화면의 데이터가 바뀌지 않는다. 프론트 담당자가 다음 두 환경변수를 설정하고 다시 배포해야 한다.

| 프론트 설정 | 넣을 값 |
| --- | --- |
| `VITE_API_BASE_URL` | 실제로 배포한 **HTTPS 백엔드 기본 주소**. `/api`는 붙이지 않음 |
| `VITE_USE_MOCK` | `false` |

일반 모드·공유 모드 모두 프론트 연동키와 교사 접속키 인증을 제거했다. 프론트는 기본 서버 주소로 자동 연결하며 새 탭에도 주소·모드를 공유한다. 자세한 내용은 frontend/API_CONNECTION.md를 따른다.

다른 사람의 PC에서 접속할 Vercel 환경에 `http://127.0.0.1:8000`을 넣으면 각자의 PC를 가리키므로 공용 연결 주소로 쓸 수 없다. 이 작업에서는 외부 백엔드 호스팅을 생성하거나 Vercel 설정을 변경하지 않았다.

백엔드 배포 시 `ALLOWED_HOSTS`에는 해당 백엔드의 호스트 이름을 포트·프로토콜 없이 넣는다. `FRONTEND_DEMO_ENABLED=true`이면 위 Vercel 출처의 **격리된 데모 경로**만 교차 출처 쓰기를 허용한다. 임의 출처, 로컬 API 설정 변경, 기존 실제 상담 API의 쓰기는 열지 않는다. 기존 실제 상담 API의 토큰 검사는 유지한다. 원본을 처리하는 교사 API도 접속키 없이 호출한다.

SQLite 저장 공간이 지속되는 단일 프로세스 백엔드가 필요하다. 기본 실행은 localhost 전용이다. 공용 배포 환경은 서비스 운영자가 HTTPS·저장 공간·실제 인증을 구성해야 하며, 이 데모 API에 실제 학생 자료를 넣지 않는다. BAZE API 키는 백엔드에만 둔다.

## 프론트 호환 API

| 메서드 | 경로 | 동작 |
| --- | --- | --- |
| POST / GET | `/api/student/counsel/cases` | 가상 상담 생성 / 고정 가상 학생의 상담 목록 |
| GET | `/api/student/counsel/cases/{id}` | 양식·메시지 포함 학생 상세 |
| POST | `/api/student/counsel/cases/{id}/messages` | 발언 ID 재시도 중복 방지. 위험 누적 3회·즉시 위험 1회 보고 후에도 대화 유지 |
| POST | `/api/student/counsel/cases/{id}/handoff` | 학생 요청으로 교사 상담 전환·대화 닫기 |
| POST | `/api/student/counsel/cases/{id}/finish` | 대화 닫기. 기존 자동 보고는 유지 |
| GET | `/api/teacher/counsel/cases` | 전환된 상담·기존 가상 개인상담 목록 |
| GET | `/api/teacher/counsel/cases/{id}` | 요약·양식·기존 사후 서류 4종. 대화 전문은 반환하지 않음 |
| POST | `/api/teacher/counsel/cases/{id}/read` | 읽음 표시 |
| POST | `/api/teacher/counsel/cases/{id}/approve` | 승인대기 → 상담대기 |
| PATCH | `/api/teacher/counsel/cases/{id}/documents/{kind}` | 사후 서류 선택·본문 수정. 수정하면 검토 완료 해제 |
| POST | `/api/teacher/counsel/cases/{id}/documents/{kind}/approve` | 선택한 서류를 검토 완료 표시 |
| POST | `/api/demo/reset` | 독립 프론트 데모 기록만 초기화 |

서류 선택에 따른 시간 절감은 프론트 계약에 맞춘 8분→1분 가정치이며 실측 결과가 아니다. 프론트에서 이미 구현한 일반 사후 서류 4종과 아래 학교폭력 보고서 2종은 서로 다른 기능이다.

## 학교폭력 서류 2종의 자료와 처리

사용자가 제공한 `양식1-3_사안접수보고서.pdf`, `양식2-4_사안조사보고서.pdf`의 항목을 읽고 초안 화면으로 재구성했다. 공식 원본 PDF의 서식을 완전히 재현하거나 기관에 제출하는 기능은 아니다. 참고 원본 PDF 파일을 저장소에 복제하지 않았다.

자료는 다음과 같이 분리한다.

- **이전 AI 상담 이력**: 특정 가상 학생의 이전 상담 내용. 현재 사안의 입증 자료로 단정하지 않는다.
- **학생별 진술서**: 피해 관련·가해 관련·목격 학생이 작성했다고 가정한 원문. AI가 학생 진술서를 대신 작성하지 않는다.
- **개별 면담 전사**: 학교폭력 사안 처리 과정에서 학생·학부모·교사가 진행한 면담. 화상과 대면 모두 녹음 자료를 받아 사용할 수 있지만 Zoom 자동 접속·자동 녹음 연동은 구현하지 않는다.
- **기본 정보**: 슈퍼스쿨을 가정한 가상 학생·학교 정보. 실제 슈퍼스쿨 DB와 연결되어 있지 않다. 장애 등록 정보·성별·연락처·보호자 통보 이력은 미제공 상태를 유지한다.

교사가 기존 **가상** 상담 건을 선택해 작업실을 열려면 `/document-demo?case_id={id}`를 사용한다. 이 시연에서는 이름이 김하늘인 가상 상담 건만 연결하며, 익명 상담을 실제 학생에게 자동 매핑하지 않는다. 기본 작업실은 준비된 가상 이력을 사용한다.

### 생성 방식

기본 **원문 발췌 데모**는 받은 텍스트 일부를 해당 항목에 인용한다. 고정 예시의 학생별 진술은 분리하며, 새 입력의 유형·쟁점·판단 요소를 분석했다고 표시하지 않는다. 자료가 부족한 칸은 빈 값으로 남긴다.

**BAZE 실제 AI 초안**은 고성능 모델 하나에 세 가지 자료와 작성 가능한 항목만 보낸다. 교사가 가상 자료 외부 전송 안내에 동의해야 호출한다. 모델이 인용한 문장이 원문에 실제 포함되는지, 항목이 허용된 목록인지 검증하며 실패한 결과는 저장하지 않는다. 인용 검증은 요약 내용의 정확성까지 보장하지 않으므로 교사 확인이 필요하다.

장애 여부·자체해결 요건·분리 조치·긴급조치·학생선수 여부·보호자 통보·재발 현황·사안번호 등은 AI가 채우지 않는다. 제공 정보가 없으면 교사가 직접 확인·입력한다. 진위·가해 사실·점수·조치·서명·결재·제출도 자동 결정하지 않는다.

### 교사 검토와 저장

항목마다 원문 출처·인용·미입력 상태·교사 수정 여부를 표시한다. 교사가 수정한 값에는 기존 인용이 전체 내용을 입증하는 것으로 표시하지 않는다. 검토 확인은 내용 읽음 상태이며 공식 결재가 아니다. 빈 항목은 검토 완료로 표시할 수 없다.

생성한 원문·초안·수정 내용·검토 상태는 같은 SQLite의 `document_drafts` 테이블에 저장한다. 버전 번호가 달라진 오래된 수정 요청은 거절한다. 새로 열기·서버 재시작 뒤에도 읽을 수 있다. 인쇄/PDF로 저장과 JSON 내려받기를 지원하며 미검토·가상 사례 표시를 유지한다.

## 면담 텍스트 추출

- 복사·붙여넣기와 UTF-8 TXT 불러오기를 지원한다. TXT는 100KB 및 자료별 20,000자 이하.
- 실제 STT는 모노 16비트 PCM WAV, 0.2~120초, 12MB 이하 구간만 지원한다. 긴 면담은 이번 시연 범위에 포함하지 않는다.
- 교사키·참여자 녹음 및 외부 전사 동의 확인 헤더가 있어야 업로드한다.
- STT 작업은 메모리에 최대 10분 보관한다. 원음은 서버 디스크·DB에 저장하지 않는다.
- 화자를 자동 구분하지 않으므로 면담 전사 결과의 참여자·일시·내용을 확인하고 수정한 후 자료에 반영한다.
- 스캔 PDF OCR·HWP·DOCX 파싱·Zoom SDK 연동·자동 측별 분리 녹음은 별도 후속 범위다.

## 추가 API

다음 요청에는 접속키가 필요 없다. OpenAPI가 기계가 읽는 계약의 단일 출처다.

| 메서드 | 경로 | 용도 |
| --- | --- | --- |
| GET | `/api/teacher/document-drafts/sources?case_id=` | 기본 가상 자료·양식 목록. 선택한 가상 상담 연결 가능 |
| POST | `/api/teacher/document-drafts` | `{template, sources:{history,statements,interview},mode,variant,external_consent}`로 초안 생성 |
| GET | `/api/teacher/document-drafts` | 최근 50개 초안 목록 |
| GET | `/api/teacher/document-drafts/{id}` | 원문·초안·검토 상태 |
| POST | `/api/teacher/document-drafts/{id}/save` | `{revision,fields:[{id,value,reviewed}]}`로 수정·검토 저장 |
| POST | `/api/teacher/interview-transcriptions` | 원시 WAV 본문, `X-Audio-Consent:true` 필요 |
| GET | `/api/teacher/interview-transcriptions/{job_id}` | 전사 상태·결과 |

## 프론트 담당자에게 필요한 작은 UI 추가

현재 배포 프론트에는 이 두 보고서의 작업실 링크가 없다. 루트 지침의 폴더 소유 경계에 따라 `frontend/` 파일은 직접 변경하지 않았다. 프론트 담당자가 `frontend/src/pages/teacher/CounselDetailPage.tsx`의 교사 상세에 다음 링크를 추가하면 된다. `Button`은 이미 import되어 있다.

```tsx
{import.meta.env.VITE_API_BASE_URL && counsel.kind === 'chatbot' && counsel.handoff && (
  <Button asChild variant="outline">
    <a
      href={`${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/document-demo?case_id=${encodeURIComponent(counsel.id)}`}
      target="_blank"
      rel="noreferrer"
    >
      학폭 서류 초안 작업실
    </a>
  </Button>
)}
```

새 창은 백엔드의 작업실이며 교사키를 그 창에 직접 입력한다. 키를 URL·프론트 환경변수·브라우저 저장소로 전달하지 않는다. 모의 API에서 만든 상담 ID는 백엔드에 없으므로 호출 전환·새 데모 상담 생성 후 사용한다.

## 검증

통신 없는 ASGI·MockTransport 테스트 59개가 통과했다. 새 검증은 프론트 응답 계약·3회 누적/즉시 전환·발언 중복 방지·문서 수정 시 검토 해제·교사 조회·출처 인용·민감 항목 비추정·저장 버전 충돌·원음 비저장·CORS 경계·데모 초기화의 실제 기록 보존을 포함한다. 고성능 모델의 실제 상담 응답은 추가로 확인했다. 전체 음성 왕복과 배포 프론트의 HTTPS 백엔드 왕복은 별도 검증이 필요하다.


### 현재 PC의 프론트 로컬 빌드 점검 결과

원본 frontend를 수정하지 않고 최신 소스의 빌드 사본을 backend 안에서 준비했다. 이 PC의 Node는 v22.14.0이며 React Router 의존성이 요구한 최소 Node는 22.22.0이다. `npm ci`도 `Exit handler never called` 오류로 완료되지 않아 로컬 React 빌드 완료를 주장하지 않는다. 프론트 담당자의 배포 디자인을 변경하지 않았으며 배포 앱은 계속 기존 MSW 설정으로 동작한다. 해당 환경을 복구하거나 프론트 담당자의 정상 빌드 환경에서 API 전환을 확인해야 한다.
