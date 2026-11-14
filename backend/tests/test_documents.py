"""배포 프론트 계약, 자료 출처, 민감 항목 추정 금지, 교사 검토·지속 저장 검증."""

import json
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

from app.config import BACKEND_ROOT, Settings
from app.main import create_app
from app.school_documents import SOURCES, TEMPLATES, demo_proposals
import test_counsel as fixtures


class DocumentTests(unittest.TestCase):
    def setUp(self):
        self.calls = []
        self.bad_quote = False
        self.bad_field = False
        self.upstream_failure = False

        async def upstream(request):
            self.calls.append(request)
            if self.upstream_failure:
                return httpx.Response(402, json={"private": "test-document-secret"})
            if request.url.path.endswith("/chat/completions/"):
                payload = json.loads(request.content)
                if "reply" in payload["response_format"]["json_schema"]["schema"].get("properties", {}):
                    current = payload["messages"][-1]["content"]
                    data = fixtures.completion(reply="고성능 모델이 문맥을 확인하고 답변했습니다.")
                    if self.bad_quote:
                        data["assessment"]["evidence"] = ["원문에 없는 인용"]
                    if getattr(self, "model_risk", False):
                        data["assessment"].update(risk_language=True, risk_kind="other", risk_evidence=[current])
                    return httpx.Response(200,json={"choices":[{"message":{"content":json.dumps(data,ensure_ascii=False)}}],"usage":{"total_tokens":70}})
                data = json.loads(payload["messages"][-1]["content"])
                template = "investigation" if any(f["id"] == "overview" for f in data["fields"]) else "intake"
                fields = demo_proposals(template, data["sources"])
                if self.bad_quote:
                    next(f for f in fields if f["value"])["evidence"] = [{"source_id": "history", "quote": "원문에 없는 인용"}]
                if self.bad_field:
                    fields.append({"id": "disability", "value": "추정한 값", "evidence": []})
                return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps({"fields": fields}, ensure_ascii=False)}}], "usage": {"total_tokens": 50}})
            if request.method == "POST":
                return httpx.Response(200, json={"status": "processing", "operation_id": "mock-operation"})
            return httpx.Response(200, json={"status": "completed", "text": "[사안 처리 중 개별 면담] 보호자: 사실관계 확인에 협조하겠습니다."})

        temp_root = BACKEND_ROOT / ".runtime"
        temp_root.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=temp_root)
        self.addCleanup(self.temp.cleanup)
        self.config = Settings(api_key="test-document-secret", teacher_token="test-document-teacher-token",
            frontend_demo_enabled=True, database_path=Path(self.temp.name) / "records.sqlite3")
        self.app = create_app(self.config, httpx.MockTransport(upstream))
        self.context = TestClient(self.app, base_url="http://127.0.0.1")
        self.client = self.context.__enter__()
        self.addCleanup(self.context.__exit__, None, None, None)
        self.teacher = {"X-Teacher-Key": self.config.teacher_token}

    def case(self):
        r = self.client.post("/api/student/counsel/cases", json={"form": {"topic": "학교생활", "answers": [{"question": "고민", "answer": "가상 사례"}]}})
        self.assertEqual(r.status_code, 201)
        return r.json()["case"]["id"]

    def draft(self, template="intake", mode="mock", consent=False):
        return self.client.post("/api/teacher/document-drafts", headers=self.teacher, json={"template": template,
            "mode": mode, "external_consent": consent, "sources": {k: SOURCES[k] for k in ("history", "statements", "interview")}})

    def test_frontend_lifecycle_and_deduplication(self):
        sid = self.case()
        path = "/api/student/counsel/cases/" + sid
        self.assertFalse(any(c["id"] == sid for c in self.client.get("/api/teacher/counsel/cases").json()["cases"]))
        for i, text in enumerate(["친구가 나를 괴롭혀", "오늘도 친구가 나를 따돌려", "계속 왕따를 당해"]):
            body = {"text": text, "request_id": "turn-" + str(i)}
            result = self.client.post(path + "/messages", json=body)
            self.assertEqual(result.status_code, 200)
            self.assertEqual(result.json()["risk_count"], i + 1)
            self.assertEqual(result.json(), self.client.post(path + "/messages", json=body).json())
        self.assertTrue(result.json()["judgment"]["handed_off"])
        self.assertTrue(result.json()["case"]["chat_open"])
        detail = self.client.get("/api/teacher/counsel/cases/" + sid).json()
        self.assertNotIn("messages", detail)
        self.assertEqual(len(detail["documents"]["items"]), 4)
        self.assertEqual(self.client.post("/api/teacher/counsel/cases/" + sid + "/approve").json()["case"]["status"], "awaiting_counsel")
        self.assertEqual(self.client.post(path + "/messages", json={"text": "다른 내용", "request_id": "turn-0"}).status_code, 409)
        self.assertEqual(self.calls, [])

    def test_frontend_immediate_handoff_and_document_review_reset(self):
        sid = self.case()
        result = self.client.post(f"/api/student/counsel/cases/{sid}/messages", json={"text": "나 지금 죽을 거야", "request_id": "urgent"}).json()
        self.assertIsNotNone(result["bot_message"])
        self.assertTrue(result["case"]["chat_open"])
        self.assertTrue(result["judgment"]["handed_off"])
        self.assertEqual(result["case"]["risk"], "high")
        path = f"/api/teacher/counsel/cases/{sid}/documents/counsel_log"
        self.assertTrue(self.client.post(path + "/approve").json()["documents"]["items"][0]["approved"])
        docs = self.client.patch(path, json={"draft": "교사가 수정한 가상 초안"}).json()["documents"]
        self.assertFalse(docs["items"][0]["approved"])
        self.assertEqual(self.client.patch(path, json={}).status_code, 422)
        self.assertEqual(self.client.get("/api/student/counsel/cases/seed_1").status_code, 404)

    def test_chat_continues_after_automatic_report_until_student_closes(self):
        sid = self.case()
        path = f"/api/student/counsel/cases/{sid}"
        first = self.client.post(path+"/messages",json={"text":"나 지금 죽을 거야","request_id":"danger"}).json()
        self.assertTrue(first["case"]["chat_open"])
        next_turn = self.client.post(path+"/messages",json={"text":"선생님께 도움을 요청할게","request_id":"next"})
        self.assertEqual(next_turn.status_code,200)
        closed = self.client.post(path+"/finish").json()["case"]
        self.assertFalse(closed["chat_open"])
        self.assertEqual(closed["status"],"awaiting_approval")
        self.assertEqual(self.client.post(path+"/messages",json={"text":"추가","request_id":"closed"}).status_code,409)

    def test_cross_origin_is_limited_to_isolated_demo_routes(self):
        origin = "https://hackathon-tau-mocha.vercel.app"
        headers = {"Origin": origin, "Sec-Fetch-Site": "cross-site"}
        self.assertEqual(self.client.post("/api/student/counsel/cases", headers=headers, json={"form": {"topic": "가상", "answers": []}}).status_code, 201)
        preflight = self.client.options("/api/teacher/counsel/cases/demo/documents/counsel_log", headers={"Origin": origin,
            "Access-Control-Request-Method": "PATCH", "Access-Control-Request-Headers": "content-type"})
        self.assertEqual(preflight.status_code, 200)
        self.assertEqual(preflight.headers["access-control-allow-origin"], origin)
        self.assertEqual(self.client.post("/api/local/settings", headers=headers, json={}).status_code, 403)
        self.assertEqual(self.client.post("/api/teacher/document-drafts", headers={**headers, **self.teacher}, json={}).status_code, 403)
        self.assertEqual(self.client.get("/api/teacher/reports", headers=headers).status_code, 200)

    def test_reset_does_not_delete_actual_archive(self):
        created = self.client.post("/api/counsel/sessions", json={"mode": "mock", "consent": True, "notice_version": "archive-report-v1"}).json()
        self.client.post(f"/api/counsel/sessions/{created['session_id']}/safety", headers={"X-Session-Token": created["session_token"]},
            json={"text": "나 지금 죽을 거야", "request_id": "real-archive-demo-report"})
        self.case()
        response = self.client.post("/api/demo/reset")
        self.assertTrue(response.json()["real_archives_retained"])
        self.assertEqual(len(self.client.get("/api/teacher/reports", headers=self.teacher).json()["items"]), 1)
        self.assertEqual(len(self.client.get("/api/teacher/counsel/cases").json()["cases"]), 3)

    def test_both_templates_keep_manual_and_sensitive_fields_empty(self):
        for template in TEMPLATES:
            r = self.draft(template)
            self.assertEqual(r.status_code, 200, r.text)
            d = r.json()
            self.assertTrue(all(not f["value"] and not f["reviewed"] for f in d["fields"] if f["manual_only"]))
            self.assertTrue(all(q["quote"] in d["sources"][q["source_id"]] for f in d["fields"] for q in f["evidence"]))
            self.assertTrue(d["demo"])
        self.assertEqual(self.calls, [])

    def test_teacher_sources_open_without_access_key_and_remain_distinct(self):
        self.assertEqual(self.client.get("/api/teacher/document-drafts/sources").status_code, 200)
        self.assertEqual(self.client.get("/document-demo").status_code, 200)
        data = self.client.get("/api/teacher/document-drafts/sources", headers=self.teacher).json()
        self.assertIn("이전 상담", data["sources"]["history"])
        self.assertIn("사안 처리 중 개별 면담", data["sources"]["interview"])
        self.assertFalse(data["superschool_connected"])
        self.assertEqual(self.client.get("/api/teacher/document-drafts/sources?case_id=seed_1", headers=self.teacher).status_code, 409)

    def test_persistent_review_revision_and_unknown_fields(self):
        d = self.draft().json()
        edits = [{"id": f["id"], "value": f["value"], "reviewed": False} for f in d["fields"]]
        edits[0]["value"], edits[0]["reviewed"] = "교사가 정정한 가상 학교", True
        path = "/api/teacher/document-drafts/" + d["id"]
        payload = {"revision": 1, "fields": edits}
        saved = self.client.post(path + "/save", headers=self.teacher, json=payload)
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.json()["revision"], 2)
        self.assertTrue(saved.json()["fields"][0]["edited"])
        self.assertEqual(self.client.post(path + "/save", headers=self.teacher, json=payload).status_code, 409)
        self.assertEqual(self.client.get(path, headers=self.teacher).json()["fields"][0]["value"], edits[0]["value"])
        payload["revision"] = 2
        edits[1]["reviewed"] = True  # 빈 사안번호를 검토 완료로 표시할 수 없다.
        self.assertEqual(self.client.post(path + "/save", headers=self.teacher, json=payload).status_code, 422)

    def test_llm_uses_evidence_and_rejects_fabrication_or_sensitive_output(self):
        self.assertEqual(self.draft(mode="baze").status_code, 422)
        self.assertEqual(self.calls, [])
        self.assertEqual(self.draft(mode="baze", consent=True).status_code, 200)
        self.bad_quote = True
        self.assertEqual(self.draft(mode="baze", consent=True).status_code, 502)
        self.bad_quote, self.bad_field = False, True
        self.assertEqual(self.draft(mode="baze", consent=True).status_code, 502)
        self.assertEqual(len(self.client.get("/api/teacher/document-drafts", headers=self.teacher).json()["items"]), 1)

    def test_stt_requires_consent_and_raw_audio_is_not_retained(self):
        path = "/api/teacher/interview-transcriptions"
        self.assertEqual(self.client.post(path, headers=self.teacher, content=fixtures.wav_bytes()).status_code, 422)
        headers = {**self.teacher, "X-Audio-Consent": "true", "Content-Type": "audio/wav"}
        self.assertEqual(self.client.post(path, headers=headers, content=b"bad wav").status_code, 422)
        r = self.client.post(path, headers=headers, content=fixtures.wav_bytes())
        self.assertEqual(r.status_code, 200, r.text)
        self.assertFalse(r.json()["raw_audio_saved"])
        job_id = r.json()["job_id"]
        result = self.client.get(path + "/" + job_id, headers=self.teacher).json()
        self.assertEqual(result["status"], "completed")
        self.assertNotIn("audio", self.app.state.interview_jobs[job_id])
        self.app.state.interview_jobs[job_id]["at"] = 0
        self.assertEqual(self.client.get(path + "/" + job_id, headers=self.teacher).status_code, 404)

    def test_external_failure_is_not_replaced_with_mock_success(self):
        self.upstream_failure = True
        r = self.draft(mode="baze", consent=True)
        self.assertEqual(r.status_code, 503)
        self.assertNotIn(self.config.api_key, r.text)
        self.assertFalse(self.client.get("/api/teacher/document-drafts", headers=self.teacher).json()["items"])


