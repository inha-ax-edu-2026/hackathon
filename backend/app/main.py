"""SAFE-PATH 녹음형 비교 화면과 로컬 API 서버."""

import asyncio
import os
from contextlib import asynccontextmanager, suppress
from dataclasses import replace
from pathlib import Path
from typing import Annotated
from urllib.parse import urlsplit

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware
from dotenv import set_key
from pydantic import BaseModel, ConfigDict, SecretStr, StringConstraints, field_validator

from app.ai import AIService
from app.config import BACKEND_ROOT, Settings
from app.counsel import Counsel, router as counsel_router
from app.gateway import Gateway

STATIC_ROOT = Path(__file__).parent / "static"


class LocalSettingsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    api_key: SecretStr | None = None
    base_url: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] | None = None
    quality_model: Annotated[str, StringConstraints(pattern=r"^[a-zA-Z0-9_./-]{1,128}$")]
    economy_model: Annotated[str, StringConstraints(pattern=r"^[a-zA-Z0-9_./-]{1,128}$")]
    stt_model: Annotated[str, StringConstraints(pattern=r"^[a-zA-Z0-9_./-]{1,128}$")]
    tts_model: Annotated[str, StringConstraints(pattern=r"^[a-zA-Z0-9_./-]{1,128}$")]

    @field_validator("base_url")
    @classmethod
    def valid_base_url(cls, value):
        if value is not None:
            Settings(base_url=value)
        return value


class GenerateRequest(BaseModel):
    prompt: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20000)]


class GenerateResponse(BaseModel):
    mode: str
    model: str
    text: str


