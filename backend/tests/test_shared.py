"""공개 프록시 뒤의 인증·설정 차단·출처·공유 DB 분리를 확인한다."""

import tempfile
import unittest
from dataclasses import replace
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.config import BACKEND_ROOT, Settings
from app.main import create_app


class SharedServerTests(unittest.TestCase):
    def setUp(self):
        root = BACKEND_ROOT / ".runtime"
        root.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=root)
        self.addCleanup(self.temp.cleanup)
        self.settings = Settings(
            shared_server_mode=True, public_base_url="https://team.trycloudflare.com",
            frontend_demo_enabled=True, frontend_ai_mode="mock", api_key="test-private-api-key",
            teacher_token="test-private-teacher-access", frontend_access_token="test-private-frontend-access",
            database_path=Path(self.temp.name) / "shared.sqlite3",
        )
        self.app = create_app(self.settings)

        @self.app.middleware("http")
        async def simulate_loopback_proxy(request, call_next):
            request.scope["client"] = ("127.0.0.1", 43210)
            return await call_next(request)

        self.context = TestClient(self.app, base_url="http://localhost")
        self.client = self.context.__enter__()
        self.addCleanup(self.context.__exit__, None, None, None)
        self.frontend = {"X-Frontend-Access": self.settings.frontend_access_token}
        self.teacher = {"X-Teacher-Key": self.settings.teacher_token}

    def test_shared_apis_work_without_access_keys(self):
        path = "/api/student/counsel/cases"
        self.assertEqual(self.client.get(path).status_code, 200)
        forged = {"X-Forwarded-For": "127.0.0.1", "X-Forwarded-Host": "localhost"}
        self.assertEqual(self.client.get(path, headers=forged).status_code, 200)
        self.assertEqual(self.client.get(path, headers=self.teacher).status_code, 200)
        self.assertEqual(self.client.get(path, headers=self.frontend).status_code, 200)
        self.assertEqual(self.client.get("/api/teacher/document-drafts").status_code, 200)
        self.assertEqual(self.client.get("/api/teacher/document-drafts", headers=self.teacher).status_code, 200)
        self.assertEqual(self.client.post("/api/demo/reset").status_code, 200)

    def test_local_settings_and_legacy_comparison_are_inaccessible_even_with_keys(self):
        for method, path in [("GET", "/api/local/settings"), ("POST", "/api/local/settings"),
            ("POST", "/api/local/verify"), ("POST", "/api/local/verify-quality"),
            ("POST", "/api/ai/generate"), ("POST", "/api/counsel/sessions")]:
            r = self.client.request(method, path, headers={**self.teacher, **self.frontend}, json={})
            self.assertEqual(r.status_code, 404, path)
        schema = self.client.get("/openapi.json").json()
        self.assertFalse(any(p.startswith(("/api/local/", "/api/counsel/")) for p in schema["paths"]))
        schemes = schema.get("components", {}).get("securitySchemes", {})
        self.assertNotIn("FrontendAccess", schemes)
        self.assertNotIn("TeacherAccess", schemes)
        self.assertIn("팀 API", self.client.get("/").text)

    def test_exact_https_origin_and_vercel_preflight_work_but_other_origin_fails(self):
        path = "/api/student/counsel/cases"
        body = {"form": {"topic": "가상 테스트", "answers": []}}
        for origin in [self.settings.public_base_url, "https://hackathon-tau-mocha.vercel.app"]:
            r = self.client.post(path, json=body, headers={**self.frontend, "Origin": origin})
            self.assertEqual(r.status_code, 201, r.text)
        r = self.client.post(path, json=body, headers={**self.frontend, "Origin": "https://other.example"})
        self.assertEqual(r.status_code, 403)
        r = self.client.options(path, headers={"Origin": "https://hackathon-tau-mocha.vercel.app",
            "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers["access-control-allow-origin"], "https://hackathon-tau-mocha.vercel.app")

    def test_public_metadata_never_contains_private_keys(self):
        for path in ["/", "/health", "/openapi.json"]:
            r = self.client.get(path)
            for secret in [self.settings.api_key, self.settings.teacher_token, self.settings.frontend_access_token]:
                self.assertNotIn(secret, r.text)

    def test_shared_configuration_fails_closed(self):
        for changed in [{"public_base_url": ""},
            {"public_base_url": "http://team.example"}, {"public_base_url": "https://team.example/path"},
            {"frontend_demo_enabled": False}, {"frontend_ai_mode": "baze", "api_key": ""}]:
            with self.subTest(changed=changed), self.assertRaises(ValueError):
                replace(self.settings, **changed)

    def test_factory_rejects_private_database_and_has_separate_default(self):
        from app.shared import create_shared_app
        values = {"PUBLIC_BASE_URL": self.settings.public_base_url,
            "FRONTEND_ACCESS_TOKEN": self.settings.frontend_access_token,
            "TEACHER_ACCESS_TOKEN": self.settings.teacher_token, "FRONTEND_AI_MODE": "mock"}
        with patch("app.shared.dotenv_values", return_value={}), patch.dict("os.environ", values, clear=True):
            application = create_shared_app()
            self.assertEqual(application.state.settings.database_path, BACKEND_ROOT / "data/shared.sqlite3")
            with patch.dict("os.environ", {"COUNSEL_DATABASE_PATH": "data/safepath.sqlite3"}):
                with self.assertRaises(ValueError):
                    create_shared_app()
