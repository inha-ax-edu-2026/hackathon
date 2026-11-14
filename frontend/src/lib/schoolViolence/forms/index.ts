import { intakeLayout } from './intake.ts'
import { investigationLayout } from './investigation.ts'
import type { FormLayoutBuilder } from './types.ts'

/** 서류 양식 ID → 양식 레이아웃. 여기에 등록된 서류만 화면에서 열린다. */
const FORM_LAYOUTS: Partial<Record<string, FormLayoutBuilder>> = {
  '1-3': intakeLayout,
  '2-4': investigationLayout,
}

export const getFormLayout = (formId: string) => FORM_LAYOUTS[formId]
