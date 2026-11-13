import { Link } from 'react-router'
import { Button } from '@/components/ui/button.tsx'

function NotFoundPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
      <Button asChild>
        <Link to="/">홈으로 돌아가기</Link>
      </Button>
    </section>
  )
}

export default NotFoundPage
