import {
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Megaphone,
  MessagesSquare,
  Utensils,
} from 'lucide-react'
import { DEMO_STUDENT, studentLabel } from '@/lib/counsel/identity.ts'
import { AppShell } from './AppShell.tsx'
import { BellButton } from './BellButton.tsx'
import type { LnbMenuItem } from './Lnb.tsx'

const STUDENT_MENU: LnbMenuItem[] = [
  { label: '시간', icon: CalendarDays },
  { label: '급식', icon: Utensils },
  { label: '출석', icon: ClipboardCheck },
  { label: '상담', icon: MessagesSquare, to: '/student/counsel' },
  { label: '설문', icon: ClipboardList },
  { label: '공지', icon: Megaphone },
]

/** 학생 화면 셸(`/student/*`). 알림 종은 모양만 있다. */
export function StudentShell() {
  return (
    <AppShell
      homeTo="/student/counsel"
      name={DEMO_STUDENT.name}
      identity={studentLabel(DEMO_STUDENT)}
      menu={STUDENT_MENU}
      bell={<BellButton />}
    />
  )
}
