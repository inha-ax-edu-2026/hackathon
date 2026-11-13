import {
  BookOpen,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  MessagesSquare,
  Users,
} from 'lucide-react'
import { DEMO_TEACHER_NAME } from '@/lib/counsel/identity.ts'
import { AppShell } from './AppShell.tsx'
import { BellButton } from './BellButton.tsx'
import type { LnbMenuItem } from './Lnb.tsx'

const TEACHER_MENU: LnbMenuItem[] = [
  { label: '출석', icon: ClipboardCheck },
  { label: '시간', icon: CalendarDays },
  { label: '수업', icon: BookOpen },
  { label: '학생', icon: Users },
  { label: '상담', icon: MessagesSquare, to: '/teacher/manage-apply/counsel' },
  { label: '설문', icon: ClipboardList },
  { label: '사용', icon: CircleHelp },
]

/** 교사 화면 셸(`/teacher/*`). 알림 종(배지·알림 시트)은 07번 티켓에서 동작시킨다. */
export function TeacherShell() {
  return (
    <AppShell
      homeTo="/teacher/manage-apply/counsel"
      name={DEMO_TEACHER_NAME}
      identity={`${DEMO_TEACHER_NAME} 선생님`}
      menu={TEACHER_MENU}
      bell={<BellButton />}
    />
  )
}
