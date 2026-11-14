# 학교폭력 사안 API 제안 계약: backend 보고서

- 대상: backend 담당자
- 작성: frontend (티켓 09). 이 문서는 backend 파일을 바꾸지 않는다. 변경이 필요한 곳은 11절 체크리스트로만 적었다.
- 목적: 프론트가 먼저 만든 사안 단위 제안 계약(ADR 0002)을 backend가 확정·구현할 수 있게 한다. backend가 확정하면 프론트 타입(`src/api/schoolViolenceTypes.ts`)을 backend 정의에 맞춰 고친다.
- 기준 코드
  - 프론트: 통합 브랜치 `frontend/school-violence-case` (티켓 01~08 병합, 팁 `59bd7d4`). 아래 계약은 기억이 아니라 이 코드에서 뽑았다.
    - 타입: `src/api/schoolViolenceTypes.ts`, 훅: `src/api/schoolViolence.ts`
    - 목 서버(= 계약 시연본): `src/mocks/schoolViolence/handlers.ts`, `edit.ts`(저장·승인 규칙), `documents.ts`(집계·사안 정보 반영), `infoUpdate.ts`(사안 정보 검증·학생별 칸 동기화), `store.ts`(단계·진행률), `documentCatalog.ts`(서류 9종), `drafts/`(1-3·2-4 칸), `materials.ts`·`seed.ts`(시드)
    - 상담 상세 추가분: `src/api/counselTypes.ts`의 `school_violence_case_id`·`school_violence_recommendation`, `src/mocks/schoolViolence/recommendation.ts`
  - backend: `origin/main`의 `backend/app/school_documents.py`(`/api/teacher/document-drafts`), `backend/app/teacher.py`, `backend/app/frontend_demo.py`, `backend/app/main.py`, `backend/docs/SHARED_SERVER.md`, `backend/docs/FRONTEND_GAP_AUDIT.md`

## 1. 한 줄 요약

backend `document-drafts`는 「서류 초안 한 장」 단위이고 자료 텍스트를 요청마다 통째로 보낸다. 프론트가 제안하는 계약은 「사안」이 단위다. 사안이 정보·자료·서류 9종을 들고, 서류마다 초안을 한 장씩 갖는다. 칸 형식(`id`·`label`·`value`·`evidence`·`reviewed`·`edited`)과 인용·개정 번호(`revision`)·409 충돌 규칙은 backend 것을 그대로 재사용했고, 승인(approve)·반복 구조 칸·사안 정보 반영은 프론트가 더했다. 승인 규칙·시드 인물·교사 인증·반복 구조 칸은 서로 다르므로 3~8절의 차이 항목을 합의해야 한다.

## 2. 최종 제안 계약

공통

- 경로 접두어: `/api/teacher/school-violence/cases` (상담 계약 `/api/teacher/...` 규칙을 따름)
- JSON 필드 이름은 snake_case, 시각은 ISO 8601 문자열(`+09:00`)
- 오류 본문은 backend와 같은 `{ "detail": "문장" }`. 프론트는 `detail` 문자열을 사용자에게 그대로 보인다(`src/lib/schoolViolence/errors.ts`). 문장이 아니면 「잠시 후 다시 시도해 주세요.」로 대체한다. 그러니 어투는 backend 것(「~합니다」)이어도 되지만 사용자에게 보여도 되는 한국어 문장이어야 한다. FastAPI의 422 검증 오류도 현재 backend 핸들러(`입력 형식 또는 길이가 올바르지 않습니다.`)처럼 문자열 `detail`이어야 한다.
- 아래 문구 중 오류 문장은 목이 쓰는 문구다(제안).

### 2.1 엔드포인트 일람과 기존 `document-drafts` 대응

| #   | 메서드·경로 (`.../cases` 기준)                 | 용도                                                 | 기존 `document-drafts`의 대응                                     |
| --- | ---------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | `GET /cases`                                   | 사안 목록(최근 접수 순)                              | 없음(초안 목록 `GET /document-drafts`는 초안 최근 50개)           |
| 2   | `POST /cases`                                  | 상담 건에서 사안 접수                                | 없음                                                              |
| 3   | `GET /cases/{id}`                              | 사안 상세: 정보·자료(원문 포함)·서류 9종 요약·진행률 | `GET /document-drafts/sources`가 자료 텍스트를 주지만 사안과 무관 |
| 4   | `PATCH /cases/{id}/info`                       | 사안 정보 수정, 서류에 즉시 반영                     | 없음(admin 칸 값은 서버 상수)                                     |
| 5   | `GET /cases/{id}/documents/{form_id}`          | 서류 한 장 상세(칸 목록)                             | `GET /document-drafts/{id}`                                       |
| 6   | `POST /cases/{id}/documents/{form_id}/draft`   | AI 초안 만들기·다시 만들기                           | `POST /document-drafts`                                           |
| 7   | `POST /cases/{id}/documents/{form_id}/save`    | 바꾼 칸의 값·검토 표시 저장                          | `POST /document-drafts/{id}/save`                                 |
| 8   | `POST /cases/{id}/documents/{form_id}/approve` | 서류 승인(결재·제출 아님)                            | 없음                                                              |
| 9   | `GET /api/teacher/counsel/cases/{id}` (기존)   | 응답에 필드 2개 추가                                 | 해당 없음                                                         |

`form_id`는 가이드북 서식 번호 문자열(`1-1` `1-2` `1-3` `2-1` `2-2` `2-3` `2-4` `2-7` `3-1`). 이번 시연에서 작업 가능한 서류는 `1-3`·`2-4`뿐이다(`available: true`). `backend`의 `template: "intake"|"investigation"`은 각각 `1-3`·`2-4`에 해당한다(reference `양식1-3`·`양식2-4`).

### 2.2 공통 응답 모양

사안 요약 서류(`SchoolViolenceDocumentSummary`). 사안 상세의 `documents[]`와 서류 상세의 앞부분이 이 모양이다.

```json
{
  "form_id": "2-4",
  "name": "사안조사 보고서",
  "stage": "investigation",
  "author": "전담조사관",
  "author_note": "자체조사 시 책임교사",
  "approval": "학교장 결재",
  "approval_note": "조사관 배정 시 제로센터에도 보고",
  "available": true,
  "locked_reason": null,
  "description": "양측 확인서와 면담 전사로 경위·양측 주장·쟁점·판단요소별 확인 사실 초안을 써요.",
  "status": "none",
  "revision": 1,
  "counts": null
}
```

- `stage`: `"intake" | "investigation" | "review"`
- `status`: `"none"`(초안 없음) `| "reviewing" | "approved"`
- `locked_reason`: 작업 가능(`available: true`)한 서류인데 지금은 초안을 만들 수 없는 이유. 없으면 `null`. 2-4는 사안 자료에 진술서(`statement`)나 면담 전사(`interview_transcript`)가 하나도 없으면 「조사 자료(진술서·면담 전사)가 없어 초안을 만들 수 없어요. 자료가 모이면 열려요.」. 시연 범위 밖 서류는 `locked_reason`을 `null`로 두고 `available: false`만 준다.
- `counts`: 초안이 없으면 `null`, 있으면 서버가 센 값. 화면은 이 값을 그대로 보인다(프론트가 다시 세지 않는다).

```json
{ "total": 69, "ai": 44, "ai_reviewed": 0, "info": 5, "judgement": 17, "judgement_remaining": 17 }
```

| 필드                  | 정의                                                                            |
| --------------------- | ------------------------------------------------------------------------------- |
| `total`               | 서류 칸 전체(처리 방식 상관없이). 화면 문구 「AI 작성 {ai}칸 / 전체 {total}칸」 |
| `ai`                  | `kind: "narrative"`이면서 `value`가 비어 있지 않은 칸 수(검토 대상)             |
| `ai_reviewed`         | 그중 `reviewed: true`인 칸 수                                                   |
| `info`                | `kind: "admin"`이면서 읽는 시점의 `value`가 비어 있지 않은 칸 수                |
| `judgement`           | `kind`가 `manual` 또는 `sensitive`인 칸 수                                      |
| `judgement_remaining` | 그중 `value`가 빈 칸 수. 「판단 칸 {n}개 남음」. 승인한 뒤에도 남을 수 있다     |

