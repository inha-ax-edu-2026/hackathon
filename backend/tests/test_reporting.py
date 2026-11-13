"""위험 누적·즉시 보고·중복 방지·교사 권한·지속 보관의 계약 검증."""

import json
import asyncio
import unittest
from dataclasses import replace
from unittest.mock import patch

from fastapi.testclient import TestClient
from app.main import create_app

from app.archive import ArchiveStore
from app.safety import screen_text
import test_counsel as fixtures

completion = fixtures.completion


class RuleTests(unittest.TestCase):
    def test_explicit_immediate_intent(self):
        for text in ("나 지금 죽을거야", "나 지금 죽을 거야", "오늘 자살할 거야", "지금 죽으려고 해", "나 지금 죽고 싶어"):
            with self.subTest(text=text):
                signal = screen_text(text)
                self.assertTrue(signal.detected)
                self.assertTrue(signal.immediate)

    def test_negation_fiction_past_and_ordinary_concern(self):
        for text in (
            "죽고 싶지 않아요. 잘 지내고 싶어요.",
            "죽을 생각은 없어요.",
            "지금 죽을거야라는 생각은 없어요.",
            "안전교육에서 '나 지금 죽을거야'라는 예문을 읽었어요.",
            "작년에는 죽고 싶었지만 지금은 괜찮아요.",
            "친구에게 말을 걸기 어색해서 걱정돼요.",
        ):
            with self.subTest(text=text):
                self.assertFalse(screen_text(text).detected)

    def test_new_immediate_intent_after_negation_is_not_hidden(self):
        signal = screen_text("아까는 죽을 생각은 없었어요. 하지만 나 지금 죽을거야")
        self.assertTrue(signal.immediate)


