import type { DocumentField, RelatedStudent } from '@/api/schoolViolenceTypes.ts'
import { GENDER_LABEL, ROLE_FORM_LABEL } from '@/lib/schoolViolence/labels.ts'
import { offenderFieldId } from '@/lib/schoolViolence/studentFields.ts'
import { br, cell, field, guide, info, label, text } from './build.ts'
import { INVESTIGATION_ROUNDS, SEPARATION_ENFORCEMENT, SEPARATION_EXCEPTIONS } from './options.ts'
import type { FormLayoutBuilder, FormNode, FormRow, FormTable } from './types.ts'

/**
 * 2-4 사안조사 보고서. 작성 예시 docx의 표 2~5(102열)를 옮겼다. 쪽 나눔은 표 2 → (쪽) → 표 3·4 → (쪽) → 표 5.
 * 반복 구조는 칸 id를 보고 행을 만든다.
 * - 쟁점: `issue.<n>.title`이 있는 n마다 4행(쟁점 문장 + 피해·가해·목격).
 * - 시행령 제19조 판단요소: 사안 정보의 가해 관련 학생마다 `factor.<판단요소>.<이름>` 칸을 한 줄씩.
 */

/** 서류 칸에서 쟁점 번호를 모은다. 칸이 없으면(초안 전) 쟁점 1개 자리만 보인다. */
function issueNumbers(fields: DocumentField[]) {
  const numbers = new Set<number>()
  for (const { id } of fields) {
    const match = /^issue\.(\d+)\.title$/.exec(id)
    if (match) numbers.add(Number(match[1]))
  }
  return numbers.size === 0 ? [1] : [...numbers].sort((a, b) => a - b)
}

const studentNote = (student: RelatedStudent) =>
  [ROLE_FORM_LABEL[student.role], student.note].filter(Boolean).join(' · ')

/**
 * 가해 관련 학생별 줄: 「• [이름]」 아래에 그 학생의 칸. 칸은 길면 줄을 바꿔 써야 해서
 * 이름 옆에 이어 붙이지 않고 블록으로 둔다(버튼은 한 줄에 이어 붙이면 통째로 다음 줄로 밀린다).
 */
const perOffender = (key: string, offenders: string[], placeholder?: string): FormNode[] =>
  offenders.flatMap((name): FormNode[] => [
    text(`• [${name}]`),
    field(offenderFieldId(key, name), { placeholder }),
  ])

const EVIDENCE_HEADER =
  '근거자료\n(※ 예시: 설문조사, CCTV, 영상자료, 녹음자료, 사진, SNS, 문자 메세지, 진단서 등) - 출처, 장소, 날짜, 시간 등 주요 내용 기재'

const SELF_RESOLUTION_REQUIREMENTS = [
  '1. 2주 이상의 신체적·정신적 치료를 요하는 진단서를 발급받지 않은 경우',
  '2. 재산상 피해가 없는 경우 또는 재산상 피해가 즉각 복구되거나 복구 약속이 있는 경우',
  '3. 학교폭력이 지속적이지 않은 경우',
  '4. 학교폭력에 대한 신고, 진술, 자료제공 등에 대한 보복행위(정보통신망을 이용한 행위를 포함한다)가 아닌 경우',
]

