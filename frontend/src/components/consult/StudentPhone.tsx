import { Bot, CalendarDays, Mic, Send } from 'lucide-react'
import { useState } from 'react'
import { ChatBubble, TypingBubble } from '@/components/consult/ChatBubble'
import { ConsultForm } from '@/components/consult/ConsultForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Flow } from '@/hooks/useConsultFlow'
import { useSpeech } from '@/hooks/useSpeech'
import { formValid, SLOTS } from '@/lib/consult/model'
import { cn } from '@/lib/utils'

/** 학생이 보는 휴대폰 화면: 상담 방식 선택 → 양식 → AI 챗봇 상담(또는 개인 상담 시간 등록). */
export function StudentPhone({ flow }: { flow: Flow }) {
  const { state: s } = flow
  const [text, setText] = useState('')
  // 음성은 텍스트 입력창만 채운다. 학생이 내용을 확인·수정한 뒤 직접 전송한다.
  const speech = useSpeech(setText)

  const submit = () => {
    flow.send(text)
    setText('')
  }

  return (
    <div className="mx-auto w-full max-w-[380px]">
      <p className="mb-2 text-center text-xs font-medium text-muted-foreground">학생 화면</p>
      <div className="flex h-[640px] flex-col overflow-hidden rounded-[2rem] border-[6px] border-accent-foreground bg-background shadow-lg">
        <div className="flex-1 overflow-y-auto p-3">
          {s.step === 'mode' && (
            <div className="space-y-2 pt-6">
              <h2 className="text-center text-lg font-bold">상담</h2>
              <Button
                className="w-full justify-start"
                size="lg"
                onClick={() => flow.pickMode('chatbot')}
              >
                <Bot /> AI 챗봇 상담하기
              </Button>
              <p className="pt-2 text-xs font-medium text-muted-foreground">개인 상담 등록하기</p>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => flow.pickMode('inperson')}
              >
                대면
              </Button>
              <Button className="w-full" variant="outline" onClick={() => flow.pickMode('remote')}>
                비대면 (신규)
              </Button>
            </div>
          )}

          {s.step === 'form' && (
            <div className="space-y-3">
              <h2 className="font-bold">상담 양식</h2>
              <ConsultForm form={s.form} onChange={flow.setForm} />
              <Button className="w-full" disabled={!formValid(s.form)} onClick={flow.submitForm}>
                {s.mode === 'chatbot' ? '상담 시작' : '다음'}
              </Button>
            </div>
          )}

          {s.step === 'booked' && (
            <div className="space-y-2">
              <h2 className="font-bold">
                {s.mode === 'inperson' ? '대면' : '비대면'} 상담 시간 선택
              </h2>
              {SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => flow.pickSlot(slot)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg border p-3 text-sm',
                    s.slot === slot && 'border-primary bg-primary-soft/40',
                  )}
                >
                  <CalendarDays className="size-4" /> {slot}
                </button>
              ))}
              {s.slot && <p className="text-sm text-success-strong">등록 완료: {s.slot}</p>}
            </div>
          )}

          {(s.step === 'chat' || s.step === 'handoff' || s.step === 'docs') && (
            <div className="space-y-2">
              {s.messages.map((m) => (
                <ChatBubble key={m.id} message={m} />
              ))}
              {s.typing && <TypingBubble />}
              {s.step === 'handoff' && (
                <p className="pt-3 text-center text-sm text-muted-foreground">
                  선생님 확인을 기다리는 중…
                </p>
              )}
              {s.step === 'docs' && (
                <p className="pt-3 text-center text-sm text-muted-foreground">상담이 종료됐어요.</p>
              )}
            </div>
          )}
        </div>

        {s.step === 'chat' && (
          <div className="space-y-1.5 border-t p-2">
            <div className="flex justify-between">
              <Button size="xs" variant="outline" onClick={flow.requestTeacher}>
                선생님과 직접 상담
              </Button>
              <Button size="xs" variant="ghost" onClick={flow.endChat}>
                종료
              </Button>
            </div>
            {speech.simulated && (
              <p className="px-1 text-xs text-muted-foreground">
                음성 인식을 쓸 수 없어 예시 문장을 넣었어요. 확인 후 보내세요.
              </p>
            )}
            <div className="flex items-center gap-1.5">
              <Button
                size="icon-sm"
                variant="outline"
                aria-label={speech.listening ? '음성 입력 중지' : '음성으로 입력'}
                className={cn(
                  speech.listening &&
                    'animate-pulse bg-destructive text-white hover:bg-destructive',
                )}
                onClick={speech.listening ? speech.stop : speech.start}
              >
                <Mic />
              </Button>
              <Input
                placeholder={speech.listening ? '듣는 중…' : '메시지 입력'}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit()
                }}
              />
              <Button
                size="icon-sm"
                aria-label="보내기"
                disabled={!text.trim() || s.typing}
                onClick={submit}
              >
                <Send />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
