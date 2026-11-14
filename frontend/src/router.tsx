import { createBrowserRouter, Navigate } from 'react-router'
import App from '@/App.tsx'
import { BackendConnectionGate } from '@/components/counsel/BackendConnection.tsx'
import { CounselUserShell } from '@/components/shell/CounselUserShell.tsx'
import { TeacherShell } from '@/components/shell/TeacherShell.tsx'
import {
  CHATBOT_FORM_PATH,
  COUNSEL_REGISTER_PATH,
  chatbotPath,
  PARENT_CHATBOT_NEW_PATH,
  PARENT_SCHOOL_VIOLENCE_PATH,
  parentChatbotPath,
  STUDENT_SCHOOL_VIOLENCE_PATH,
} from '@/lib/counsel/paths.ts'
import {
  SCHOOL_VIOLENCE_PATH,
  schoolViolenceCasePath,
  schoolViolenceCounselDetailPath,
  schoolViolenceDocumentPath,
} from '@/lib/schoolViolence/paths.ts'
import DemoLauncherPage from '@/pages/DemoLauncherPage.tsx'
import NotFoundPage from '@/pages/NotFoundPage.tsx'
import ParentChatbotPage from '@/pages/parent/ParentChatbotPage.tsx'
import ParentCounselPage from '@/pages/parent/ParentCounselPage.tsx'
import ChatbotChatPage from '@/pages/student/ChatbotChatPage.tsx'
import ChatbotFormPage from '@/pages/student/ChatbotFormPage.tsx'
import CounselRegisterPage from '@/pages/student/CounselRegisterPage.tsx'
import StudentCounselPage from '@/pages/student/StudentCounselPage.tsx'
import CounselDetailPage from '@/pages/teacher/CounselDetailPage.tsx'
import SchoolViolenceCasePage from '@/pages/teacher/SchoolViolenceCasePage.tsx'
import SchoolViolenceDocumentPage from '@/pages/teacher/SchoolViolenceDocumentPage.tsx'
import SchoolViolenceListPage from '@/pages/teacher/SchoolViolenceListPage.tsx'

/**
 * 화면 경로 정의. 새 페이지는 src/pages/에 만들고 알맞은 레이아웃의 children에 추가한다.
 * - `/student/*`·`/parent/*`: 상담 사용자 셸, `/teacher/*`: 교사 셸
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
    element: (
      <BackendConnectionGate>
        <CounselUserShell audience="student" />
      </BackendConnectionGate>
    ),
    children: [
      { index: true, element: <Navigate to={STUDENT_SCHOOL_VIOLENCE_PATH} replace /> },
      { path: STUDENT_SCHOOL_VIOLENCE_PATH, element: <StudentCounselPage /> },
      { path: CHATBOT_FORM_PATH, element: <ChatbotFormPage /> },
      { path: chatbotPath(':id'), element: <ChatbotChatPage /> },
      { path: COUNSEL_REGISTER_PATH, element: <CounselRegisterPage /> },
    ],
  },
  {
    path: '/parent',
    element: <CounselUserShell audience="parent" />,
    children: [
      { index: true, element: <Navigate to={PARENT_SCHOOL_VIOLENCE_PATH} replace /> },
      { path: PARENT_SCHOOL_VIOLENCE_PATH, element: <ParentCounselPage /> },
      { path: PARENT_CHATBOT_NEW_PATH, element: <ParentChatbotPage /> },
      { path: parentChatbotPath(':id'), element: <ParentChatbotPage /> },
    ],
  },
  {
    path: '/teacher',
    element: (
      <BackendConnectionGate>
        <TeacherShell />
      </BackendConnectionGate>
    ),
    children: [
      { index: true, element: <Navigate to={SCHOOL_VIOLENCE_PATH} replace /> },
      { path: SCHOOL_VIOLENCE_PATH, element: <SchoolViolenceListPage /> },
      {
        path: schoolViolenceCounselDetailPath(':id'),
        element: <CounselDetailPage />,
      },
      { path: schoolViolenceCasePath(':id'), element: <SchoolViolenceCasePage /> },
      {
        path: schoolViolenceDocumentPath(':id', ':formId'),
        element: <SchoolViolenceDocumentPage />,
      },
    ],
  },
])
