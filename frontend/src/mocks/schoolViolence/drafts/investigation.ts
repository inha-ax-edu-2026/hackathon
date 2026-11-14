import type { DocumentField, Evidence } from '@/api/schoolViolenceTypes.ts'
import { offenderFieldId } from '@/lib/schoolViolence/studentFields.ts'
import { MATERIAL_IDS } from '@/mocks/schoolViolence/materials.ts'
import { adminField, manualField, narrativeField, sensitiveField } from './fields.ts'

/**
 * 2-4 사안조사 보고서 목 초안. 값은 작성 예시 docx의 2-4 값이고, 인용문은 사안 자료 원문
 * (materials.ts)에 실제로 들어 있는 문장이다. 판단 칸(1차/보완 구분·자체해결 의견·긴급조치·재발 현황·
 * 선도 가능성·장애 여부)은 docx에 예시 값이 있어도 비워 둔다.
 *
 * 반복 구조는 칸 id로 나눈다.
 * - 쟁점 n개: `issue.<n>.<title|victim_claim|victim_evidence|offender_claim|offender_evidence|witness_claim|witness_evidence>`
 * - 가해 관련 학생별 시행령 제19조 판단요소: `factor.<판단요소>.<학생 이름>` (`offenderFieldId`)
 * - 학생과 상관없는 공통 사실: `common.<판단요소>`
 * 원본 docx는 지속성·고의성에 「[정민혁·박도윤]」처럼 묶은 문장을 쓰지만, 여기서는 학생마다 칸을 나눈다.
 */

const M = MATERIAL_IDS
const q = (sourceId: string, quote: string): Evidence => ({ source_id: sourceId, quote })

// 상담 기록
const C_TIME = q(M.counsel, '상담 일시: 2026. 11. 13.(금) 19:40 (익명 상담으로 시작, 긴급 분류)')
const C_MEMO = q(M.counsel, '[책임교사 익명 음성 상담 메모] 2026. 11. 13. 20:05')
const C_SWITCH = q(
  M.counsel,
  '[전환 기록] 2026. 11. 13. 20:40 학생이 실명 전환과 정식 사건 접수에 동의함. 21:00 교감에게 유선 보고함.',
)
const C_THREAT = q(M.counsel, '[설문형 응답] 보복·협박 위협을 들었나요? 예')
const C_PHYSICAL = q(M.counsel, '신체 위해가 있었나요? 아니요')
const C_DURATION = q(M.counsel, '지속 기간: 약 4주')
const C_LEVEL = q(M.counsel, '힘든 정도 4/5')
const C_SLEEP = q(M.counsel, '요즘 학교 가기 싫고 잠도 잘 못 자요')
const C_BREAK_MONEY = q(
  M.counsel,
  '정민혁이랑 박도윤이 쉬는 시간에 돈을 빌려 달라고 해서 네 번 줬는데 한 번도 돌려받지 못했어요',
)

// 피해 관련 학생 진술서
const VS_START = q(
  M.victimStatement,
  '10월 14일부터 반 단체방에 제 체육복 사진이 올라오기 시작했고 별명이 붙었습니다. 정민혁이 올렸고 박도윤은 그 사진을 합성해서 다시 올렸습니다.',
)
const VS_STOP = q(
  M.victimStatement,
  "10월 22일에 제가 단체방에 '그만해'라고 썼는데도 11월 12일까지 사진이 계속 올라왔습니다.",
)
const VS_MONEY = q(
  M.victimStatement,
  '10월 21일 정민혁에게 5,000원, 10월 28일 7,000원, 11월 4일 박도윤에게 6,000원, 11월 10일 정민혁에게 5,000원을 줬습니다.',
)
const VS_WHY = q(
  M.victimStatement,
  "빌려 달라고 했지만 거절하면 사진을 더 올릴 것 같아 무서워서 줬습니다. 돌려 달라고 두 번 말했지만 '다음에'라고만 했습니다.",
)
const VS_MEMO = q(
  M.victimStatement,
  '용돈 메모에 날짜와 금액을 적어 두었습니다. 10월 21일 5,000원, 10월 28일 7,000원, 11월 4일 6,000원, 11월 10일 5,000원이고 모두 돌려받지 못했습니다.',
)
const VS_CAPTURE = q(
  M.victimStatement,
  "단체방 캡처에는 10월 29일 박도윤이 '돈 내일 줘~'라고 쓴 메시지가 있습니다.",
)
const VS_1105 = q(
  M.victimStatement,
  "점심시간 복도에서 정민혁이 정색하고 '선생님한테 말하면 가만 안 둔다'고 말했습니다.",
)
const VS_NOW = q(M.victimStatement, '등교가 불안하고 잠을 잘 이루지 못합니다.')

