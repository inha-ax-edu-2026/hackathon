import type { DemoMaterialKind, SchoolViolenceMaterial } from '@/api/schoolViolenceTypes.ts'

/**
 * 사안 자료 시드 원문(가상 사례). 작성 예시 docx의 가상 사안(가온중학교 2학년 3반)을 바탕으로 한다.
 * 이후 서류 초안의 AI 칸이 이 글을 인용하므로, 인용될 문장은 원문 그대로 이 안에 들어 있어야 한다.
 * 자료 ID는 서류 칸 인용의 source_id다. 조사 단계 자료는 시연 때문에 접수 직후 미리 넣어 둔다.
 */

export const MATERIAL_IDS = {
  counsel: 'm_counsel',
  victimStatement: 'm_statement_victim',
  offenderStatement: 'm_statement_offender',
  witnessStatement: 'm_statement_witness',
  victimInterview: 'm_interview_victim',
  offenderInterview: 'm_interview_offender',
  studentRecord: 'm_record',
} as const

const COUNSEL_RECORD = `[AI 챗봇 상담 기록 №4821]
상담 일시: 2026. 11. 13.(금) 19:40 (익명 상담으로 시작, 긴급 분류)
학생: 2학년 3반 21번 한지우
상담 양식: 주제 교우관계 / 지금 기분 1(힘듦) / 이어진 기간 한 달 이상 / 힘든 정도 4/5
양식에 쓴 고민: 반 단체방에서 계속 놀림을 받고, 친구들이 돈을 빌려 가고 돌려주지 않아요.

[대화 발췌]
학생: 10월 중순부터 우리 반 단체방에 제 체육복 사진이 올라오고 별명으로 놀림을 받아요. 거의 매일이에요.
학생: 정민혁이랑 박도윤이 쉬는 시간에 돈을 빌려 달라고 해서 네 번 줬는데 한 번도 돌려받지 못했어요.
학생: 11월 첫째 주에는 정민혁이 선생님한테 말하면 가만 안 둔다고 했어요. 그래서 무서워서 말을 못 했어요.
학생: 단체방 캡처를 저장해 뒀어요. 학교폭력이라고 해도 되는 건지 모르겠어요. 요즘 학교 가기 싫고 잠도 잘 못 자요.
AI: 용기 내어 말해 줘서 고마워. 지금 안전한지, 선생님과 바로 이야기하고 싶은지 알려 줄래?
학생: 선생님이랑 이야기하고 싶어요. 이름을 밝혀도 괜찮아요.

[설문형 응답] 보복·협박 위협을 들었나요? 예 / 신체 위해가 있었나요? 아니요 / 지속 기간: 약 4주
[감지 키워드] 학교폭력, 괴롭, 무서, 가기 싫

[책임교사 익명 음성 상담 메모] 2026. 11. 13. 20:05
학생이 직접 신고하는 것이며, 사진 게시와 금전 요구가 반복되었다고 진술함. 신체 폭력은 없다고 함. 정식 사안으로 처리하는 데 동의할지 확인함.

[전환 기록] 2026. 11. 13. 20:40 학생이 실명 전환과 정식 사건 접수에 동의함. 21:00 교감에게 유선 보고함. 피해 관련 학생이 분리를 희망하고 분리 의사 확인서를 제출함.`

const VICTIM_STATEMENT = `[학생 작성 확인서] 피해 관련 학생 한지우 (2학년 3반 21번)
작성일: 2026. 11. 17.

1. 있었던 일
10월 14일부터 반 단체방에 제 체육복 사진이 올라오기 시작했고 별명이 붙었습니다. 정민혁이 올렸고 박도윤은 그 사진을 합성해서 다시 올렸습니다. 10월 22일에 제가 단체방에 '그만해'라고 썼는데도 11월 12일까지 사진이 계속 올라왔습니다. 최서진은 게시물에 조롱하는 댓글을 여러 번 달았습니다.

2. 돈에 대해서
10월 21일 정민혁에게 5,000원, 10월 28일 7,000원, 11월 4일 박도윤에게 6,000원, 11월 10일 정민혁에게 5,000원을 줬습니다. 빌려 달라고 했지만 거절하면 사진을 더 올릴 것 같아 무서워서 줬습니다. 돌려 달라고 두 번 말했지만 '다음에'라고만 했습니다.
용돈 메모에 날짜와 금액을 적어 두었습니다. 10월 21일 5,000원, 10월 28일 7,000원, 11월 4일 6,000원, 11월 10일 5,000원이고 모두 돌려받지 못했습니다.
단체방 캡처에는 10월 29일 박도윤이 '돈 내일 줘~'라고 쓴 메시지가 있습니다.

3. 11월 5일
점심시간 복도에서 정민혁이 정색하고 '선생님한테 말하면 가만 안 둔다'고 말했습니다. 진짜 무서웠고 그 뒤로 선생님께 말하지 못했습니다.

4. 지금 상태
등교가 불안하고 잠을 잘 이루지 못합니다. 같은 반에서 분리되기를 원합니다.`

