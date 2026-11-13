"""실행 위치와 관계없이 backend/.env에서 설정을 읽는다."""

import math
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import dotenv_values


BACKEND_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    mode: str = "mock"
    base_url: str = "https://api.baze.co/v1/gateway"
    api_key: str = field(default="", repr=False)
    model: str = ""
    chat_path: str = "/chat/completions/"
    timeout_seconds: float = 60.0
    system_prompt: str = "사용자의 요청에 한국어로 명확하게 답하세요."
    quality_model: str = "claude-opus-5-5"
    economy_model: str = "gpt-6-luna"
    stt_model: str = "stt-async-v6"
    tts_model: str = "gemini-3.8-flash-tts"
    tts_voice: str = "Sulafat"
    teacher_token: str = field(default="", repr=False)
    database_path: Path = BACKEND_ROOT / "data" / "safepath.sqlite3"
    risk_threshold: int = 3
    frontend_demo_enabled: bool = False
    frontend_ai_mode: str = "mock"
    frontend_access_token: str = field(default="", repr=False)
    shared_server_mode: bool = False
    public_base_url: str = ""
    allowed_hosts: tuple[str, ...] = ("127.0.0.1", "localhost", "[::1]")
    cors_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )

    def __post_init__(self) -> None:
        if self.mode not in {"mock", "baze"}:
            raise ValueError("AI_MODE는 mock 또는 baze로 설정하세요.")
        if self.frontend_ai_mode not in {"mock", "baze"}:
            raise ValueError("FRONTEND_AI_MODE는 mock 또는 baze로 설정하세요.")
        if self.frontend_access_token and len(self.frontend_access_token) < 24:
            raise ValueError("FRONTEND_ACCESS_TOKEN은 24자 이상이어야 합니다.")
        if self.public_base_url:
            public = urlsplit(self.public_base_url)
            if (public.scheme != "https" or not public.hostname or public.username or public.password
                    or public.port not in {None, 443} or public.path not in {"", "/"} or public.query or public.fragment):
                raise ValueError("PUBLIC_BASE_URL에는 경로 없는 HTTPS 서버 주소를 입력하세요.")
        if self.shared_server_mode:
            if not self.public_base_url or not self.frontend_demo_enabled:
                raise ValueError("공유 서버에는 PUBLIC_BASE_URL과 FRONTEND_DEMO_ENABLED=true가 필요합니다.")
            if not self.frontend_access_token or not self.teacher_token:
                raise ValueError("공유 서버에는 프론트 연동키와 교사 접속키가 모두 필요합니다.")
            if self.frontend_ai_mode == "baze" and not self.api_key:
                raise ValueError("실제 고성능 모델 공유 서버에는 BAZE_API_KEY가 필요합니다.")
        parsed = urlsplit(self.base_url)
        if (
            parsed.scheme not in {"https", "http"}
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError("BAZE_BASE_URL에는 API 기본 주소를 입력하세요.")
        if not self.chat_path.startswith("/") or self.chat_path.startswith("//"):
            raise ValueError("BAZE_CHAT_PATH는 /로 시작하는 API 경로여야 합니다.")
        if not math.isfinite(self.timeout_seconds) or self.timeout_seconds <= 0:
            raise ValueError("BAZE_TIMEOUT_SECONDS는 양수여야 합니다.")
        if self.risk_threshold != 3:
            raise ValueError("현재 교사 보고 기준은 서로 다른 위험 발언 3회입니다.")
        if self.teacher_token and len(self.teacher_token) < 16:
            raise ValueError("TEACHER_ACCESS_TOKEN은 16자 이상이어야 합니다.")
        if not self.allowed_hosts or any(not re.fullmatch(r"[a-zA-Z0-9.\[\]:-]+", host) for host in self.allowed_hosts):
            raise ValueError("ALLOWED_HOSTS에는 접속할 호스트 이름만 쉼표로 구분해 입력하세요.")
        if not Path(self.database_path).resolve().is_relative_to(BACKEND_ROOT.resolve()):
            raise ValueError("상담 데이터베이스는 backend 폴더 안에 두세요.")

    @property
    def chat_url(self) -> str:
        return self.base_url.rstrip("/") + self.chat_path.rstrip("/") + "/"

    @property
    def missing_settings(self) -> list[str]:
        return [
            name
            for name, value in (
                ("BAZE_API_KEY", self.api_key),
                ("BAZE_MODEL", self.model),
            )
            if not value.strip()
        ]

    @classmethod
    def from_env(cls, env_file: Path = BACKEND_ROOT / ".env") -> "Settings":
        values = {**dotenv_values(env_file, encoding="utf-8-sig"), **os.environ}
        defaults = cls()

        def read(name: str, default: str = "") -> str:
            value = values.get(name)
            return value.strip() if isinstance(value, str) and value.strip() else default

        try:
            timeout = float(read("BAZE_TIMEOUT_SECONDS", str(defaults.timeout_seconds)))
        except ValueError:
            raise ValueError("BAZE_TIMEOUT_SECONDS에는 숫자를 입력하세요.") from None

        origins = read("CORS_ORIGINS", ",".join(defaults.cors_origins))
        return cls(
            mode=read("AI_MODE", defaults.mode),
            base_url=read("BAZE_BASE_URL", defaults.base_url),
            api_key=read("BAZE_API_KEY"),
            model=read("BAZE_MODEL"),
            chat_path=read("BAZE_CHAT_PATH", defaults.chat_path),
            timeout_seconds=timeout,
            system_prompt=read("AI_SYSTEM_PROMPT", defaults.system_prompt),
            quality_model=read("BAZE_QUALITY_MODEL", defaults.quality_model),
            economy_model=read("BAZE_ECONOMY_MODEL", defaults.economy_model),
            stt_model=read("BAZE_STT_MODEL", defaults.stt_model),
            tts_model=read("BAZE_TTS_MODEL", defaults.tts_model),
            tts_voice=read("BAZE_TTS_VOICE", defaults.tts_voice),
            teacher_token=read("TEACHER_ACCESS_TOKEN"),
            frontend_demo_enabled=read("FRONTEND_DEMO_ENABLED", "false").lower() == "true",
            frontend_ai_mode=read("FRONTEND_AI_MODE", "mock"),
            frontend_access_token=read("FRONTEND_ACCESS_TOKEN"),
            shared_server_mode=read("SHARED_SERVER_MODE", "false").lower() == "true",
            public_base_url=read("PUBLIC_BASE_URL").rstrip("/"),
            allowed_hosts=tuple(h.strip() for h in read("ALLOWED_HOSTS", ",".join(defaults.allowed_hosts)).split(",") if h.strip()),
            database_path=BACKEND_ROOT / read("COUNSEL_DATABASE_PATH", "data/safepath.sqlite3"),
            cors_origins=tuple(origin.strip() for origin in origins.split(",") if origin.strip()),
        )
