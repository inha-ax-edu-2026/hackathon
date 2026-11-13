"""BAZE 공식 게이트웨이: 채팅, 비동기 전사, PCM 음성 합성."""

import io
import math
import wave
from copy import deepcopy
from urllib.parse import quote

import httpx
from fastapi import HTTPException

from app.config import Settings


def claude_output_schema(schema: dict) -> dict:
    """Claude가 받지 않는 제약은 설명으로 옮기고 원래 스키마는 서버 검증에 유지한다.

    직접 HTTP를 사용하므로 Anthropic SDK의 스키마 변환에 해당하는 부분을 처리한다.
    properties/$defs의 필드 이름을 스키마 키워드와 혼동하지 않도록 노드별로 순회한다.
    """
    result = deepcopy(schema)
    unsupported = {"minLength", "maxLength", "maxItems", "uniqueItems", "minimum",
        "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf"}

    def visit(node):
        if not isinstance(node, dict):
            return
        constraints = []
        for key in sorted(unsupported):
            if key in node:
                constraints.append(f"{key}={node.pop(key)}")
        if "minItems" in node and node["minItems"] not in (0, 1):
            constraints.append(f"minItems={node.pop('minItems')}")
        if constraints:
            note = "응답은 다음 조건도 충족해야 합니다(서버에서 검증): " + ", ".join(constraints)
            node["description"] = (node.get("description", "") + " " + note).strip()
        for mapping in ("properties", "$defs", "definitions", "patternProperties"):
            if isinstance(node.get(mapping), dict):
                for child in node[mapping].values():
                    visit(child)
        for key in ("items", "not", "if", "then", "else", "additionalProperties"):
            visit(node.get(key))
        for key in ("anyOf", "allOf", "oneOf", "prefixItems"):
            if isinstance(node.get(key), list):
                for child in node[key]:
                    visit(child)

    visit(result)
    return result


def bad_request_detail(response: httpx.Response) -> str:
    """외부 오류 원문 대신 알려진 오류 범주만 반환한다. 키·상담 문장은 반사하지 않는다."""
    try:
        body = response.json()
    except ValueError:
        body = {}
    fields = []
    if isinstance(body, dict):
        error = body.get("error")
        for value in (body.get("detail"), body.get("message"), error):
            if isinstance(value, str):
                fields.append(value)
        if isinstance(error, dict):
            fields.extend(error[key] for key in ("message", "param", "code") if isinstance(error.get(key), str))
    text = " ".join(fields).lower()
    if any(marker in text for marker in ("response_format", "output_config", "json_schema", "schema", "minlength", "maxlength", "maxitems")):
        return "BAZE가 JSON 응답 스키마 옵션을 거절했습니다(HTTP 400). 모델별 구조화된 출력 호환성을 확인하세요."
    if "max_tokens" in text or "max_completion_tokens" in text:
        return "BAZE가 출력 토큰 설정을 거절했습니다(HTTP 400). 모델의 필수 토큰 설정과 허용 범위를 확인하세요."
    return "BAZE가 요청 형식 또는 옵션을 거절했습니다(HTTP 400). API 경로와 모델별 지원 옵션을 확인하세요."


def metrics(body: dict, response: httpx.Response) -> dict:
    """공급사 본문 전체 대신 숫자 사용량만 노출한다."""
    usage = body.get("usage")
    result = {}
    if isinstance(usage, dict):
        for key in ("prompt_tokens", "completion_tokens", "total_tokens"):
            value = usage.get(key)
            if isinstance(value, (int, float)) and math.isfinite(value) and value >= 0:
                result[key] = value
    credit = response.headers.get("x-credits-charged", body.get("credits_charged"))
    try:
        number = float(credit)
        if math.isfinite(number) and number >= 0:
            result["credits_charged"] = number
    except (ValueError, TypeError):
        pass
    return result


def json_body(response: httpx.Response) -> dict:
    try:
        body = response.json()
        if isinstance(body, dict):
            return body
    except ValueError:
        pass
    raise HTTPException(502, "BAZE 응답 형식이 예상과 다릅니다.")


