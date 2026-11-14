import type { StoredDocument } from './store.ts'

/**
 * 공통 단계 서류 9종(접수 3 · 조사 5 · 심의 1). 서식 번호·명칭은 교육부 「2026년 학교폭력 사안처리 가이드북」 부록1.
 * 실제 결재선은 학교별 위임전결 규정에 따라 다를 수 있다(예: 교감 전결).
 * 작업할 수 있는 서류는 1-3과 2-4뿐이고, 나머지는 시연 범위 밖으로 잠근다.
 */
type CatalogEntry = Omit<StoredDocument, 'status' | 'revision' | 'fields'>

export const DOCUMENT_CATALOG: CatalogEntry[] = [
  {
    form_id: '1-1',
    name: '신고접수대장',
    stage: 'intake',
    author: '책임교사',
    author_note: null,
    approval: '별도 결재 없음',
    approval_note: '전담기구가 비치·관리',
    available: false,
    description: '일시, 신고 경로, 신고 내용 요약이 상담 기록에 다 있어요.',
  },
  {
    form_id: '1-2',
    name: '분리 의사 확인서',
    stage: 'intake',
    author: '피해 관련 학생',
    author_note: '의사 표시·서명',
    approval: '학교장에게 제출',
    approval_note: null,
    available: false,
    description: '사안번호·인적사항은 자동 생성, 희망 여부와 서명은 학생이 직접 해요.',
  },
  {
    form_id: '1-3',
    name: '사안접수보고서',
    stage: 'intake',
    author: '책임교사',
    author_note: null,
    approval: '학교장 결재',
    approval_note: '→ 교육(지원)청 보고 (48시간 안)',
    available: true,
    description: '사안 유형·사실 요약은 상담에서, 보호자 통보 일시·방법은 시스템 기록에서 채워요.',
  },
  {
    form_id: '2-1',
    name: '학생 작성 확인서',
    stage: 'investigation',
    author: '관련 학생·목격 학생',
    author_note: '본인 작성',
    approval: '책임교사(또는 조사관) 접수',
    approval_note: '원본은 학교 보관',
    available: false,
    description: '학생이 쓰는 서류라 AI가 대신 쓰지 않아요. 제출·보관만 자동화할 수 있어요.',
  },
  {
    form_id: '2-2',
    name: '보호자 확인서',
    stage: 'investigation',
    author: '보호자',
    author_note: '본인 확인·서명',
    approval: '책임교사(또는 조사관) 접수',
    approval_note: null,
    available: false,
    description: '보호자 면담 전사를 바탕으로 초안을 만들고, 보호자가 확인·수정·서명해요.',
  },
  {
    form_id: '2-3',
    name: '긴급조치 보고서',
    stage: 'investigation',
    author: '책임교사',
    author_note: null,
    approval: '학교장 확인',
    approval_note: '→ 심의위원회 보고 (가해 측 조치는 추인 필요)',
    available: false,
    description: '의견청취 여부·일시·방법·내용은 면담 기록으로 채우고, 조치 결정은 학교장이 해요.',
  },
  {
    form_id: '2-4',
    name: '사안조사 보고서',
    stage: 'investigation',
    author: '전담조사관',
    author_note: '자체조사 시 책임교사',
    approval: '학교장 결재',
    approval_note: '조사관 배정 시 제로센터에도 보고',
    available: true,
    description: '양측 확인서와 면담 전사로 경위·양측 주장·쟁점·판단요소별 확인 사실 초안을 써요.',
  },
  {
    form_id: '2-7',
    name: '조사관 자료 관리대장',
    stage: 'investigation',
    author: '책임교사',
    author_note: null,
    approval: '별도 결재 없음',
    approval_note: '자료 폐기 시 조사관 서명',
    available: false,
    description: '자료 제공·폐기 이력이라 시스템 로그로 자동 기록할 수 있어요.',
  },
  {
    form_id: '3-1',
    name: '전담기구 심의결과 보고서',
    stage: 'review',
    author: '전담기구',
    author_note: '실무 작성: 책임교사',
    approval: '학교장 결재',
    approval_note: '자체해결 여부는 학교장이 결정',
    available: false,
    description:
      '일시·참석자·심의 내용 요약은 자동으로, 요건 충족 여부는 위원이 정한 대로 기록해요.',
  },
]

/** 접수 직후의 서류 9종. 아직 초안이 없다. */
export function createDocuments(): StoredDocument[] {
  return DOCUMENT_CATALOG.map((entry) => ({ ...entry, status: 'none', revision: 1, fields: [] }))
}