서류 상세(`SchoolViolenceDocument`)는 요약에 `fields`가 붙는다(초안이 없으면 `fields: []`).

```json
{
  "document": {
    "...요약 필드 전부...": "...",
    "fields": [
      {
        "id": "issue.1.victim_claim",
        "label": "주요 쟁점 1 · 피해 관련 학생 주장",
        "kind": "narrative",
        "value": "• 한지우: 거절하면 사진을 더 올릴 것 같아 무서워서 줬다. ...",
        "evidence": [
          {
            "source_id": "m_interview_victim",
            "quote": "거절하면 사진을 더 올릴 것 같아 무서워서 줬어요."
          }
        ],
        "reviewed": false,
        "edited": false
      }
    ]
  }
}
```

- `kind`: `"narrative"`(AI 칸) `| "admin"`(사안 정보에서 가져옴) `| "manual"`(판단·수동 입력) `| "sensitive"`(민감 정보, 판단 칸처럼 비움). backend에서는 응답에 직접 실리지 않던 값이다(차이 8항).
- `value`: 문자열 하나. 여러 줄은 `\n`. 최대 6000자. 선택(체크) 칸은 고른 선택지 id를 쉼표로 이은 문자열(`"victim_objection,not_in_activity"`), 선택 안 했으면 `""`(부록 B).
- `evidence[].source_id`: 사안 자료 `id`(자유 문자열). `quote`는 그 자료 `body`의 부분 문자열.
- `edited`: 교사가 AI 칸 값을 고쳤는지. 판단 칸은 처음부터 사람이 쓰는 칸이라 `true`가 되지 않는다. `evidence`는 고쳐도 지워지지 않는다(화면이 「교사 수정」 표시로 인용이 전부를 입증하지 않음을 알린다).

사안 정보(`SchoolViolenceInfo`)와 관련 학생:

```json
{
  "school_name": "가온중학교",
  "case_number": "2026-27",
  "received_at": "2026-11-13T20:40:00+09:00",
  "teacher_name": "이수진",
  "vice_principal": "문경숙",
  "students": [
    {
      "name": "한지우",
      "grade": 2,
      "class": 3,
      "number": 21,
      "gender": "male",
      "role": "victim",
      "guardian_notice": { "notified": true, "at": "2026-11-13T21:00:00+09:00", "method": "유선" },
      "note": "신고자 본인",
      "found_during_investigation": false
    }
  ],
  "separation": { "enforced": null, "period": null, "exception_reasons": [] }
}
```

- `role`: `"victim" | "offender" | "witness"`, `gender`: `"male" | "female"`
- `guardian_notice`: `notified: false`이면 `at`·`method`는 `null`로 저장한다.
- `separation.enforced`: 아직 정하지 않았으면 `null`. `exception_reasons`는 부록 B의 분리 예외 사유 id 배열.
- `found_during_investigation`: 조사 중에 확인된 학생이면 `true`(접수 때부터 정보에 들어 있어도 표시만 다르다).

사안 자료(`SchoolViolenceMaterial`):

```json
{
  "id": "m_statement_victim",
  "kind": "statement",
  "title": "피해 관련 학생 진술서 (한지우)",
  "body": "[학생 작성 확인서] 피해 관련 학생 한지우 ...",
  "stage": "investigation",
  "demo_preloaded": true,
  "counsel_case_id": null
}
```

- `kind`: `"counsel_record" | "statement" | "interview_transcript" | "student_record"`
- `demo_preloaded`: 조사 중에 모일 자료를 시연 때문에 접수 직후 미리 넣어 두었으면 `true`(8절 13항 참고).
- `counsel_case_id`: 상담 기록이면 연결된 상담 건 ID, 아니면 `null`.

### 2.3 엔드포인트별 상세

#### 1) `GET /api/teacher/school-violence/cases`

응답 200: `{ "cases": [ListItem] }`. 최근 접수 순(`created_at` 내림차순).

```json
{
  "id": "sv_...",
  "stage": "intake",
  "case_number": "2026-27",
  "received_at": "2026-11-13T20:40:00+09:00",
  "students": [ /* RelatedStudent */ ],
  "progress": { "approved": 0, "total": 2 }
}
```

`progress`는 작업 가능한 서류(`available: true`) 중 승인한 수 / 작업 가능한 서류 수. 지금은 `total`이 2다.

#### 2) `POST /api/teacher/school-violence/cases`

요청: `{ "counsel_case_id": "seed_4" }`. 선택 항목 `demo_material_kinds`(`"statement"`·`"interview_transcript"` 배열)는 접수 직후 미리 붙일 시연용 조사 자료의 종류다. 보내지 않으면 모두 붙이고, 빈 배열이면 조사 자료 없이 접수해 2-4가 잠긴 사안을 만든다(프론트 계약 테스트가 「자료 없는 사안」을 공개 API만으로 만들려고 쓴다. 시연 전용이라 backend가 운영 API에 둘 필요는 없고, 두지 않으면 프론트 테스트를 맞춘다).

| 상태 | 조건                                                                 | `detail`(제안 문구)                       |
| ---- | -------------------------------------------------------------------- | ----------------------------------------- |
| 201  | 성공. 본문 `{ "case": SchoolViolenceCase }`                          |                                           |
| 422  | `counsel_case_id`가 없거나 빈 문자열                                 | 접수할 상담 건을 보내 주세요.             |
| 422  | `demo_material_kinds`가 배열이 아니거나 허용 종류가 아닌 값을 포함   | 미리 붙일 조사 자료 종류를 확인해 주세요. |
| 404  | 없는 상담 건, 또는 상담이 아직 진행 중(`status: "in_progress"`)인 건 | 상담 건을 찾을 수 없어요.                 |
| 409  | 이미 사안으로 접수한 상담 건(상담 건은 사안 하나에만 연결)           | 이미 사안으로 접수한 상담 건이에요.       |

접수할 때 서버가 하는 일(목 기준)

- 접수 일시 = 접수하는 순간의 현재 시각, 사안번호 자동 부여(목은 `2026-27`부터 접수 순서대로 센다. 실제 규칙은 backend가 정한다. 접수 후 수정 가능).
- 사안 정보 시드: 학교명·책임교사(`이수진`)·교감(`문경숙`)·관련 학생 4명·분리 `enforced: null`.
- 사안 자료 시드: 상담 기록 1건(이 상담 건에 연결), 학적 정보 1건, 그리고 `demo_preloaded: true`인 조사 자료 5건(진술서 3·면담 전사 2).
- 서류 9종을 모두 `status: "none"`, `revision: 1`로 만든다.

`SchoolViolenceCase`:

```json
{
  "id": "sv_...",
  "stage": "intake",
  "info": { /* SchoolViolenceInfo */ },
  "materials": [ /* SchoolViolenceMaterial, body 포함 */ ],
  "documents": [ /* SchoolViolenceDocumentSummary 9개, 칸 목록 없음 */ ],
  "progress": { "approved": 0, "total": 2 },
  "counsel_case_ids": ["seed_4"],
  "created_at": "2026-11-13T20:40:00+09:00"
}
```

`stage`는 저장하지 않고 서류 상태에서 계산한다: 1-3이 승인 전이면 `intake`, 1-3 승인 후 2-4 승인 전이면 `investigation`, 2-4까지 승인하면 `review`.

#### 3) `GET /api/teacher/school-violence/cases/{id}`

응답 200: `{ "case": SchoolViolenceCase }`. 404: 사안을 찾을 수 없어요.

#### 4) `PATCH /api/teacher/school-violence/cases/{id}/info`

요청(보낸 항목만 바뀐다. `students`·`separation`은 통째로 바꾼다):

```json
{
  "case_number": "2026-31",
  "teacher_name": "이수진",
  "vice_principal": "문경숙",
  "students": [ /* RelatedStudent 전체 목록 */ ],
  "separation": { "enforced": true, "period": "11.19.~11.30.", "exception_reasons": ["victim_objection"] }
}
```

응답 200: `{ "case": SchoolViolenceCase }`. 학교명·접수 일시는 고치지 않는다(목은 보내도 무시한다. backend는 `extra=forbid`가 관례라면 422로 거절해도 된다).

