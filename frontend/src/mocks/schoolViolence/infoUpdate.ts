import type {
  DocumentField,
  GuardianNotice,
  RelatedStudent,
  SchoolViolenceInfo,
  Separation,
} from '@/api/schoolViolenceTypes.ts'
import { SEPARATION_EXCEPTIONS } from '@/lib/schoolViolence/forms/options.ts'
import { offenderFieldId, parseOffenderFieldId } from '@/lib/schoolViolence/studentFields.ts'
import type { StoredDocument } from './store.ts'

/** 사안 정보 수정(PATCH .../info): 요청 검증과, 관련 학생이 바뀔 때 학생별 서류 칸 맞추기. */

type Obj = Record<string, unknown>
export type InfoPatch = Partial<
  Pick<
    SchoolViolenceInfo,
    'case_number' | 'teacher_name' | 'vice_principal' | 'students' | 'separation'
  >
>
export type InfoParse = { patch: InfoPatch } | { error: string }

const isObj = (value: unknown): value is Obj =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
/** 빈 글은 null로 둔다. 글이 아니면 undefined(잘못된 값). */
const nullableText = (value: unknown) =>
  value === null || value === undefined
    ? null
    : typeof value === 'string'
      ? value.trim() || null
      : undefined
const positiveInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1

const ROLES = ['victim', 'offender', 'witness']
const GENDERS = ['male', 'female', 'unknown']
const EXCEPTION_IDS = SEPARATION_EXCEPTIONS.map((option) => option.id)

function parseNotice(value: unknown): GuardianNotice | null {
  if (!isObj(value) || typeof value.notified !== 'boolean') return null
  // 통보하지 않았으면 일시·방법은 남기지 않는다.
  if (!value.notified) return { notified: false, at: null, method: null }
  const at = nullableText(value.at)
  const method = nullableText(value.method)
  if (at === undefined || method === undefined) return null
  if (at !== null && Number.isNaN(Date.parse(at))) return null
  return { notified: true, at, method }
}

function parseStudent(value: unknown): RelatedStudent | null {
  if (!isObj(value)) return null
  const name = text(value.name)
  const notice = parseNotice(value.guardian_notice)
  const note = nullableText(value.note)
  if (
    name === '' ||
    !positiveInt(value.grade) ||
    !positiveInt(value.class) ||
    !positiveInt(value.number) ||
    typeof value.gender !== 'string' ||
    !GENDERS.includes(value.gender) ||
    typeof value.role !== 'string' ||
    !ROLES.includes(value.role) ||
    !notice ||
    note === undefined ||
    typeof value.found_during_investigation !== 'boolean'
  ) {
    return null
  }
  return {
    name,
    grade: value.grade,
    class: value.class,
    number: value.number,
    gender: value.gender as RelatedStudent['gender'],
    role: value.role as RelatedStudent['role'],
    guardian_notice: notice,
    note,
    found_during_investigation: value.found_during_investigation,
  }
}

function parseSeparation(value: unknown): Separation | null {
  if (!isObj(value)) return null
  const period = nullableText(value.period)
  const reasons = value.exception_reasons
  if (
    (value.enforced !== null && typeof value.enforced !== 'boolean') ||
    period === undefined ||
    !Array.isArray(reasons) ||
    !reasons.every((id) => typeof id === 'string' && EXCEPTION_IDS.includes(id))
  ) {
    return null
  }
  return { enforced: value.enforced, period, exception_reasons: [...new Set(reasons as string[])] }
}

/** 마지막 글자에 받침이 있으면 「을」, 없으면 「를」. */
function objectParticle(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  return code >= 0 && code % 28 !== 0 ? '을' : '를'
}