// 가해 관련 학생 진술서
const OS_MIN_PHOTO = q(
  M.offenderStatement,
  '10월 14일에 단체방에 한지우의 체육복 사진을 올리고 별명을 붙인 것은 맞습니다. 이후 사진을 모두 9회 올렸습니다.',
)
const OS_MIN_MONEY = q(
  M.offenderStatement,
  '돈은 10월 21일 5,000원, 10월 28일 7,000원, 11월 10일 5,000원, 모두 3회 17,000원을 빌린 것이고 나중에 갚으려 했습니다. 정확한 액수는 기억나지 않습니다.',
)
const OS_MIN_1105 = q(M.offenderStatement, '11월 5일에 그런 말을 한 건 맞지만 장난이었습니다.')
const OS_DOY_PHOTO = q(
  M.offenderStatement,
  '정민혁이 올린 사진을 합성해서 올렸고 사진을 모두 8회 올렸습니다.',
)
const OS_DOY_MONEY = q(
  M.offenderStatement,
  '돈은 11월 4일에 한 번 6,000원 빌렸고 갚았다고 생각했습니다.',
)
const OS_DOY_SAW = q(
  M.offenderStatement,
  "한지우가 '그만해'라고 쓴 건 봤지만 다들 하는 일이라고 생각했습니다.",
)
const OS_SEO_COMMENT = q(
  M.offenderStatement,
  '게시물에 조롱하는 댓글을 6회 썼습니다(10월 22일부터 11월 10일까지). 돈과는 관련이 없습니다.',
)
const OS_SEO_SORRY = q(M.offenderStatement, '잘못한 것을 모두 인정하고 사과하고 싶습니다.')

// 목격 학생 확인서
const WS_HEADER = q(M.witnessStatement, '작성일: 2026. 11. 18. 제출')
const WS_A1 = q(
  M.witnessStatement,
  "10월 28일 쉬는 시간에 정민혁이 한지우에게 '빨리 내놔'라고 하는 것을 들었습니다.",
)
const WS_A2 = q(M.witnessStatement, '정민혁은 돈을 빌릴 때 매번 먼저 요구했습니다.')
const WS_B = q(
  M.witnessStatement,
  '쉬는 시간에 돈을 주고받는 장면은 봤으나 어떤 대화를 했는지는 듣지 못했습니다.',
)
const WS_NONE = q(M.witnessStatement, '11월 5일 복도에서의 발언을 직접 본 학생은 없습니다.')

// 피해 측 면담 전사
const VI_DATE = q(
  M.victimInterview,
  '면담 일시: 2026. 11. 17.(화) 한지우 / 2026. 11. 18.(수) 한지우 보호자',
)
const VI_INTERVIEWER = q(M.victimInterview, '면담자: 전담조사관 강태호')
const VI_WHY = q(
  M.victimInterview,
  "한지우: 거절하면 사진을 더 올릴 것 같아 무서워서 줬어요. 돌려 달라고 두 번 말했지만 '다음에'라고만 했어요.",
)
const VI_1105 = q(
  M.victimInterview,
  '한지우: 정색하고 말해서 진짜 무서웠어요. 그 뒤로 선생님께 말하지 못했어요.',
)
const VI_NOW = q(
  M.victimInterview,
  '한지우: 등교가 불안하고 잠을 잘 못 자요. 상담 때 힘든 정도를 4점이라고 썼어요.',
)
const VI_GUARD_WANT = q(
  M.victimInterview,
  '보호자: 금전 반환과 진심 어린 사과를 원합니다. 지금은 사과를 받아들일 생각이 없고 심의위원회를 열었으면 합니다.',
)
const VI_GUARD_DEMAND = q(M.victimInterview, '보호자: 단체방 게시물 삭제와 학급 분리도 요구합니다.')
const VI_GUARD_NO_PROGRAM = q(
  M.victimInterview,
  '보호자: 관계회복 프로그램에는 지금은 참여를 원하지 않습니다. 자체해결에는 동의하지 않습니다.',
)
const VI_NO_DIAGNOSIS = q(M.victimInterview, '보호자: 진단서는 받지 않았습니다.')