| 상태 | 조건                                                                                                                                                                                                                                    | `detail`(제안 문구)                                                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 404  | 없는 사안                                                                                                                                                                                                                               | 사안을 찾을 수 없어요.                                                                                                                             |
| 422  | 본문이 객체가 아님                                                                                                                                                                                                                      | 고칠 사안 정보를 보내 주세요.                                                                                                                      |
| 422  | `case_number`·`teacher_name`·`vice_principal`이 공백뿐/빈 값                                                                                                                                                                            | 사안번호를 입력해 주세요. / 책임교사를 입력해 주세요. / 교감을 입력해 주세요.(항목별 문구. 「교감을」처럼 받침에 맞는 조사를 쓰도록 목에서 고쳤다) |
| 422  | `students`가 비었거나 한 명이라도 형식이 틀림(이름 공백, 학년·반·번호가 1 이상 정수 아님, `gender`·`role` 허용값 아님, `guardian_notice.notified`가 불리언 아님, `found_during_investigation`이 불리언 아님, `at`이 날짜로 읽히지 않음) | 관련 학생의 이름·학년/반/번호·성별·구분·보호자 통보를 확인해 주세요.                                                                               |
| 422  | `students` 이름이 겹침(이름이 서류 칸 id의 일부라 구별 기준)                                                                                                                                                                            | 이름이 같은 관련 학생이 있어요. 서류에서 구별할 수 있게 이름을 달리해 주세요.                                                                      |
| 422  | `separation`이 형식에 안 맞음(`enforced`는 불리언 또는 null, `exception_reasons`는 허용 id 배열)                                                                                                                                        | 분리 시행 여부·기간·예외 사유를 확인해 주세요.                                                                                                     |

서류에 미치는 영향

- 서류의 사안 정보 칸(`kind: "admin"`)은 저장하지 않고 읽을 때 사안 정보에서 가져온다. 그래서 이미 만든 서류에도 즉시 반영된다. 목이 만드는 값은 부록 C.
- 가해 관련 학생(`role: "offender"`)이 바뀌면 이미 초안이 있는 서류의 학생별 칸(`factor.<판단요소>.<이름>`)을 맞춘다. 빠진 학생·구분이 바뀐 학생의 칸은 지우고, 새 가해 관련 학생의 칸은 같은 판단요소의 칸을 본떠 값·인용·검토·수정 표시를 비워서 넣되, AI 칸(`narrative`)이던 판단요소는 판단 칸(`manual`)으로 바꾼다(AI가 쓴 칸이 아니므로). 칸 구성이 바뀌면 그 서류의 `revision`이 1 오른다.

#### 5) `GET /api/teacher/school-violence/cases/{id}/documents/{form_id}`

응답 200: `{ "document": SchoolViolenceDocument }`. 404: 사안을 찾을 수 없어요. / 서류를 찾을 수 없어요.(알 수 없는 `form_id`). 초안이 없으면 `status: "none"`, `fields: []`.

#### 6) `POST /api/teacher/school-violence/cases/{id}/documents/{form_id}/draft`

요청: `{}` 또는 `{ "overwrite_confirmed": true }` (생략 가능). 이미 초안이 있으면 다시 만들 때 고친 내용이 지워지므로 `overwrite_confirmed: true`가 있어야 한다.

검사 순서와 응답:

| 순서 | 상태 | 조건                                                                    | `detail`(제안 문구)                                                                            |
| ---- | ---- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1    | 404  | 없는 사안                                                               | 사안을 찾을 수 없어요.                                                                         |
| 2    | 404  | 없는 서류                                                               | 서류를 찾을 수 없어요.                                                                         |
| 3    | 409  | `available: false`(시연 범위 밖)                                        | 이번 시연 범위 밖의 서류예요.                                                                  |
| 4    | 409  | 초안 생성기가 없는 서류                                                 | 이 서류의 초안은 아직 만들 수 없어요.                                                          |
| 5    | 409  | `locked_reason`이 있음(2-4인데 진술서·면담 전사가 없음)                 | `locked_reason`과 같은 문장                                                                    |
| 6    | 409  | 초안이 있는데(`status != "none"`) `overwrite_confirmed`가 `true`가 아님 | 이미 만든 초안이 있어요. 다시 만들면 고친 내용이 지워지니, 덮어쓰기를 확인한 뒤 요청해 주세요. |
| -    | 201  | 성공. 본문 `{ "document": SchoolViolenceDocument }`                     |                                                                                                |

성공 시 상태

- `fields`를 새로 만든다(모든 칸 `reviewed: false`, `edited: false`). 가해 관련 학생별 칸은 지금의 관련 학생 명단에 맞춘다.
- `status = "reviewing"`. 이미 승인한 서류를 다시 만들면 승인이 풀려 「검토 중」이 된다.
- `revision`: 첫 생성은 그대로(1), 다시 만들 때는 1 오른다.

#### 7) `POST /api/teacher/school-violence/cases/{id}/documents/{form_id}/save`

요청: 바꾼 칸만 보낸다.

```json
{
  "revision": 3,
  "fields": [
    { "id": "facts", "value": "고친 내용" },
    { "id": "issue.1.title", "reviewed": true },
    { "id": "round", "value": "first" }
  ]
}
```

각 항목은 `{ "id": string, "value"?: string, "reviewed"?: boolean }`이다. 값을 고칠 때는 `value`, 검토 표시를 바꿀 때는 `reviewed`만 보낸다(둘 다 가능).

검사 순서와 응답:

| 순서 | 상태 | 조건                                                | `detail`(제안 문구)                                                |
| ---- | ---- | --------------------------------------------------- | ------------------------------------------------------------------ |
| 1    | 404  | 없는 사안 / 없는 서류                               | 사안을 찾을 수 없어요. / 서류를 찾을 수 없어요.                    |
| 2    | 409  | 초안이 없는 서류(`status: "none"`)                  | 아직 초안이 없는 서류예요. 먼저 AI 초안을 만들어 주세요.           |
| 3    | 422  | `revision`이 숫자가 아님                            | 개정 번호를 보내 주세요.                                           |
| 4    | 409  | `revision` ≠ 저장된 `revision`                      | 다른 창에서 수정되었어요. 다시 열어 최신 내용을 확인해 주세요.     |
| 5    | 422  | `fields`가 배열이 아님                              | 고칠 칸 목록을 보내 주세요.                                        |
| 5    | 422  | 서류에 없는 칸 id                                   | 서류에 없는 칸이에요: {id}                                         |
| 5    | 422  | 항목에 `value`도 `reviewed`도 없음                  | 고칠 값이나 검토 표시를 보내 주세요.                               |
| 5    | 422  | `value`가 문자열이 아님                             | 칸 값은 글자로 보내 주세요.                                        |
| 5    | 422  | `kind: "admin"` 칸의 `value`                        | 사안 정보 칸은 서류에서 고칠 수 없어요. 사안 정보에서 고쳐 주세요. |
| 5    | 422  | `value`가 6000자 초과                               | 칸 값은 6000자까지 쓸 수 있어요.                                   |
| 5    | 422  | `reviewed`가 불리언이 아님                          | 검토 표시를 다시 확인해 주세요.                                    |
| 5    | 422  | 값이 있는 AI 칸이 아닌 칸의 `reviewed`              | AI가 쓴 칸에만 검토 표시를 할 수 있어요.                           |
| -    | 200  | 성공. 본문 `{ "document": SchoolViolenceDocument }` |                                                                    |

5번의 검증은 하나라도 틀리면 아무 칸도 적용하지 않는다(전부 아니면 전무).

성공 시 적용 규칙

- AI 칸(`narrative`)의 `value`를 바꾸면: 값 교체, `edited = true`, `reviewed = false`(같이 보낸 `reviewed`는 무시). 값이 기존과 같으면 값 변경으로 보지 않고 `reviewed`만 적용한다.
- 판단 칸(`manual`·`sensitive`)의 `value`를 바꾸면: 값만 교체. `edited`·`reviewed`는 그대로(검토 대상이 아님).
- `revision`은 항상 1 오른다. 응답은 서류 전체.
- 승인한 서류(`status: "approved"`)도 저장할 수 있다. 저장 뒤 AI 칸에 `reviewed: false`인 칸이 하나라도 있으면 `status`가 `reviewing`으로 돌아간다. 판단 칸만 고쳤다면 승인은 유지된다.
- 프론트는 「바꾼 칸만」 보낸다(backend `save`는 전체 칸을 매번 보내야 함. 차이 11항).

