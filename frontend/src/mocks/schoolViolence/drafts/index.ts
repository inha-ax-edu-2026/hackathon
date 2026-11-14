import type { DocumentField, SchoolViolenceMaterial } from '@/api/schoolViolenceTypes.ts'
import type { DraftContext } from './fields.ts'
import { createIntakeFields } from './intake.ts'
import { createInvestigationFields } from './investigation.ts'

/**
 * 서류 양식 ID → 목 초안 생성기. 여기에 등록된 서류만 「AI 초안 만들기」가 된다.
 * 가해 관련 학생별 칸(`factor.*`)은 생성기가 시드 학생 기준으로 만들고, 핸들러가 현재 사안 정보에 맞춘다.
 */
export const DRAFT_BUILDERS: Partial<Record<string, (context: DraftContext) => DocumentField[]>> = {
  '1-3': () => createIntakeFields(),
  '2-4': () => createInvestigationFields(),
}

const hasInvestigationMaterial = (materials: SchoolViolenceMaterial[]) =>
  materials.some((m) => m.kind === 'statement' || m.kind === 'interview_transcript')

/**
 * 서류 양식 ID → 초안을 만들 수 없는 이유(없으면 null). 근거 없는 초안을 만들지 않도록,
 * 2-4는 조사 자료(진술서·면담 전사)가 없으면 잠근다. 1-3은 접수 때 붙는 상담 기록만으로 쓴다.
 */
const DRAFT_LOCKS: Partial<Record<string, (materials: SchoolViolenceMaterial[]) => string | null>> =
  {
    '2-4': (materials) =>
      hasInvestigationMaterial(materials)
        ? null
        : '조사 자료(진술서·면담 전사)가 없어 초안을 만들 수 없어요. 자료가 모이면 열려요.',
  }

export const draftLockReason = (formId: string, materials: SchoolViolenceMaterial[]) =>
  DRAFT_LOCKS[formId]?.(materials) ?? null
