"""모델 호출을 모아 주제별 기능에서도 같은 설정을 재사용한다."""

import httpx
from fastapi import HTTPException

from app.config import Settings


class AIService:
    def __init__(self, settings: Settings, client: httpx.AsyncClient) -> None:
        self.settings = settings
        self.client = client

    async def generate(self, prompt: str) -> dict[str, str]:
        if self.settings.mode == "mock":
            return {
                "mode": "mock",
                "model": "mock",
                "text": f"[모의 응답] 백엔드 연결이 정상입니다. {len(prompt)}자의 입력을 받았습니다.",
            }

        missing = self.settings.missing_settings
        if missing:
            raise HTTPException(
                status_code=503,
                detail="backend/.env에서 다음 설정을 입력하세요: " + ", ".join(missing),
            )

        # BAZE 문서 확인 전의 호환 형식 가정. URL 경로는 설정으로 변경한다.
        payload = {
            "model": self.settings.model,
            "messages": [
                {"role": "system", "content": self.settings.system_prompt},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
        }
        try:
            response = await self.client.post(
                self.settings.chat_url,
                headers={"Authorization": "Bearer " + self.settings.api_key},
                json=payload,
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="BAZE 응답 시간이 초과됐습니다.") from None
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="BAZE 서버에 연결하지 못했습니다.") from None

        if response.status_code in {401, 403}:
            raise HTTPException(
                status_code=502,
                detail="BAZE 인증 또는 모델 접근 권한을 확인하세요.",
            )
        if response.status_code == 429:
            raise HTTPException(
                status_code=503,
                detail="BAZE 사용 한도 또는 요청 횟수를 초과했습니다. 잠시 후 다시 시도하세요.",
            )
        if not response.is_success:
            raise HTTPException(
                status_code=502,
                detail=f"BAZE 호출에 실패했습니다(HTTP {response.status_code}). API 경로와 모델 설정을 확인하세요.",
            )

        try:
            content = response.json()["choices"][0]["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError):
            raise HTTPException(
                status_code=502,
                detail="BAZE 응답이 현재 어댑터의 Chat Completions 형식과 다릅니다.",
            ) from None
        if not isinstance(content, str) or not content.strip():
            raise HTTPException(status_code=502, detail="BAZE에서 텍스트 응답을 받지 못했습니다.")

        return {"mode": "baze", "model": self.settings.model, "text": content}