#### 8) `POST /api/teacher/school-violence/cases/{id}/documents/{form_id}/approve`

요청: `{ "revision": 3 }`

| 순서 | 상태 | 조건                                                                   | `detail`(제안 문구)                                            |
| ---- | ---- | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1    | 404  | 없는 사안 / 없는 서류                                                  | 위와 같음                                                      |
| 2    | 409  | 초안이 없음                                                            | 아직 초안이 없는 서류예요. 먼저 AI 초안을 만들어 주세요.       |
| 3    | 422  | `revision`이 숫자가 아님                                               | 개정 번호를 보내 주세요.                                       |
| 4    | 409  | `revision` 불일치                                                      | 다른 창에서 수정되었어요. 다시 열어 최신 내용을 확인해 주세요. |
| 5    | 409  | 값이 있는 AI 칸 중 `reviewed: false`가 남음                            | 검토하지 않은 AI 칸이 {n}개 남아 있어요.                       |
| -    | 200  | 성공. `{ "document": ... }`, `status: "approved"`, `revision`은 그대로 |                                                                |

판단 칸이 비어 있어도 승인된다. AI 칸이 하나도 없으면(값 있는 narrative 0개) 조건을 자동 충족한다. 이미 승인한 서류를 다시 승인해도 오류 없이 200이다. 승인은 결재·제출이 아니다(화면에 그렇게 표시한다).

#### 9) 교사 상담 상세에 추가되는 필드

`GET /api/teacher/counsel/cases/{id}` 응답(기존 `{ case, summary, form, documents }`)에 두 필드를 더한다.

```json
{
  "school_violence_case_id": "sv_...",
  "school_violence_recommendation": { "recommended": true, "keywords": ["학교폭력", "괴롭"] }
}
```

- `school_violence_case_id`: 이 상담 건에서 접수한 사안 ID. 접수하지 않았으면 `null`. 접수(2번)하면 이 값이 채워진다.
- `school_violence_recommendation`: 감지 키워드(`case.detected_keywords`)가 학폭 키워드 목록(`학교폭력`·`폭행`·`맞았`·`따돌`·`왕따`·`괴롭`, 예비교사 팀 확정 전 임시값)에 하나라도 걸리면 `recommended: true`, `keywords`는 걸린 키워드(감지된 문자열 그대로, 목록에 있는 것만). 아니면 `{ "recommended": false, "keywords": [] }`. 권고는 참고용이며 사안을 만들지 않는다(접수는 교사만).
- 상담 목록(`GET /api/teacher/counsel/cases`)은 바꾸지 않는다. 상세에만 추가한다.

## 3. 칸 구성 규모와 반복 구조 칸 (차이 항목 2)

(3~8절은 차이 항목이다. 3절 반복 구조 칸, 4절 사안 단위 API 부재, 5절 승인 규칙, 6절 시드 인물, 7절 교사 인증, 8절 그 밖의 차이 8~16항. 형식: 현황 / 프론트 제안 / 이유 / 요청.)

|                         | backend `document-drafts`                                  | 프론트 제안                                                                                                                     |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1-3 칸 수               | 18 (admin 4 · narrative 3 · manual/sensitive 11)           | 24 (admin 9 · narrative 5 · manual 10)                                                                                          |
| 2-4 칸 수               | 29 (admin 4 · narrative 14 · manual/sensitive 11)          | 69 (admin 8 · narrative 44 · manual 16 · sensitive 1)                                                                           |
| 쟁점 n개                | 칸 1개(`issues`, 여러 줄 문자열)                           | `issue.<n>.<title                                                                                                               | victim_claim | victim_evidence | offender_claim | offender_evidence                                  | witness_claim                                                          | witness_evidence>` (쟁점 하나당 7칸. 시드는 2개 = 14칸) |
| 판단요소(시행령 제19조) | 5칸(`severity_facts` 등. 가해 관련 학생이 여럿이어도 하나) | `factor.<severity                                                                                                               | persistence  | intent          | remorse        | reconcile>.<학생 이름>`+ 판단 칸`factor.<education | recurrence>.<학생 이름>`. 가해 관련 학생 n명이면 7n칸(시드 3명 = 21칸) |
| 관련 학생 표            | admin `students` 한 칸에 여러 줄                           | 같음(admin 한 칸, 여러 줄). 단 사안 정보 `students[]`에서 만든다                                                                |
| 자체해결 요건 4개       | `self_resolution` manual 한 칸                             | `self_resolution.<1~4>.opinion`(manual, 충족 여부 의견) + `.facts`(narrative, 확인 사실) + `self_resolution.consent`(narrative) |
| 값당 최대 인용 수       | `evidence` ≤ 6                                             | 시드 2-4에서 최대 12개                                                                                                          |
| AI 응답 칸 상한         | `Output.fields` ≤ 25                                       | narrative가 44개(2-4)                                                                                                           |
| 저장 요청 칸 상한       | `Save.fields` ≤ 40, 전체 칸 필수                           | 69칸 서류는 전체를 보내면 상한 초과                                                                                             |

왜 쪼갰나: 예비교사가 확정한 2-4 서식이 쟁점별·가해 관련 학생별 표이기 때문이다. 쟁점마다 피해 측·가해 측·목격 학생의 주장과 근거를 한 칸씩 따로 검토하고, 가해 관련 학생마다 판단요소 확인 사실을 따로 검토해야 「칸마다 인용문을 보고 검토 표시」가 의미가 있다. 한 칸에 뭉치면 일부만 맞아도 전체를 검토하거나 전체를 버리게 된다.

요청 사항

1. 칸 id 규칙을 위 표대로 인정한다(`.`로 구분한 구조 id). 학생 이름이 id의 일부라 사안 정보 수정이 이름 중복을 막는다(422).
2. 한도 조정: `Save.fields`·`Output.fields` 상한을 올리거나 없앤다(2-4 69칸, 가해 관련 학생이 늘면 더 커진다). `evidence` 상한 6은 12 이상으로.
3. `validate_proposals`의 기대 칸 집합을 고정 목록이 아니라 「서류별 정적 칸 + 쟁점 n개 + 가해 관련 학생 n명」으로 계산한다. 쟁점 개수 n은 AI가 정하므로, 규칙은 「`issue.<n>.*`는 n이 1부터 연속이고 7개 부분이 모두 있으면 허용」으로 하고 `factor.*.<이름>`의 이름은 사안 정보의 가해 관련 학생 이름과 같아야 한다.
4. 가해 관련 학생이 늘거나 줄 때 서류 칸을 맞추는 규칙(4번 엔드포인트 설명)을 서버가 수행한다.

## 4. 사안 단위 API 부재 (차이 항목 1)

- 현황: backend에는 사안을 만들고 목록·상세로 다루는 API가 없다. `document-drafts`는 초안 한 장(`id` 토큰)이 단위이고, 같은 사안의 서류 여러 장이 서로를 모른다. 자료는 `POST /document-drafts`마다 `sources`(`history`·`statements`·`interview`)를 텍스트로 통째로 보낸다(셋 중 하나라도 비면 422, 각 ≤20000자). 관련 학생·학교·접수 일시 같은 정보는 서버 상수 `admin`이다.
- 프론트 제안: 사안(`cases`)이 정보·자료·서류 9종을 소유한다. 접수는 상담 건에서 하고(`POST /cases`), 서류는 `(사안, form_id)`당 한 장이며 다시 만들면 같은 서류에 덮어쓴다(개정 번호 유지).
- 이유: 교사는 서류를 한 장씩이 아니라 「사안」으로 다룬다. 접수 → 조사 → 심의 단계, 서류 9종 체크리스트, 진행률(「승인 n / 작업 가능 m」), 사안 정보 한 번 수정에 여러 서류 반영이 모두 사안이 단위일 때만 성립한다. 또 사안 정보(학교·책임교사·관련 학생·분리 시행 등)는 1-3과 2-4가 같은 값을 써야 하므로 사안에 한 번만 둔다.
- 요청: 위 8개 엔드포인트를 만든다. 기존 `document-drafts`는 그대로 두고(작업실 `/document-demo`가 쓴다) 새 API가 같은 초안 저장·검증 로직을 재사용하게 하면 된다. 목록은 `{cases: [...]}`로 가며 `GET /document-drafts`의 `{items: [...]}`(최근 50) 형식과 다르다. 두 API가 한 DB 테이블을 공유할지, 사안 테이블을 새로 만들지는 backend가 정한다.
- 시연 초기화: `POST /api/demo/reset`이 사안 데이터(접수한 사안·서류)도 지워야 한다(프론트 목은 지운다). 상담 건 시드(`seed_4`)는 유지된다.

