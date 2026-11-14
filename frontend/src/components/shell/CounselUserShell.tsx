import {
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Megaphone,
  ShieldAlert,
  Utensils,
} from 'lucide-react'
import { DEMO_STUDENT, studentLabel } from '@/lib/counsel/identity.ts'
import { PARENT_SCHOOL_VIOLENCE_PATH, STUDENT_SCHOOL_VIOLENCE_PATH } from '@/lib/counsel/paths.ts'
import { AppShell } from './AppShell.tsx'
import { BellButton } from './BellButton.tsx'
import type { LnbMenuItem } from './Lnb.tsx'

export function CounselUserShell({ audience }: { audience: 'student' | 'parent' }) {
  const parent = audience === 'parent'
  const name = parent ? '학부모' : DEMO_STUDENT.name
  const identity = parent ? '가상 보호자 체험' : studentLabel(DEMO_STUDENT)
  const menu: LnbMenuItem[] = [
    { label: '시간', icon: CalendarDays },
    { label: '급식', icon: Utensils },
    { label: '출석', icon: ClipboardCheck },
    {
      label: '학폭',
      icon: ShieldAlert,
      to: parent ? PARENT_SCHOOL_VIOLENCE_PATH : STUDENT_SCHOOL_VIOLENCE_PATH,
    },
    { label: '설문', icon: ClipboardList },
    { label: '공지', icon: Megaphone },
  ]

  return <AppShell name={name} identity={identity} menu={menu} bell={<BellButton />} />
}