class ReportingTests(unittest.TestCase):
    # 기존 통신 없는 앱 fixture만 재사용하고 기존 테스트를 중복 실행하지 않는다.
    setUp = fixtures.CounselTests.setUp
    new_session = fixtures.CounselTests.new_session
    send = fixtures.CounselTests.send

    @property
    def teacher_headers(self):
        return {"X-Teacher-Key": "test-teacher-access-key-0001"}

    def precheck(self, text, rid="safety-turn-0001"):
        return self.client.post(self.path + "/safety", headers=self.headers, json={"text": text, "request_id": rid})

    def reports(self):
        response = self.client.get("/api/teacher/reports", headers=self.teacher_headers)
        self.assertEqual(response.status_code, 200)
        return response.json()["items"]

    def test_threshold_three_distinct_utterances(self):
        examples = ["친구가 저를 계속 괴롭혀요", "친구가 또 저를 때렸어요", "학교에서 협박을 받아요"]
        for i, text in enumerate(examples, 1):
            response = self.send(text, f"safety-turn-{i:04d}")
            self.assertEqual(response.status_code, 200)
            state = response.json()["safety"]
            self.assertEqual(state["risk_count"], i)
            self.assertEqual(state["reported"], i == 3)
        records = self.reports()
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["risk_count"], 3)
        self.assertEqual(records[0]["severity"], "attention")

    def test_acute_report_is_saved_before_any_model_call(self):
        result = self.precheck("나 지금 죽을거야").json()
        self.assertEqual(result["risk_count"], 1)
        self.assertTrue(result["immediate"])
        self.assertTrue(result["reported"])
        self.assertFalse(result["external_sent"])
        self.assertEqual(len(self.calls), 0)
        record = self.reports()[0]
        self.assertEqual(record["trigger_kind"], "immediate")
        self.assertEqual(record["severity"], "urgent")
        detail = self.client.get("/api/teacher/reports/" + record["id"], headers=self.teacher_headers).json()
        self.assertEqual(detail["conversation"]["summary"]["summary_status"], "pending_or_unavailable")
        self.assertEqual(detail["conversation"]["turns"][0]["text"], "나 지금 죽을거야")

    def test_precheck_two_models_and_retry_count_only_once(self):
        text = "괴롭힘과 협박을 받고 있고 친구들이 저를 때렸어요"
        self.precheck(text)
        self.precheck(text)
        self.send(text, "safety-turn-0001")
        self.send(text, "safety-turn-0001", retry=True)
        state = self.client.get(self.path + "/safety", headers=self.headers).json()
        self.assertEqual(state["risk_count"], 1)
        self.assertEqual(len(self.reports()), 0)

    def test_normal_concerns_do_not_reach_threshold(self):
        for i in range(4):
            self.send("친구에게 먼저 말 걸기가 어색해요", f"normal-turn-{i:04d}")
        state = self.client.get(self.path + "/safety", headers=self.headers).json()
        self.assertEqual(state["risk_count"], 0)
        self.assertFalse(state["reported"])

    def test_model_only_signals_from_both_models_are_one_utterance(self):
        async def model_reply(gateway, model, messages, schema):
            text = messages[-1]["content"]
            output = completion(evidence=[text], referral="recommended")
            output["assessment"].update(risk_language=True, risk_kind="bullying", risk_evidence=[text])
            return json.dumps(output, ensure_ascii=False), {}
        with patch("app.gateway.Gateway.chat", new=model_reply):
            for i in range(1, 4):
                result = self.send("친구와 만나는 시간이 두려워요", f"model-risk-{i:04d}").json()
                self.assertTrue(all(r["status"] == "ok" for r in result["results"].values()))
                self.assertEqual(result["safety"]["risk_count"], i)
        self.assertEqual(len(self.reports()), 1)

    def test_previous_quote_cannot_count_as_a_new_risk_utterance(self):
        old_text = "친구와 만나는 시간이 두려워요"
        async def model_reply(gateway, model, messages, schema):
            output = completion(evidence=[old_text], referral="recommended")
            output["assessment"].update(risk_language=True, risk_kind="bullying", risk_evidence=[old_text])
            return json.dumps(output, ensure_ascii=False), {}
        with patch("app.gateway.Gateway.chat", new=model_reply):
            self.send(old_text, "grounded-risk-0001")
            result = self.send("네", "grounded-risk-0002").json()
        self.assertTrue(all(r["status"] == "error" for r in result["results"].values()))
        self.assertEqual(result["safety"]["risk_count"], 1)

    def test_report_survives_model_failure(self):
        self.failure = 500
        result = self.send("나 지금 죽을거야", "urgent-failure-0001").json()
        self.assertTrue(all(r["status"] == "error" for r in result["results"].values()))
        self.assertTrue(result["safety"]["reported"])
        self.assertEqual(len(self.reports()), 1)

    def test_report_escalates_and_deduplicates_after_acknowledgement(self):
        for i in range(3):
            self.precheck("학교에서 협박을 받아요", f"repeat-risk-{i:04d}")
        before = self.reports()[0]
        self.client.post("/api/teacher/reports/" + before["id"] + "/acknowledge", headers=self.teacher_headers)
        after = self.precheck("나 지금 죽을거야", "escalate-risk-0001").json()
        self.assertEqual(after["report"]["id"], before["id"])
        self.assertEqual(after["report"]["status"], "unread")
        self.assertEqual(after["report"]["severity"], "urgent")
        self.precheck("나 지금 죽을거야", "escalate-risk-0001")
        self.assertEqual(self.reports()[0]["risk_count"], 4)
        self.assertEqual(len(self.reports()), 1)

    def test_summary_and_transcript_persist_after_close_and_store_reopen(self):
        self.send("친구와 이야기하고 싶어요", "archive-test-0001")
        response = self.client.post(self.path + "/finish", headers=self.headers)
        self.assertTrue(response.json()["archive_retained"])
        self.client.delete(self.path, headers=self.headers)
        fresh_store = ArchiveStore(self.app.state.settings.database_path)
        record = fresh_store.detail(self.session["session_id"])
        self.assertEqual(record["status"], "finished")
        self.assertEqual(record["summary"]["turn_count"], 1)
        self.assertEqual(set(record["summary"]["model_summaries"]), {"quality", "economy"})
        self.assertEqual(record["turns"][0]["text"], "친구와 이야기하고 싶어요")
        self.assertNotIn(self.session["session_token"], json.dumps(record))
        self.assertNotIn("test-secret-key", json.dumps(record))

    def test_teacher_authentication_and_student_isolation(self):
        self.precheck("나 지금 죽을거야")
        self.assertEqual(self.client.get("/api/teacher/reports").status_code, 401)
        self.assertEqual(self.client.get("/api/teacher/reports", headers=self.headers).status_code, 401)
        self.assertEqual(self.client.get("/api/teacher/reports", headers={"X-Teacher-Key": "wrong-key"}).status_code, 401)
        result = self.client.get("/api/teacher/conversations/" + self.session["session_id"], headers=self.teacher_headers)
        self.assertEqual(result.status_code, 200)
        self.assertNotIn("test-teacher-access-key-0001", result.text)
        self.assertEqual(self.client.get("/teacher").status_code, 200)

    def test_old_notice_cannot_enable_persistent_storage(self):
        result = self.client.post("/api/counsel/sessions", json={"mode": "mock", "consent": True})
        self.assertEqual(result.status_code, 422)

    def test_safety_request_id_conflict_and_new_session_counter(self):
        self.precheck("학교에서 협박을 받아요")
        self.assertEqual(self.precheck("다른 내용").status_code, 409)
        self.new_session()
        self.assertEqual(self.client.get(self.path + "/safety", headers=self.headers).json()["risk_count"], 0)

    def test_demo_reports_are_identified_as_demo(self):
        self.new_session("mock")
        self.precheck("나 지금 죽을거야")
        self.assertEqual(self.reports()[0]["mode"], "mock")

    def test_fast_model_can_report_before_slow_model_finishes(self):
        self.seen_early_report = False
        async def model_reply(gateway, model, messages, schema):
            text = messages[-1]["content"]
            if model.startswith("claude-"):
                for _ in range(100):
                    if self.app.state.archive.list_reports():
                        self.seen_early_report = True
                        break
                    await asyncio.sleep(0.005)
                output = completion()
            else:
                output = completion(evidence=[text], referral="urgent")
            return json.dumps(output, ensure_ascii=False), {}
        with patch("app.gateway.Gateway.chat", new=model_reply):
            result = self.send("친구와 만나는 시간이 두려워요", "fast-model-risk-0001").json()
        self.assertTrue(self.seen_early_report)
        self.assertTrue(result["safety"]["reported"])
        self.assertEqual(result["safety"]["risk_count"], 1)

    def test_production_start_generates_private_teacher_key_without_exposing_it(self):
        configuration = replace(self.app.state.settings, teacher_token="")
        with patch("app.main.Settings.from_env", return_value=configuration), patch("app.main.set_key") as save:
            application = create_app()
            with TestClient(application, base_url="http://127.0.0.1", client=("127.0.0.1", 50101)) as client:
                generated = application.state.settings.teacher_token
                self.assertGreaterEqual(len(generated), 16)
                self.assertEqual(save.call_args.args[1], "TEACHER_ACCESS_TOKEN")
                self.assertNotIn(generated, client.get("/api/local/settings").text)
                self.assertEqual(client.get("/api/teacher/reports", headers={"X-Teacher-Key": generated}).status_code, 200)


if __name__ == "__main__":
    unittest.main()
