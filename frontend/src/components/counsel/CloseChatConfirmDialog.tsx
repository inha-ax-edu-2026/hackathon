import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.tsx'
import { TEACHER_VISIBILITY_NOTICE } from '@/lib/counsel/labels.ts'

/** 챗봇 대화를 닫는 학생 버튼 두 가지 */
export type CloseChatAction = 'handoff' | 'finish'

const COPY: Record<CloseChatAction, { title: string; detail: string; confirm: string }> = {
  handoff: {
    title: '선생님과 상담할까요?',
    detail: '선생님께 전달하면 AI 챗봇 상담은 끝나고, 다시 이어서 할 수 없어요.',
    confirm: '선생님과 상담하기',
  },
  finish: {
    title: '상담을 끝낼까요?',
    detail: '끝낸 상담은 다시 이어서 할 수 없어요.',
    confirm: '상담 끝내기',
  },
}

type CloseChatConfirmDialogProps = {
  /** 창의 종류. 닫는 동안에도 문구가 바뀌지 않게 open과 따로 받는다. */
  action: CloseChatAction
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

/**
 * 「선생님과 상담하기」·「상담 끝내기」 확인 창. 챗봇 대화는 학생이 이 창에서 확인해야만 끝난다.
 * 고지 문구를 한 번 더 보이고, 끝낸 대화는 다시 열 수 없음을 알린다.
 */
export function CloseChatConfirmDialog({
  action,
  open,
  onOpenChange,
  onConfirm,
}: CloseChatConfirmDialogProps) {
  const copy = COPY[action]
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {TEACHER_VISIBILITY_NOTICE}. {copy.detail}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>계속 이야기하기</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{copy.confirm}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