def create_app(
    settings: Settings | None = None,
    transport: httpx.AsyncBaseTransport | None = None,
) -> FastAPI:
    config = settings if settings is not None else Settings.from_env()

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        async with httpx.AsyncClient(
            timeout=config.timeout_seconds,
            follow_redirects=False,
            transport=transport,
        ) as client:
            application.state.client = client
            application.state.ai = AIService(config, client)
            async def reap():
                while True:
                    await asyncio.sleep(60)
                    application.state.counsel.cleanup()
            cleanup_task = asyncio.create_task(reap())
            try:
                yield
            finally:
                cleanup_task.cancel()
                with suppress(asyncio.CancelledError):
                    await cleanup_task
                for sid in list(application.state.counsel.sessions):
                    application.state.counsel.remove(sid)

    application = FastAPI(
        title="SAFE-PATH 녹음형 상담 비교",
        description="고품질형과 가성비형의 익명 AI 사전 상담을 비교합니다.",
        lifespan=lifespan,
    )
    application.state.settings = config
    application.state.counsel = Counsel()
    application.state.catalog_check = None
    application.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "[::1]"])
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(config.cors_origins),
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Content-Type", "X-Session-Token"],
    )

    @application.middleware("http")
    async def local_headers(request: Request, call_next):
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            origin = request.headers.get("origin")
            if origin:
                parsed = urlsplit(origin)
                if parsed.netloc != request.headers.get("host") or parsed.scheme != request.url.scheme:
                    return JSONResponse({"detail": "같은 로컬 서버 화면에서 요청하세요."}, status_code=403)
            if request.headers.get("sec-fetch-site") == "cross-site":
                return JSONResponse({"detail": "외부 사이트의 요청을 허용하지 않습니다."}, status_code=403)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "microphone=(self), camera=()"
        if request.url.path == "/" or request.url.path.startswith("/static/"):
            response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; media-src 'self' blob:; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
        return response

    @application.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        # Pydantic 기본 응답의 input에 키·상담 본문이 반사되지 않도록 한다.
        return JSONResponse({"detail": "입력 형식 또는 길이가 올바르지 않습니다.",
            "fields": [".".join(str(p) for p in error["loc"]) for error in exc.errors()]}, status_code=422)

    application.include_router(counsel_router)
    application.mount("/static", StaticFiles(directory=STATIC_ROOT), name="static")

    @application.get("/", include_in_schema=False)
    async def index():
        return FileResponse(STATIC_ROOT / "index.html")

    @application.get("/api/local/settings", summary="API 키 존재 여부·모델 설정 (키 반환 없음)")
    async def local_settings():
        cfg = application.state.settings
        return {"api_key_present": bool(cfg.api_key), "default_mode": cfg.mode,
            "quality_model": cfg.quality_model, "economy_model": cfg.economy_model,
            "stt_model": cfg.stt_model, "tts_model": cfg.tts_model, "tts_voice": cfg.tts_voice,
            "base_url": cfg.base_url, "real_api_verified": False,
            "catalog_check": application.state.catalog_check}

    @application.post("/api/local/settings", summary="이 PC의 .env에 API 키·모델 저장")
    async def save_local_settings(body: LocalSettingsRequest, request: Request):
        if not request.client or request.client.host not in {"127.0.0.1", "::1"}:
            raise HTTPException(403, "API 설정은 이 PC에서만 변경할 수 있습니다.")
        cfg = application.state.settings
        changes = body.model_dump(exclude={"api_key"}, exclude_none=True)
        if body.api_key is not None:
            key = body.api_key.get_secret_value().strip()
            if key:
                if len(key) > 4096 or any(ord(c) < 33 or ord(c) > 126 for c in key):
                    raise HTTPException(422, "API 키 형식을 확인하세요.")
                changes["api_key"] = key
        if "BAZE_API_KEY" in os.environ and "api_key" in changes:
            raise HTTPException(409, "시스템 BAZE_API_KEY가 설정돼 있습니다. 실행 환경변수를 수정한 뒤 재시작하세요.")
        new = replace(cfg, **changes)
        names = {"api_key": "BAZE_API_KEY", "base_url": "BAZE_BASE_URL", "quality_model": "BAZE_QUALITY_MODEL",
            "economy_model": "BAZE_ECONOMY_MODEL", "stt_model": "BAZE_STT_MODEL", "tts_model": "BAZE_TTS_MODEL"}
        try:
            for name, value in changes.items():
                set_key(str(BACKEND_ROOT / ".env"), names[name], value, quote_mode="always")
        except OSError:
            raise HTTPException(500, "설정을 저장하지 못했습니다. backend/.env를 직접 확인하세요.") from None
        application.state.settings = new
        application.state.ai.settings = new
        application.state.catalog_check = None
        return {"saved": True, "api_key_present": bool(new.api_key), "applies_to": "new_sessions"}

    @application.post("/api/local/verify", summary="저장된 키로 BAZE 모델 목록·프리셋 확인 (상담 생성 없음)")
    async def verify_local_settings(request: Request):
        if not request.client or request.client.host not in {"127.0.0.1", "::1"}:
            raise HTTPException(403, "연결 확인은 이 PC에서만 할 수 있습니다.")
        cfg = application.state.settings
        application.state.catalog_check = None
        result = await Gateway(cfg, application.state.client).verify_models()
        # 확인 중 설정이 바뀌었다면 이전 키·주소에 대한 결과를 현재 상태로 표시하지 않는다.
        if application.state.settings is cfg:
            application.state.catalog_check = result
        return result

    @application.get("/health", summary="서버 및 설정 상태 확인")
    async def health():
        current = application.state.settings
        return {
            "status": "ok",
            "ai_mode": current.mode,
            "baze_configured": not current.missing_settings,
            "missing_settings": current.missing_settings,
            "counsel_key_configured": bool(current.api_key),
        }

    @application.post(
        "/api/ai/generate",
        response_model=GenerateResponse,
        summary="설정된 모델에 텍스트 요청 보내기",
    )
    async def generate(body: GenerateRequest):
        return await application.state.ai.generate(body.prompt)

    return application


app = create_app()