const OFFENDER_STATEMENT = `[학생 작성 확인서] 가해 관련 학생 3명 (2학년 3반)
작성일: 2026. 11. 17.(정민혁·박도윤), 2026. 11. 18.(최서진)

정민혁 (24번)
10월 14일에 단체방에 한지우의 체육복 사진을 올리고 별명을 붙인 것은 맞습니다. 이후 사진을 모두 9회 올렸습니다. 돈은 10월 21일 5,000원, 10월 28일 7,000원, 11월 10일 5,000원, 모두 3회 17,000원을 빌린 것이고 나중에 갚으려 했습니다. 정확한 액수는 기억나지 않습니다. 11월 5일에 그런 말을 한 건 맞지만 장난이었습니다.

박도윤 (12번)
정민혁이 올린 사진을 합성해서 올렸고 사진을 모두 8회 올렸습니다. 돈은 11월 4일에 한 번 6,000원 빌렸고 갚았다고 생각했습니다. 한지우가 '그만해'라고 쓴 건 봤지만 다들 하는 일이라고 생각했습니다.

최서진 (28번)
게시물에 조롱하는 댓글을 6회 썼습니다(10월 22일부터 11월 10일까지). 돈과는 관련이 없습니다. 다들 하길래 따라 했습니다. 잘못한 것을 모두 인정하고 사과하고 싶습니다.`

const WITNESS_STATEMENT = `[학생 작성 확인서] 목격 학생 2명 (2학년 3반)
작성일: 2026. 11. 18. 제출

목격 학생 A
10월 28일 쉬는 시간에 정민혁이 한지우에게 '빨리 내놔'라고 하는 것을 들었습니다. 정민혁은 돈을 빌릴 때 매번 먼저 요구했습니다. 이후 한지우가 돈을 건네는 것을 봤습니다.

목격 학생 B
쉬는 시간에 돈을 주고받는 장면은 봤으나 어떤 대화를 했는지는 듣지 못했습니다.

11월 5일 복도에서의 발언을 직접 본 학생은 없습니다.`

const VICTIM_INTERVIEW = `[면담 전사] 피해 측 비대면 면담 (녹음·전사는 학생·보호자 사전 동의 후 실시)
면담 일시: 2026. 11. 17.(화) 한지우 / 2026. 11. 18.(수) 한지우 보호자
면담자: 전담조사관 강태호

[11. 17. 한지우]
조사관: 돈을 건넨 이유를 말해 줄래요?
한지우: 거절하면 사진을 더 올릴 것 같아 무서워서 줬어요. 돌려 달라고 두 번 말했지만 '다음에'라고만 했어요.
조사관: 11월 5일에는 어떤 일이 있었나요?
한지우: 정색하고 말해서 진짜 무서웠어요. 그 뒤로 선생님께 말하지 못했어요.
조사관: 지금 학교생활은 어떤가요?
한지우: 등교가 불안하고 잠을 잘 못 자요. 상담 때 힘든 정도를 4점이라고 썼어요.

[11. 18. 피해 관련 학생 보호자]
보호자: 금전 반환과 진심 어린 사과를 원합니다. 지금은 사과를 받아들일 생각이 없고 심의위원회를 열었으면 합니다.
보호자: 단체방 게시물 삭제와 학급 분리도 요구합니다.
보호자: 관계회복 프로그램에는 지금은 참여를 원하지 않습니다. 자체해결에는 동의하지 않습니다.
조사관: 병원 진단서는 받으셨나요?
보호자: 진단서는 받지 않았습니다.`