## 5. 승인 규칙 (차이 항목 3)

|                 | backend                                                                                                              | 프론트 제안                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 승인 개념       | 없음. 칸별 `reviewed`만 있고 화면에는 「항목 검토 n/전체」                                                           | 서류 단위 `status`(`none`→`reviewing`→`approved`)와 `approve` 엔드포인트                                                                                   |
| 빈 칸           | `reviewed: true`인데 `value`가 비면 422 「빈 항목을 검토 완료로 표시할 수 없습니다.」 → 사실상 전 칸이 채워져야 완료 | 검토 대상은 「값이 있는 AI 칸」뿐. 모두 `reviewed`면 판단 칸이 비어 있어도 승인 가능. 남은 판단 칸 수는 `counts.judgement_remaining`로 표시                |
| 값 수정 시 검토 | 값을 고쳐도 `reviewed`는 요청이 보낸 값을 그대로 씀(클라이언트가 풀어야 함)                                          | AI 칸 값을 고치면 서버가 `reviewed`를 풀고 `edited: true`(같이 보낸 `reviewed`는 무시)                                                                     |
| 승인 뒤 수정    | 해당 없음                                                                                                            | 승인한 서류도 저장 가능. 저장 뒤 검토하지 않은 AI 칸이 있으면 `reviewing`으로 복귀. AI 초안을 다시 만들면(`overwrite_confirmed` 필요) `reviewing`으로 복귀 |

이유: 2-4의 자체해결 요건·긴급조치·선도 가능성·재발 현황 같은 칸은 판단 칸이라 AI는 비워 두고 사람이 결재 과정에서 채운다. backend 규칙대로면 판단 칸을 다 채우기 전에는 어떤 칸도 「검토 완료」로 표시할 수 없고, 반대로 판단 칸을 채우지 않은 채 승인하는 일을 막을 수단도 없다(승인이라는 개념이 없다). 프론트의 목적은 「AI가 쓴 칸은 교사가 인용문을 보고 모두 검토했다」를 승인의 의미로 두고, 판단 칸의 남은 개수는 숨기지 않고 보여주는 것이다. 값을 고치면 검토를 서버가 풀어야 「승인했는데 AI 문장은 이미 바뀜」이 안 생긴다.

요청: backend 규칙을 바꾸는 것이 부담이면 새 API에만 프론트 규칙을 적용하고 기존 `document-drafts`의 `save` 규칙은 그대로 두어도 된다. 다만 「검토 대상=값이 있는 AI 칸」이므로 `reviewed`는 그 칸에만 보낼 수 있게(판단 칸·admin 칸이면 422), 빈 칸을 `reviewed: true`로 막는 규칙은 새 API에서 빼 달라.

## 6. 시드 인물 (차이 항목 4)

|              | backend                                                                  | 프론트                                                                                                                 |
| ------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| 학교         | 가온중학교(가상)                                                         | 가온중학교                                                                                                             |
| 책임교사     | 이수진(가상)                                                             | 이수진 (`DEMO_TEACHER_NAME`)                                                                                           |
| 교감         | 없음                                                                     | 문경숙 (사안 정보 `vice_principal`)                                                                                    |
| 관련 학생    | 피해 김하늘(12번), 가해 이도윤(7번), 목격 박서연(18번)                   | 피해 한지우(21번), 가해 정민혁(24번)·박도윤(12번)·최서진(28번, 조사 중 확인)                                           |
| 접수 일시    | 2026-11-13 09:20 고정                                                    | 접수하는 순간의 현재 시각(고정값 아님)                                                                                 |
| 시드 상담 건 | `seed_1~3`. 김하늘은 `seed_3`(완료 건, 12번)와 시연 학생(`DEMO_STUDENT`) | `seed_4`: 한지우 AI 챗봇 상담 건(21번, 키워드 `학교폭력`·`괴롭`·`무서`, 위험 high, 교사 전환됨, 교사가 읽은 것으로 둠) |

이유: 사례는 예비교사가 확정한 작성 예시(가온중학교 2학년 3반 가상 사안)를 따랐다. 접수 일시와 사안번호는 접수 순간 정해지는 값이라 고정하지 않는다. 박도윤의 학번(2학년 3반 12번)이 backend 시연 학생 `DEMO_STUDENT`(12번)와 같아, 학번만 비교하는 `isMine` 때문에 박도윤으로 만든 챗봇 상담 건은 시드에 넣지 않았다.

backend 측 연쇄 영향

- `GET /document-drafts/sources?case_id=`는 이름이 김하늘인 상담 건만 허용한다(아니면 409). 새 API는 접수한 사안의 자료를 쓰므로 이 제한이 없다. 다만 시연 상담 건 중 `seed_4`가 backend에 없으면 사안 접수 화면이 막힌다.
- 시드 자료 원문(진술서·면담 전사·학적 정보·상담 기록)은 프론트 `src/mocks/schoolViolence/materials.ts`에 있다. 인용은 이 원문의 정확한 부분 문자열이어야 하므로(차이 14항) 원문 문장을 바꾸면 칸 인용도 같이 바꿔야 한다.

요청: (a) backend 시드를 프론트 시드로 맞춘다(`seed_4` 한지우 상담 건 추가, 사안 자료 시드 교체; 프론트가 기대하는 상담 건 필드는 `src/mocks/schoolViolence/seed.ts` 참고), 또는 (b) 프론트가 김하늘 시드로 바꾼다. 프론트는 (a)를 선호한다. 서류 값이 예비교사의 작성 예시와 이미 대조돼 있기 때문이다. (b)를 택하면 프론트 시드·인용·테스트를 모두 다시 만들어야 하니 알려 달라.

## 7. 교사 인증 (차이 항목 5)

