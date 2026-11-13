# 프론트 기능 대조 결과

검토일: 2026-11-14. 프론트 기준 커밋: `dd8da651cae53257318f301805c6e4db9c6be726`. 실제 앱 소스 62개(페이지·API·도메인 컴포넌트·훅·유틸)를 읽고 로컬 백엔드 OpenAPI와 대조했다. 브라우저 전체 왕복 테스트를 완료했다는 의미는 아니다. 기준 이후 팀원이 추가한 기능은 별도 확인이 필요하다.

## 이미 구현된 기능

- 상담 신청 양식·생성·목록·상세·학생 대화·종료/교사 상담 요청.
- 위험 신호의 교사 알림, 읽음, 상담 승인, 자동 알림 뒤에도 대화 계속하기.
- 교사 상담 요약·입력 양식·기본 정보 탭.
- 기존 사후 서류 4종 선택·추천 근거·초안 수정·저장·검토 완료·수정 시 재검토.
- 학생의 마이크 입력. 브라우저 SpeechRecognition으로 텍스트를 입력하며 서버의 면담 WAV 전사와 다르다.

근거: [교사 상세](https://github.com/inha-ax-edu-2026/hackathon/blob/dd8da651cae53257318f301805c6e4db9c6be726/frontend/src/pages/teacher/CounselDetailPage.tsx#L45), [서류 카드](https://github.com/inha-ax-edu-2026/hackathon/blob/dd8da651cae53257318f301805c6e4db9c6be726/frontend/src/components/counsel/detail/DocumentsSlot.tsx#L30), [초안 편집·검토](https://github.com/inha-ax-edu-2026/hackathon/blob/dd8da651cae53257318f301805c6e4db9c6be726/frontend/src/components/counsel/detail/DocumentRow.tsx#L81), [마이크 입력](https://github.com/inha-ax-edu-2026/hackathon/blob/dd8da651cae53257318f301805c6e4db9c6be726/frontend/src/hooks/useVoiceInput.ts#L24).

## 로컬 백엔드에는 추가됐지만 팀 프론트에는 아직 연결되지 않은 부분

| 우선순위 | 기능 | 현재 프론트 상태 | 대응하는 백엔드/로컬 기능 |
| --- | --- | --- | --- |
| P1 | 이전 상담·학생별 진술서·사안 처리 중 개별 면담의 자료 입력 | 입력·원문 확인·자료 선택 UI 없음 | GET /api/teacher/document-drafts/sources, SourcePacket |
| P1 | 접수보고서 1-3·사안조사 보고서 2-4 | 기존 4종 DocumentKind에 포함되지 않음. 양식 선택·생성·항목별 근거·부족 정보·수정·보관 목록 UI 없음 | /api/teacher/document-drafts 생성·조회·수정 저장, /document-demo |
| P1 | 개별 면담 녹음 업로드·전사 확인·자료 반영 | 관련 파일 입력·API 호출 없음 | /api/teacher/interview-transcriptions. 참여자 동의 확인·WAV 2분 이하 구간 |
| P2 | 새 보고서 인쇄·JSON 내려받기 | 팀 React 화면에 없음 | 로컬 /document-demo에서 브라우저 인쇄와 JSON 내보내기 |
| P2 | AI 답변 음성 듣기(TTS) | 메시지는 텍스트만 표시 | 기존 /api/counsel/sessions/{sid}/speech는 비교실 세션용. 프론트 case ID에 맞춘 어댑터도 필요하므로 양쪽 작업 |

[현재 서류 종류 계약](https://github.com/inha-ax-edu-2026/hackathon/blob/dd8da651cae53257318f301805c6e4db9c6be726/frontend/src/api/counselTypes.ts#L146), [메시지 표시](https://github.com/inha-ax-edu-2026/hackathon/blob/dd8da651cae53257318f301805c6e4db9c6be726/frontend/src/components/counsel/MessageList.tsx#L6).

62개 앱 소스에서 document-drafts·interview-transcriptions 호출, 파일 입력·WAV 업로드, TTS/오디오 재생, 출력/내려받기 구현을 찾지 못했다. UI 기본 컴포넌트·모의 서버·테스트 코드는 기능 구현 여부 판정 대상에서 제외했다.

## 프론트 누락으로 분류하지 않는 항목

- 배포 주소·인증 헤더·MSW 해제: 양쪽의 실제 연동 작업이다. [apiFetch](https://github.com/inha-ax-edu-2026/hackathon/blob/dd8da651cae53257318f301805c6e4db9c6be726/frontend/src/lib/api.ts#L21)에는 현재 X-Frontend-Access/X-Teacher-Key 전달이 없다. [main.tsx](https://github.com/inha-ax-edu-2026/hackathon/blob/dd8da651cae53257318f301805c6e4db9c6be726/frontend/src/main.tsx#L18)는 주소가 없으면 모의 API를 켠다.
- 실제 슈퍼스쿨 학생 DB·장애 등록 정보·학생 실명 매핑: 백엔드도 실제 플랫폼에 연결되지 않았다. 화면만 추가해 해결할 수 없으며 장애 여부를 AI가 추정하면 안 된다.
- Zoom 자동 접속/녹음·장시간 면담·스캔 PDF/HWP/DOCX 파싱: 백엔드도 후속 범위다. 현재 TXT/붙여넣기와 제한된 WAV 전사를 지원한다.
- 공식 원본 PDF/HWP의 완성 파일: 백엔드도 원본 서식을 완전히 재현하지 않는다. 인쇄 가능한 항목별 초안과 JSON까지다.
- 교사에게 학생 대화 전문 표시: 현재 프론트 계약은 요약만 받도록 설계됐다. 내부 비교실의 전문 조회 API가 있다는 이유로 추가할 필수 기능으로 보지 않는다.
- 고성능/가성비 선택 UI: 고성능 단일 모델로 결정했으므로 새 선택기는 필요 없다.

## 정확히 표시할 운영 정보

[PrivacyNotice](https://github.com/inha-ax-edu-2026/hackathon/blob/dd8da651cae53257318f301805c6e4db9c6be726/frontend/src/components/counsel/PrivacyNotice.tsx#L24)는 교사 알림 예외를 안내한다. 실제 API 전환 시에는 AI 외부 전송·기록 보관·전문 접근 범위·가상 시연 여부 안내도 실제 운영과 맞춰야 한다. 면담 녹음·전사에는 별도 참여자 동의 확인 UI가 필요하다.

[PipelineProgress](https://github.com/inha-ax-edu-2026/hackathon/blob/dd8da651cae53257318f301805c6e4db9c6be726/frontend/src/components/counsel/detail/PipelineProgress.tsx#L5)는 타이머 기반 시연 애니메이션이다. 실제 서버의 단계별 진행률을 표시하려면 백엔드 작업 상태 API도 추가해야 한다.

## 최소 시연 연결안

기존 디자인의 사후 서류 탭에 **학폭 서류 초안 작업실 열기** 버튼을 먼저 넣고, 백엔드 /document-demo?case_id={id}로 연결한다. 공용 백엔드 주소·교사 접속·모의 API 해제 후 새 상담 ID를 사용한다. 이후 자료 입력·보고서 2종·면담 전사·근거 확인 UI를 현재 탭/카드 디자인으로 통합한다. 기존 4종 초안 편집기는 그대로 활용할 수 있다.

우선순위는 ① 공유 서버·인증 연결 ② 자료 3종 입력과 보고서 2종 ③ 면담 전사 ④ 출력/TTS다. 공용 서버를 인증 없이 공개하거나 API 키를 VITE_* 값에 넣지 않는다.