const OFFENDER_INTERVIEW = `[면담 전사] 가해 측 비대면 면담 (녹음·전사는 학생·보호자 사전 동의 후 실시)
면담 일시: 2026. 11. 17.(화) 정민혁·박도윤 / 2026. 11. 18.(수) 최서진, 보호자 3명
면담자: 전담조사관 강태호

[11. 17. 정민혁]
조사관: 단체방에 올린 사진과 돈에 대해 말해 줄래요?
정민혁: 사진은 제가 올린 게 맞아요. 돈은 빌린 것이고 나중에 갚으려 했어요. 정확한 액수는 기억나지 않아요.
조사관: 11월 5일 말은 어떤 뜻이었나요?
정민혁: 그런 말을 한 건 맞지만 장난이었어요. 때리거나 실제로 뭘 한 적은 없어요.
조사관: 돈을 갚았다는 자료가 있나요?
정민혁: 따로 낸 자료는 없어요. 지금은 사과하고 싶어요.

[11. 17. 박도윤]
박도윤: 사진을 합성해서 올린 것은 인정해요. 한 번 6,000원 빌렸고 갚았다고 생각했어요. 사과 편지를 쓰고 싶어요.

[11. 18. 최서진]
최서진: 조롱하는 댓글을 단 건 사실이에요. 다들 하길래 따라 했어요. 11월 18일에 담임 선생님을 통해 사과하고 싶다는 뜻을 전했어요.

[11. 18. 가해 관련 학생 보호자]
정민혁·박도윤 보호자: 금액을 돌려주고 사과하겠습니다. 관계회복 프로그램에 참여할 의사가 있습니다.
최서진 보호자: 사과하겠습니다. 프로그램 참여 의사가 있습니다.

[조사 관련 확인] 반환 사실을 입증하는 자료 제출 없음. 단체방 게시물은 11월 16일 게시자가 삭제했고 캡처 원본 19매는 학교에서 보관함.
이전에 학교폭력 조치를 받은 이력은 3명 모두 없음.`

const STUDENT_RECORD = `[학적 정보] 슈퍼스쿨 학적 DB 연동을 가정한 가상 정보
학교: 가온중학교 / 교감 문경숙
2학년 3반 21번 한지우(남) - 특수교육대상자 아님, 이주배경학생 아님
2학년 3반 24번 정민혁(남) - 학교폭력 조치 이력 없음
2학년 3반 12번 박도윤(남) - 학교폭력 조치 이력 없음
2학년 3반 28번 최서진(남) - 학교폭력 조치 이력 없음
학생선수 여부: 해당 없음`

type Seed = Omit<SchoolViolenceMaterial, 'counsel_case_id'>

const SEEDS: Seed[] = [
  {
    id: MATERIAL_IDS.counsel,
    kind: 'counsel_record',
    title: 'AI 챗봇 상담 기록 №4821',
    body: COUNSEL_RECORD,
    stage: 'intake',
    demo_preloaded: false,
  },
  {
    id: MATERIAL_IDS.studentRecord,
    kind: 'student_record',
    title: '학적 정보 (관련 학생 4명)',
    body: STUDENT_RECORD,
    stage: 'intake',
    demo_preloaded: false,
  },
  {
    id: MATERIAL_IDS.victimStatement,
    kind: 'statement',
    title: '피해 관련 학생 진술서 (한지우)',
    body: VICTIM_STATEMENT,
    stage: 'investigation',
    demo_preloaded: true,
  },
  {
    id: MATERIAL_IDS.offenderStatement,
    kind: 'statement',
    title: '가해 관련 학생 진술서 (정민혁·박도윤·최서진)',
    body: OFFENDER_STATEMENT,
    stage: 'investigation',
    demo_preloaded: true,
  },
  {
    id: MATERIAL_IDS.witnessStatement,
    kind: 'statement',
    title: '목격 학생 확인서 2부',
    body: WITNESS_STATEMENT,
    stage: 'investigation',
    demo_preloaded: true,
  },
  {
    id: MATERIAL_IDS.victimInterview,
    kind: 'interview_transcript',
    title: '피해 측 면담 전사 (11.17.~11.18.)',
    body: VICTIM_INTERVIEW,
    stage: 'investigation',
    demo_preloaded: true,
  },
  {
    id: MATERIAL_IDS.offenderInterview,
    kind: 'interview_transcript',
    title: '가해 측 면담 전사 (11.17.~11.18.)',
    body: OFFENDER_INTERVIEW,
    stage: 'investigation',
    demo_preloaded: true,
  },
]

export const DEMO_MATERIAL_KINDS: DemoMaterialKind[] = ['statement', 'interview_transcript']

/**
 * 접수하는 상담 건에 연결해 사안 자료 시드를 만든다. 상담 기록만 그 상담 건에 이어진다.
 * 시연용 조사 자료(demo_preloaded)는 demoKinds에 든 종류만 붙인다. 기본은 모두.
 */
export function createMaterials(
  counselCaseId: string,
  demoKinds: DemoMaterialKind[] = DEMO_MATERIAL_KINDS,
): SchoolViolenceMaterial[] {
  return SEEDS.filter(
    (seed) => !seed.demo_preloaded || demoKinds.includes(seed.kind as DemoMaterialKind),
  ).map((seed) => ({
    ...seed,
    counsel_case_id: seed.kind === 'counsel_record' ? counselCaseId : null,
  }))
}
