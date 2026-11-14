import { createBrowserRouter, Navigate } from 'react-router'
import App from '@/App.tsx'
import { StudentShell } from '@/components/shell/StudentShell.tsx'
import { TeacherShell } from '@/components/shell/TeacherShell.tsx'
import {
  CHATBOT_FORM_PATH,
  COUNSEL_REGISTER_PATH,
  chatbotFormPath,
  chatbotPath,
  counselDetailPath,
  counselRegisterPath,
  STUDENT_COUNSEL_PATH,
  STUDENT_SCHOOL_VIOLENCE_PATH,
  TEACHER_COUNSEL_PATH,
} from '@/lib/counsel/paths.ts'
import {
  SCHOOL_VIOLENCE_PATH,
  schoolViolenceCasePath,
  schoolViolenceDocumentPath,
} from '@/lib/schoolViolence/paths.ts'
import DemoLauncherPage from '@/pages/DemoLauncherPage.tsx'
import NotFoundPage from '@/pages/NotFoundPage.tsx'
import ChatbotChatPage from '@/pages/student/ChatbotChatPage.tsx'
import ChatbotFormPage from '@/pages/student/ChatbotFormPage.tsx'
import CounselRegisterPage from '@/pages/student/CounselRegisterPage.tsx'
import StudentCounselPage from '@/pages/student/StudentCounselPage.tsx'
import CounselDetailPage from '@/pages/teacher/CounselDetailPage.tsx'
import CounselManagePage from '@/pages/teacher/CounselManagePage.tsx'
import SchoolViolenceCasePage from '@/pages/teacher/SchoolViolenceCasePage.tsx'
import SchoolViolenceDocumentPage from '@/pages/teacher/SchoolViolenceDocumentPage.tsx'
import SchoolViolenceListPage from '@/pages/teacher/SchoolViolenceListPage.tsx'

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
      { index: true, element: <Navigate to={STUDENT_COUNSEL_PATH} replace /> },
      { path: STUDENT_COUNSEL_PATH, element: <StudentCounselPage /> },
      { path: CHATBOT_FORM_PATH, element: <ChatbotFormPage /> },
      { path: chatbotPath(':id'), element: <ChatbotChatPage /> },
      { path: COUNSEL_REGISTER_PATH, element: <CounselRegisterPage /> },
      { path: STUDENT_SCHOOL_VIOLENCE_PATH, element: <StudentCounselPage schoolViolence /> },
      {
        path: counselRegisterPath(STUDENT_SCHOOL_VIOLENCE_PATH),
        element: <CounselRegisterPage />,
      },
      {
        path: chatbotFormPath(STUDENT_SCHOOL_VIOLENCE_PATH),
        element: <ChatbotFormPage schoolViolence />,
      },
      {
        path: chatbotPath(':id', STUDENT_SCHOOL_VIOLENCE_PATH),
        element: <ChatbotChatPage schoolViolence />,
      },
    ],
  },
  {
    path: '/teacher',
    element: <TeacherShell />,
    children: [
      { index: true, element: <Navigate to={TEACHER_COUNSEL_PATH} replace /> },
      { path: TEACHER_COUNSEL_PATH, element: <CounselManagePage /> },
      { path: counselDetailPath(':id'), element: <CounselDetailPage /> },
      { path: SCHOOL_VIOLENCE_PATH, element: <SchoolViolenceListPage /> },
      { path: schoolViolenceCasePath(':id'), element: <SchoolViolenceCasePage /> },
      {
        path: schoolViolenceDocumentPath(':id', ':formId'),
        element: <SchoolViolenceDocumentPage />,
      },
    ],
  },
])
