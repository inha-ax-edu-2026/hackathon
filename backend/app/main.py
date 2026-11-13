"""주제 확정 전 사용할 수 있는 로컬 AI API 서버."""

from contextlib import asynccontextmanager
from typing import Annotated

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, StringConstraints

from app.ai import AIService
from app.config import Settings


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
            application.state.ai = AIService(config, client)
            yield

    application = FastAPI(
        title="Edu 해커톤 백엔드",
        description="주제별 기능에서 재사용하는 AI 연결 기반입니다.",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(config.cors_origins),
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @application.get("/health", summary="서버 및 설정 상태 확인")
    async def health():
        return {
            "status": "ok",
            "ai_mode": config.mode,
            "baze_configured": not config.missing_settings,
            "missing_settings": config.missing_settings,
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