class Gateway:
    def __init__(self, settings: Settings, client: httpx.AsyncClient):
        self.settings, self.client = settings, client

    async def request(self, method: str, path: str, **kwargs) -> httpx.Response:
        if not self.settings.api_key:
            raise HTTPException(503, "API 키가 없습니다. 화면의 API 설정에서 입력하세요.")
        try:
            response = await self.client.request(
                method,
                self.settings.base_url.rstrip("/") + "/" + path.lstrip("/"),
                headers={"Authorization": "Bearer " + self.settings.api_key},
                **kwargs,
            )
        except httpx.TimeoutException:
            raise HTTPException(504, "BAZE 응답 대기 시간이 초과됐습니다. 재시도 시 중복 과금될 수 있습니다.") from None
        except httpx.RequestError:
            raise HTTPException(502, "BAZE 서버에 연결하지 못했습니다. API 기본 주소·인터넷 연결·실행 환경의 네트워크 권한을 확인하세요.") from None
        if response.status_code in {401, 403}:
            raise HTTPException(502, "BAZE API 키 또는 모델 접근 권한을 확인하세요.")
        if response.status_code == 402:
            raise HTTPException(503, "BAZE 크레딧이 부족합니다.")
        if response.status_code == 429:
            raise HTTPException(503, "BAZE 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.")
        if response.status_code == 400:
            raise HTTPException(502, bad_request_detail(response))
        if not response.is_success:
            raise HTTPException(502, f"BAZE 호출 실패(HTTP {response.status_code}). 모델과 API 설정을 확인하세요.")
        return response

    async def verify_models(self) -> dict:
        response = await self.request("GET", "models/")
        data = json_body(response).get("data")
        if not isinstance(data, list) or any(not isinstance(item, dict) or not isinstance(item.get("id"), str) for item in data):
            raise HTTPException(502, "BAZE 모델 목록 형식이 예상과 다릅니다. API 기본 주소를 확인하세요.")
        identifiers = {item["id"] for item in data}
        selected = {"quality": self.settings.quality_model, "economy": self.settings.economy_model,
            "stt": self.settings.stt_model, "tts": self.settings.tts_model}
        return {"catalog_verified": True, "model_count": len(identifiers),
            "models": {role: {"id": model, "listed": model in identifiers} for role, model in selected.items()},
            "inference_verified": False,
            "message": "키 인증과 모델 목록 조회를 확인했습니다. 실제 상담·STT·TTS 생성은 별도로 테스트하세요."}

    async def chat(self, model: str, messages: list[dict], schema: dict) -> tuple[str, dict]:
        is_claude = model.rsplit("/", 1)[-1].startswith("claude-")
        payload = {
            "model": model, "messages": messages, "stream": False,
            "response_format": {"type": "json_schema", "json_schema": {
                "name": "counsel_turn", "strict": True,
                "schema": claude_output_schema(schema) if is_claude else schema,
            }},
        }
        if is_claude:
            payload["max_tokens"] = 8192
        response = await self.request("POST", self.settings.chat_path.rstrip("/") + "/", json=payload)
        body = json_body(response)
        try:
            content = body["choices"][0]["message"]["content"]
            if isinstance(content, str) and content.strip():
                return content, metrics(body, response)
        except (KeyError, TypeError, IndexError):
            pass
        raise HTTPException(502, "상담 모델에서 텍스트 응답을 받지 못했습니다.")

    async def start_stt(self, audio: bytes) -> tuple[dict, dict]:
        response = await self.request("POST", "audio/transcriptions/", data={
            "model": self.settings.stt_model, "language_hints": "ko",
            "enable_speaker_diarization": "false",
        }, files={"file": ("recording.wav", audio, "audio/wav")})
        body = json_body(response)
        return body, metrics(body, response)

    async def poll_stt(self, operation: str) -> dict:
        response = await self.request("GET", "audio/transcriptions/" + quote(operation, safe="") + "/")
        return json_body(response)

    async def speech(self, text: str) -> tuple[bytes, dict]:
        payload = {"model": self.settings.tts_model, "input": text, "voice": self.settings.tts_voice}
        if self.settings.tts_model == "gemini-3.8-flash-tts":
            payload["instructions"] = "한국어로 따뜻하고 차분하게, 학생이 듣기 편한 속도로 읽어 주세요."
        response = await self.request("POST", "audio/speech/", json=payload)
        mime = response.headers.get("content-type", "").split(";")[0].lower()
        raw = response.content
        if not raw or len(raw) > 24_000 * 2 * 180:
            raise HTTPException(502, "음성 응답이 비어 있거나 길이 제한을 초과했습니다.")
        if mime in {"audio/wav", "audio/x-wav", "audio/wave"} and raw[:4] == b"RIFF":
            return raw, metrics({}, response)
        if mime not in {"audio/pcm", "audio/l16", "application/octet-stream"} or len(raw) % 2:
            raise HTTPException(502, "BAZE 음성 응답 형식을 확인하세요. 24kHz PCM 또는 WAV가 필요합니다.")
        out = io.BytesIO()
        with wave.open(out, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(24000)
            wav.writeframes(raw)
        return out.getvalue(), metrics({}, response)