- 현황: `/api/teacher/*` 전체가 `X-Teacher-Key`(`TEACHER_ACCESS_TOKEN`) 필수다(`require_teacher`: 없으면 401, 서버 미설정 503). 반면 상담 API(`/api/student/counsel/*`·`/api/teacher/counsel/*`)와 `/api/demo/reset`은 `X-Frontend-Access`(`FRONTEND_ACCESS_TOKEN`)를 쓴다. 문서·면담 API 키는 상담 API 키와 서로 다르다.
- 문제: 브라우저 번들(`VITE_*`)·소스·저장소에 키를 넣을 수 없고, 키를 가진 서버(BFF·프록시)가 현재 프론트에 없다. 통합 브랜치의 `apiFetch`는 두 헤더 모두 보내지 않는다. `origin/main`에는 연결 설정 화면이 들어와(`6191afe`, `frontend/API_CONNECTION.md`) 사용자가 입력한 키를 탭 메모리에만 두고 경로별로 헤더를 붙인다(`/api/student/counsel/*`·`/api/teacher/counsel/*`·`/api/demo/reset`은 `X-Frontend-Access`, 그 밖의 `/api/teacher/*`는 교사키를 입력했을 때만 `X-Teacher-Key`). 이 방식이면 새 경로 `/api/teacher/school-violence/*`는 교사키가 있으면 `X-Teacher-Key`가 붙는다. 교사키 입력은 선택이고 문서에 「현재 학생·교사 상담 계약은 모두 프론트 연동키를 사용한다」고 적혀 있다.
- CORS·교차 출처: `main.py` 미들웨어는 교차 출처 POST/PUT/PATCH/DELETE를 `demo_path`(`/api/student/counsel/`·`/api/teacher/counsel/`로 시작하거나 `/api/demo/reset`)에만 허용하고 나머지는 403(`같은 로컬 서버 화면에서 요청하세요.`/`외부 사이트의 요청을 허용하지 않습니다.`)으로 막는다. `SHARED_SERVER.md`도 「Vercel 교차 출처 쓰기는 상담 계약과 데모 초기화에만 열려 있다」고 적는다. 그래서 새 사안 API(POST·PATCH)는 지금 구조로는 프론트에서 호출할 수 없다. `allow_methods`에는 `PATCH`가 이미 있다.
- 요청: 새 사안 API를 상담 계약과 같은 인증으로 맞춘다.
  - 옵션 A(권장): `/api/teacher/school-violence/*`를 `/api/teacher/counsel/*`처럼 `X-Frontend-Access` 인증으로 두고(`enabled` 의존성), `demo_path`에 이 접두어를 추가한다. 키를 하나만 입력하면 된다.
  - 옵션 B: `X-Teacher-Key`를 유지하되 `demo_path`에 이 접두어를 추가해 교차 출처 쓰기를 허용한다. 이 경우 연결 설정에서 교사키 입력이 필수가 된다.
  - 어느 쪽이든 키는 브라우저 번들에 넣지 않는다. 프론트는 `origin/main`의 연결 설정(탭 메모리 입력) 방식을 쓸 예정이다. 이 방식은 사용자가 키를 입력해야 하므로 시연 전에 입력 절차가 필요하다.
  - 어느 쪽이 맞는지 정해 주면 프론트는 `apiFetch`의 경로별 헤더 규칙을 이에 맞춘다(통합 브랜치에 `origin/main`의 연결 설정이 합쳐진 뒤).

## 8. 그 밖의 차이 (8~16항)

번호는 위 3~7절(1~5항, 항목 번호 1=사안 단위 API, 2=반복 구조, 3=승인 규칙, 4=시드, 5=인증)에 이어 붙였다.

8. 칸 JSON의 `kind`·`status` — backend 응답에는 `status`(`provided|extracted|manual|missing|teacher_edited`)와 `manual_only`가 있고 처리 방식(narrative/admin/manual/sensitive)은 서버 상수에만 있어 응답으로 구분할 수 없다(manual과 sensitive도 `manual_only`로 뭉침). 프론트는 `kind`를 응답에 명시하고 `status`·`manual_only`는 쓰지 않는다. 이유: 화면이 AI 칸(인용 표시·검토 체크)·사안 정보 칸·판단 칸을 다르게 그려야 하고, 승인 규칙·집계가 모두 `kind`를 본다. 요청: 응답 칸에 `kind` 추가. `status`·`manual_only`는 프론트가 읽지 않으니 남겨도 된다(알 수 없는 필드는 무시).
9. admin 칸 값의 출처 — backend는 생성 시점에 서버 상수(`admin` 딕셔너리)를 칸 `value`로 복사해 저장하고, 저장(save) 때 admin 칸 값을 바꾸면 `teacher_edited`가 된다. 프론트는 admin 칸을 저장하지 않고 읽을 때 사안 정보에서 계산한다(부록 C). admin 칸 `value` 수정은 422. 이유: 사안 정보를 한 번 고치면 이미 만든 1-3·2-4 모두에 즉시 반영돼야 한다(티켓 05). 요청: admin 칸을 읽을 때 사안 정보에서 만들 것.
10. 사안번호 — backend는 `case_number`가 manual(빈 값)이다. 프론트는 접수 때 자동 부여해 admin 칸으로 두고 사안 정보에서 수정한다. 요청: 사안번호 자동 부여 규칙(연도-순번 등)과 중복 방지를 정한다. 목은 `2026-27`부터 접수 순서로 센다.
11. 저장 요청 모양 — backend `save`는 `{revision, fields:[{id,value,reviewed}]}`에 초안의 칸 전체를 매번 보내야 하고 id 집합이 다르면 422다. 프론트는 바꾼 칸만 보내고 `value`·`reviewed`는 각각 선택이다. 이유: 69칸을 칸 하나 고칠 때마다 전부 보내면 느리고 칸 하나 편집이 다른 칸 편집과 충돌한다. 체크 칸은 누르는 즉시 저장한다. 요청: 부분 저장을 허용하고 `value`·`reviewed`를 선택 항목으로.
12. 단일 선택 칸 — 체크(선택) 칸의 `value`는 고른 선택지 id를 쉼표로 이은 문자열이고 양식 순서로 정렬한다. 하나만 고르는 칸(`report_route`·`investigator`·`separation.enforced`·`round`)은 화면이 라디오로 보여 주고(「선택 해제」 제공) 한 개 id만 보낸다. 이 「단일 선택」 구분은 프론트 양식 레이아웃(`src/lib/schoolViolence/forms/`)에만 있다. 요청: 선택 칸의 허용 id(부록 B)를 서버도 알고 알 수 없는 id는 422로 거절한다. 단일 선택 칸에 둘 이상 오면 422로 거절해 주면 가장 안전하다. 응답에 칸 메타(`choice: {options, single}`)를 실을지는 backend가 정한다(프론트는 현재 양식 레이아웃을 자체 상수로 가진다).
13. 사안 자료 종류와 `demo_preloaded` — backend의 자료는 3종 고정(`history` 이전 상담 이력·`statements` 진술서·`interview` 개별 면담 전사)과 `admin`이고, `history`는 「이전 상담 이력, 현재 사안의 사실 확인 자료 아님」이다(프롬프트도 이전 상담을 입증 자료로 쓰지 말라고 한다). 프론트의 자료는 4종(`counsel_record` 이 사안을 접수한 상담 기록·`statement`·`interview_transcript`·`student_record` 학적 정보)이고 자료가 여러 건이다(시드 7건). 의미 차이가 크다: 프론트의 `counsel_record`는 1-3 접수보고서의 근거 자료다(현재 신고 내용). 이유: 1-3의 사안 유형·사실 요약·신고자는 접수 계기가 된 상담에서 채운다. 또 조사 단계 자료(진술서·면담 전사)는 실제로는 조사 중에 모이는데, 시연에서는 접수 직후 한 번에 2-4까지 보여야 해서 `demo_preloaded: true`로 접수 직후 미리 넣고 `stage: "investigation"`을 표시한다. 요청: (a) 자료를 사안 소유로 두고 `{id, kind, title, body, stage, demo_preloaded, counsel_case_id}`를 응답에 싣는다(원문 포함). (b) `evidence[].source_id`를 3종 고정 enum이 아니라 사안 자료 id로 확장한다(차이 14항). (c) 시연 시드에서는 접수 때 조사 자료를 미리 붙이되, 실제 운영에서 자료를 추가하는 API(진술서 업로드·붙여넣기, `interview-transcriptions` 전사 결과 연결)는 후속 범위로 두고 알려 달라(프론트는 이번에 자료 추가 UI가 없다). (d) `history`(이전 상담)의 「입증 자료 아님」 의미가 프론트의 `counsel_record`와 다르다는 점을 정리해 달라: 1-3은 이번 신고를 낳은 상담 기록을 근거로 쓰므로 AI 프롬프트의 「이전 상담을 입증 자료로 쓰지 말라」 제한을 사안 API에서는 `counsel_record`에 적용하지 않아야 한다.
14. 인용 검증(서버 측) — 프론트는 런타임에 인용을 검증하지 않고 서버가 보증한다고 가정한다(검증은 목 테스트에서만: 「인용문은 해당 사안 자료 원문에 들어 있다」). backend의 `validate_proposals` 규칙(칸 구성 일치·값이 있으면 인용 ≥1·모든 인용이 원문의 부분 문자열, 위반 시 502로 저장하지 않음)을 그대로 쓰되 다음처럼 확장해 달라: `source_id`는 해당 사안의 자료 id여야 하고 `quote`는 그 자료 `body`의 부분 문자열이어야 한다. 한 칸에 서로 다른 자료의 인용이 섞일 수 있다. 값이 비면 `evidence`도 비어야 한다(`reviewed` 대상도 아님). 검증 실패 502의 `detail`은 backend 문구를 그대로 써도 된다. 또 admin·manual·sensitive 칸은 AI 응답으로 받지 않는다는 규칙도 유지한다.
15. 2-4는 조사 자료가 없으면 초안 거절(409) — 근거 없는 초안을 만들지 않도록 사안 자료에 `statement` 또는 `interview_transcript`가 없으면 2-4 초안 생성을 막는다. 서류 요약에는 같은 문장을 `locked_reason`으로 싣고 화면은 서류 행에 잠금 사유를 보인다. 1-3은 접수 때 붙는 상담 기록만으로 쓴다. backend는 이런 제한이 없다(요청마다 세 자료가 모두 비어 있지 않아야 422). 요청: 서류별 필요 자료 규칙(`DRAFT_LOCKS`: 2-4 = 진술서 또는 면담 전사 1건 이상)을 서버가 갖고 `locked_reason`·409로 노출한다.
16. 그 밖의 응답 모양 차이(프론트가 읽지 않으므로 합의만 필요) —
    - backend 초안 응답에는 `mode`(`mock`|`baze`)·`model`·`usage`·`demo`·`warnings[]`·`sources`·`title`·`reference`·`original_value`(고치기 전 값)·`created_at`·`updated_at`이 있다. 프론트는 이 중 어느 것도 응답에서 읽지 않는다(`demo` 표시와 「미검토 초안」 안내 문구는 화면이 자체 문구로 보인다). 지워도 되고 남겨도 된다. 단 `original_value`는 「교사 수정 전 값」 보기 기능을 나중에 만들 수 있으므로 남기기를 권한다.
    - 초안 생성 요청의 `mode`(`mock`|`baze`)·`variant`·`external_consent`: 프론트 요청 본문은 `overwrite_confirmed`뿐이다. 실제 AI(`baze`)를 쓰려면 외부 전송 동의가 필요한데(없으면 422) 프론트에는 그 동의 단계가 없다. 요청: 사안 API에서 모드를 서버 설정(`FRONTEND_AI_MODE`)으로 정하고, `baze`일 때의 외부 전송 동의를 어디서 받을지 정해 알려 달라(프론트가 동의 UI를 더해야 하면 요청 본문에 `external_consent`를 선택 필드로 추가하는 안이 있다).
    - 서류 생성 상태 코드: backend `POST /document-drafts`는 200, 프론트 제안은 새 초안을 만드는 `draft`가 201이다(`save`·`approve`는 200).
    - 한 서류당 초안 수: backend는 생성할 때마다 새 초안 `id`가 생기고 초안이 계속 쌓인다(목록 50개). 프론트는 `(사안, form_id)`당 한 장이고 다시 만들면 덮어쓴다.
    - 서류 9종 메타(`name`·`stage`·`author`·`author_note`·`approval`·`approval_note`·`available`·`description`)는 backend에 없다. 프론트 제안은 서버가 `documents[]`에 준다(근거: 교육부 「2026년 학교폭력 사안처리 가이드북」 부록1. 실제 결재선은 학교별 위임전결 규정에 따라 다를 수 있음, 예: 교감 전결). 값은 `src/mocks/schoolViolence/documentCatalog.ts` 참고. 이 메타를 프론트 상수로 옮기는 안도 가능하니 서버에 두기 부담이면 말해 달라.
    - 사안 정보에 없는 항목(조사관 강태호·조사 일자 등)은 서류 칸으로 두되 AI 칸이면 자료 인용으로, 아니면 판단 칸으로 둔다(부록 A).