// 가해 측 면담 전사
const OI_DATE = q(
  M.offenderInterview,
  '면담 일시: 2026. 11. 17.(화) 정민혁·박도윤 / 2026. 11. 18.(수) 최서진, 보호자 3명',
)
const OI_MIN = q(
  M.offenderInterview,
  '정민혁: 사진은 제가 올린 게 맞아요. 돈은 빌린 것이고 나중에 갚으려 했어요. 정확한 액수는 기억나지 않아요.',
)
const OI_MIN_1105 = q(
  M.offenderInterview,
  '정민혁: 그런 말을 한 건 맞지만 장난이었어요. 때리거나 실제로 뭘 한 적은 없어요.',
)
const OI_MIN_NO_PROOF = q(
  M.offenderInterview,
  '정민혁: 따로 낸 자료는 없어요. 지금은 사과하고 싶어요.',
)
const OI_DOY = q(
  M.offenderInterview,
  '박도윤: 사진을 합성해서 올린 것은 인정해요. 한 번 6,000원 빌렸고 갚았다고 생각했어요. 사과 편지를 쓰고 싶어요.',
)
const OI_SEO = q(
  M.offenderInterview,
  '최서진: 조롱하는 댓글을 단 건 사실이에요. 다들 하길래 따라 했어요. 11월 18일에 담임 선생님을 통해 사과하고 싶다는 뜻을 전했어요.',
)
const OI_GUARD_MD = q(
  M.offenderInterview,
  '정민혁·박도윤 보호자: 금액을 돌려주고 사과하겠습니다. 관계회복 프로그램에 참여할 의사가 있습니다.',
)
const OI_GUARD_SEO = q(
  M.offenderInterview,
  '최서진 보호자: 사과하겠습니다. 프로그램 참여 의사가 있습니다.',
)
const OI_NO_RETURN_PROOF = q(M.offenderInterview, '반환 사실을 입증하는 자료 제출 없음')
const OI_DELETED = q(
  M.offenderInterview,
  '단체방 게시물은 11월 16일 게시자가 삭제했고 캡처 원본 19매는 학교에서 보관함.',
)

// 학적 정보
const SR_MIGRANT = q(
  M.studentRecord,
  '2학년 3반 21번 한지우(남) - 특수교육대상자 아님, 이주배경학생 아님',
)

/** 쟁점 한 개의 칸 7개. 쟁점 문장·세 주체의 주장·각 근거자료. */
type IssueText = {
  title: [string, Evidence[]]
  victimClaim: [string, Evidence[]]
  victimEvidence: [string, Evidence[]]
  offenderClaim: [string, Evidence[]]
  offenderEvidence: [string, Evidence[]]
  witnessClaim: [string, Evidence[]]
  witnessEvidence: [string, Evidence[]]
}

function issueFields(n: number, t: IssueText): DocumentField[] {
  const ref = `쟁점 ${n}`
  const make = (part: string, label: string, [value, evidence]: [string, Evidence[]]) =>
    narrativeField(`issue.${n}.${part}`, `${ref} · ${label}`, value, evidence)
  return [
    make('title', '쟁점 문장', t.title),
    make('victim_claim', '피해(관련) 학생의 주장 내용', t.victimClaim),
    make('victim_evidence', '피해(관련) 주장의 근거자료', t.victimEvidence),
    make('offender_claim', '가해(관련) 학생의 주장 내용', t.offenderClaim),
    make('offender_evidence', '가해(관련) 주장의 근거자료', t.offenderEvidence),
    make('witness_claim', '목격학생의 진술 등', t.witnessClaim),
    make('witness_evidence', '목격 진술의 근거자료', t.witnessEvidence),
  ]
}

