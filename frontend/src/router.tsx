import { createBrowserRouter, Navigate } from 'react-router'
import App from '@/App.tsx'
import { StudentShell } from '@/components/shell/StudentShell.tsx'
import { TeacherShell } from '@/components/shell/TeacherShell.tsx'
import DemoLauncherPage from '@/pages/DemoLauncherPage.tsx'
import NotFoundPage from '@/pages/NotFoundPage.tsx'
import ChatbotChatPage from '@/pages/student/ChatbotChatPage.tsx'
import ChatbotFormPage from '@/pages/student/ChatbotFormPage.tsx'
import CounselRegisterPage from '@/pages/student/CounselRegisterPage.tsx'
import StudentCounselPage from '@/pages/student/StudentCounselPage.tsx'
import CounselDetailPage from '@/pages/teacher/CounselDetailPage.tsx'
import CounselManagePage from '@/pages/teacher/CounselManagePage.tsx'

/**
 * 화면 경로 정의. 새 페이지는 src/pages/에 만들고 알맞은 레이아웃의 children에 추가한다.
 * - `/student/*`: 학생 셸, `/teacher/*`: 교사 셸
 * - 그 밖(시연 런처, 404): App 레이아웃
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <DemoLauncherPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/student',
    element: <StudentShell />,
    children: [
      { index: true, element: <Navigate to="counsel" replace /> },
      { path: 'counsel', element: <StudentCounselPage /> },
      { path: 'counsel/chatbot/new', element: <ChatbotFormPage /> },
      { path: 'counsel/chatbot/:id', element: <ChatbotChatPage /> },
      { path: 'counsel/register', element: <CounselRegisterPage /> },
    ],
  },
  {
    path: '/teacher',
    element: <TeacherShell />,
    children: [
      { index: true, element: <Navigate to="manage-apply/counsel" replace /> },
      { path: 'manage-apply/counsel', element: <CounselManagePage /> },
      { path: 'manage-apply/counsel/:id', element: <CounselDetailPage /> },
    ],
  },
])
