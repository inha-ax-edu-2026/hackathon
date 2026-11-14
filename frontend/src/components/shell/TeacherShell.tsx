import {
  BookOpen,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  MessagesSquare,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useTeacherCases } from '@/api/teacherCounsel.ts'
import { NotificationSheet } from '@/components/counsel/NotificationSheet.tsx'
import { Toaster } from '@/components/ui/sonner.tsx'
import { useHandoffToasts } from '@/hooks/useHandoffToasts.tsx'
import { DEMO_TEACHER_NAME } from '@/lib/counsel/identity.ts'
import { unreadHandoffs } from '@/lib/counsel/notifications.ts'
import { counselDetailPath, TEACHER_COUNSEL_PATH } from '@/lib/counsel/paths.ts'
import { SCHOOL_VIOLENCE_PATH } from '@/lib/schoolViolence/paths.ts'
import { AppShell } from './AppShell.tsx'
import { BellButton } from './BellButton.tsx'
import type { LnbMenuItem } from './Lnb.tsx'

const TEACHER_MENU: LnbMenuItem[] = [
  { label: '출석', icon: ClipboardCheck },
  { label: '시간', icon: CalendarDays },
  { label: '수업', icon: BookOpen },
  { label: '학생', icon: Users },
  { label: '상담', icon: MessagesSquare, to: TEACHER_COUNSEL_PATH },
  { label: '학폭', icon: ShieldAlert, to: SCHOOL_VIOLENCE_PATH },
  { label: '설문', icon: ClipboardList },
  { label: '사용', icon: CircleHelp },
]

/**
 * 교사 화면 셸(`/teacher/*`). 알림 종·토스트·알림 시트를 여기서 동작시킨다.
 * 알림은 목록 폴링 결과에서 계산하므로 어느 교사 화면에 있어도 알림이 온다.
 */
export function TeacherShell() {
  const navigate = useNavigate()
  const { data: cases } = useTeacherCases()
  const [sheetOpen, setSheetOpen] = useState(false)
  const notifications = unreadHandoffs(cases ?? [])
  useHandoffToasts(cases)

  return (
    <>
      <AppShell
        homeTo={SCHOOL_VIOLENCE_PATH}
        name={DEMO_TEACHER_NAME}
        identity={`${DEMO_TEACHER_NAME} 선생님`}
        menu={TEACHER_MENU}
        bell={
          <BellButton
            count={notifications.length}
            onClick={() => {
              toast.dismiss() // 시트 위에 토스트가 겹치지 않게, 같은 내용은 시트에 있다
              setSheetOpen(true)
            }}
          />
        }
      />
      <NotificationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        notifications={notifications}
        onSelect={(c) => {
          setSheetOpen(false)
          navigate(counselDetailPath(c.id))
        }}
      />
      <Toaster position="top-right" />
    </>
  )
}
