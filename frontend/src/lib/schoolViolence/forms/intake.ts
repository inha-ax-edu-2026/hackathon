import type { RelatedRole, RelatedStudent } from '@/api/schoolViolenceTypes.ts'
import { GENDER_LABEL, guardianNoticeLabel, ROLE_FORM_LABEL } from '@/lib/schoolViolence/labels.ts'
import { br, cell, field, guide, info, label, text } from './build.ts'
import {
  INVESTIGATION_MODES,
  REPORT_ROUTES,
  SEPARATION_ENFORCEMENT,
  SEPARATION_EXCEPTIONS,
} from './options.ts'
import type { FormLayoutBuilder, FormRow } from './types.ts'

/** 1-3 사안접수보고서. 작성 예시 docx의 표 1(21행, 102열)을 그대로 옮겼다. */

const namesOf = (students: RelatedStudent[], role: RelatedRole) =>
  students
    .filter((s) => s.role === role)
    .map((s) => s.name)
    .join(', ')

/** 관련 학생 표의 비고: 구분 + 조사 중 확인 등 비고 */
const studentNote = (student: RelatedStudent) =>
  [ROLE_FORM_LABEL[student.role], student.note].filter(Boolean).join(' · ')

export const intakeLayout: FormLayoutBuilder = ({ info: caseInfo }) => {
  const shortSchool = caseInfo.school_name.replace(/학교$/, '')

  const studentRows: FormRow[] = caseInfo.students.map((student) => [
    cell(14, [info('students', shortSchool)]),
    cell(12, [info('students', student.name)]),
    cell(14, [info('students', `${student.grade} / ${student.class} / ${student.number}`)]),
    cell(8, [info('students', GENDER_LABEL[student.gender])]),
    cell(12, [info('students', guardianNoticeLabel(student.guardian_notice))]),
    cell(26, [info('students', studentNote(student))]),
  ])

  return {
    title: '학교폭력사안 접수보고서',
    preamble: [
      text('* 사안번호: ('),
      info('school', shortSchool),
      text(')학교  '),
      field('case_number', { inline: true }),
      text('호'),
    ],
    tables: [
      {
        rows: [
          [
            label(16, '학교명', { rowSpan: 2 }),
            cell(18, [field('school')], { rowSpan: 2 }),
            label(8, '교감', { rowSpan: 2 }),
            label(10, '성명'),
            cell(16, [field('vice_principal')]),
            label(12, '담당자\n(책임교사)', { rowSpan: 2 }),
            label(10, '성명'),
            cell(12, [field('teacher')]),
          ],
          [
            label(10, '휴대전화'),
            cell(16, [field('vice_principal_phone', { placeholder: '010-XXXX-XXXX' })]),
            label(10, '휴대전화'),
            cell(12, [field('teacher_phone', { placeholder: '010-XXXX-XXXX' })]),
          ],
          [label(16, '접수 일시'), cell(86, [field('received_at')])],
          [
            label(16, '신고자\n(성명, 신분)'),
            cell(50, [field('reporter'), br, guide('* 신고자가 익명을 희망할 경우 익명 처리')]),
            label(12, '접수·\n인지경로'),
            cell(24, [
              { type: 'choice', id: 'report_route', options: REPORT_ROUTES, single: true },
            ]),
          ],
          [
            label(16, '사안 유형'),
            cell(86, [
              guide('신체폭력/언어폭력/금품갈취/강요/따돌림/성폭력/사이버폭력/기타 → '),
              field('incident_type', { inline: true }),
            ]),
          ],
          [
            label(16, '조사관 배정 요청'),
            cell(86, [
              {
                type: 'choice',
                id: 'investigator',
                options: INVESTIGATION_MODES,
                direction: 'inline',
                single: true,
              },
            ]),
          ],
          [
            label(16, '가해학생\n제2호 조치 시행'),
            cell(86, [
              text('학교폭력예방법 제17조제4항에 따른'),
              br,
              text('가해학생 제2호 조치 시행('),
              field('measure2_date', { placeholder: '2026. 00. 00.', inline: true }),
              text(')  대상: '),
              field('measure2_targets', { placeholder: '대상 학생', inline: true }),
            ]),
          ],
          [
            label(16, '(학교폭력예방법\n제16조제1항에\n따른)\n가해자와\n피해학생\n분리여부', {
              rowSpan: 3,
            }),
            label(44, '분리 시행 여부'),
            label(42, '가해자와 피해학생 분리 예외 사유(√)'),
          ],
          [
            cell(44, [
              {
                type: 'choice',
                id: 'separation.enforced',
                options: SEPARATION_ENFORCEMENT,
                direction: 'inline',
                single: true,
              },
            ]),
            cell(
              42,
              [
                {
                  type: 'choice',
                  id: 'separation.exceptions',
                  options: SEPARATION_EXCEPTIONS,
                  mark: 'paren',
                },
              ],
              { rowSpan: 2 },
            ),
          ],
          [cell(44, [text('*분리기간: '), field('separation.period', { inline: true })])],
          [
            label(16, '사실확인 내용'),
            cell(86, [guide('* 육하원칙에 의거 접수한 내용을 간략히 기재'), br, field('facts')]),
          ],
          [
            label(16, '관련 학생', { rowSpan: 1 + studentRows.length }),
            label(14, '학교명'),
            label(12, '성명'),
            label(14, '학년/반/번호'),
            label(8, '성별'),
            label(12, '보호자\n통보여부'),
            label(26, '비고\n(가해(관련)/ 피해(관련)/\n장애학생/ 이주배경학생)'),
          ],
          ...studentRows,
          [
            label(16, '기타 사항'),
            cell(86, [guide('(경찰신고, 고소, 소송 여부 등) '), br, field('other')]),
          ],
          [
            label(16, '타학교 관련 여부', { rowSpan: 2 }),
            label(22, '관련학교명'),
            cell(64, [
              field('other_school.name', {
                placeholder: '* 신고 접수 시 타학교 관련성이 확인되지 않은 경우에는 공란으로 처리',
              }),
            ]),
          ],
          [
            label(22, '통보여부'),
            cell(64, [
              field('other_school.notice', {
                placeholder: '(통보 일시, 방법) (통보 받은 사람) (연락처)',
              }),
            ]),
          ],
          [
            label(16, '(전담조사관 배정\n요청에 따른)\n학생 조사\n가능 시간', { rowSpan: 2 }),
            {
              ...label(22, '피해 관련 학생'),
              nodes: [
                text('피해 관련 학생'),
                br,
                info('students', `(${namesOf(caseInfo.students, 'victim')})`),
              ],
            },
            cell(64, [field('availability.victim')]),
          ],
          [
            {
              ...label(22, '가해 관련 학생'),
              nodes: [
                text('가해 관련 학생'),
                br,
                info('students', `(${namesOf(caseInfo.students, 'offender')})`),
              ],
            },
            cell(64, [field('availability.offender')]),
          ],
          [label(38, '기타 요청 사항'), cell(64, [field('requests')])],
        ],
      },
    ],
  }
}
