import type { Student } from '@/api/counselTypes.ts'

/** 시연의 고정 신원. 로그인 없이 학생 1명·교사 1명이다(backend도 같은 신원을 고정으로 둔다). */
export const DEMO_STUDENT: Student = { grade: 2, class: 3, number: 12, name: '김하늘' }

export const DEMO_TEACHER_NAME = '이수진'

/** 「2학년 3반 12번 김하늘」 */
export function studentLabel({ grade, class: classNo, number, name }: Student) {
  return `${grade}학년 ${classNo}반 ${number}번 ${name}`
}
