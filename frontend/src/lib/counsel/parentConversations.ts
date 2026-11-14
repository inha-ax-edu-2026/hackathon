import { useMemo, useSyncExternalStore } from 'react'
import { answerParentFaq } from './parentFaq.ts'

const STORAGE_KEY = 'school-violence:parent-conversations'
const CHANGE_EVENT = 'parent-conversations-change'

type ParentMessage = {
  id: string
  role: 'parent' | 'bot'
  text: string
}

type ParentConversation = {
  id: string
  createdAt: string
  messages: ParentMessage[]
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onChange()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

function snapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function readConversations(value: string | null): ParentConversation[] {
  if (value === null) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useParentConversations() {
  const value = useSyncExternalStore(subscribe, snapshot)
  return useMemo(() => readConversations(value), [value])
}

export function sendParentQuestion(conversationId: string | undefined, question: string) {
  const conversations = readConversations(snapshot())
  const existing = conversations.find(({ id }) => id === conversationId)
  // 다른 탭에서 초기화된 대화는 다시 저장하지 않는다.
  if (conversationId && !existing) return

  const messages: ParentMessage[] = [
    { id: crypto.randomUUID(), role: 'parent', text: question },
    { id: crypto.randomUUID(), role: 'bot', text: answerParentFaq(question) },
  ]
  const conversation: ParentConversation = existing
    ? { ...existing, messages: [...existing.messages, ...messages] }
    : { id: crypto.randomUUID(), createdAt: new Date().toISOString(), messages }
  const updated = existing
    ? conversations.map((item) => (item.id === conversation.id ? conversation : item))
    : [conversation, ...conversations]

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  window.dispatchEvent(new Event(CHANGE_EVENT))
  return conversation.id
}

export function clearParentConversations() {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}
