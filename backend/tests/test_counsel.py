"""통신 없는 계약·오류·세션 격리 검증. python -m unittest discover -s tests -v"""

import asyncio
import io
import json
import time
import unittest
import wave
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def wav_bytes(seconds=1):
    stream = io.BytesIO()
    with wave.open(stream, "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(16000)
        output.writeframes(b"\0\0" * int(seconds * 16000))
    return stream.getvalue()


def completion(reply="이야기해 줘서 고마워요. 지금 어떤 도움이 필요할까요?", evidence=None, referral="check"):
    return {"reply": reply, "assessment": {
        "referral": referral, "urgency": "immediate" if referral == "urgent" else "normal",
        "summary": "친구 관계의 고민을 이야기했습니다.", "reason": "현재 상황의 추가 확인이 필요합니다.",
        "question": "지금 어떤 도움이 필요할까요?", "evidence": evidence or [],
    }}


class CounselTests(unittest.TestCase):
    def setUp(self):
        self.calls = []
        self.failure = None
        self.invalid = False
        self.fake_evidence = False
        self.urgent = False
        self.pending = False
        self.bad_models = False
        self.close_during_stt = False
        self.reject_claude_constraints = False
        self.oversized_quality_reply = False
        self.bad_request_message = ""

        async def upstream(request):
            self.calls.append(request)
            if self.failure == "timeout":
                raise httpx.ReadTimeout("test-secret-key", request=request)
            if isinstance(self.failure, int):
                if self.failure == 400:
                    return httpx.Response(400, json={"error": {"message": self.bad_request_message or "private transcript test-secret-key"}})
                return httpx.Response(self.failure, json={"detail": "test-secret-key private transcript"})
            if request.url.path.endswith("/models/"):
                return httpx.Response(200, json={"data": "invalid"} if self.bad_models else {
                    "data": [{"id": model} for model in ["claude-opus-5-5", "gpt-6-luna", "stt-async-v5", "gemini-3.8-flash-tts"]]})
            if request.url.path.endswith("/chat/completions/"):
                body = json.loads(request.content)
                if self.reject_claude_constraints and body["model"].startswith("claude-"):
                    serialized_schema = json.dumps(body["response_format"]["json_schema"]["schema"])
                    if any('"' + key + '"' in serialized_schema for key in ("minLength", "maxLength", "maxItems")):
                        return httpx.Response(400, json={"error": {"message": "Unsupported schema constraint: maxLength"}})
                if self.failure == "economy" and body["model"] == "gpt-6-luna":
                    return httpx.Response(429)
                content = "not json" if self.invalid else json.dumps(completion(
                    reply="x" * 3001 if self.oversized_quality_reply and body["model"].startswith("claude-") else "이야기해 줘서 고마워요. 어떤 도움이 필요할까요?",
                    evidence=["만들어낸 근거"] if self.fake_evidence else (["친구 관계가 힘들어요"] if self.urgent else []),
                    referral="urgent" if self.urgent else "check",
                ), ensure_ascii=False)
                await asyncio.sleep(0.01)
                return httpx.Response(200, json={"choices": [{"message": {"content": content}}],
                    "usage": {"total_tokens": 100, "untrusted": "test-secret-key"}}, headers={"X-Credits-Charged": "2.5"})
            if request.method == "POST" and request.url.path.endswith("/audio/transcriptions/"):
                if self.close_during_stt:
                    self.app.state.counsel.sessions[self.session["session_id"]].closed = True
                return httpx.Response(200, json={"operation_id": "soniox:job:test", "status": "processing", "credits_charged": 0.1})
            if request.method == "GET" and "/audio/transcriptions/" in request.url.path:
                return httpx.Response(200, json={"status": "processing"} if self.pending else {"status": "completed", "text": "친구 관계가 힘들어요"})
            if request.url.path.endswith("/audio/speech/"):
                return httpx.Response(200, content=b"\0\0" * 24000, headers={"Content-Type": "audio/pcm", "X-Credits-Charged": "0.2"})
            return httpx.Response(404)

        self.app = create_app(Settings(api_key="test-secret-key", model="gpt-6-luna"), httpx.MockTransport(upstream))
        self.client_context = TestClient(self.app, base_url="http://127.0.0.1", client=("127.0.0.1", 50100))
        self.client = self.client_context.__enter__()
        self.addCleanup(self.client_context.__exit__, None, None, None)
        self.new_session()

    def new_session(self, mode="baze"):
        result = self.client.post("/api/counsel/sessions", json={"mode": mode, "consent": True})
        self.assertEqual(result.status_code, 200)
        self.session = result.json()
        self.path = "/api/counsel/sessions/" + self.session["session_id"]
        self.headers = {"X-Session-Token": self.session["session_token"]}

    def send(self, text="친구 관계가 힘들어요", request_id="test-turn-0001", retry=False):
        return self.client.post(self.path + "/messages", headers=self.headers,
            json={"text": text, "request_id": request_id, "retry_failed": retry})

    def test_full_lifecycle(self):
        self.assertEqual(self.client.get("/").status_code, 200)
        self.assertEqual(self.client.get("/openapi.json").status_code, 200)
        results = self.send().json()["results"]
        self.assertEqual(set(results), {"quality", "economy"})
        self.assertTrue(all(r["status"] == "ok" for r in results.values()))
        summary = self.client.post(self.path + "/finish", headers=self.headers).json()
        self.assertEqual(summary["teacher_delivery"], "preview_only")
        preview = self.client.post(self.path + "/handoff-preview", headers=self.headers,
            json={"variant": "quality", "teacher": "가상 상담 선생님", "summary": "확인한 요약", "consent": True})
        self.assertFalse(preview.json()["sent"])
        self.assertEqual(self.send().status_code, 409)
        self.assertEqual(self.client.delete(self.path, headers=self.headers).status_code, 200)
        self.assertEqual(self.send().status_code, 404)

    def test_models_and_history_are_separate(self):
        self.send()
        self.send("내일 어떻게 말하면 좋을까요?", "test-turn-0002")
        chat = [json.loads(call.content) for call in self.calls]
        self.assertEqual([c["model"] for c in chat], ["claude-opus-5-5", "gpt-6-luna"] * 2)
        self.assertEqual(len(chat[0]["messages"]), 2)
        self.assertEqual(len(chat[2]["messages"]), 4)
        self.assertEqual(chat[2]["messages"][-1]["content"], "내일 어떻게 말하면 좋을까요?")

    def test_idempotency_and_conflict(self):
        first = self.send().json()
        self.assertEqual(self.send().json(), first)
        self.assertEqual(len(self.calls), 2)
        self.assertEqual(self.send("다른 발언").status_code, 409)

    def test_retry_only_failed_model(self):
        self.failure = "economy"
        first = self.send().json()["results"]
        self.assertEqual(first["quality"]["status"], "ok")
        self.assertEqual(first["economy"]["status"], "error")
        self.failure = None
        retried = self.send(retry=True).json()["results"]
        self.assertEqual(retried["economy"]["status"], "ok")
        self.assertEqual(len(self.calls), 3)
        self.assertEqual(len(json.loads(self.calls[-1].content)["messages"]), 2)

    def test_session_auth_and_isolation(self):
        self.assertEqual(self.client.post(self.path + "/finish").status_code, 404)
        self.send()
        old = self.headers
        self.new_session()
        self.assertEqual(self.client.post(self.path + "/finish", headers=old).status_code, 404)
        self.send()
        self.assertEqual(len(json.loads(self.calls[-1].content)["messages"]), 2)

    def test_expiry(self):
        session = self.app.state.counsel.sessions[self.session["session_id"]]
        session.touched = time.monotonic() - 1801
        self.assertEqual(self.send().status_code, 404)
        self.assertTrue(session.deleted)

    def test_external_errors_do_not_leak(self):
        for index, status in enumerate([401, 403, 402, 429, 500, 307, "timeout"]):
            with self.subTest(status=status):
                self.failure = status
                response = self.send(request_id=f"error-turn-{index:04d}")
                self.assertNotIn("test-secret-key", response.text)
                self.assertNotIn("private transcript", response.text)
                self.assertTrue(all(r["status"] == "error" for r in response.json()["results"].values()))

    def test_invalid_json_and_fabricated_evidence(self):
        self.invalid = True
        self.assertTrue(all(r["status"] == "error" for r in self.send().json()["results"].values()))
        self.invalid, self.fake_evidence = False, True
        self.assertTrue(all(r["status"] == "error" for r in self.send(request_id="test-turn-0002").json()["results"].values()))

    def test_peak_risk_survives_later_normal_turn(self):
        self.urgent = True
        self.send()
        self.urgent = False
        self.send(request_id="test-turn-0002")
        summary = self.client.post(self.path + "/finish", headers=self.headers).json()
        self.assertEqual(summary["results"]["quality"]["highest_referral"], "urgent")

    def test_stt_async_and_audio_not_retained(self):
        result = self.client.post(self.path + "/transcriptions", content=wav_bytes(), headers=self.headers).json()
        self.assertEqual(result["status"], "processing")
        job = result["job_id"]
        result = self.client.get(self.path + "/transcriptions/" + job, headers=self.headers).json()
        self.assertEqual(result["text"], "친구 관계가 힘들어요")
        session = self.app.state.counsel.sessions[self.session["session_id"]]
        self.assertNotIn("audio", session.jobs[job])
        count = len(self.calls)
        self.client.get(self.path + "/transcriptions/" + job, headers=self.headers)
        self.assertEqual(len(self.calls), count)

    def test_stt_poll_failure_and_bad_audio(self):
        self.assertEqual(self.client.post(self.path + "/transcriptions", content=b"webm", headers=self.headers).status_code, 422)
        result = self.client.post(self.path + "/transcriptions", content=wav_bytes(), headers=self.headers).json()
        self.failure = 502
        response = self.client.get(self.path + "/transcriptions/" + result["job_id"], headers=self.headers)
        self.assertEqual(response.status_code, 502)
        self.assertNotIn("test-secret-key", response.text)

    def test_tts_pcm_wrapped_and_cached(self):
        self.send()
        response = self.client.post(self.path + "/speech", headers=self.headers,
            json={"variant": "quality", "request_id": "test-turn-0001"})
        self.assertEqual(response.status_code, 200)
        with wave.open(io.BytesIO(response.content), "rb") as audio:
            self.assertEqual(audio.getframerate(), 24000)
        count = len(self.calls)
        self.client.post(self.path + "/speech", headers=self.headers,
            json={"variant": "quality", "request_id": "test-turn-0001"})
        self.assertEqual(len(self.calls), count)

    def test_input_and_cross_origin_protection(self):
        self.assertEqual(self.send(" ").status_code, 422)
        response = self.send("sensitive-body" * 1000)
        self.assertEqual(response.status_code, 422)
        self.assertNotIn("sensitive-body", response.text)
        self.assertEqual(self.client.post(self.path + "/finish", headers={**self.headers, "Origin": "https://example.com"}).status_code, 403)
        self.assertEqual(self.client.get("/", headers={"Host": "evil.example"}).status_code, 400)

    def test_key_not_exposed_and_setting_saved(self):
        response = self.client.get("/api/local/settings")
        self.assertNotIn("test-secret-key", response.text)
        with patch("app.main.set_key") as write:
            response = self.client.post("/api/local/settings", json={"api_key": "new-test-secret",
                "quality_model": "claude-opus-5-5", "economy_model": "gpt-6-luna",
                "stt_model": "stt-async-v5", "tts_model": "gemini-3.8-flash-tts"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(write.call_count, 5)
        self.assertNotIn("new-test-secret", response.text)

    def test_mock_never_calls_external_service(self):
        self.new_session("mock")
        result = self.send().json()
        self.assertTrue(all(r["mode"] == "mock" for r in result["results"].values()))
        self.assertEqual(len(self.calls), 0)

    def test_catalog_verification_distinguishes_listing_from_inference(self):
        response = self.client.post("/api/local/verify")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["catalog_verified"])
        self.assertFalse(body["inference_verified"])
        self.assertTrue(body["models"]["quality"]["listed"])
        self.assertFalse(body["models"]["stt"]["listed"])
        self.assertEqual(len(self.calls), 1)
        self.assertNotIn("test-secret-key", response.text)
        self.assertTrue(self.client.get("/api/local/settings").json()["catalog_check"]["catalog_verified"])

    def test_catalog_verification_failure_and_invalid_response(self):
        for status in (401, 403, 429, "timeout"):
            self.failure = status
            response = self.client.post("/api/local/verify")
            self.assertGreaterEqual(response.status_code, 400)
            self.assertNotIn("test-secret-key", response.text)
            self.assertIsNone(self.client.get("/api/local/settings").json()["catalog_check"])
        self.failure, self.bad_models = None, True
        self.assertEqual(self.client.post("/api/local/verify").status_code, 502)

    def test_base_url_credentials_are_rejected_without_reflection(self):
        response = self.client.post("/api/local/settings", json={"api_key": "private-key",
            "base_url": "https://user:private-password@example.com/v1/gateway",
            "quality_model": "claude-opus-5-5", "economy_model": "gpt-6-luna",
            "stt_model": "stt-async-v6", "tts_model": "gemini-3.8-flash-tts"})
        self.assertEqual(response.status_code, 422)
        self.assertNotIn("private-password", response.text)
        self.assertNotIn("private-key", response.text)

    def test_late_transcription_does_not_repopulate_finished_session(self):
        self.close_during_stt = True
        response = self.client.post(self.path + "/transcriptions", content=wav_bytes(), headers=self.headers)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.app.state.counsel.sessions[self.session["session_id"]].jobs, {})

    def test_claude_rejects_unsupported_schema_constraints(self):
        self.reject_claude_constraints = True
        result = self.send().json()["results"]
        self.assertEqual(result["quality"]["status"], "ok")
        self.assertEqual(result["economy"]["status"], "ok")
        payloads = {json.loads(call.content)["model"]: json.loads(call.content) for call in self.calls}
        claude = payloads["claude-opus-5-5"]
        self.assertGreater(claude.get("max_tokens", 0), 0)
        # 가성비형은 원래 지원하는 글자 수 제한을 유지해야 한다.
        economy_schema = payloads["gpt-6-luna"]["response_format"]["json_schema"]["schema"]
        self.assertEqual(economy_schema["properties"]["reply"]["maxLength"], 3000)

    def test_claude_response_limits_still_validated_on_server(self):
        self.oversized_quality_reply = True
        result = self.send().json()["results"]
        self.assertEqual(result["quality"]["status"], "error")
        self.assertEqual(result["economy"]["status"], "ok")

    def test_bad_request_diagnostics_do_not_reflect_provider_message(self):
        self.failure = 400
        self.bad_request_message = "response_format schema maxLength unsupported. private transcript test-secret-key"
        response = self.send()
        self.assertNotIn("private transcript", response.text)
        self.assertNotIn("test-secret-key", response.text)
        self.assertIn("스키마", response.json()["results"]["quality"]["error"])

    def test_bad_request_token_requirement_is_distinguished(self):
        self.failure = 400
        self.bad_request_message = "max_tokens is required. test-secret-key"
        response = self.send()
        self.assertNotIn("test-secret-key", response.text)
        self.assertIn("출력 토큰", response.json()["results"]["quality"]["error"])


if __name__ == "__main__":
    unittest.main()