/** 요청 본문을 검증해 바뀔 항목만 돌려준다. 보내지 않은 항목은 그대로 둔다. */
export function parseInfoPatch(body: unknown): InfoParse {
  if (!isObj(body)) return { error: '고칠 사안 정보를 보내 주세요.' }
  const patch: InfoPatch = {}

  for (const [key, label] of [
    ['case_number', '사안번호'],
    ['teacher_name', '책임교사'],
    ['vice_principal', '교감'],
  ] as const) {
    if (!(key in body)) continue
    const value = text(body[key])
    if (value === '') return { error: `${label}${objectParticle(label)} 입력해 주세요.` }
    patch[key] = value
  }

  if ('students' in body) {
    const list = Array.isArray(body.students) ? body.students.map(parseStudent) : null
    if (!list || list.length === 0 || list.some((student) => student === null)) {
      return { error: '관련 학생의 이름·학년/반/번호·성별·구분·보호자 통보를 확인해 주세요.' }
    }
    const students = list as RelatedStudent[]
    if (new Set(students.map((student) => student.name)).size !== students.length) {
      return {
        error: '이름이 같은 관련 학생이 있어요. 서류에서 구별할 수 있게 이름을 달리해 주세요.',
      }
    }
    patch.students = students
  }

  if ('separation' in body) {
    const separation = parseSeparation(body.separation)
    if (!separation) return { error: '분리 시행 여부·기간·예외 사유를 확인해 주세요.' }
    patch.separation = separation
  }

  return { patch }
}

/**
 * 가해 관련 학생별 칸(`factor.<판단요소>.<이름>`)을 가해 관련 학생 목록에 맞춘다.
 * 빠진 학생·구분이 바뀐 학생의 칸은 지우고, 새 가해 관련 학생의 칸은 같은 판단요소의 칸을 본떠 비워서 더한다.
 * 새 칸은 AI가 쓴 것이 아니므로 AI 칸이던 판단요소는 판단 칸(manual)으로 만든다. 바뀐 게 없으면 같은 배열을 돌려준다.
 */
export function syncOffenderFields(
  fields: DocumentField[],
  students: RelatedStudent[],
): DocumentField[] {
  const offenders = students.filter((s) => s.role === 'offender').map((s) => s.name)
  const templates = new Map<string, { field: DocumentField; name: string }>()
  for (const field of fields) {
    const parsed = parseOffenderFieldId(field.id)
    if (parsed && !templates.has(parsed.key))
      templates.set(parsed.key, { field, name: parsed.name })
  }
  if (templates.size === 0) return fields

  const kept = fields.filter((field) => {
    const parsed = parseOffenderFieldId(field.id)
    return !parsed || offenders.includes(parsed.name)
  })
  let changed = kept.length !== fields.length

  for (const [key, { field: template, name: templateName }] of templates) {
    const have = new Set(
      kept
        .map((field) => parseOffenderFieldId(field.id))
        .flatMap((p) => (p?.key === key ? [p.name] : [])),
    )
    const added = offenders
      .filter((name) => !have.has(name))
      .map(
        (name): DocumentField => ({
          ...template,
          id: offenderFieldId(key, name),
          label: template.label.replaceAll(templateName, name),
          kind: template.kind === 'narrative' ? 'manual' : template.kind,
          value: '',
          evidence: [],
          reviewed: false,
          edited: false,
        }),
      )
    if (added.length === 0) continue
    changed = true
    // 같은 판단요소의 마지막 칸 바로 뒤에 넣는다. 그 판단요소의 칸이 다 지워졌으면 맨 끝에 붙인다.
    const last = kept.findLastIndex((field) => parseOffenderFieldId(field.id)?.key === key)
    kept.splice(last === -1 ? kept.length : last + 1, 0, ...added)
  }
  return changed ? kept : fields
}

/** 사안 정보가 바뀐 뒤 이미 칸이 있는 서류의 학생별 칸을 맞춘다. 칸이 바뀌면 개정 번호를 올린다. */
export function syncDocumentStudents(doc: StoredDocument, students: RelatedStudent[]) {
  if (doc.fields.length === 0) return
  const next = syncOffenderFields(doc.fields, students)
  if (next === doc.fields) return
  doc.fields = next
  doc.revision += 1
}
