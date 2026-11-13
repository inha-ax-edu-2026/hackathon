import type {
  CaseDocuments,
  CounselCase,
  CounselDocument,
  CounselForm,
  DocumentKind,
  HandoffReason,
  Risk,
} from '@/api/counselTypes.ts'
import { DEMO_TEACHER_NAME, studentLabel } from '@/lib/counsel/identity.ts'
import { HANDOFF_REASON_LABEL, RISK_LABEL } from '@/lib/counsel/labels.ts'

/**
 * 사후 서류 초안 4종(명세 「사후 서류」). 전환 시점에 상담 양식·전환 요약·감지 키워드·위험도·전환 사유로 만든다.
 * 추천 규칙은 AI가 아니라 위험도 규칙이다. 서류 케이스·작성 시간은 03번(예비교사 팀) 확정 전 임시값이다.
 * 값이 오면 이 파일의 DOCUMENT_KINDS(종류·대상·추천 조건)와 분 단위 상수만 바꾼다.
 */

/** 서류 하나를 직접 쓰는 시간(분). 가정치. */
export const MANUAL_MINUTES = 8
/** 만들어 둔 초안을 검토하는 시간(분). 가정치. */
export const REVIEW_MINUTES = 1

const RISK_RANK: Record<Risk, number> = { low: 0, medium: 1, high: 2 }
const atLeast = (risk: Risk, min: Risk) => RISK_RANK[risk] >= RISK_RANK[min]

type Source = {
  student: CounselCase['student']
  form: CounselForm
  summary: string
  keywords: string[]
  risk: Risk
  reason: HandoffReason
  /** 전환 시각(ISO) */
  at: string
}

type KindSpec = {
  kind: DocumentKind
  title: string
  audience: string
  /** 추천 여부와 근거 */
  recommend: (risk: Risk, reason: HandoffReason) => { recommended: boolean; why: string }
  draft: (source: Source) => string
}

