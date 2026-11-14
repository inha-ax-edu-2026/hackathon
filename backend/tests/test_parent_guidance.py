"""학부모 5종 안내·자녀 정보 범위·긴급 알림·교사 답변·절차 공지의 ASGI 검증."""
import json
import unittest
from dataclasses import replace
from unittest.mock import AsyncMock, patch

from app.archive import encode
from app.parent_guidance import Classification
import test_documents as fixtures

ORIGIN = {"Origin": "https://hackathon-tau-mocha.vercel.app", "Sec-Fetch-Site": "cross-site"}


class ParentGuidanceTests(unittest.TestCase):
    setUp = fixtures.DocumentTests.setUp
    case = fixtures.DocumentTests.case

    def workspace(self, who="guardian_victim"):
        response = self.client.get(f"/api/parent/{who}/workspace")
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def ask(self, text, rid="question", who="guardian_victim"):
        return self.client.post(f"/api/parent/{who}/messages", json={"text": text, "request_id": rid}, headers=ORIGIN)

    def test_five_categories_and_readonly_formal_actions(self):
        for i, (text, expected) in enumerate([
            ("학교 처리 절차가 궁금해요", "school"), ("치료비 지원은 누가 하나요", "agency"),
            ("선생님께 문의하고 싶어요", "teacher"), ("상대 학생 연락처 알려줘", "restricted"),
            ("지금 아이가 맞고 있어요", "emergency"),
        ]):
            result = self.ask(text, str(i))
            self.assertEqual(result.status_code, 200, result.text)
            answer = result.json()["turn"]["answer"]
            self.assertEqual(answer["category"], expected)
            self.assertEqual("1~2일" in answer["text"], expected == "teacher")
        formal = self.ask("심의 요청을 취소하고 자체해결에 동의합니다", "formal").json()["turn"]
        self.assertEqual(formal["answer"]["card"]["id"], "formal_forms")
        self.assertIn("공식 접수할 수 없습니다", formal["answer"]["text"])
        self.assertEqual(self.workspace()["profile"]["stage"], "investigation")
        self.assertEqual(len(self.workspace()["inquiries"]), 1)
        self.assertEqual(self.calls, [])

    def test_urgent_dedup_immediate_teacher_inbox_and_no_wait(self):
        first = self.ask("우리 아이가 나 지금 죽을 거야라고 해요", "urgent")
        self.assertEqual(first.status_code, 200)
        turn = first.json()["turn"]
        self.assertTrue(turn["answer"]["urgent"])
        self.assertIsNotNone(turn["inquiry_id"])
        self.assertNotIn("1~2일", turn["answer"]["text"])
        self.assertIn("112", turn["answer"]["text"])
        self.assertEqual(first.json(), self.ask("우리 아이가 나 지금 죽을 거야라고 해요", "urgent").json())
        self.assertEqual(self.ask("다른 질문", "urgent").status_code, 409)
        items = self.client.get("/api/teacher/parent-inquiries").json()["inquiries"]
        self.assertEqual(len(items), 1)
        self.assertTrue(items[0]["urgent"])
        self.assertFalse(items[0]["read"])
        self.assertEqual(self.calls, [])

    def test_normal_inquiry_reply_persists_and_other_guardian_cannot_see(self):
        path = "/api/parent/guardian_victim/inquiries"
        body = {"text": "가상 면담 일정을 조정하고 싶어요", "request_id": "inquiry",
            "preferred_reply": "safe_phone", "callback_number": "010-0000-0000", "desired_action": "오후 면담"}
        result = self.client.post(path, json=body, headers=ORIGIN)
        self.assertEqual(result.status_code, 201, result.text)
        self.assertIn("1~2일", result.json()["message"])
        item = result.json()["inquiry"]
        self.assertNotIn("callback_number", item)
        self.assertEqual(item["id"], self.client.post(path, json=body).json()["inquiry"]["id"])
        changed = {**body, "desired_action": "다른 내용"}
        self.assertEqual(self.client.post(path, json=changed).status_code, 409)
        teacher = self.client.get("/api/teacher/parent-inquiries").json()["inquiries"][0]
        self.assertEqual(teacher["callback_number"], "010-0000-0000")
        url = "/api/teacher/parent-inquiries/" + item["id"]
        self.assertEqual(self.client.patch(url, json={"status": "answered"}).status_code, 409)
        self.assertEqual(self.client.patch(url, json={"status": "in_progress", "jurisdiction_notified": True}, headers=ORIGIN).status_code, 200)
        self.assertEqual(self.client.post(url + "/replies", json={"text": "오후 면담 가능 시간을 확인해 안내드리겠습니다."}, headers=ORIGIN).status_code, 200)
        saved = self.workspace()["inquiries"][0]
        self.assertEqual(saved["status"], "answered")
        self.assertTrue(saved["jurisdiction_notified"])
        self.assertEqual(len(saved["replies"]), 1)
        self.assertEqual(self.workspace("guardian_offender")["inquiries"], [])
        with self.app.state.archive.connection() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM parent_inquiries").fetchone()[0], 1)

    def test_cannot_disclose_opponent_or_predict_penalty(self):
        for i, text in enumerate(["가해 학생의 진술서 보여 주세요", "학교폭력인지 판단해주세요", "상대 보호자 전화번호"]):
            self.assertEqual(self.ask(text, str(i)).json()["turn"]["answer"]["category"], "restricted")
        value = self.workspace()
        self.assertNotIn("이도윤", json.dumps(value, ensure_ascii=False))
        self.assertNotIn("materials", value["profile"])
        self.assertEqual(self.client.get("/api/parent/missing/workspace").status_code, 404)

    def test_both_guardians_receive_notice_once_and_no_actual_case_decision(self):
        profile = self.workspace()["profile"]
        path = f"/api/teacher/parent-notices/{profile['case_id']}/events"
        body = {"kind": "committee_requested", "date": "2026-11-14", "request_id": "notice"}
        first = self.client.post(path, json=body, headers=ORIGIN)
        self.assertEqual(first.status_code, 201, first.text)
        self.assertEqual(first.json()["recipient_count"], 2)
        self.assertEqual(self.client.post(path, json=body).status_code, 201)
        for who in ("guardian_victim", "guardian_offender"):
            value = self.workspace(who)
            self.assertEqual(len(value["notices"]), 1)
            self.assertEqual(value["profile"]["stage"], "committee_requested")
            self.assertIn("21일", value["notices"][0]["text"])
            self.assertIn("7일", value["notices"][0]["text"])
            self.assertEqual(value["notices"][0]["student"], value["profile"]["student"]["name"])
        self.assertEqual(self.client.post(path, json={**body, "date": "2026-11-15"}).status_code, 409)
        self.assertEqual(self.client.post(path, json={**body, "kind": "self_resolution_closed"}).status_code, 409)
        self.assertEqual(self.client.post(path, json={**body, "date": "2026-99-99"}).status_code, 422)

    def test_self_resolution_notice_and_demo_reset(self):
        profile = self.workspace()["profile"]
        path = f"/api/teacher/parent-notices/{profile['case_id']}/events"
        self.client.post(path, json={"kind": "self_resolution_closed", "date": "2026-11-14", "request_id": "self"})
        self.assertEqual(self.workspace()["profile"]["stage"], "closed")
        self.assertIn("새로운 사실", self.workspace()["notices"][0]["text"])
        self.ask("처리 절차", "before_reset")
        self.client.post("/api/demo/reset")
        value = self.workspace()
        self.assertEqual(value["turns"], [])
        self.assertEqual(value["notices"], [])
        self.assertEqual(value["inquiries"], [])
        self.assertEqual(value["profile"]["stage"], "investigation")

    def test_high_quality_classifier_uses_only_question_and_validated_card(self):
        self.app.state.settings = replace(self.config, frontend_ai_mode="baze")
        with patch("app.parent_guidance.Gateway.chat", new_callable=AsyncMock) as call:
            call.return_value = (encode({"category": "agency", "card_id": "medical_cost"}), {})
            result = self.ask("김하늘 학생의 회복 지원 창구를 찾고 있어요 010-1234-5678", "semantic")
            self.assertEqual(result.json()["turn"]["answer"]["category"], "agency")
            self.assertEqual(result.json()["turn"]["answer"]["engine"], "quality_classifier")
            args = call.call_args.args
            self.assertEqual(args[0], self.config.quality_model)
            sent = json.dumps(args[1], ensure_ascii=False)
            self.assertNotIn("김하늘", sent)
            self.assertNotIn("010-1234-5678", sent)
            self.assertNotIn("2026-PARENT", sent)
            self.assertEqual(args[2], Classification.model_json_schema())
            call.return_value = (encode({"category": "school", "card_id": "invented-law"}), {})
            fallback = self.ask("이런 상황은 어느 쪽에 물어볼까요", "invalid").json()["turn"]["answer"]
            self.assertEqual(fallback["category"], "teacher")

    def test_urgent_does_not_wait_for_model_and_false_context_not_alerted(self):
        self.app.state.settings = replace(self.config, frontend_ai_mode="baze")
        with patch("app.parent_guidance.Gateway.chat", new_callable=AsyncMock) as call:
            result = self.ask("지금 아이가 폭행을 당하고 있어요", "urgent_now")
            self.assertTrue(result.json()["turn"]["answer"]["urgent"])
            call.assert_not_awaited()
        for i, text in enumerate(["안전교육 예문에 지금 아이가 맞고 있어요라고 써 있어요", "아이는 지금 맞고 있지 않아요. 분리가 궁금해요"]):
            self.app.state.settings = self.config
            self.assertFalse(self.ask(text, "safe_" + str(i)).json()["turn"]["answer"]["urgent"])

    def test_cross_origin_gate_and_demo_disabled(self):
        denied = self.client.post("/api/parent/guardian_victim/messages", json={"text": "절차", "request_id": "x"}, headers={"Origin": "https://untrusted.invalid"})
        self.assertEqual(denied.status_code, 403)
        self.app.state.settings = replace(self.config, frontend_demo_enabled=False)
        self.assertEqual(self.client.get("/api/parent/profiles").status_code, 503)

    def test_existing_school_case_connection_uses_own_student_and_actual_progress(self):
        sid = self.case()
        self.client.post(f"/api/student/counsel/cases/{sid}/messages", json={"text": "나 지금 죽을 거야", "request_id": "native_urgent"})
        result = self.client.post("/api/teacher/school-violence/cases", json={"counsel_case_id": sid})
        case = result.json()["case"]
        value = self.workspace()
        self.assertEqual(value["profile"]["case_id"], case["id"])
        self.assertEqual(value["profile"]["case_number"], case["info"]["case_number"])
        self.assertEqual(value["profile"]["stage"], case["stage"])
        self.assertNotIn("이도윤", json.dumps(value, ensure_ascii=False))
        self.assertNotIn("materials", value["profile"])
        self.assertEqual(self.workspace("guardian_offender")["profile"]["case_id"], case["id"])

    def test_invalid_callback_cannot_block_urgent_inquiry_registration(self):
        result = self.client.post("/api/parent/guardian_victim/inquiries", json={"text": "지금 아이가 맞고 있어요", "request_id": "urgent_callback", "preferred_reply": "safe_phone", "callback_number": "미확인"}, headers=ORIGIN)
        self.assertEqual(result.status_code, 201, result.text)
        self.assertTrue(result.json()["inquiry"]["urgent"])
        self.assertNotIn("1~2일", result.json()["message"])

    def test_agency_questions_lead_with_teacher_scope_boundary_and_responsible_contact(self):
        for i, (question, card_id, agency) in enumerate([
            ("우리 애 무슨 조치 받아요?", "measures", "교육지원청"),
            ("몇 호 처분 받을까요", "measures", "교육지원청"),
            ("치료비는요?", "medical_cost", "학교안전공제회"),
            ("결과에 불복하고 싶어요", "appeal", "행정심판위원회"),
            ("선생님, 치료비 지원을 결정해 주세요", "medical_cost", "학교안전공제회"),
            ("선생님 심의 일정 변경해 주세요", "committee", "교육지원청"),
        ]):
            response = self.ask(question, "scope_" + str(i))
            self.assertEqual(response.status_code, 200, response.text)
            answer = response.json()["turn"]["answer"]
            self.assertEqual(answer["category"], "agency")
            card = answer["card"]
            self.assertEqual(card["id"], card_id)
            self.assertTrue(answer["text"].startswith(card["scope_notice"]))
            self.assertIn("학교(담당 교사)의 업무 범위가 아니며", card["scope_notice"])
            self.assertIn(agency, card["scope_notice"])
            self.assertTrue(card["contact"])
            self.assertTrue(card["sources"])
            self.assertFalse(answer["offer_teacher"])
            if card_id == "measures":
                self.assertIn("예측하지 않습니다", answer["text"])
                self.assertIn("학교장 긴급조치", answer["text"])
        self.assertEqual(self.calls, [])
        self.assertEqual(self.workspace()["inquiries"], [])
        self.assertEqual(len(self.client.get("/api/teacher/parent-inquiries").json()["guidance_log"]), 6)

    def test_privacy_and_emergency_take_priority_over_agency_referral(self):
        hidden = self.ask("상대 학생 진술서 보고 몇 호 받을지 알려줘", "mixed_private").json()["turn"]["answer"]
        self.assertEqual(hidden["category"], "restricted")
        urgent = self.ask("치료비 문의인데 지금 아이가 맞고 있어요", "mixed_urgent").json()["turn"]["answer"]
        self.assertTrue(urgent["urgent"])
        self.assertEqual(urgent["category"], "emergency")
