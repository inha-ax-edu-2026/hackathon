import { FileText } from 'lucide-react'
import { useState } from 'react'
import type { SchoolViolenceMaterial } from '@/api/schoolViolenceTypes.ts'
import { DetailCard } from '@/components/counsel/detail/DetailCard.tsx'
import { MaterialDialog } from '@/components/schoolViolence/MaterialDialog.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { MATERIAL_KIND_LABEL } from '@/lib/schoolViolence/labels.ts'

/** 조사 중 수합된 자료를 접수 직후 미리 넣어 둔 자료에 붙이는 표시. */
const DEMO_PRELOADED_LABEL = '시연용: 조사 중 수합된 자료를 미리 넣어 둠'

/** 사안 자료 목록. 「원문 보기」로 초안의 근거가 되는 원문을 연다. */
export function MaterialsCard({ materials }: { materials: SchoolViolenceMaterial[] }) {
  const [opened, setOpened] = useState<SchoolViolenceMaterial | null>(null)

  return (
    <DetailCard
      title="사안 자료"
      icon={<FileText className="size-4 text-muted-foreground" />}
      aside={<span className="text-sm text-muted-foreground">{materials.length}건</span>}
    >
      <p className="mb-3 text-sm text-muted-foreground">
        서류 초안의 근거가 되는 원문이에요. 면담은 측별로 따로 진행했고, 녹음·전사는 학생·보호자
        사전 동의 후 실시했어요.
      </p>
      <ul className="divide-y rounded-lg border">
        {materials.map((material) => (
          <li key={material.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{MATERIAL_KIND_LABEL[material.kind]}</Badge>
                <span className="font-medium">{material.title}</span>
              </div>
              {material.demo_preloaded && (
                <p className="text-sm text-warning-strong">{DEMO_PRELOADED_LABEL}</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setOpened(material)}>
              원문 보기
            </Button>
          </li>
        ))}
      </ul>

      <MaterialDialog material={opened} onClose={() => setOpened(null)} />
    </DetailCard>
  )
}
