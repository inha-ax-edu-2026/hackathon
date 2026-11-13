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

type FinishConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

/** 「상담 끝내기」 확인 창. 고지 문구를 한 번 더 보이고, 끝낸 상담은 다시 열 수 없음을 알린다. */
export function FinishConfirmDialog({ open, onOpenChange, onConfirm }: FinishConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>상담을 끝낼까요?</AlertDialogTitle>
          <AlertDialogDescription>
            {TEACHER_VISIBILITY_NOTICE}. 끝낸 상담은 다시 이어서 할 수 없어요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>계속 이야기하기</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>상담 끝내기</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
