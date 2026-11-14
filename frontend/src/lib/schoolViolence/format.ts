const KST_PARTS = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
})

/** 「2026년 11월 13일 오후 8시 40분」(한국 시간 기준) */
export function formatKoreanDateTime(iso: string) {
  const p = Object.fromEntries(KST_PARTS.formatToParts(new Date(iso)).map((x) => [x.type, x.value]))
  const hour = Number(p.hour)
  const meridiem = hour < 12 ? '오전' : '오후'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${p.year}년 ${p.month}월 ${p.day}일 ${meridiem} ${hour12}시 ${p.minute}분`
}
