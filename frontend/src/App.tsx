import { Outlet } from 'react-router'

/** 셸 밖 페이지(시연 런처, 404)의 레이아웃. 학생·교사 화면은 각자의 셸을 쓴다. */
function App() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export default App
