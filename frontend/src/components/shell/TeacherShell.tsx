import {
  BookOpen,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  MessageCircle,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useParentInbox } from '@/api/parentGuidance.ts'
import { useTeacherCases } from '@/api/teacherCounsel.ts'
import { NotificationSheet } from '@/components/counsel/NotificationSheet.tsx'
import { Toaster } from '@/components/ui/sonner.tsx'
import { useHandoffToasts } from '@/hooks/useHandoffToasts.tsx'
import { DEMO_TEACHER_NAME } from '@/lib/counsel/identity.ts'
import { unreadHandoffs } from '@/lib/counsel/notifications.ts'
import {
  SCHOOL_VIOLENCE_PATH,
  schoolViolenceCounselDetailPath,
} from '@/lib/schoolViolence/paths.ts'
import { AppShell } from './AppShell.tsx'
import { BellButton } from './BellButton.tsx'
import type { LnbMenuItem } from './Lnb.tsx'

const TEACHER_MENU: LnbMenuItem[] = [
  { label: '출석', icon: ClipboardCheck },
  { label: '시간', icon: CalendarDays },
  { label: '수업', icon: BookOpen },
  { label: '학생', icon: Users },
  { label: '보호자', icon: MessageCircle, to: '/teacher/parent-inquiries' },
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
  const parentInbox = useParentInbox()
  const parentUnread = (parentInbox.data?.inquiries ?? []).filter((i) => !i.read)
  const seenParent = useRef(new Set<string>())
  useEffect(() => {
    for (const item of parentInbox.data?.inquiries ?? []) {
      if (!item.read && !seenParent.current.has(item.id)) {
        seenParent.current.add(item.id)
        const notify = item.urgent ? toast.error : toast.info
        notify(item.urgent ? '학부모 긴급 안전 확인 요청' : '새 학부모 문의가 도착했어요', {
          description: item.guardian,
          duration: item.urgent ? 15000 : 5000,
          action: { label: '확인', onClick: () => navigate('/teacher/parent-inquiries') },
        })
      }
    }
  }, [parentInbox.data, navigate])

  return (
    <>
      <AppShell
        name={DEMO_TEACHER_NAME}
        identity={`${DEMO_TEACHER_NAME} 선생님`}
        menu={TEACHER_MENU}
        bell={
          <BellButton
            count={notifications.length + parentUnread.length}
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
        parentCount={parentUnread.length}
        urgentParentCount={parentUnread.filter((i) => i.urgent).length}
        onSelectParent={() => {
          setSheetOpen(false)
          navigate('/teacher/parent-inquiries')
        }}
        onSelect={(c) => {
          setSheetOpen(false)
          navigate(schoolViolenceCounselDetailPath(c.id))
        }}
      />
      <Toaster position="top-right" />
    </>
  )
}
