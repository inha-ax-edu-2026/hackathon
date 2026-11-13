import { FolderOpen } from 'lucide-react'
import type { CaseDocuments } from '@/api/counselTypes.ts'
import { DetailCard } from './DetailCard.tsx'

type DocumentsSlotProps = {
  caseId: string
  /** 상세 응답의 서류. 전환된 건에만 있다. */
  documents: CaseDocuments
}

/**
 * ④ 사후 서류 카드 자리.
 * TODO(09번 티켓): 이 컴포넌트 안을 채운다. 서류 4종 카드·선택·초안 수정·승인·절감 수치·진행 단계 표시.
 * `documents`는 상세 응답 그대로이고, 변경은 서류 PATCH/approve 엔드포인트로 한 뒤 상세 쿼리를 무효화한다.
 * 상세 페이지는 전환된 건(`documents != null`)에서만 이 자리를 그린다.
 */
export function DocumentsSlot({ caseId, documents }: DocumentsSlotProps) {
  return (
    <DetailCard
      title="사후 서류"
      icon={<FolderOpen className="size-4 text-muted-foreground" />}
      className="border-dashed"
    >
      <p data-case-id={caseId} className="text-muted-foreground">
        서류 초안 {documents.items.length}종이 준비되어 있어요.
      </p>
    </DetailCard>
  )
}