export const investigationLayout: FormLayoutBuilder = ({ info: caseInfo, fields }) => {
  const shortSchool = caseInfo.school_name.replace(/학교$/, '')
  const offenders = caseInfo.students.filter((s) => s.role === 'offender').map((s) => s.name)

  // 표 2: 기본 사항·사안 개요·경위·분리 여부
  const studentRows: FormRow[] = caseInfo.students.map((student) => [
    cell(10, [info('students', shortSchool)]),
    cell(12, [info('students', `${student.grade} / ${student.class}-${student.number}`)]),
    cell(9, [info('students', student.name)]),
    cell(9, [info('students', GENDER_LABEL[student.gender])]),
    cell(11, [info('students', '-')]),
    cell(13, [info('students', '-')]),
    cell(22, [info('students', studentNote(student))]),
  ])

  const basics: FormTable = {
    rows: [
      [
        label(16, '신고접수 일자'),
        cell(22, [field('received_at')]),
        label(10, '작성자', { rowSpan: 2 }),
        label(12, '책임교사'),
        cell(42, [
          text('(성명) '),
          field('teacher', { inline: true }),
          text('    (연락처) '),
          field('teacher_phone', { inline: true, placeholder: '010-XXXX-XXXX' }),
        ]),
      ],
      [
        label(16, '사안조사 일자'),
        cell(22, [field('investigated_at')]),
        label(12, '조사관'),
        cell(42, [
          text('(성명) '),
          field('investigator', { inline: true }),
          text('    (연락처) '),
          field('investigator_phone', { inline: true, placeholder: '010-XXXX-XXXX' }),
        ]),
      ],
      [
        label(16, '사안 유형', { rowSpan: 2 }),
        cell(86, [
          guide('유형: 신체폭력/ 언어폭력/ 금품갈취/ 강요/ 따돌림/ 성폭력/ 사이버폭력/ 기타 → '),
          field('incident_type', { inline: true }),
        ]),
      ],
      [cell(86, [field('incident_summary')])],
      [
        label(16, '관련 학생', { rowSpan: 2 + studentRows.length }),
        label(10, '학교'),
        label(12, '학년 반/번호'),
        label(9, '성 명'),
        label(9, '성 별'),
        label(11, '(공동사안인\n경우)\n관련학교의\n사안 번호'),
        label(13, '학생선수 여부\n(V표시,\n가해(관련)학생에\n한함)*'),
        label(22, '비고\n(가해(관련)/\n피해(관련))'),
      ],
      ...studentRows,
      [
        cell(86, [
          guide(
            "* 국민체육진흥법 개정으로 「학생징계정보 수집」이 시행('22.8.11)됨에 따라 학교의 학생선수 담당 교사로부터 학생선수 확인 서류를 제출 받은 경우, V 표시",
          ),
        ]),
      ],
      [
        label(16, '사안 개요\n(주요 내용)'),
        cell(86, [
          guide(
            '※ 신고내용과 관련하여 확인한 내용을 육하원칙에 의거 구체적으로 기재 (피해 관련 학생의 신고내용이 누락되지 않도록 주의)',
          ),
          br,
          field('overview'),
        ]),
      ],
      [
        label(16, '사안 경위\n(세부내용\n전체)'),
        cell(86, [
          guide(
            '※ 사안의 전후, 사안 접수, 전담기구 및 조사관 조사, 양측의 주장을 포함한 전체 사건 내용, 등을 시간의 흐름에 맞춰 구체적으로 기재',
          ),
          br,
          field('timeline'),
        ]),
      ],
      [
        label(16, '가해자와\n피해학생의\n분리 여부', { rowSpan: 3 }),
        label(44, '분리 시행 여부'),
        label(42, '가해자와 피해학생 분리 예외(√)'),
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
    ],
  }

  // 표 3: 자체해결 요건 충족 여부
  const selfResolution: FormTable = {
    pageBreakBefore: true,
    rows: [
      [
        label(16, '자체해결\n요건\n충족 여부', {
          rowSpan: 2 + SELF_RESOLUTION_REQUIREMENTS.length,
        }),
        label(70, "(조사관 조사시)\n'객관적 요건 충족 여부'에 대한 전담 조사관의 의견"),
        label(16, '자체해결\n동의 여부'),
      ],
      [
        label(40, '학교장 자체해결 요건'),
        label(30, '의견(충족 여부)'),
        cell(16, [guide('※ 현재까지 확인된 내용 기재'), br, field('self_resolution.consent')], {
          rowSpan: 1 + SELF_RESOLUTION_REQUIREMENTS.length,
        }),
      ],
      ...SELF_RESOLUTION_REQUIREMENTS.map((requirement, index): FormRow => {
        const n = index + 1
        return [
          cell(40, [text(requirement)]),
          cell(30, [
            field(`self_resolution.${n}.opinion`, { placeholder: '[조사관 의견 기재]' }),
            br,
            guide('참고 사실: '),
            field(`self_resolution.${n}.facts`, { inline: true }),
          ]),
        ]
      }),
    ],
  }

  // 표 4: 쟁점 n개
  const issues = issueNumbers(fields)
  const issueTable: FormTable = {
    rows: issues.flatMap((n, index): FormRow[] => {
      const id = (part: string) => `issue.${n}.${part}`
      const first: FormRow = [
        ...(index === 0 ? [label(12, '쟁점 사안', { rowSpan: issues.length * 4 })] : []),
        cell(14, [text(`주요 쟁점 ${n}.`)]),
        cell(38, [field(id('title'))]),
        label(38, index === 0 ? EVIDENCE_HEADER : '근거자료\n※ 위와 동일'),
      ]
      return [
        first,
        [
          cell(14, [text('피해(관련)'), br, text('학생의 주장'), br, text('내용')]),
          cell(38, [field(id('victim_claim'))]),
          cell(38, [field(id('victim_evidence'))]),
        ],
        [
          cell(14, [text('가해(관련)'), br, text('학생의 주장'), br, text('내용')]),
          cell(38, [field(id('offender_claim'))]),
          cell(38, [field(id('offender_evidence'))]),
        ],
        [
          cell(14, [text('목격학생의'), br, text('진술 등')]),
          cell(38, [field(id('witness_claim'))]),
          cell(38, [field(id('witness_evidence'))]),
        ],
      ]
    }),
  }

  // 표 5: 시행령 제19조 판단요소 (가해 관련 학생별로 구별하여 작성)
  const factorRow = (title: string, nodes: FormNode[]): FormRow => [
    label(14, title),
    cell(88, nodes),
  ]
  const factors: FormTable = {
    pageBreakBefore: true,
    rows: [
      [label(102, '시행령 제19조 판단요소 관련 확인 사실 기재', {})],
      [
        cell(102, [
          guide('※ 작성 시 참고사항에 따라 각 판단요소별 구체적으로 사실을 기재'),
          br,
          guide('(책임교사나 조사관이 판단하는 점수를 기재하는 것이 아님)'),
          br,
          guide('※ 가해학생별로 구별하여 작성'),
        ]),
      ],
      factorRow('학교폭력의\n심각성', [
        field('common.severity'),
        br,
        ...perOffender('severity', offenders),
      ]),
      factorRow('학교폭력의\n지속성', perOffender('persistence', offenders)),
      factorRow('학교폭력의\n고의성', perOffender('intent', offenders)),
      factorRow('가해학생의\n반성 정도', perOffender('remorse', offenders)),
      [
        label(14, '가해학생 및\n보호자와\n피해학생 및\n보호자간\n화해 정도', { rowSpan: 3 }),
        cell(88, [field('common.reconcile'), br, ...perOffender('reconcile', offenders)]),
      ],
      [label(88, '관계회복 프로그램·갈등조정 등을 진행하였는지, 진행할 의사가 있는지')],
      [cell(88, [field('common.program')])],
      factorRow(
        '해당 조치로\n인한\n가해학생의\n선도 가능성',
        perOffender(
          'education',
          offenders,
          '[담임 입력] 평소 생활태도 및 사안접수 이후 생활태도 변화',
        ),
      ),
      factorRow('피해학생이\n장애학생인지\n여부', [field('disability')]),
      [
        label(14, '긴급조치\n여부', { rowSpan: 2 }),
        cell(14, [text('피해(관련)학생')]),
        cell(74, [field('urgent.victim')]),
      ],
      [cell(14, [text('가해(관련)학생')]), cell(74, [field('urgent.offender')])],
      [
        label(14, '가해학생\n학교폭력\n재발 현황', { rowSpan: 1 + offenders.length }),
        cell(88, [
          guide(
            '※ 학교폭력 가해학생 조치사항 관리대장을 통해 확인될 수 있는 가해학생의 학교폭력 횟수 기재',
          ),
        ]),
      ],
      ...offenders.map(
        (name): FormRow => [
          cell(14, [text(name)]),
          cell(74, [
            field(offenderFieldId('recurrence', name), {
              placeholder: '학년 / 사안번호 / 가해학생 선도조치(학교장 자체해결 포함)',
            }),
          ]),
        ],
      ),
      factorRow('특이사항 및\n고려사항', [
        guide(
          '※ 성 관련 사안 여부, 치료비 분쟁, 관련 학생들이 이주배경학생인지 여부, 관련 학생 및 그 보호자의 요구사항, 언론보도, 경찰신고(고소) 및 법률대리인 선임 여부 등 특이사항 기재',
        ),
        br,
        field('special'),
      ]),
      [label(102, '기타 사항')],
      [
        cell(102, [
          guide(
            '※ 보완조사 보고서의 경우 사례회의의 개최 일시, 사례회의에서 결정한 주요 보완사항 등을 작성',
          ),
          br,
          field('etc'),
        ]),
      ],
    ],
  }

  return {
    title: '학교폭력 사안조사 보고서',
    preamble: [
      {
        type: 'choice',
        id: 'round',
        options: INVESTIGATION_ROUNDS,
        direction: 'inline',
        single: true,
      },
      text('* 사안번호: ('),
      info('school', shortSchool),
      text(')학교  '),
      field('case_number', { inline: true }),
      text('호'),
    ],
    tables: [basics, selfResolution, issueTable, factors],
  }
}
