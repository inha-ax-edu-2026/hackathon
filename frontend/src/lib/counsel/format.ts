const KST_PARTS = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** 「2026.11.16 16:00」(한국 시간 기준. 브라우저 시간대와 무관하게 같게 보인다) */
export function formatDateTime(iso: string) {
  const p = Object.fromEntries(KST_PARTS.formatToParts(new Date(iso)).map((x) => [x.type, x.value]))
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`
}
