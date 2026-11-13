import type { CounselCase, Student } from '@/api/counselTypes.ts'

/** 교사 화면은 학생 이름을 가려 보인다. 「김하늘」 → 「김○○」 */
export function maskName(name: string) {
  const [first = '', ...rest] = [...name]
  return first + rest.map(() => '○').join('')
}

/** 「2학년 3반 12번 김○○」 */
export function maskedStudentLabel({ grade, class: classNo, number, name }: Student) {
  return `${grade}학년 ${classNo}반 ${number}번 ${maskName(name)}`
}

const CHATBOT_PREFIX = /^\[AI 챗봇\]\s*/

/** 상담제목을 종류 칩과 나머지 제목으로 나눈다. 「[AI 챗봇] 교우관계 상담」 → 「AI 챗봇」 + 「교우관계 상담」 */
export function splitTitle({ kind, title }: Pick<CounselCase, 'kind' | 'title'>) {
  if (kind === 'chatbot') return { chip: 'AI 챗봇', text: title.replace(CHATBOT_PREFIX, '') }
  return { chip: '개인상담', text: title }
}

const KST_PARTS = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** 「2026.11.16 16:00」 */
export function formatDateTime(iso: string) {
  const p = Object.fromEntries(KST_PARTS.formatToParts(new Date(iso)).map((x) => [x.type, x.value]))
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`
}

/**
 * 상담예약일시 칸. 일정이 있으면 날짜(+방식), 없으면 전환 건은 「일정 미정」, 종료 건은 「-」.
 */
export function scheduleLabel({ schedule, status }: Pick<CounselCase, 'schedule' | 'status'>) {
  if (schedule.at) return formatDateTime(schedule.at)
  return status === 'completed' ? '-' : '일정 미정'
}

/** 알림 시트에 쓰는 「3분 전」 표기 */
export function timeAgo(iso: string, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (seconds < 60) return '방금 전'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}
