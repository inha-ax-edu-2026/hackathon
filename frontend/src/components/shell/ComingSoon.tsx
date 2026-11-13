/** 경로만 먼저 열어 둔 화면의 자리 표시. 해당 티켓에서 실제 화면으로 바꾼다. */
export function ComingSoon({ children = '이 화면은 준비 중이에요.' }: { children?: string }) {
  return (
    <section className="rounded-xl border bg-card px-6 py-16 text-center text-muted-foreground">
      {children}
    </section>
  )
}
