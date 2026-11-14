"""공유 서버 전용 앱 팩터리. 로컬 비교실과 DB를 분리한다."""

import os
from dataclasses import replace
from urllib.parse import urlsplit

from dotenv import dotenv_values

from app.config import BACKEND_ROOT, Settings
from app.main import create_app


def create_shared_app():
    # 기본 .env는 API 연결 설정만 재사용한다. 공유 서버의 주소·DB는 별도 관리한다.
    values = {**dotenv_values(BACKEND_ROOT / ".env.shared", encoding="utf-8-sig"), **os.environ}
    public_url = (values.get("PUBLIC_BASE_URL") or values.get("RENDER_EXTERNAL_URL") or "").rstrip("/")
    settings = replace(
        Settings.from_env(),
        shared_server_mode=True,
        public_base_url=public_url,
        frontend_demo_enabled=True,
        frontend_ai_mode=values.get("FRONTEND_AI_MODE") or "baze",
        database_path=BACKEND_ROOT / (values.get("COUNSEL_DATABASE_PATH") or "data/shared.sqlite3"),
        allowed_hosts=("127.0.0.1", "localhost", "[::1]", urlsplit(public_url).hostname or "localhost"),
    )
    if settings.database_path.resolve() == (BACKEND_ROOT / "data/safepath.sqlite3").resolve():
        raise ValueError("공유 서버에는 로컬 상담과 분리된 DB 경로를 사용하세요.")
    return create_app(settings)
