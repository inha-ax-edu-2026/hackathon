import { createBrowserRouter } from 'react-router'
import App from '@/App.tsx'
import ConsultPage from '@/pages/ConsultPage.tsx'
import HomePage from '@/pages/HomePage.tsx'
import NotFoundPage from '@/pages/NotFoundPage.tsx'

/** 화면 경로 정의. 새 페이지는 src/pages/에 만들고 children에 추가한다. */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'consult', element: <ConsultPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
