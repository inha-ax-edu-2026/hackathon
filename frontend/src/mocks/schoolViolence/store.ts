import type {
  DocumentProgress,
  SchoolViolenceCase,
  SchoolViolenceCaseListItem,
  SchoolViolenceDocument,
  SchoolViolenceInfo,
  SchoolViolenceMaterial,
  SchoolViolenceStage,
} from '@/api/schoolViolenceTypes.ts'
import type { Db } from '@/mocks/counsel/db.ts'
import { toDocumentSummary } from './documents.ts'

/** 목 저장소의 서류 한 장. 응답과 달리 집계(counts)·잠금 이유(locked_reason)는 저장하지 않고 읽을 때 계산한다. */
export type StoredDocument = Omit<SchoolViolenceDocument, 'counts' | 'locked_reason'>

/** 목 저장소의 사안 한 줄. 응답과 달리 서류에 칸 목록(fields)이 들어 있다. */
export type StoredSchoolViolenceCase = {
  id: string
  info: SchoolViolenceInfo
  materials: SchoolViolenceMaterial[]
  documents: StoredDocument[]
  counsel_case_ids: string[]
  created_at: string
}

export const findSchoolViolenceCase = (db: Db, id: string) =>
  db.schoolViolenceCases.find((stored) => stored.id === id)

/** 상담 건에 연결된 사안. 상담 건은 사안에 최대 하나 연결된다. */
export const findCaseByCounsel = (db: Db, counselCaseId: string) =>
  db.schoolViolenceCases.find((stored) => stored.counsel_case_ids.includes(counselCaseId))

/** 단계는 저장하지 않고 서류 상태에서 계산한다. 1-3 승인 전 접수, 2-4 승인 전 조사, 그 뒤 심의. */
function stageOf(documents: StoredDocument[]): SchoolViolenceStage {
  const approved = (formId: string) =>
    documents.find((d) => d.form_id === formId)?.status === 'approved'
  if (!approved('1-3')) return 'intake'
  if (!approved('2-4')) return 'investigation'
  return 'review'
}

/** 작업할 수 있는 서류 중 승인한 수. */
function progressOf(documents: StoredDocument[]): DocumentProgress {
  const workable = documents.filter((d) => d.available)
  return {
    approved: workable.filter((d) => d.status === 'approved').length,
    total: workable.length,
  }
}

export function toCase(stored: StoredSchoolViolenceCase): SchoolViolenceCase {
  return {
    id: stored.id,
    stage: stageOf(stored.documents),
    info: stored.info,
    materials: stored.materials,
    // 칸 목록은 서류 상세에서만 준다.
    documents: stored.documents.map((doc) => toDocumentSummary(doc, stored.info, stored.materials)),
    progress: progressOf(stored.documents),
    counsel_case_ids: stored.counsel_case_ids,
    created_at: stored.created_at,
  }
}

export function toListItem(stored: StoredSchoolViolenceCase): SchoolViolenceCaseListItem {
  return {
    id: stored.id,
    stage: stageOf(stored.documents),
    case_number: stored.info.case_number,
    received_at: stored.info.received_at,
    students: stored.info.students,
    progress: progressOf(stored.documents),
  }
}
