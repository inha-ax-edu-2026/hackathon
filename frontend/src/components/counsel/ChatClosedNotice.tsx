import { Link } from 'react-router'
import type { CounselCase } from '@/api/counselTypes.ts'
import { Button } from '@/components/ui/button.tsx'

/** 위기 연락처. 위험도가 높을 때만 전환 안내에 붙는다. */
function CrisisContacts() {
  return (
    <div className="space-y-1 rounded-lg bg-muted px-4 py-3 text-sm">
      <p className="font-medium">지금 많이 힘들다면 바로 이야기할 수 있어요.</p>
      <ul className="space-y-0.5 text-secondary-foreground">
        <li>자살예방 상담전화 109 (24시간)</li>
        <li>청소년 상담전화 1388 (24시간)</li>
      </ul>
    </div>
  )
}

/**
 * 끝난 상담(전환·종료) 화면 아래의 안내 카드. 입력창 자리를 대신한다.
 * 전환 여부는 `handoff`로 가른다. 위험도는 학생에게 보이지 않고, 높음일 때 연락처만 덧붙는다.
 */
export function ChatClosedNotice({ counselCase }: { counselCase: CounselCase }) {
  const handedOff = counselCase.handoff !== null
  const approved = counselCase.status === 'awaiting_counsel'

  return (
    <section aria-label="상담 안내" className="space-y-3 rounded-xl border bg-card p-5">
      {handedOff ? (
        <>
          <p className="font-medium">
            {approved
              ? '선생님이 상담을 승인했어요. 상담 일정을 곧 알려 드려요.'
              : '선생님께 전달했어요. 승인되면 상담 일정을 알려 드려요.'}
          </p>
          {counselCase.risk === 'high' && <CrisisContacts />}
        </>
      ) : (
        <>
          <p className="font-medium">상담이 끝났어요. 이야기해 줘서 고마워요.</p>
          <p className="text-sm text-muted-foreground">
            선생님과 직접 이야기하고 싶다면 개인상담을 신청해 보세요.
          </p>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/student/counsel">내 상담으로</Link>
        </Button>
        {!handedOff && (
          <Button asChild variant="outline">
            <Link to="/student/counsel/register">개인상담 신청하기</Link>
          </Button>
        )}
      </div>
    </section>
  )
}
