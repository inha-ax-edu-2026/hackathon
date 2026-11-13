/** 음성 입력 실패 종류. 화면에 이유를 안내할 때 쓴다. */
export type VoiceErrorKind = 'denied' | 'network' | 'unsupported' | 'no-speech' | 'no-mic' | 'other'

/** Web Speech API의 오류 코드를 안내 종류로 바꾼다. 사용자가 멈춘 `aborted`는 오류가 아니므로 null. */
export function classifyVoiceError(code: string): VoiceErrorKind | null {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'denied'
    case 'network':
      return 'network'
    case 'language-not-supported':
      return 'unsupported'
    case 'no-speech':
      return 'no-speech'
    case 'audio-capture':
      return 'no-mic'
    case 'aborted':
      return null
    default:
      return 'other'
  }
}

export const VOICE_ERROR_MESSAGES: Record<VoiceErrorKind, string> = {
  denied: '마이크 사용이 막혀 있어요. 브라우저 주소창에서 마이크를 허용하거나, 글로 적어 주세요.',
  network:
    '인터넷 연결이 불안정해서 음성을 글로 바꾸지 못했어요. 글로 적거나 예시 문장을 눌러 주세요.',
  unsupported: '이 브라우저는 음성 입력을 지원하지 않아요. 글로 적거나 예시 문장을 눌러 주세요.',
  'no-speech': '말소리가 들리지 않았어요. 마이크를 다시 눌러 말해 보세요.',
  'no-mic': '마이크를 찾을 수 없어요. 마이크 연결을 확인하거나 글로 적어 주세요.',
  other: '음성 입력에 문제가 생겼어요. 글로 적거나 예시 문장을 눌러 주세요.',
}

/** 이미 적힌 글 뒤에 인식된 말을 이어 붙인다. */
export function appendTranscript(base: string, transcript: string): string {
  const spoken = transcript.trim()
  if (!spoken) return base
  if (!base.trim()) return spoken
  return `${base.replace(/\s+$/, '')} ${spoken}`
}
