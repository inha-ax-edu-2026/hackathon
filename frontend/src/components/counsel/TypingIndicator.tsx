/** 챗봇이 답을 쓰는 중 표시. 챗봇 말풍선 자리에 점 세 개가 튄다. */
export function TypingIndicator() {
  return (
    <div className="flex justify-start" role="status" aria-label="챗봇이 답을 쓰는 중이에요">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
