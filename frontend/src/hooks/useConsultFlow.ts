import { useCallback, useEffect, useRef, useState } from 'react'
import { botReply, buildDocs, greeting, nowLabel, summarize } from '@/lib/consult/mockAi'
import {
  DEFAULT_KEYWORDS,
  DEMO_LINES,
  detect,
  EMPTY_FORM,
  type FormValues,
  formValid,
  type HandoffReason,
  type KeywordConfig,
  type Mode,
  type Msg,
  PIPELINE_STAGES,
  SAMPLE_FORM,
  type State,
} from '@/lib/consult/model'

const initial = (): State => ({
  step: 'mode',
  mode: null,
  form: EMPTY_FORM,
  slot: null,
  messages: [],
  typing: false,
  keywords: DEFAULT_KEYWORDS,
  handoff: null,
  summary: null,
  pipeline: { stage: -1, docs: [] },
  approved: {},
})

const msg = (s: State, role: Msg['role'], text: string): Msg => ({
  id: s.messages.length,
  role,
  text,
})

/** 순수 전이: 상담 → 교사 전달(handoff) */
function toHandoff(s: State, reason: HandoffReason): State {
  const det = detect(s.messages, s.keywords)
  const text =
    reason === 'student'
      ? '선생님과 직접 상담하고 싶다고 요청했어요. 양식과 지금까지의 대화 요약을 선생님께 전달할게요.'
      : '이야기해줘서 고마워. 이 이야기는 선생님이 직접 들어주시면 좋겠어. 양식과 대화 요약을 선생님께 전달할게.'
  const role: Msg['role'] = reason === 'student' ? 'system' : 'bot'
  return {
    ...s,
    typing: false,
    step: 'handoff',
    messages: [...s.messages, msg(s, role, text)],
    summary: summarize(s.form, s.messages, s.keywords, reason),
    handoff: { reason, keywords: [...det.severe, ...new Set(det.mild)], at: nowLabel() },
  }
}

export function useConsultFlow() {
  const [s, setS] = useState<State>(initial)
  const timers = useRef<number[]>([])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  const clearTimers = () => {
    for (const t of timers.current) clearTimeout(t)
    timers.current = []
  }

  const pickMode = (mode: Mode) => setS((p) => ({ ...p, mode, step: 'form' }))
  const setForm = (patch: Partial<FormValues>) =>
    setS((p) => ({ ...p, form: { ...p.form, ...patch } }))
  const submitForm = () =>
    setS((p) =>
      !formValid(p.form)
        ? p
        : p.mode === 'chatbot'
          ? { ...p, step: 'chat', messages: [msg(p, 'bot', greeting(p.form))] }
          : { ...p, step: 'booked' },
    )
  const pickSlot = (slot: string) => setS((p) => ({ ...p, slot }))
  const setKeywords = (keywords: KeywordConfig) => setS((p) => ({ ...p, keywords }))

  const send = (text: string) => {
    const t = text.trim()
    if (!t) return
    setS((p) =>
      p.step !== 'chat' || p.typing
        ? p
        : { ...p, typing: true, messages: [...p.messages, msg(p, 'student', t)] },
    )
    later(
      () =>
        setS((p) => {
          if (p.step !== 'chat') return p
          const turns = p.messages.filter((m) => m.role === 'student').length
          const next = {
            ...p,
            typing: false,
            messages: [...p.messages, msg(p, 'bot', botReply(p.form, turns))],
          }
          return detect(p.messages, p.keywords).trigger ? toHandoff(next, 'keyword') : next
        }),
      900,
    )
  }

  const requestTeacher = () => setS((p) => (p.step === 'chat' ? toHandoff(p, 'student') : p))

  const endChat = () =>
    setS((p) =>
      p.step === 'chat'
        ? { ...p, step: 'docs', summary: summarize(p.form, p.messages, p.keywords, null) }
        : p,
    )

  const completeConsult = () => setS((p) => (p.step === 'handoff' ? { ...p, step: 'docs' } : p))

  const runPipeline = useCallback(() => {
    setS((p) => ({ ...p, pipeline: { stage: 0, docs: [] }, approved: {} }))
    PIPELINE_STAGES.forEach((_, i) => {
      if (i === 0) return
      timers.current.push(
        window.setTimeout(
          () =>
            setS((p) => ({
              ...p,
              pipeline: { stage: i, docs: i === PIPELINE_STAGES.length - 1 ? buildDocs(p) : [] },
            })),
          i * 800,
        ),
      )
    })
  }, [])

  // 서류 단계에 들어오면 파이프라인 자동 시작
  useEffect(() => {
    if (s.step === 'docs' && s.pipeline.stage === -1) runPipeline()
  }, [s.step, s.pipeline.stage, runPipeline])

  const approve = (id: string) =>
    setS((p) => ({ ...p, approved: { ...p.approved, [id]: !p.approved[id] } }))
  const editDoc = (id: string, text: string) =>
    setS((p) => ({
      ...p,
      pipeline: {
        ...p.pipeline,
        docs: p.pipeline.docs.map((d) => (d.id === id ? { ...d, text } : d)),
      },
    }))

  const reset = () => {
    clearTimers()
    setS((p) => ({ ...initial(), keywords: p.keywords }))
  }

  /** 자동 시연: 양식 채우기 → 챗봇 → 학생 발화 3개 → 키워드 전환까지 */
  const playDemo = () => {
    clearTimers()
    setS((p) => ({
      ...initial(),
      keywords: p.keywords,
      mode: 'chatbot',
      step: 'form',
      form: SAMPLE_FORM,
    }))
    later(submitForm, 1200)
    DEMO_LINES.forEach((line, i) => {
      later(() => send(line), 2800 + i * 2600)
    })
  }

  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t)
    },
    [],
  )

  return {
    state: s,
    pickMode,
    setForm,
    submitForm,
    pickSlot,
    setKeywords,
    send,
    requestTeacher,
    endChat,
    completeConsult,
    runPipeline,
    approve,
    editDoc,
    reset,
    playDemo,
  }
}

export type Flow = ReturnType<typeof useConsultFlow>