/** 시행령 제19조 판단요소 중 가해 관련 학생별로 나뉘는 칸의 (키, 표시명). */
const FACTORS: { key: string; label: string }[] = [
  { key: 'severity', label: '학교폭력의 심각성' },
  { key: 'persistence', label: '학교폭력의 지속성' },
  { key: 'intent', label: '학교폭력의 고의성' },
  { key: 'remorse', label: '가해학생의 반성 정도' },
  { key: 'reconcile', label: '보호자 간 화해 정도' },
]

/** 가해 관련 학생 한 명의 판단요소 값. */
type OffenderFacts = Record<
  'severity' | 'persistence' | 'intent' | 'remorse' | 'reconcile',
  [string, Evidence[]]
>

const OFFENDER_FACTS: Record<string, OffenderFacts> = {
  정민혁: {
    severity: [
      '사진 게시 9회, 금전 3회 17,000원, 11.5. 신고 관련 발언',
      [OS_MIN_PHOTO, OS_MIN_MONEY, OS_MIN_1105],
    ],
    persistence: [
      '10.14.~11.12. 약 4주간 단체방 게시 9회, 금전 수령 3회(10.21. / 10.28. / 11.10.)',
      [VS_START, VS_STOP, OS_MIN_PHOTO, OS_MIN_MONEY, C_DURATION],
    ],
    intent: [
      "10.22. 한지우가 단체방에 '그만해'라고 쓴 뒤에도 게시가 계속됨. 금전은 매번 먼저 요구했다는 목격 학생 A의 확인서가 있음.",
      [VS_STOP, WS_A2],
    ],
    remorse: [
      "게시 사실 인정. 금전은 '빌린 것', 11.5. 발언은 '장난'이라고 주장. 사과 의사 있음(11.17.)",
      [OI_MIN, OI_MIN_1105, OI_MIN_NO_PROOF],
    ],
    reconcile: ['정민혁 보호자: 금액 반환 및 사과 의사 표명(11.18.)', [OI_GUARD_MD]],
  },
  박도윤: {
    severity: ['사진 합성·게시 8회, 금전 1회 6,000원', [OS_DOY_PHOTO, OS_DOY_MONEY]],
    persistence: [
      '10.14.~11.12. 약 4주간 단체방 게시 8회, 금전 수령 1회(11.4.)',
      [VS_START, VS_STOP, OS_DOY_PHOTO, OS_DOY_MONEY, C_DURATION],
    ],
    intent: [
      "한지우가 '그만해'라고 쓴 것을 봤지만 '다들 하는 일'이라고 생각했다고 진술함. 10.22. 이후에도 게시가 계속됨.",
      [OS_DOY_SAW, VS_STOP],
    ],
    remorse: [
      "게시·합성 인정, 금전은 '갚았다고 생각했다'고 진술. 사과 편지 작성 의사 밝힘(11.17.)",
      [OI_DOY],
    ],
    reconcile: ['박도윤 보호자: 금액 반환 및 사과 의사 표명(11.18.)', [OI_GUARD_MD]],
  },
  최서진: {
    severity: ['조롱 댓글 6회, 금전 관련 없음', [OS_SEO_COMMENT]],
    persistence: ['10.22.~11.10. 댓글 6회', [OS_SEO_COMMENT]],
    intent: ["'다들 하길래 따라 했다'고 진술함(11.18. 면담)", [OI_SEO]],
    remorse: ['사실 모두 인정, 11.18. 담임을 통해 사과 의사 전달', [OS_SEO_SORRY, OI_SEO]],
    reconcile: ['최서진 보호자: 사과 의사 표명(11.18.)', [OI_GUARD_SEO]],
  },
}

/** 가해 관련 학생별 판단 칸(선도 가능성·재발 현황). 시드에서는 누구도 미리 채우지 않는다. */
const OFFENDER_JUDGEMENTS: { key: string; label: string }[] = [
  { key: 'education', label: '선도 가능성(담임 입력: 평소 생활태도, 사안접수 이후 변화)' },
  { key: 'recurrence', label: '학교폭력 재발 현황(학년 / 사안번호 / 선도조치)' },
]

