/** 마이크 → 텍스트. 브라우저 음성 인식이 없거나 실패하면 데모 문장으로 대체한다. */
import { useRef, useState } from 'react'
import { DEMO_LINES } from '@/lib/consult/model'

type Recognition = {
  lang: string
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

const getSR = (): (new () => Recognition) | undefined => {
  const w = window as unknown as Record<string, new () => Recognition>
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function useSpeech(onText: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [simulated, setSimulated] = useState(false)
  const demoIdx = useRef(0)
  const rec = useRef<Recognition | null>(null)

  const simulate = () => {
    setSimulated(true)
    setListening(true)
    window.setTimeout(() => {
      onText(DEMO_LINES[demoIdx.current++ % DEMO_LINES.length])
      setListening(false)
    }, 1400)
  }

  const start = () => {
    const SR = getSR()
    if (!SR) return simulate()
    try {
      const r = new SR()
      r.lang = 'ko-KR'
      r.interimResults = false
      r.onresult = (e) => {
        const text = Array.from(e.results)
          .map((x) => x[0].transcript)
          .join(' ')
        onText(text)
      }
      r.onerror = () => {
        setListening(false)
        simulate()
      }
      r.onend = () => setListening(false)
      rec.current = r
      setSimulated(false)
      setListening(true)
      r.start()
    } catch {
      simulate()
    }
  }

  const stop = () => {
    rec.current?.stop()
    setListening(false)
  }

  return { listening, simulated, start, stop }
}