## 9. 사안·상담 건 연결 (참고)

- 상담 건 하나는 사안 하나에만 연결된다(`counsel_case_ids`는 배열이지만 현재 접수는 한 건만 담는다). 접수 후 상담 상세의 `school_violence_case_id`가 채워져 상담 화면에서 사안 페이지로 이동한다.
- 접수는 교사 행동이다. 권고(`school_violence_recommendation`)는 사안을 만들지 않는다.
- `GET /cases/{id}`의 자료 `body`는 원문 전체를 싣는다(시드 기준 자료 7건, 수 KB). 화면의 「근거 옆 패널」이 인용문 하이라이트에 원문을 쓰므로 상세에 포함해 달라. 규모가 커지면 자료별 조회 엔드포인트를 따로 두는 안을 협의한다.

## 10. 프론트 쪽 후속 (backend가 확정한 뒤)

- ADR 0002를 `accepted`로 바꾸고 `schoolViolenceTypes.ts`를 backend 정의에 맞춘다.
- 통합 브랜치에 `origin/main`의 연결 설정(`6191afe`)을 합쳐 사안 경로에 알맞은 인증 헤더를 붙인다(7절 결정에 따라).
- MSW 목은 backend 장애 대비로 남긴다.

## 11. backend에 요청할 것 (체크리스트)

사안 단위 API

- [ ] 2.3절의 엔드포인트 8개(`GET/POST /cases`, `GET /cases/{id}`, `PATCH /cases/{id}/info`, `GET .../documents/{form_id}`, `POST .../draft`, `.../save`, `.../approve`)를 구현한다.
- [ ] 상담 상세 `GET /api/teacher/counsel/cases/{id}`에 `school_violence_case_id`(없으면 `null`)와 `school_violence_recommendation`(`{recommended, keywords}`)을 추가한다.
- [ ] 사안 접수(`POST /cases`) 시 사안 정보·사안 자료·서류 9종을 만든다. 상담 건 중복 접수 409, 진행 중 상담 건 404, 사안번호·접수 일시 자동 부여.
- [ ] 단계(`stage`)·진행률(`progress`)을 서류 승인 상태에서 서버가 계산한다.
- [ ] `POST /api/demo/reset`이 접수한 사안 데이터도 지운다.

칸·저장 형식

- [ ] 칸 응답에 `kind`(`narrative|admin|manual|sensitive`)를 싣는다. `id`·`label`·`value`·`evidence`·`reviewed`·`edited`는 기존 이름 그대로.
- [ ] 칸 id 규칙을 반복 구조(`issue.<n>.<부분>`, `factor.<판단요소>.<학생 이름>`, `self_resolution.<n>.*`)까지 포함해 인정하고, 한도를 푼다: `evidence` ≤ 12 이상, `Output.fields`·`Save.fields` 상한 상향(2-4 = 69칸, 가해 관련 학생 수에 비례).
- [ ] `validate_proposals`의 기대 칸 집합을 동적으로 계산한다(쟁점 n개 연속, 가해 관련 학생 이름 = 사안 정보).
- [ ] 저장은 바꾼 칸만 받는다(`value`·`reviewed` 각각 선택). 부분 저장 시에도 전부-아니면-전무로 검증한다.
- [ ] 사안 정보 칸(admin)은 저장하지 않고 읽을 때 사안 정보에서 만든다. admin 칸 `value` 수정은 422. 값 형식은 부록 C.
- [ ] 선택 칸의 허용 id(부록 B)를 검증한다. 알 수 없는 id는 422, 단일 선택 칸(`report_route`·`investigator`·`separation.enforced`·`round`)에 둘 이상이면 422.
- [ ] 가해 관련 학생이 바뀌면(사안 정보 PATCH) 이미 만든 서류의 학생별 칸을 맞추고 `revision`을 올린다.

승인 규칙

- [ ] `approve`: 값이 있는 AI 칸이 모두 `reviewed`일 때만 성공(409 「검토하지 않은 AI 칸이 n개 남아 있어요.」). 판단 칸이 비어 있어도 승인된다. 빈 칸 `reviewed` 금지 규칙(422)은 사안 API에서 뺀다.
- [ ] AI 칸 `value`를 바꾸면 서버가 `reviewed`를 풀고 `edited`를 켠다. 판단 칸은 `edited`를 켜지 않는다.
- [ ] 승인한 서류도 저장할 수 있고, 저장 뒤 검토하지 않은 AI 칸이 있으면 `reviewing`으로 돌린다. 초안을 다시 만들면(`overwrite_confirmed: true` 필요) `reviewing`.
- [ ] `reviewed`는 값이 있는 AI 칸에만 허용한다(그 밖은 422).