class QualityFrontendTests(unittest.TestCase):
    case = DocumentTests.case

    def setUp(self):
        DocumentTests.setUp(self)
        self.config = replace(self.config, frontend_ai_mode="baze", frontend_access_token="test-frontend-access-token-0001")
        self.app.state.settings = self.config
        self.client.headers["X-Frontend-Access"] = self.config.frontend_access_token

    def test_only_quality_model_is_called_and_replay_is_free(self):
        sid=self.case()
        path=f"/api/student/counsel/cases/{sid}/messages"
        payload={"text":"친구 관계가 걱정돼요","request_id":"quality-1"}
        r=self.client.post(path,json=payload)
        self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(r.json()["model"],self.config.quality_model)
        self.assertEqual(r.json()["ai_mode"],"baze")
        self.assertIn("고성능 모델",r.json()["bot_message"]["text"])
        self.assertEqual(len(self.calls),1)
        self.assertEqual(json.loads(self.calls[0].content)["model"],self.config.quality_model)
        self.assertEqual(r.json(),self.client.post(path,json=payload).json())
        self.assertEqual(len(self.calls),1)

    def test_quality_probe_calls_only_saved_quality_model(self):
        r = self.client.post('/api/local/verify-quality')
        self.assertEqual(r.status_code,200,r.text)
        self.assertTrue(r.json()['inference_verified'])
        self.assertEqual(len(self.calls),1)
        self.assertEqual(json.loads(self.calls[0].content)['model'],self.config.quality_model)

    def test_context_and_ai_summary_reach_teacher_without_full_messages(self):
        sid=self.case()
        path=f"/api/student/counsel/cases/{sid}"
        self.client.post(path+"/messages",json={"text":"첫 번째 고민이에요","request_id":"first"})
        self.client.post(path+"/messages",json={"text":"어제도 그랬어요","request_id":"second"})
        history=json.loads(self.calls[-1].content)["messages"]
        self.assertTrue(any(m["content"]=="첫 번째 고민이에요" for m in history))
        self.client.post(path+"/handoff")
        detail=self.client.get(f"/api/teacher/counsel/cases/{sid}").json()
        self.assertIn("AI 요약",detail["summary"])
        self.assertNotIn("messages",detail)
        self.assertFalse(detail["case"]["chat_open"])

    def test_immediate_report_bypasses_model_wait_and_keeps_latest_statement(self):
        sid=self.case()
        path=f"/api/student/counsel/cases/{sid}/messages"
        self.client.post(path,json={"text":"학교생활이 고민이에요","request_id":"normal"})
        before=len(self.calls)
        self.upstream_failure=True
        r=self.client.post(path,json={"text":"나 지금 죽을 거야","request_id":"immediate"})
        self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(len(self.calls),before)
        self.assertEqual(r.json()["model"],"immediate-safety-rule")
        self.assertTrue(r.json()["judgment"]["handed_off"])
        detail=self.client.get(f"/api/teacher/counsel/cases/{sid}").json()
        self.assertIn("나 지금 죽을 거야",detail["summary"])

    def test_failure_keeps_accepted_text_and_does_not_duplicate_on_retry(self):
        sid=self.case()
        path=f"/api/student/counsel/cases/{sid}"
        payload={"text":"친구가 나를 괴롭혀","request_id":"retry"}
        self.upstream_failure=True
        self.assertEqual(self.client.post(path+"/messages",json=payload).status_code,503)
        detail=self.client.get(path).json()
        self.assertEqual(len([m for m in detail["messages"] if m["role"]=="student"]),1)
        self.upstream_failure=False
        r=self.client.post(path+"/messages",json=payload)
        self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(r.json()["risk_count"],1)
        detail=self.client.get(path).json()
        self.assertEqual(len([m for m in detail["messages"] if m["role"]=="student"]),1)

    def test_model_risk_counts_current_utterances_and_report_does_not_close_chat(self):
        sid=self.case()
        self.model_risk=True
        path=f"/api/student/counsel/cases/{sid}/messages"
        for i in range(3):
            r=self.client.post(path,json={"text":f"추가 확인이 필요한 가상 발언 {i}","request_id":f"risk-{i}"})
            self.assertEqual(r.status_code,200,r.text)
            self.assertEqual(r.json()["risk_count"],i+1)
        self.assertTrue(r.json()["judgment"]["handed_off"])
        self.assertTrue(r.json()["case"]["chat_open"])

    def test_public_requests_work_without_keys_and_invalid_quotes_fail(self):
        self.assertEqual(self.client.get("/api/student/counsel/cases").status_code,200)
        sid=self.case()
        self.bad_quote=True
        r=self.client.post(f"/api/student/counsel/cases/{sid}/messages",json={"text":"일반 고민","request_id":"bad-quote"})
        self.assertEqual(r.status_code,502)
        self.assertNotIn(self.config.api_key,r.text)

