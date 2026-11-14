import type { DocumentField, Evidence, SchoolViolenceMaterial } from '@/api/schoolViolenceTypes.ts'

/** 목 초안 생성기가 서류마다 쓰는 입력. 사안 정보는 읽을 때 따로 반영하므로 여기에는 없다. */
export type DraftContext = { materials: SchoolViolenceMaterial[] }

/** 초안 칸 한 개의 기본 모양. 값·인용·검토·수정 표시는 비어 있는 상태다. */
const base = (id: string, label: string, kind: DocumentField['kind']): DocumentField => ({
  id,
  label,
  kind,
  value: '',
  evidence: [],
  reviewed: false,
  edited: false,
})

/** 사안 정보에서 가져오는 칸. 값은 읽을 때 사안 정보로 채워진다. */
export const adminField = (id: string, label: string) => base(id, label, 'admin')

/** 교사가 판단·입력하는 칸. AI는 채우지 않고 비워 둔다. */
export const manualField = (id: string, label: string) => base(id, label, 'manual')

/** 민감 정보 칸(장애 여부 등). 판단 칸과 같이 비워 둔다. */
export const sensitiveField = (id: string, label: string) => base(id, label, 'sensitive')

/** AI가 쓴 칸. 값이 있으면 근거 인용이 하나 이상 있어야 한다(backend 규칙). */
export function narrativeField(
  id: string,
  label: string,
  value: string,
  evidence: Evidence[],
): DocumentField {
  return { ...base(id, label, 'narrative'), value, evidence }
}
