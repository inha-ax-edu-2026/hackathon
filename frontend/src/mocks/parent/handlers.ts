import { HttpResponse, http } from 'msw'
import type {
  ParentCard,
  ParentInbox,
  ParentInquiry,
  ParentInquiryInput,
  ParentNotice,
  ParentProfile,
  ParentTurn,
  ParentWorkspace,
} from '@/api/parentGuidance.ts'
import { apiUrl, errorJson } from '@/mocks/http.ts'
import knowledge from './knowledge.json'

const KEY = 'safepath.parent.demo.v1'
const WAIT =
  '담당 교사의 근무시간 기준 1~2일 내 답변을 목표로 합니다. 긴급한 상황에는 기다리지 말고 즉시 도움을 요청해 주세요.'
const ACTORS = ['guardian_victim', 'guardian_offender']
const cards: ParentCard[] = knowledge.cards.map((c) => ({
  ...c,
  category: c.category as ParentCard['category'],
  sources: c.sources.map((id) => knowledge.sources[id as keyof typeof knowledge.sources]),
}))
type State = {
  turns: Record<string, ParentTurn[]>
  inquiries: ParentInquiry[]
  notices: Record<string, ParentNotice[]>
  event?: { kind: string; date: string }
}
function state(): State {
  try {
    return (
      JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? { turns: {}, inquiries: [], notices: {} }
    )
  } catch {
    return { turns: {}, inquiries: [], notices: {} }
  }
}
function save(value: State) {
  localStorage.setItem(KEY, JSON.stringify(value))
}
export function resetParentMock() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(`${KEY}.requests`)
}
function profile(actor: string, db: State): ParentProfile {
  const victim = actor === ACTORS[0]
  const stage =
    db.event?.kind === 'committee_requested'
      ? 'committee_requested'
      : db.event?.kind === 'self_resolution_closed'
        ? 'closed'
        : 'investigation'
  return {
    actor_id: actor,
    label: victim ? '피해 관련 보호자 체험' : '가해 관련 보호자 체험',
    demo: true,
    guardian: `${victim ? '김하늘' : '이도윤'} 보호자(가상)`,
    student: { name: victim ? '김하늘' : '이도윤', grade: 2, class: 3, number: victim ? 12 : 8 },
    case_id: 'parent_demo_case',
    case_number: '2026-PARENT-DEMO-1호',
    school: '새봄중학교(가상)',
    stage,
    teacher: '담당 교사',
    education_office_contact: '담당 교사를 통해 관할 교육지원청 연락처 확인',
    timeline: [
      ['received', '사안 접수'],
      ['investigation', '사안 조사'],
      ['review', '학교 검토'],
      ['committee_requested', '교육지원청 심의 요청'],
      ['closed', '학교장 자체해결 종결'],
    ].map(([key, label]) => ({ stage: key, label, state: key === stage ? 'current' : 'guide' })),
    events: [],
  }
}
function newInquiry(
  actor: string,
  body: ParentInquiryInput,
  db: State,
  urgent = false,
): ParentInquiry {
  const p = profile(actor, db)
  return {
    id: crypto.randomUUID(),
    actor_id: actor,
    case_id: p.case_id,
    case_number: p.case_number,
    guardian: p.guardian,
    student: p.student,
    question: body.text,
    summary: body.text.slice(0, 350),
    summary_kind: '문의 원문 발췌',
    desired_action: body.desired_action,
    preferred_reply: body.preferred_reply,
    callback_number: body.callback_number,
    urgent,
    status: 'received',
    read: false,
    jurisdiction_notified: false,
    at: new Date().toISOString(),
    previous_count: db.inquiries.filter((i) => i.actor_id === actor).length,
    replies: [],
  }
}
const own = ({ callback_number: _number, ...item }: ParentInquiry) => item
export const parentHandlers = [
  http.get(apiUrl('/api/parent/profiles'), () =>
    HttpResponse.json({
      demo: true,
      profiles: ACTORS.map((id) => ({
        id,
        label: id === ACTORS[0] ? '피해 관련 보호자 체험' : '가해 관련 보호자 체험',
      })),
    }),
  ),
  http.get(apiUrl('/api/parent/:actor/workspace'), ({ params }) => {
    const actor = String(params.actor)
    if (!ACTORS.includes(actor)) return errorJson(404, '보호자 프로필을 찾을 수 없습니다.')
    const db = state()
    return HttpResponse.json<ParentWorkspace>({
      profile: profile(actor, db),
      turns: db.turns[actor] ?? [],
      inquiries: db.inquiries.filter((i) => i.actor_id === actor).map(own),
      notices: db.notices[actor] ?? [],
      cards,
      reply_policy: WAIT,
      knowledge_version: knowledge.version,
    })
  }),
  http.post(apiUrl('/api/parent/:actor/messages'), async ({ params, request }) => {
    const actor = String(params.actor)
    if (!ACTORS.includes(actor)) return errorJson(404, '보호자 프로필을 찾을 수 없습니다.')
    const body = (await request.json()) as { text: string; request_id: string }
    const db = state()
    const previous = db.turns[actor]?.find((t) => t.request_id === body.request_id)
    if (previous)
      return previous.question === body.text
        ? HttpResponse.json({ turn: previous })
        : errorJson(409, '같은 요청 ID의 질문이 다릅니다.')
    let card =
      cards.find((c) =>
        knowledge.cards
          .find((k) => k.id === c.id)
          ?.keywords.some((word) => body.text.includes(word)),
      ) ?? null
    let category: ParentTurn['answer']['category'] = card?.category ?? 'teacher'
    if (
      /몇 호|몇호|학폭인지|학교폭력인지|상대.{0,12}(연락처|전화|진술서|개인정보)|가해.{0,12}(연락처|진술서)/.test(
        body.text,
      )
    ) {
      category = 'restricted'
      card = null
    }
    if (/취소|철회|동의합니다|취하/.test(body.text)) {
      category = 'restricted'
      card = cards.find((c) => c.id === 'formal_forms') ?? null
    }
    if (/(지금|현재).{0,30}(맞고|폭행|죽을|죽고|자해)|죽을 거야|죽이겠/.test(body.text)) {
      category = 'emergency'
      card = null
    }
    let answer =
      card?.text ??
      (category === 'restricted'
        ? '다른 학생의 개인정보·진술서는 제공하지 않으며 학교폭력 해당 여부·징계 결과는 판단하지 않습니다. 담당 교사에게 문의해 주세요.'
        : `개별 확인이 필요한 질문입니다. 교사에게 문의하기에서 내용을 남겨 주세요. ${WAIT}`)
    if (category === 'emergency')
      answer =
        '지금은 자녀의 안전을 먼저 확인해 주세요. 즉각적인 위험은 112, 학교폭력 신고·상담은 117에 직접 연락해 주세요. 교사 문의함에도 긴급 알림을 등록했지만 교사 답변을 기다리지 마세요.'
    if (category !== 'emergency' && category !== 'restricted' && /진행 단계/.test(body.text)) {
      category = 'school'
      card = null
      answer =
        '자녀의 현재 단계는 자녀 진행 안내에서 확인할 수 있어요. 확정 일정은 담당 교사의 안내를 확인해 주세요.'
    }
    const turn: ParentTurn = {
      id: crypto.randomUUID(),
      request_id: body.request_id,
      question: body.text,
      at: new Date().toISOString(),
      inquiry_id: null,
      answer: {
        category,
        text: answer,
        card,
        engine: 'mock_guide',
        offer_teacher: category !== 'emergency',
        urgent: category === 'emergency',
      },
    }
    if (turn.answer.urgent) {
      const item = newInquiry(
        actor,
        { ...body, preferred_reply: 'chat', callback_number: '', desired_action: '' },
        db,
        true,
      )
      db.inquiries.unshift(item)
      turn.inquiry_id = item.id
    }
    db.turns[actor] = [...(db.turns[actor] ?? []), turn]
    save(db)
    return HttpResponse.json({ turn })
  }),
  http.post(apiUrl('/api/parent/:actor/inquiries'), async ({ params, request }) => {
    const actor = String(params.actor)
    if (!ACTORS.includes(actor)) return errorJson(404, '보호자 프로필을 찾을 수 없습니다.')
    const body = (await request.json()) as ParentInquiryInput
    const db = state()
    if (
      body.preferred_reply === 'safe_phone' &&
      !/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(body.callback_number)
    )
      return errorJson(422, '가상 회신 연락처 형식을 확인해 주세요.')
    const item = newInquiry(
      actor,
      body,
      db,
      /(지금|현재).{0,30}(맞고|폭행|죽을|자해)/.test(body.text),
    )
    db.inquiries.unshift(item)
    // 요청 ID는 별도 비공개 저장소에 두어 채팅 목록에는 문의용 가짜 발언이 나타나지 않게 한다.
    const ids = JSON.parse(localStorage.getItem(`${KEY}.requests`) ?? '{}') as Record<
      string,
      { id: string; signature: string }
    >
    const previous = ids[`${actor}:${body.request_id}`]
    if (previous) {
      if (previous.signature !== JSON.stringify(body))
        return errorJson(409, '같은 요청 ID의 내용이 다릅니다.')
      const old = db.inquiries.find((i) => i.id === previous.id)
      if (old)
        return HttpResponse.json(
          { inquiry: own(old), message: `교사 문의함에 접수했습니다. ${WAIT}` },
          { status: 201 },
        )
    }
    ids[`${actor}:${body.request_id}`] = { id: item.id, signature: JSON.stringify(body) }
    localStorage.setItem(`${KEY}.requests`, JSON.stringify(ids))
    save(db)
    return HttpResponse.json(
      {
        inquiry: own(item),
        message: item.urgent
          ? '긴급 문의를 교사 문의함에 등록했습니다. 즉각적인 위험은 112에 직접 연락하세요.'
          : `교사 문의함에 접수했습니다. ${WAIT}`,
      },
      { status: 201 },
    )
  }),
  http.get(apiUrl('/api/teacher/parent-inquiries'), () => {
    const db = state()
    const guidance_log: ParentInbox['guidance_log'] = Object.entries(db.turns).flatMap(
      ([actor_id, turns]) =>
        turns.flatMap((t) =>
          t.answer.category === 'agency' && t.answer.card?.agency
            ? [
                {
                  actor_id,
                  at: t.at,
                  question: t.question,
                  agency: t.answer.card.agency,
                  contact: t.answer.card.contact ?? '',
                },
              ]
            : [],
        ),
    )
    return HttpResponse.json<ParentInbox>({
      inquiries: [...db.inquiries].sort((a, b) => Number(b.urgent) - Number(a.urgent)),
      profiles: ACTORS.map((id) => profile(id, db)),
      guidance_log,
    })
  }),
  http.patch(apiUrl('/api/teacher/parent-inquiries/:id'), async ({ params, request }) => {
    const db = state()
    const item = db.inquiries.find((i) => i.id === params.id)
    if (!item) return errorJson(404, '문의를 찾을 수 없습니다.')
    const body = (await request.json()) as {
      status?: ParentInquiry['status']
      jurisdiction_notified?: boolean
    }
    if (body.status === 'answered' && !item.replies.length)
      return errorJson(409, '답변을 작성해 주세요.')
    Object.assign(item, body, { read: true })
    save(db)
    return HttpResponse.json({ inquiry: item })
  }),
  http.post(apiUrl('/api/teacher/parent-inquiries/:id/replies'), async ({ params, request }) => {
    const db = state()
    const item = db.inquiries.find((i) => i.id === params.id)
    if (!item) return errorJson(404, '문의를 찾을 수 없습니다.')
    const body = (await request.json()) as { text: string }
    item.replies.push({
      id: crypto.randomUUID(),
      text: body.text,
      at: new Date().toISOString(),
      teacher: '담당 교사',
    })
    item.status = 'answered'
    item.read = true
    save(db)
    return HttpResponse.json({ inquiry: item })
  }),
  http.post(apiUrl('/api/teacher/parent-notices/:id/events'), async ({ request }) => {
    const db = state()
    const body = (await request.json()) as { kind: string; date: string }
    if (db.event && (db.event.kind !== body.kind || db.event.date !== body.date))
      return errorJson(409, '이미 다른 절차 시연 기록이 있습니다.')
    if (!db.event) {
      db.event = body
      for (const actor of ACTORS) {
        const p = profile(actor, db)
        const card = cards.find(
          (c) => c.id === (body.kind === 'committee_requested' ? 'committee' : 'self_resolution'),
        )
        db.notices[actor] = [
          {
            id: crypto.randomUUID(),
            title:
              body.kind === 'committee_requested'
                ? '교육지원청 심의 요청 안내'
                : '학교장 자체해결 종결 안내',
            text: `${body.date} 시연 기록입니다. ${card?.text ?? ''}`,
            at: new Date().toISOString(),
            event_date: body.date,
            kind: body.kind,
            student: p.student.name,
            case_number: p.case_number,
            sources: card?.sources ?? [],
          },
        ]
      }
      save(db)
    }
    return HttpResponse.json(
      {
        recipient_count: 2,
        message:
          '양측 가상 보호자 화면에 안내를 저장했습니다. 실제 기관·문자·전화 발송은 없습니다.',
      },
      { status: 201 },
    )
  }),
]
