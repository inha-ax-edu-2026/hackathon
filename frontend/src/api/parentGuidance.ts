import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api.ts'

export type ParentCategory = 'school' | 'agency' | 'teacher' | 'restricted' | 'emergency'
export type ParentSource = { label: string; url: string }
export type ParentCard = {
  id: string
  title: string
  category: ParentCategory
  text: string
  sources: ParentSource[]
  agency?: string
  contact?: string
}
export type ParentProfile = {
  actor_id: string
  label: string
  demo: boolean
  guardian: string
  student: { name: string; grade: number; class: number; number: number }
  case_id: string
  case_number: string
  school: string
  stage: string
  teacher: string
  education_office_contact: string
  timeline: { stage: string; label: string; state: string }[]
  events: { kind: string; date: string; at: string }[]
}
export type ParentTurn = {
  id: string
  request_id: string
  question: string
  at: string
  inquiry_id: string | null
  answer: {
    category: ParentCategory
    text: string
    card: ParentCard | null
    engine: string
    offer_teacher: boolean
    urgent: boolean
  }
}
export type ParentInquiry = {
  id: string
  actor_id: string
  case_id: string
  case_number: string
  guardian: string
  student: ParentProfile['student']
  question: string
  summary: string
  summary_kind: string
  desired_action: string
  preferred_reply: 'chat' | 'safe_phone'
  callback_number?: string
  urgent: boolean
  status: 'received' | 'in_progress' | 'answered'
  read: boolean
  jurisdiction_notified: boolean
  at: string
  previous_count: number
  replies: { id: string; text: string; at: string; teacher: string }[]
}
export type ParentNotice = {
  id: string
  title: string
  text: string
  at: string
  event_date: string
  kind: string
  student: string
  case_number: string
  sources: ParentSource[]
}
export type ParentWorkspace = {
  profile: ParentProfile
  turns: ParentTurn[]
  inquiries: ParentInquiry[]
  notices: ParentNotice[]
  cards: ParentCard[]
  reply_policy: string
  knowledge_version: string
}
export type ParentInquiryInput = {
  text: string
  request_id: string
  desired_action: string
  preferred_reply: 'chat' | 'safe_phone'
  callback_number: string
}
export type ParentInbox = {
  inquiries: ParentInquiry[]
  profiles: ParentProfile[]
  guidance_log: {
    actor_id: string
    at: string
    agency: string
    contact: string
    question: string
  }[]
}

export const parentWorkspaceKey = (id: string) => ['parentGuidance', 'workspace', id] as const
export const parentInboxKey = ['parentGuidance', 'inbox'] as const
export const fetchParentWorkspace = (id: string, signal?: AbortSignal) =>
  apiFetch<ParentWorkspace>(`/api/parent/${encodeURIComponent(id)}/workspace`, { signal })
export const sendParentQuestion = (id: string, body: { text: string; request_id: string }) =>
  apiFetch<{ turn: ParentTurn }>(`/api/parent/${encodeURIComponent(id)}/messages`, {
    method: 'POST',
    body,
  })
export const submitParentInquiry = (id: string, body: ParentInquiryInput) =>
  apiFetch<{ inquiry: ParentInquiry; message: string }>(
    `/api/parent/${encodeURIComponent(id)}/inquiries`,
    { method: 'POST', body },
  )
export const fetchParentInbox = (signal?: AbortSignal) =>
  apiFetch<ParentInbox>('/api/teacher/parent-inquiries', { signal })

export function useParentWorkspace(id: string) {
  return useQuery({
    queryKey: parentWorkspaceKey(id),
    queryFn: ({ signal }) => fetchParentWorkspace(id, signal),
    refetchInterval: 2500,
    refetchIntervalInBackground: true,
    retry: 1,
  })
}
export function useParentInbox() {
  return useQuery({
    queryKey: parentInboxKey,
    queryFn: ({ signal }) => fetchParentInbox(signal),
    refetchInterval: 1500,
    refetchIntervalInBackground: true,
    retry: 1,
  })
}
export function useParentQuestion(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { text: string; request_id: string }) => sendParentQuestion(id, body),
    onSuccess: () => client.invalidateQueries({ queryKey: ['parentGuidance'] }),
  })
}
export function useParentInquiry(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: ParentInquiryInput) => submitParentInquiry(id, body),
    onSuccess: () => client.invalidateQueries({ queryKey: ['parentGuidance'] }),
  })
}
export function useUpdateParentInquiry() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      status?: ParentInquiry['status']
      jurisdiction_notified?: boolean
    }) =>
      apiFetch<{ inquiry: ParentInquiry }>(
        `/api/teacher/parent-inquiries/${encodeURIComponent(id)}`,
        { method: 'PATCH', body },
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ['parentGuidance'] }),
  })
}
export function useReplyParentInquiry() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      apiFetch<{ inquiry: ParentInquiry }>(
        `/api/teacher/parent-inquiries/${encodeURIComponent(id)}/replies`,
        { method: 'POST', body: { text } },
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ['parentGuidance'] }),
  })
}
export function useParentProcedureEvent() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      case_id,
      ...body
    }: {
      case_id: string
      kind: 'committee_requested' | 'self_resolution_closed'
      date: string
      request_id: string
    }) =>
      apiFetch<{ recipient_count: number; message: string }>(
        `/api/teacher/parent-notices/${encodeURIComponent(case_id)}/events`,
        { method: 'POST', body },
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ['parentGuidance'] }),
  })
}