AI 초안·자료

- [ ] 초안 생성은 사안 자료(서버 소유)로 만든다. 요청 본문은 `{overwrite_confirmed?}`뿐. 초안이 이미 있으면 `overwrite_confirmed` 없이는 409.
- [ ] 서류별 필요 자료 규칙을 서버가 갖는다: 2-4는 `statement` 또는 `interview_transcript`가 없으면 409와 `locked_reason`.
- [ ] 인용 검증을 사안 자료 단위로 확장한다(`source_id` = 자료 id, `quote` ⊂ `body`, 값이 있으면 인용 ≥1, 위반 시 502·저장 안 함).
- [ ] 이번 사안을 낳은 상담 기록(`counsel_record`)은 1-3의 근거로 쓴다(기존 「이전 상담은 입증 자료 아님」 제한을 이 자료에 적용하지 않는다).
- [ ] `baze` 모드의 외부 전송 동의를 사안 API에서 어떻게 받을지 정한다.
- [ ] (후속) 조사 자료 추가 API(진술서 업로드·붙여넣기, 면담 전사 연결)가 필요하면 일정을 알린다.

시드·인증

- [ ] 시드 정합: 한지우 `seed_4` AI 챗봇 상담 건 추가(교사 전환·읽음 상태, 시연 초기화 뒤에도 유지)와 사안 자료 시드 교체(`src/mocks/schoolViolence/materials.ts`·`seed.ts`). 시드를 바꾸기 어려우면 알려 달라(프론트가 김하늘 시드로 바꾼다).
- [ ] 인증 방식을 정한다: `X-Frontend-Access`(권장)이면 `enabled` 의존성으로, `X-Teacher-Key`이면 그대로. 어느 쪽이든 `main.py`의 `demo_path`에 `/api/teacher/school-violence/`를 추가해 교차 출처 POST·PATCH를 허용한다.
- [ ] 위 결정과 확정한 계약(필드 이름·상태 코드·오류 문구)을 프론트에 알려 달라.

---

## 부록 A. 서류별 칸 id와 처리 방식

`a` admin, `n` narrative, `m` manual, `s` sensitive. 표시명(label)은 `src/mocks/schoolViolence/drafts/intake.ts`·`investigation.ts`에 있다(시드 기준 값). 칸 순서는 양식의 위→아래, 왼쪽→오른쪽이다.

### 1-3 사안접수보고서 (24칸: a 9 · n 5 · m 10)

`school:a` `case_number:a` `vice_principal:a` `vice_principal_phone:m` `teacher:a` `teacher_phone:m` `received_at:a` `reporter:n` `report_route:n(선택·단일)` `incident_type:n` `investigator:m(선택·단일)` `measure2_date:m` `measure2_targets:m` `separation.enforced:a(선택·단일)` `separation.period:a` `separation.exceptions:a(선택)` `facts:n` `students:a` `other:n` `other_school.name:m` `other_school.notice:m` `availability.victim:m` `availability.offender:m` `requests:m`

backend 1-3(18칸)과 다른 점: `case_number`·`separation`은 manual → admin(사안 정보). `reporter`는 manual → narrative(상담 기록에서 인용). `report_route`(접수·인지 경로)가 따로 생김. `vice_principal`·연락처가 칸으로 나뉘었다(`contact`가 교감·책임교사 한 칸이었음). `measure2`·`other_school`·`availability`가 항목별로 나뉘었다. `parent_notice`(보호자 통보)는 사라졌다(관련 학생 `guardian_notice`로 `students` admin 칸에 들어간다). `disability`(민감)는 1-3 시드에 없다.

### 2-4 사안조사 보고서 (69칸: a 8 · n 44 · m 16 · s 1)

공통(앞부분, 시드 기준): `round:m(선택·단일)` `school:a` `case_number:a` `received_at:a` `teacher:a` `teacher_phone:m` `investigated_at:n` `investigator:n` `investigator_phone:m` `incident_type:n` `incident_summary:n` `students:a` `overview:n` `timeline:n` `separation.enforced:a(선택·단일)` `separation.period:a` `separation.exceptions:a(선택)`

자체해결 요건: `self_resolution.1.opinion:m` `self_resolution.1.facts:n` … `self_resolution.4.opinion:m` `self_resolution.4.facts:n` `self_resolution.consent:n`

쟁점(n개, 시드 2개): `issue.<n>.title:n` `issue.<n>.victim_claim:n` `issue.<n>.victim_evidence:n` `issue.<n>.offender_claim:n` `issue.<n>.offender_evidence:n` `issue.<n>.witness_claim:n` `issue.<n>.witness_evidence:n`

판단요소: `common.severity:n` → 가해 관련 학생별 `factor.severity.<이름>:n` `factor.persistence.<이름>:n` `factor.intent.<이름>:n` `factor.remorse.<이름>:n` `factor.reconcile.<이름>:n` → `common.reconcile:n` `common.program:n` → 가해 관련 학생별 `factor.education.<이름>:m` `factor.recurrence.<이름>:m`

그 밖: `disability:s` `urgent.victim:m` `urgent.offender:m` `special:n` `etc:m`

AI가 비워 두는 칸(판단·민감)은 항상 `value: ""`, `evidence: []`이다. 판단 칸에는 작성 예시에 값이 있어도 비워 둔다(재발 현황·긴급조치·1차/보완 구분·선도 가능성은 사람이 판단).

## 부록 B. 선택(체크) 칸의 선택지 id

선택 칸의 `value`는 선택지 id를 양식 순서로 쉼표로 이은 문자열이다(비어 있으면 아무것도 고르지 않음).

| 칸 id                                        | 단일   | 선택지 id                                                                                                                                    |
| -------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `report_route` (1-3)                         | 예     | `victim_direct`(피해자 직접신고) · `teacher_guardian`(담임, 보호자 신고) · `peer`(주변 학생 신고)                                            |
| `investigator` (1-3)                         | 예     | `assign`(조사관 배정 요청) · `self`(학교 자체 조사)                                                                                          |
| `round` (2-4)                                | 예     | `first`(1차 조사) · `supplement`(보완조사)                                                                                                   |
| `separation.enforced` (1-3·2-4, 사안 정보)   | 예     | `enforced`(시행) · `not_enforced`(미시행). 사안 정보 `separation.enforced`가 `null`이면 `""`                                                 |
| `separation.exceptions` (1-3·2-4, 사안 정보) | 아니오 | `victim_objection` · `not_in_activity` · `urgent_separated` · `other_school` · `self_resolution` (사안 정보 `exception_reasons`의 id와 같음) |

## 부록 C. 사안 정보 칸(admin)의 값 형식

읽을 때 사안 정보에서 계산한다(`src/mocks/schoolViolence/documents.ts`의 `adminValues`). 서류마다 쓰는 칸만 골라 쓴다.

| 칸 id                   | 값                                                                                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `school`                | `info.school_name`                                                                                                                                                                                                                                |
| `case_number`           | `info.case_number`                                                                                                                                                                                                                                |
| `vice_principal`        | `info.vice_principal`                                                                                                                                                                                                                             |
| `teacher`               | `info.teacher_name`                                                                                                                                                                                                                               |
| `received_at`           | 한국 시간 「2026년 11월 13일 오후 8시 40분」 형식(`info.received_at`을 변환)                                                                                                                                                                      |
| `students`              | 학생마다 한 줄: `{이름} · {학년}학년 {반}반 {번호}번 · {남/여} · {피해 관련/가해 관련/목격} · 보호자 통보 {라벨}{ · 비고}`. 보호자 통보 라벨: 통보 안 함 → `미통보`, 통보 → 「11.13. 유선」(일시가 있으면 `MM.DD.` + 방법), 둘 다 없으면 `통보함` |
| `separation.enforced`   | `enforced` / `not_enforced` / `""`(미정)                                                                                                                                                                                                          |
| `separation.period`     | `info.separation.period` 또는 `""`                                                                                                                                                                                                                |
| `separation.exceptions` | `exception_reasons`를 쉼표로 이은 문자열                                                                                                                                                                                                          |

`counts.info`는 이 값이 비어 있지 않은 admin 칸 수다.
