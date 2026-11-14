/** 양식 범례: 칸 색이 무슨 뜻인지. 작성 예시 docx 맨 위의 범례 줄과 같은 규칙이다. */
export function FormLegend() {
  return (
    <ul aria-label="범례" className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="size-3 rounded-sm bg-ai" />
        <span className="text-ai">AI 작성</span>
        <span className="text-muted-foreground">(근거 인용이 붙어요)</span>
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="size-3 rounded-sm bg-judge" />
        <span className="text-judge">교사 판단·입력</span>
        <span className="text-muted-foreground">(AI가 채우지 않아요)</span>
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="size-3 rounded-sm border border-black/70 bg-white" />
        <span>양식 원문</span>
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="w-5 border-b border-dashed border-black/60" />
        <span>사안 정보에서 가져옴</span>
      </li>
    </ul>
  )
}
