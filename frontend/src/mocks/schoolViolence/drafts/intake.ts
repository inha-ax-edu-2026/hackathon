import type { DocumentField } from '@/api/schoolViolenceTypes.ts'
import { MATERIAL_IDS } from '@/mocks/schoolViolence/materials.ts'
import { adminField, manualField, narrativeField } from './fields.ts'

/**
 * 1-3 사안접수보고서 목 초안. 값은 작성 예시 docx의 1-3 값이다.
 * 인용문은 사안 자료 원문(materials.ts의 상담 기록)에 실제로 들어 있는 문장만 쓴다.
 * 칸 순서는 양식의 위→아래, 왼쪽→오른쪽이다. 판단 칸은 docx에 예시 값이 있어도 비워 둔다.
 */

const COUNSEL = MATERIAL_IDS.counsel
const quote = (text: string) => ({ source_id: COUNSEL, quote: text })

const MONEY =
  '정민혁이랑 박도윤이 쉬는 시간에 돈을 빌려 달라고 해서 네 번 줬는데 한 번도 돌려받지 못했어요'
const PHOTO = '10월 중순부터 우리 반 단체방에 제 체육복 사진이 올라오고 별명으로 놀림을 받아요'
const THREAT = '11월 첫째 주에는 정민혁이 선생님한테 말하면 가만 안 둔다고 했어요'

export function createIntakeFields(): DocumentField[] {
  return [
    adminField('school', '학교명'),
    adminField('case_number', '사안번호'),
    adminField('vice_principal', '교감 성명'),
    manualField('vice_principal_phone', '교감 휴대전화'),
    adminField('teacher', '담당자(책임교사) 성명'),
    manualField('teacher_phone', '담당자(책임교사) 휴대전화'),
    adminField('received_at', '접수 일시'),
    narrativeField(
      'reporter',
      '신고자(성명, 신분)',
      '한지우 (피해 관련 학생 본인, 2학년 3반)\n익명 AI 상담(19:40) → 익명 음성 상담(20:05) → 실명 전환 동의(20:40)',
      [
        quote('학생: 2학년 3반 21번 한지우'),
        quote('상담 일시: 2026. 11. 13.(금) 19:40 (익명 상담으로 시작, 긴급 분류)'),
        quote('[책임교사 익명 음성 상담 메모] 2026. 11. 13. 20:05'),
        quote('[전환 기록] 2026. 11. 13. 20:40 학생이 실명 전환과 정식 사건 접수에 동의함'),
      ],
    ),
    narrativeField('report_route', '접수·인지경로', 'victim_direct', [
      quote('학생이 직접 신고하는 것이며'),
    ]),
    narrativeField('incident_type', '사안 유형', '금품갈취, 사이버폭력, 언어폭력', [
      quote(MONEY),
      quote(PHOTO),
      quote('[감지 키워드] 학교폭력, 괴롭, 무서, 가기 싫'),
    ]),
    manualField('investigator', '조사관 배정 요청 / 학교 자체 조사'),
    manualField('measure2_date', '가해학생 제2호 조치 시행 일자'),
    manualField('measure2_targets', '가해학생 제2호 조치 시행 대상'),
    adminField('separation.enforced', '분리 시행 여부'),
    adminField('separation.period', '분리 기간'),
    adminField('separation.exceptions', '분리 예외 사유'),
    narrativeField(
      'facts',
      '사실확인 내용',
      [
        '• (언제) 2026년 10월 중순경부터 상담 신청일(11.13.)까지 계속',
        '• (어디서) 2학년 3반 교실(쉬는 시간) 및 반 단체 채팅방',
        '• (누가·무엇을) 같은 반 학생 2~3명(정민혁, 박도윤 등)이 피해 관련 학생의 사진을 단체방에 올려 놀리는 행위를 거의 매일 반복하고, 돈을 빌려 달라며 4회가량 받아 간 뒤 돌려주지 않았다고 진술함',
        "• 11월 첫째 주 '선생님한테 말하면 가만 안 둔다'는 말을 들었다고 진술함(보복 협박 언급)",
        '• 피해 관련 학생이 단체방 캡처를 보유하고 있음. 등교 불안, 수면 곤란 호소(상담 시 힘든 정도 4/5)',
      ].join('\n'),
      [
        quote(PHOTO),
        quote(MONEY),
        quote(THREAT),
        quote('단체방 캡처를 저장해 뒀어요'),
        quote('요즘 학교 가기 싫고 잠도 잘 못 자요'),
        quote('힘든 정도 4/5'),
      ],
    ),
    adminField('students', '관련 학생'),
    narrativeField(
      'other',
      '기타 사항(경찰신고, 고소, 소송 여부 등 · 성범죄 신고 여부)',
      '경찰신고·고소·소송: 상담 기록에 언급 없음(접수 시점 기준, 교사 확인 필요)\n아동·청소년 대상 성범죄: 해당 없음(신체 폭력은 없다고 진술함)',
      [quote('신체 폭력은 없다고 함')],
    ),
    manualField('other_school.name', '타학교 관련 여부: 관련학교명'),
    manualField('other_school.notice', '타학교 관련 여부: 통보여부'),
    manualField('availability.victim', '학생 조사 가능 시간: 피해 관련 학생'),
    manualField('availability.offender', '학생 조사 가능 시간: 가해 관련 학생'),
    manualField('requests', '기타 요청 사항'),
  ]
}
