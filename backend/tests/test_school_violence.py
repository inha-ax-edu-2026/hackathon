"""팀 프론트의 서류 작업실 API를 실제 SQLite·ASGI·가상 모델 전송으로 검증한다."""

import json
import unittest
from dataclasses import replace
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import create_app
import test_documents as fixtures


BASE = "/api/teacher/school-violence/cases"
ORIGIN = {"Origin": "https://hackathon-tau-mocha.vercel.app", "Sec-Fetch-Site": "cross-site"}


class SchoolWorkspaceTests(unittest.TestCase):
    setUp = fixtures.DocumentTests.setUp
    case = fixtures.DocumentTests.case

    def intake(self, kinds=None):
        counsel_id = self.case()
        self.client.post(f"/api/student/counsel/cases/{counsel_id}/messages",
            json={"text": "나 지금 죽을 거야", "request_id": "urgent"})
        body = {"counsel_case_id": counsel_id}
        if kinds is not None:
            body["demo_material_kinds"] = kinds
        result = self.client.post(BASE, json=body, headers=ORIGIN)
        self.assertEqual(result.status_code, 201, result.text)
        return result.json()["case"]

    def draft(self, case, form="1-3", **body):
        return self.client.post(f"{BASE}/{case['id']}/documents/{form}/draft", json=body, headers=ORIGIN)

    def test_workspace_links_existing_counsel_once_and_keeps_materials_distinct(self):
        case = self.intake()
        cid = case["counsel_case_ids"][0]
        detail = self.client.get("/api/teacher/counsel/cases/" + cid).json()
        self.assertEqual(detail["school_violence_case_id"], case["id"])
        self.assertTrue(detail["school_violence_intake_supported"])
        materials = {m["kind"]: m for m in case["materials"]}
        self.assertIn(detail["summary"], materials["counsel_record"]["body"])
        self.assertIn("사안 처리 중", materials["interview_transcript"]["body"])
        self.assertTrue(materials["statement"]["demo_preloaded"])
        self.assertFalse(materials["counsel_record"]["demo_preloaded"])
        self.assertEqual(case["info"]["students"][0]["gender"], "unknown")
        self.assertEqual(self.client.post(BASE, json={"counsel_case_id": cid}).status_code, 409)
        self.assertEqual(len(self.client.get(BASE).json()["cases"]), 1)
        self.assertEqual(self.client.get(BASE).json()["cases"][0]["counsel_case_ids"], [cid])
        self.assertEqual(self.client.post(BASE, json={"counsel_case_id": "missing", "external_counsel": True}).status_code, 404)
        self.assertEqual(len(case["documents"]), 9)
        self.assertEqual(sum(d["available"] for d in case["documents"]), 2)

    def test_draft_matches_native_form_schema_and_does_not_fill_manual_fields(self):
        case = self.intake()
        before = self.client.get(f"{BASE}/{case['id']}/documents/1-3").json()["document"]
        self.assertEqual(before["status"], "none")
        self.assertEqual(before["fields"], [])
        for form in ("1-3", "2-4"):
            result = self.draft(case, form)
            self.assertEqual(result.status_code, 201, result.text)
            doc = result.json()["document"]
            self.assertEqual(doc["status"], "reviewing")
            by_id = {f["id"]: f for f in doc["fields"]}
            self.assertEqual(by_id["school"]["value"], case["info"]["school_name"])
            self.assertEqual(by_id["case_number"]["value"], case["info"]["case_number"])
            self.assertTrue(all(not f["value"] for f in doc["fields"] if f["kind"] in {"manual", "sensitive"}))
            sources = {m["id"]: m["body"] for m in case["materials"]}
            self.assertTrue(all(e["quote"] in sources[e["source_id"]] for f in doc["fields"] for e in f["evidence"]))
            if form == "2-4":
                self.assertIn("factor.severity.이도윤", by_id)
                self.assertNotIn("factor.severity.정민혁", by_id)
        self.assertEqual(self.calls, [])

    def test_save_review_stale_revision_and_approval_progress(self):
        case = self.intake()
        for form, stage in [("1-3", "investigation"), ("2-4", "review")]:
            doc = self.draft(case, form).json()["document"]
            path = f"{BASE}/{case['id']}/documents/{form}"
            self.assertEqual(self.client.post(path + "/approve", json={"revision": doc["revision"]}).status_code, 409)
            edits = [{"id": f["id"], "reviewed": True} for f in doc["fields"] if f["kind"] == "narrative" and f["value"]]
            saved = self.client.post(path + "/save", json={"revision": doc["revision"], "fields": edits})
            self.assertEqual(saved.status_code, 200, saved.text)
            self.assertEqual(self.client.post(path + "/save", json={"revision": doc["revision"], "fields": edits}).status_code, 409)
            updated = saved.json()["document"]
            approved = self.client.post(path + "/approve", json={"revision": updated["revision"]})
            self.assertEqual(approved.status_code, 200, approved.text)
            current = self.client.get(f"{BASE}/{case['id']}").json()["case"]
            self.assertEqual(current["stage"], stage)
            ai = next(f for f in updated["fields"] if f["kind"] == "narrative" and f["value"])
            result = self.client.post(path + "/save", json={"revision": updated["revision"],
                "fields": [{"id": ai["id"], "value": "교사가 수정한 가상 초안", "reviewed": True}]}).json()["document"]
            self.assertEqual(result["status"], "reviewing")
            self.assertFalse(next(f for f in result["fields"] if f["id"] == ai["id"])["reviewed"])
            # 다음 단계 검증을 위해 방금 고친 칸을 검토 완료한다.
            reviewed = self.client.post(path + "/save", json={"revision": result["revision"], "fields": [{"id": ai["id"], "reviewed": True}]}).json()["document"]
            self.client.post(path + "/approve", json={"revision": reviewed["revision"]})

    def test_invalid_edit_is_atomic_and_admin_values_follow_case_info(self):
        case = self.intake()
        doc = self.draft(case).json()["document"]
        path = f"{BASE}/{case['id']}/documents/1-3"
        invalid = self.client.post(path + "/save", json={"revision": doc["revision"],
            "fields": [{"id": "facts", "value": "저장되면 안 됨"}, {"id": "school", "value": "다른 학교"}]})
        self.assertEqual(invalid.status_code, 422)
        self.assertEqual(self.client.get(path).json()["document"], doc)
        self.assertEqual(self.client.patch(f"{BASE}/{case['id']}/info", json={"teacher_name": "검토 교사", "vice_principal": ""}).status_code, 200)
        fields = {f["id"]: f for f in self.client.get(path).json()["document"]["fields"]}
        self.assertEqual(fields["teacher"]["value"], "검토 교사")

    def test_investigation_requires_own_materials_and_overwrite_is_explicit(self):
        case = self.intake([])
        self.assertEqual(self.draft(case, "2-4").status_code, 409)
        self.assertEqual(self.draft(case, "1-1").status_code, 409)
        self.assertEqual(self.draft(case).status_code, 201)
        self.assertEqual(self.draft(case).status_code, 409)
        result = self.draft(case, overwrite_confirmed=True)
        self.assertEqual(result.status_code, 201)
        self.assertEqual(result.json()["document"]["revision"], 2)

    def test_workspace_and_teacher_edits_survive_server_restart(self):
        case = self.intake()
        doc = self.draft(case).json()["document"]
        path = f"{BASE}/{case['id']}/documents/1-3"
        saved = self.client.post(path + "/save", json={"revision": doc["revision"],
            "fields": [{"id": "facts", "value": "저장해 둔 가상 초안"}]}).json()["document"]
        with TestClient(create_app(self.config), base_url="http://127.0.0.1") as client:
            self.assertEqual(client.get(path).json()["document"], saved)
            detail = client.get("/api/teacher/counsel/cases/" + case["counsel_case_ids"][0]).json()
            self.assertEqual(detail["school_violence_case_id"], case["id"])

    def test_single_quality_model_and_quote_validation_no_mock_fallback(self):
        case = self.intake()
        self.app.state.settings = replace(self.config, frontend_ai_mode="baze")
        calls = []
        bad_quote = False

        async def model(gateway, name, messages, schema):
            calls.append(name)
            packet = json.loads(messages[-1]["content"])
            source = packet["materials"][0]
            return json.dumps({"fields": [{"id": f["id"], "value": "상담에서 확인할 사항" if f["id"] == "facts" else "",
                "evidence": [{"source_id": source["id"], "quote": "없는 인용" if bad_quote else source["body"][:60]}] if f["id"] == "facts" else []}
                for f in packet["fields"]]}, ensure_ascii=False), {}

        with patch("app.school_violence.Gateway.chat", new=model):
            self.assertEqual(self.draft(case).status_code, 422)
            self.assertEqual(calls, [])
            result = self.draft(case, external_consent=True)
            self.assertEqual(result.status_code, 201, result.text)
            self.assertEqual(result.json()["document"]["model"], self.config.quality_model)
            before = result.json()["document"]
            bad_quote = True
            self.assertEqual(self.draft(case, overwrite_confirmed=True, external_consent=True).status_code, 502)
            self.assertEqual(self.client.get(f"{BASE}/{case['id']}/documents/1-3").json()["document"], before)
        self.assertEqual(calls, [self.config.quality_model] * 2)

        async def failed(*args):
            raise HTTPException(503, "테스트 공급사 오류")
        with patch("app.school_violence.Gateway.chat", new=failed):
            self.assertEqual(self.draft(case, overwrite_confirmed=True, external_consent=True).status_code, 503)

    def test_unknown_origin_cannot_create_case(self):
        self.assertEqual(self.client.post(BASE, json={"counsel_case_id": "anything"}, headers={"Origin": "https://untrusted.example"}).status_code, 403)


if __name__ == "__main__":
    unittest.main()
