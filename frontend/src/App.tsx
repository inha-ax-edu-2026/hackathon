import { NavLink, Outlet } from 'react-router'

/** 모든 페이지가 공유하는 최상위 레이아웃. 페이지 내용은 <Outlet />에 그려진다. */
function App() {
  return (
    <div className="min-h-svh bg-white text-gray-900">
      <header className="border-b border-gray-200">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <NavLink to="/" className="font-semibold">
            홈
          </NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export default App
