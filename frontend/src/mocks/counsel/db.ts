import type { CounselCase, CounselForm, Message } from '@/api/counselTypes.ts'
import { createSeedCases } from './seed.ts'

/**
 * 목 상담 건 저장소. 탭마다 MSW가 따로 돌기 때문에 상담 건을 localStorage에 둔다.
 * 학생 탭이 쓴 내용을 교사 탭이 폴링으로 읽는다. 테스트에서는 setup이 메모리 Storage를 끼운다.
 */

/** 저장소 한 줄. 응답에 실을 공개 필드(case·form·messages·summary)와 목 내부 상태를 함께 둔다. */
export type StoredCase = {
  case: CounselCase
  /** 학생이 쓴 상담 양식. 개인상담 시드는 null. */
  form: CounselForm | null
  /** 대화 전문. 학생 쪽 응답에만 싣는다. */
  messages: Message[]
  /** 전환 요약. 전환·종료 전이나 개인상담 시드는 null. */
  summary: string | null
}

export type Db = { cases: StoredCase[] }

const STORAGE_KEY = 'ax-counsel-demo/db/v1'

export function loadDb(): Db {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as Db
    } catch {
      // 깨진 값이면 시드로 되돌린다.
    }
  }
  const db = seedDb()
  saveDb(db)
  return db
}

export function saveDb(db: Db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

/** 읽고 → 고치고 → 저장한다. fn의 반환값을 그대로 돌려준다. */
export function updateDb<T>(fn: (db: Db) => T): T {
  const db = loadDb()
  const result = fn(db)
  saveDb(db)
  return result
}

/** 모든 상담 건을 지우고 시드 상태로 되돌린다. */
export function resetDb() {
  saveDb(seedDb())
}

export function findCase(db: Db, id: string) {
  return db.cases.find((stored) => stored.case.id === id)
}

function seedDb(): Db {
  return { cases: createSeedCases() }
}

export function nowIso() {
  return new Date().toISOString()
}

/** 짧은 무작위 id. 예: newId('c') → 'c_8f3k2a' */
export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}