export const DOCUMENT_KINDS: KindSpec[] = [
  {
    kind: 'counsel_log',
    title: '상담일지',
    audience: '교사 보관용',
    recommend: () => ({
      recommended: true,
      why: '교사 보관용 기록이라 전환된 모든 상담 건에 추천해요.',
    }),
    draft: (s) =>
      [
        '[상담일지]',
        `상담 일시: ${dateLabel(s.at)} (개인상담으로 전환된 AI 챗봇 상담)`,
        `상담 대상: ${studentLabel(s.student)}`,
        `상담 주제: ${s.form.topic}`,
        `전환 사유: ${HANDOFF_REASON_LABEL[s.reason]} / 위험도 ${RISK_LABEL[s.risk]}`,
        `감지 키워드: ${keywordsLabel(s.keywords)}`,
        '',
        '상담 요약',
        s.summary,
        '',
        '상담 양식',
        formLines(s.form),
        '',
        '후속 조치: 개인상담 일정을 잡아 직접 만나 이야기를 듣는다.',
        `작성: ${DEMO_TEACHER_NAME} 교사`,
      ].join('\n'),
  },
  {
    kind: 'student_record',
    title: '학생부 상담 기록 초안',
    audience: '학교생활기록부 누가기록',
    recommend: () => ({
      recommended: true,
      why: '학교생활기록부 누가기록은 전환된 모든 상담 건에 추천해요.',
    }),
    draft: (s) =>
      [
        '[학교생활기록부 누가기록 초안]',
        `${dateLabel(s.at)} ${s.form.topic} 관련 고민으로 AI 챗봇 상담을 이용한 뒤 개인상담으로 전환함.`,
        `${s.student.name} 학생이 ${s.form.topic} 문제로 어려움을 느끼고 있어 교사와의 개인상담이 필요하다고 판단함.`,
        '개인상담에서 학생의 이야기를 듣고 필요한 지원을 안내할 예정임.',
        '(학생의 민감한 발언은 기록하지 않고, 개인상담 이후 교사가 내용을 보완한다.)',
      ].join('\n'),
  },
  {
    kind: 'parent_notice',
    title: '학부모 안내문',
    audience: '보호자',
    recommend: (risk, reason) =>
      atLeast(risk, 'medium')
        ? {
            recommended: true,
            why:
              reason === 'student_request'
                ? '위험도가 보통 이상이라 추천해요. 학생이 직접 요청한 전환이니 보호자에게 알릴지는 선생님이 판단해 주세요.'
                : `위험도가 ${RISK_LABEL[risk]}이라 보호자 안내를 추천해요.`,
          }
        : {
            recommended: false,
            why: '위험도가 낮음이라 보호자 안내는 추천하지 않아요.',
          },
    draft: (s) =>
      [
        `${s.student.name} 학생 학부모님께`,
        '',
        `안녕하세요, 담임교사 ${DEMO_TEACHER_NAME}입니다.`,
        `${s.student.name} 학생이 학교 상담 서비스를 통해 ${s.form.topic} 관련 고민을 나누었고, 담임교사와 개인상담으로 전환되었음을 안내드립니다.`,
        '학생의 이야기를 충분히 듣고 학교에서 도울 수 있는 부분을 함께 찾겠습니다.',
        '가정에서도 학생이 편하게 이야기할 수 있도록 따뜻하게 들어 주시면 큰 도움이 됩니다.',
        '상담 일정이 정해지면 다시 연락드리겠습니다. 궁금하신 점은 언제든 문의해 주세요.',
        '',
        `${dateLabel(s.at)}`,
        `담임교사 ${DEMO_TEACHER_NAME} 드림`,
      ].join('\n'),
  },
  {
    kind: 'crisis_report',
    title: '위기 학생 관리 보고서',
    audience: '학교 관리자·상담교사',
    recommend: (risk) =>
      risk === 'high'
        ? { recommended: true, why: '위험도가 높음이라 관리자·상담교사 보고를 추천해요.' }
        : {
            recommended: false,
            why: `위험도가 ${RISK_LABEL[risk]}이라 관리자 보고는 추천하지 않아요. 위험도 높음일 때만 추천해요.`,
          },
    draft: (s) =>
      [
        '[위기 학생 관리 보고서]',
        `보고 일시: ${dateLabel(s.at)}`,
        `대상 학생: ${studentLabel(s.student)}`,
        `위험도: ${RISK_LABEL[s.risk]}`,
        `전환 사유: ${HANDOFF_REASON_LABEL[s.reason]}`,
        `감지 키워드: ${keywordsLabel(s.keywords)}`,
        '',
        '상황 요약',
        s.summary,
        '',
        '조치 계획',
        '1. 담임교사가 학생과 개인상담을 우선 진행한다.',
        '2. 상담교사와 관리자에게 공유하고 필요하면 전문기관 연계를 검토한다.',
        '3. 자살예방 상담전화 109, 청소년상담 1388 이용을 학생에게 안내한다.',
        `보고자: ${DEMO_TEACHER_NAME} 교사`,
      ].join('\n'),
  },
]

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

const keywordsLabel = (keywords: string[]) => (keywords.length > 0 ? keywords.join(', ') : '없음')

const formLines = (form: CounselForm) =>
  form.answers.length > 0
    ? form.answers.map((a) => `- ${a.question} ${a.answer}`).join('\n')
    : '- (작성한 내용 없음)'

/** 전환 시점에 서류 초안 4종을 만든다. 추천된 서류는 처음부터 선택되어 있다. */
export function createDocuments(source: Source): CounselDocument[] {
  return DOCUMENT_KINDS.map((spec) => {
    const { recommended, why } = spec.recommend(source.risk, source.reason)
    return {
      kind: spec.kind,
      title: spec.title,
      audience: spec.audience,
      recommended,
      recommend_reason: why,
      draft: spec.draft(source),
      selected: recommended,
      approved: false,
    }
  })
}

/** 응답에 싣는 모양. 절감 분과 승인 완료 여부는 저장하지 않고 매번 계산한다. */
export function toCaseDocuments(items: CounselDocument[]): CaseDocuments {
  const selected = items.filter((d) => d.selected)
  return {
    items,
    saved_minutes: selected.length * (MANUAL_MINUTES - REVIEW_MINUTES),
    manual_minutes_per_document: MANUAL_MINUTES,
    review_minutes_per_document: REVIEW_MINUTES,
    all_approved: selected.length > 0 && selected.every((d) => d.approved),
  }
}
