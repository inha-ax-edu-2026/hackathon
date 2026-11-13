"""실행 위치와 관계없이 backend/.env에서 설정을 읽는다."""

import math
import os
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
    chat_path: str = "/chat/completions"
    timeout_seconds: float = 60.0
    system_prompt: str = "사용자의 요청에 한국어로 명확하게 답하세요."
    cors_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )

    def __post_init__(self) -> None:
        if self.mode not in {"mock", "baze"}:
            raise ValueError("AI_MODE는 mock 또는 baze로 설정하세요.")
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

    @property
    def chat_url(self) -> str:
        return self.base_url.rstrip("/") + self.chat_path

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
            cors_origins=tuple(origin.strip() for origin in origins.split(",") if origin.strip()),
        )
