import { Printer } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button.tsx'
import './print.css'

/**
 * 「인쇄」 버튼. 브라우저 인쇄 창을 연다(「PDF로 저장」도 그 창에서 고른다).
 * PDF 파일 이름은 문서 제목을 따르므로 인쇄하는 동안만 서류 이름으로 바꾼다.
 */
export function PrintButton({ documentTitle }: { documentTitle: string }) {
  function print() {
    const previous = document.title
    document.title = documentTitle
    window.addEventListener('afterprint', () => (document.title = previous), { once: true })
    window.print()
  }

  return (
    <Button variant="outline" onClick={print}>
      <Printer /> 인쇄
    </Button>
  )
}

type PrintMarksProps = {
  /** 승인 전이면 「초안」을 단다. */
  approved: boolean
}

/**
 * 인쇄물에만 보이는 표시. 화면에서는 숨겨진다.
 * - 초안 표시: 승인 전 서류가 공식 서류로 오해되지 않게 「초안」을 단다.
 * 첫 쪽은 이 컴포넌트가, 둘째 쪽부터는 `print.css`의 쪽 여백 상자가 같은 표시를 단다.
 */
export function PrintMarks({ approved }: PrintMarksProps) {
  useEffect(() => {
    if (approved) return
    const root = document.documentElement
    root.style.setProperty('--print-draft-mark', '"초안"')
    return () => {
      root.style.removeProperty('--print-draft-mark')
    }
  }, [approved])

  if (approved) return null

  return (
    <div aria-hidden className="hidden justify-end print:flex">
      <span className="rounded-sm border border-black/70 px-2 py-1 text-[11px] font-bold tracking-widest text-black">
        초안
      </span>
    </div>
  )
}
