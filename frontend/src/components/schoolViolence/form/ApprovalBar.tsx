import { CheckCircle2, Info, RefreshCw } from 'lucide-react'
import type { DocumentField, SchoolViolenceDocument } from '@/api/schoolViolenceTypes.ts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog.tsx'
import { Button } from '@/components/ui/button.tsx'
import { isAiField } from '@/lib/schoolViolence/aiField.ts'

type ApprovalBarProps = {
  doc: SchoolViolenceDocument
  onApprove: () => void
  approving: boolean
  /** 검토하지 않은 칸 이름을 누르면 그 칸을 연다. */
  onSelectField: (id: string) => void
  /** 덮어쓰기를 확인한 뒤 초안을 다시 만든다. */
  onRegenerate: () => void
  /** 승인·검토 저장·다시 만들기의 오류 문구 */
  error: string | null
}

/** AI 칸(비운 칸 포함) 중 검토하지 않은 칸. 승인할 수 있는지는 이 목록이 비었는지로 정한다. */
export function unreviewedAiFields(fields: DocumentField[]) {
  return fields.filter((f) => isAiField(f) && !f.reviewed)
}

/**
 * 서류 화면 위쪽의 검토·승인 줄. AI 칸을 모두 검토하면 판단 칸이 비어 있어도 승인할 수 있고,
 * 하나라도 남았으면 승인을 막고 어떤 칸이 남았는지 보여준다. 승인은 결재·제출이 아니다.
 * 서류 양식과 상관없이 서류의 칸·상태만 보므로 2-4에서도 그대로 쓴다.
 */
export function ApprovalBar({
  doc,
  onApprove,
  approving,
  onSelectField,
  onRegenerate,
  error,
}: ApprovalBarProps) {
  const remaining = unreviewedAiFields(doc.fields)
  const approved = doc.status === 'approved'
  const aiTotal = doc.counts?.ai ?? 0
  const judgementRemaining = doc.counts?.judgement_remaining ?? 0

  return (
    <section
      aria-label="검토와 승인"
      className="space-y-3 rounded-xl border bg-card px-4 py-3 shadow-xs print:hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">
            AI 칸 검토 {aiTotal - remaining.length} / {aiTotal}
          </p>
          {approved ? (
            <p className="flex items-center gap-1 text-sm text-success-strong">
              <CheckCircle2 className="size-4" /> 승인했어요
              {judgementRemaining > 0 && (
                <span className="text-secondary-foreground">
                  {' '}
                  · 판단 칸 {judgementRemaining}개는 결재 전에 채워 주세요
                </span>
              )}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              AI 칸을 모두 검토하면 판단 칸이 비어 있어도 승인할 수 있어요.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <RegenerateButton onConfirm={onRegenerate} />
          <Button onClick={onApprove} disabled={approved || remaining.length > 0 || approving}>
            <CheckCircle2 /> {approving ? '승인 중' : approved ? '승인됨' : '승인'}
          </Button>
        </div>
      </div>

      {!approved && remaining.length > 0 && (
        <div className="space-y-1.5 text-sm">
          <p className="text-secondary-foreground">
            아직 검토하지 않은 AI 칸 {remaining.length}개가 있어 승인할 수 없어요. 칸을 눌러 확인한
            뒤 「이 칸을 검토했어요」를 체크해 주세요.
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {remaining.map((field) => (
              <li key={field.id}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectField(field.id)}
                >
                  {field.label}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          승인은 이 서비스 안에서 AI 칸을 모두 확인했다는 표시예요. 결재·제출·보고는 하지 않으니
          학교 절차에 따라 따로 진행해 주세요. 승인한 뒤 AI 칸을 고치면 다시 검토 중이 돼요.
        </span>
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}

function RegenerateButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <RefreshCw /> AI 초안 다시 만들기
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>초안을 다시 만들까요?</AlertDialogTitle>
          <AlertDialogDescription>
            지금 서류의 내용을 지우고 새로 만들어요. 고친 내용, 직접 입력한 판단 칸, 검토 표시,
            승인이 모두 사라져요. 되돌릴 수 없어요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>덮어쓰고 다시 만들기</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
