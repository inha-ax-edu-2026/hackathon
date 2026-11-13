/**
 * 마이크 → 텍스트(학생 챗봇 상담용). 브라우저 내장 음성 인식(ko-KR)으로 연속 인식하고,
 * 중간 결과도 `onText`로 바로 내보낸다. 자동 전송은 하지 않는다. 입력창을 채우는 일까지만 한다.
 * 실패하면 `error`에 종류를 담는다. 예시 문장 대체는 부르는 화면이 맡는다.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { appendTranscript, classifyVoiceError, type VoiceErrorKind } from '@/lib/counsel/voice.ts'

type RecognitionAlternative = { transcript: string }
type RecognitionEvent = { results: ArrayLike<ArrayLike<RecognitionAlternative>> }

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

function getRecognition(): (new () => Recognition) | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as Record<string, new () => Recognition>
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

type UseVoiceInputOptions = {
  /** 입력창 전체 글을 새 값으로 바꾼다. 인식 중에는 중간 결과마다 부른다. */
  onText: (text: string) => void
}

export function useVoiceInput({ onText }: UseVoiceInputOptions) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<VoiceErrorKind | null>(null)
  const recognition = useRef<Recognition | null>(null)
  const onTextRef = useRef(onText)
  onTextRef.current = onText

  /** 현재 세션의 결과를 더 이상 받지 않고 끊는다. */
  const detach = useCallback(() => {
    const r = recognition.current
    if (!r) return
    recognition.current = null
    r.onresult = null
    r.onerror = null
    r.onend = null
    r.abort()
  }, [])

  // 화면을 떠나면 마이크를 놓는다.
  useEffect(() => detach, [detach])

  /** 인식을 시작한다. `base`는 이미 입력창에 적힌 글이고, 말한 내용은 그 뒤에 붙는다. */
  const start = useCallback(
    (base: string) => {
      setError(null)
      const SR = getRecognition()
      if (!SR) {
        setError('unsupported')
        return
      }
      detach()
      try {
        const r = new SR()
        r.lang = 'ko-KR'
        r.continuous = true
        r.interimResults = true
        r.onresult = (e) => {
          const transcript = Array.from(e.results)
            .map((alternatives) => alternatives[0]?.transcript ?? '')
            .join(' ')
            .replace(/\s+/g, ' ')
          onTextRef.current(appendTranscript(base, transcript))
        }
        r.onerror = (e) => {
          console.warn('[음성 입력]', e.error)
          const kind = classifyVoiceError(e.error)
          if (kind) setError(kind)
        }
        r.onend = () => {
          recognition.current = null
          setListening(false)
        }
        recognition.current = r
        setListening(true)
        r.start()
      } catch (e) {
        console.warn('[음성 입력]', e)
        recognition.current = null
        setListening(false)
        setError('other')
      }
    },
    [detach],
  )

  /** 마이크 버튼으로 멈춘다. 말하던 마지막 부분까지 최종 결과로 남는다. */
  const stop = useCallback(() => {
    recognition.current?.stop()
  }, [])

  /** 입력창을 직접 고칠 때처럼 결과를 더 받지 않을 때 끊는다. */
  const cancel = useCallback(() => {
    detach()
    setListening(false)
  }, [detach])

  const dismissError = useCallback(() => setError(null), [])

  return { listening, error, start, stop, cancel, dismissError }
}