export function createInvestigationFields(): DocumentField[] {
  const offenders = Object.keys(OFFENDER_FACTS)

  const factorFields = FACTORS.flatMap(({ key, label }) =>
    offenders.map((name) => {
      const [value, evidence] = OFFENDER_FACTS[name][key as keyof OffenderFacts]
      return narrativeField(offenderFieldId(key, name), `${label} · ${name}`, value, evidence)
    }),
  )
  const judgementFields = OFFENDER_JUDGEMENTS.flatMap(({ key, label }) =>
    offenders.map((name) => manualField(offenderFieldId(key, name), `${label} · ${name}`)),
  )

  return [
    manualField('round', '1차 조사 / 보완조사 구분'),
    adminField('school', '학교명'),
    adminField('case_number', '사안번호'),
    adminField('received_at', '신고접수 일자'),
    adminField('teacher', '작성자 · 책임교사 성명'),
    manualField('teacher_phone', '작성자 · 책임교사 연락처'),
    narrativeField('investigated_at', '사안조사 일자', '2026년 11월 17일~18일', [VI_DATE, OI_DATE]),
    narrativeField('investigator', '작성자 · 조사관 성명', '강태호', [VI_INTERVIEWER]),
    manualField('investigator_phone', '작성자 · 조사관 연락처'),
    narrativeField('incident_type', '사안 유형', '금품갈취, 사이버폭력, 언어폭력', [
      VS_MONEY,
      VS_START,
      VS_1105,
    ]),
    narrativeField(
      'incident_summary',
      '사안 유형별 횟수 요약',
      [
        '• 금품갈취 4회(총 23,000원, 미반환)',
        '• 반 단체방 사진·합성 이미지 게시 17회, 조롱 댓글 6회',
        '• 신고 관련 위협성 발언 1회',
      ].join('\n'),
      [VS_MEMO, OS_MIN_PHOTO, OS_DOY_PHOTO, OS_SEO_COMMENT, VS_1105],
    ),
    adminField('students', '관련 학생'),
    narrativeField(
      'overview',
      '사안 개요(주요 내용)',
      "2026. 10. 14.경부터 11. 12.까지 2학년 3반 교실과 반 단체 채팅방에서, 정민혁·박도윤은 한지우의 체육복 사진과 이를 합성한 이미지를 17회 게시하며 별명을 붙였고, 최서진은 게시물에 조롱하는 댓글을 6회 씀. 정민혁(3회, 17,000원)·박도윤(1회, 6,000원)은 쉬는 시간에 '빌려 달라'며 총 23,000원을 받아 가 반환하지 않음. 11. 5. 정민혁이 한지우에게 '선생님한테 말하면 가만 안 둔다'고 말함(발언 사실은 양측이 일치하고, 의미는 다툼).",
      [VS_START, OS_MIN_PHOTO, OS_DOY_PHOTO, OS_SEO_COMMENT, C_BREAK_MONEY, VS_MONEY, VS_1105],
    ),
    narrativeField(
      'timeline',
      '사안 경위(세부내용 전체, 시간순)',
      [
        '• 10.14.(수) 정민혁이 단체방에 한지우의 체육복 사진을 올리고 별명을 붙임. 박도윤이 사진을 합성해 다시 올림.',
        '• 10.21.(수) 정민혁이 5,000원을 받아 감(1회차).',
        "• 10.22.(목) 한지우가 단체방에 '그만해'라고 씀. 이후 11.12.까지 게시가 계속됨. 최서진 댓글 6회(10.22.~11.10.).",
        '• 10.28.(수) 정민혁 7,000원 / 11.4.(수) 박도윤 6,000원 / 11.10.(화) 정민혁 5,000원 수령, 모두 미반환.',
        "• 11.5.(목) 점심시간 복도에서 정민혁이 '선생님한테 말하면 가만 안 둔다'고 말함.",
        '• 11.13.(금) 19:40 AI 익명 상담 신청(긴급 분류) → 20:05 책임교사 익명 음성 상담 → 20:40 정식 사건 전환 동의·접수 → 21:00 교감 유선 보고.',
        '• 11.16.(월) 단체방 게시물을 게시자가 삭제함. 캡처 원본 19매는 학교 보관.',
        '• 11.17.(화)~18.(수) 전담조사관 방문 조사: 관련 학생 면담, 목격 학생 2명 확인서, 보호자 면담(녹음·전사 동의). 조사 과정에서 최서진 관련 사실 추가 확인.',
      ].join('\n'),
      [
        VS_START,
        VS_STOP,
        OS_SEO_COMMENT,
        VS_MONEY,
        VS_1105,
        C_TIME,
        C_MEMO,
        C_SWITCH,
        OI_DELETED,
        VI_DATE,
        OI_DATE,
        q(M.witnessStatement, '[학생 작성 확인서] 목격 학생 2명 (2학년 3반)'),
      ],
    ),
    adminField('separation.enforced', '분리 시행 여부'),
    adminField('separation.period', '분리 기간'),
    adminField('separation.exceptions', '분리 예외 사유'),

    manualField('self_resolution.1.opinion', '자체해결 요건 1 · 조사관 의견(충족 여부)'),
    narrativeField(
      'self_resolution.1.facts',
      '자체해결 요건 1 · 참고 사실',
      '진단서 제출 없음(11.18. 기준)',
      [VI_NO_DIAGNOSIS],
    ),
    manualField('self_resolution.2.opinion', '자체해결 요건 2 · 조사관 의견(충족 여부)'),
    narrativeField(
      'self_resolution.2.facts',
      '자체해결 요건 2 · 참고 사실',
      '23,000원 미반환. 정민혁·박도윤 보호자 반환 의사 표명(11.18.)',
      [VS_MEMO, OI_GUARD_MD],
    ),
    manualField('self_resolution.3.opinion', '자체해결 요건 3 · 조사관 의견(충족 여부)'),
    narrativeField(
      'self_resolution.3.facts',
      '자체해결 요건 3 · 참고 사실',
      '10.14.~11.12. 게시 17회, 금전 4회',
      [VS_START, VS_STOP, OS_MIN_PHOTO, OS_DOY_PHOTO, VS_MONEY],
    ),
    manualField('self_resolution.4.opinion', '자체해결 요건 4 · 조사관 의견(충족 여부)'),
    narrativeField(
      'self_resolution.4.facts',
      '자체해결 요건 4 · 참고 사실',
      '11.5. 신고 관련 발언 있음(정민혁은 장난이라고 진술). 정민혁은 실제로 한 행위는 없다고 진술함',
      [VS_1105, OI_MIN_1105],
    ),
    narrativeField(
      'self_resolution.consent',
      '자체해결 동의 여부(현재까지 확인된 내용)',
      '피해 관련 학생 측 자체해결 부동의, 심의위원회 개최 희망(11.18. 보호자 면담)',
      [VI_GUARD_WANT, VI_GUARD_NO_PROGRAM],
    ),

    ...issueFields(1, {
      title: [
        "• 금전을 '빌린 것'인지, 요구에 못 이겨 '준 것'인지 (금품갈취 해당 여부)",
        [VS_WHY, OI_MIN],
      ],
      victimClaim: [
        "• 한지우: 거절하면 사진을 더 올릴 것 같아 무서워서 줬다. 돌려 달라고 두 번 말했지만 '다음에'라고만 했다. (11.17. 면담)",
        [VI_WHY],
      ],
      victimEvidence: [
        [
          '• 피해 측 용돈 메모: 10.21. 5,000 / 10.28. 7,000 / 11.4. 6,000 / 11.10. 5,000원',
          "• 단체방 캡처 10.29. 박도윤 '돈 내일 줘~' 메시지",
          '• 피해 관련 학생 보호자 면담 전사 (11.18.)',
        ].join('\n'),
        [VS_MEMO, VS_CAPTURE, VI_GUARD_WANT],
      ],
      offenderClaim: [
        [
          '• 정민혁: 빌린 것이고 나중에 갚으려 했다. 정확한 액수는 기억나지 않는다.',
          '• 박도윤: 한 번 6,000원 빌렸고 갚았다고 생각했다. (11.17. 면담)',
        ].join('\n'),
        [OI_MIN, OI_DOY],
      ],
      offenderEvidence: [
        ['• 반환 사실을 입증하는 자료 제출 없음', '• 가해 관련 학생 면담 전사 (11.17.)'].join('\n'),
        [OI_NO_RETURN_PROOF, OI_MIN_NO_PROOF],
      ],
      witnessClaim: [
        [
          "• 목격 학생 A: 10.28. 쉬는 시간에 정민혁이 '빨리 내놔'라고 하는 것을 들었다.",
          '• 목격 학생 B: 돈을 주고받는 장면은 봤으나 대화는 듣지 못했다.',
        ].join('\n'),
        [WS_A1, WS_B],
      ],
      witnessEvidence: ['• 목격 학생 확인서 2부 (11.18. 제출)', [WS_HEADER]],
    }),
    ...issueFields(2, {
      title: [
        "• 11.5. '선생님한테 말하면 가만 안 둔다' 발언의 의미 (신고 관련 위협 여부)",
        [VS_1105, OI_MIN_1105],
      ],
      victimClaim: [
        '• 한지우: 정색하고 말해서 진짜 무서웠다. 그 뒤로 선생님께 말하지 못했다. (11.17. 면담)',
        [VI_1105],
      ],
      victimEvidence: [
        [
          "• AI 익명 상담 기록 №4821 (11.13.) — 보복·협박 '예' 응답",
          '• 피해 관련 학생 면담 전사 (11.17.)',
        ].join('\n'),
        [C_THREAT, VI_1105],
      ],
      offenderClaim: [
        '• 정민혁: 그런 말을 한 건 맞지만 장난이었다. 때리거나 실제로 뭘 한 적은 없다. (11.17. 면담)',
        [OI_MIN_1105],
      ],
      offenderEvidence: ['• 가해 관련 학생 면담 전사 (11.17.)', [OI_MIN_1105]],
      witnessClaim: ['• 발언 장면을 목격한 학생 없음', [WS_NONE]],
      witnessEvidence: ['• 목격 학생 확인서 2부 (11.18. 제출)', [WS_NONE]],
    }),

    narrativeField(
      'common.severity',
      '학교폭력의 심각성 · 공통',
      [
        '• 금품갈취·사이버폭력·언어폭력이 함께 일어남. 반 단체방에 게시함.',
        '• 신체 위해는 없다고 진술함. 진단서는 받지 않음.',
        '• 피해 관련 학생은 등교 불안·수면 곤란을 호소함(상담 힘든 정도 4/5).',
      ].join('\n'),
      [VS_START, C_PHYSICAL, VI_NO_DIAGNOSIS, C_LEVEL, C_SLEEP, VS_NOW, VI_NOW],
    ),
    ...factorFields,
    narrativeField(
      'common.reconcile',
      '화해 정도 · 피해 관련 학생 보호자',
      '피해 관련 학생 보호자: 금전 반환과 진심 어린 사과를 원함. 현재 사과 수용 의사 없음, 심의위원회 개최 희망(11.18.)',
      [VI_GUARD_WANT],
    ),
    narrativeField(
      'common.program',
      '화해 정도 · 관계회복 프로그램·갈등조정',
      '피해 관련 학생 측은 현재 참여를 원하지 않음. 가해 관련 학생 측 보호자는 참여 의사를 밝힘(11.18.). 프로그램을 실제로 진행했는지는 사안 자료에 없음(교사 확인 필요).',
      [VI_GUARD_NO_PROGRAM, OI_GUARD_MD, OI_GUARD_SEO],
    ),
    ...judgementFields,
    sensitiveField('disability', '피해학생이 장애학생인지 여부'),
    manualField('urgent.victim', '긴급조치 여부 · 피해(관련)학생'),
    manualField('urgent.offender', '긴급조치 여부 · 가해(관련)학생'),
    narrativeField(
      'special',
      '특이사항 및 고려사항',
      [
        '• 피해 관련 학생 보호자 요구: 금전 반환, 진심 어린 사과, 단체방 게시물 삭제, 학급 분리',
        '• 단체방 게시물은 11.16. 게시자가 삭제함. 캡처 원본 19매는 학교 보관',
        '• 이주배경학생 해당 없음(학적 정보)',
        '• 경찰신고·고소·법률대리인 선임 여부는 사안 자료에 언급 없음(교사 확인 필요)',
      ].join('\n'),
      [VI_GUARD_WANT, VI_GUARD_DEMAND, OI_DELETED, SR_MIGRANT],
    ),
    manualField('etc', '기타 사항(보완조사: 사례회의 일시·주요 보완사항)'),
  ]
}
