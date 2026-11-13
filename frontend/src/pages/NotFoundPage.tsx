import { Link } from 'react-router'

function NotFoundPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
      <Link to="/" className="text-blue-600 underline">
        홈으로 돌아가기
      </Link>
    </section>
  )
}

export default NotFoundPage
