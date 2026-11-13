import { Play, RotateCcw } from 'lucide-react'
import { StudentPhone } from '@/components/consult/StudentPhone'
import { TeacherDashboard } from '@/components/consult/TeacherDashboard'
import { Button } from '@/components/ui/button'
import { useConsultFlow } from '@/hooks/useConsultFlow'

/** 상담 시연 화면: 학생 휴대폰과 교사 대시보드를 나란히 놓아 한 상담의 양쪽 흐름을 동시에 보여준다. */
function ConsultPage() {
  const flow = useConsultFlow()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">상담</h1>
        <span className="flex-1" />
        <Button size="sm" variant="outline" onClick={flow.playDemo}>
          <Play /> 자동 시연
        </Button>
        <Button size="sm" variant="outline" onClick={flow.reset}>
          <RotateCcw /> 처음부터
        </Button>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[380px_1fr]">
        <StudentPhone flow={flow} />
        <TeacherDashboard flow={flow} />
      </div>
    </div>
  )
}

export default ConsultPage
