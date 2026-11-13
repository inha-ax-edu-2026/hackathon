"""실행 중인 로컬 서버를 통해 현재 모드의 AI 연결을 확인한다."""

import argparse
import sys
from urllib.parse import urlsplit

import httpx


def main() -> int:
    parser = argparse.ArgumentParser(description="로컬 백엔드와 AI 연결 확인")
    parser.add_argument("--server", default="http://127.0.0.1:8000")
    arguments = parser.parse_args()
    url = urlsplit(arguments.server)
    if url.hostname not in {"127.0.0.1", "localhost", "::1"}:
        parser.error("--server에는 이 노트북에서 실행 중인 로컬 서버 주소를 입력하세요.")

    try:
        with httpx.Client(base_url=arguments.server, timeout=70) as client:
            health = client.get("/health")
            health.raise_for_status()
            state = health.json()
            print("서버 상태:", state["status"])
            print("AI 모드:", state["ai_mode"])
            print("필수 설정 입력 완료:", state["baze_configured"])
            if state["ai_mode"] == "baze" and not state["baze_configured"]:
                print("누락된 설정:", ", ".join(state["missing_settings"]))
                return 1
            result = client.post(
                "/api/ai/generate", json={"prompt": "연결 확인용입니다. 확인이라고 짧게 답하세요."}
            )
            if result.is_error:
                print("AI 호출 실패. HTTP 상태:", result.status_code)
                return 1
            body = result.json()
            print("응답 모드:", body["mode"])
            print("텍스트 응답 수신:", bool(body["text"].strip()))
            return 0
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        print("확인에 실패했습니다. 서버 실행 여부와 /health 응답을 확인하세요.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
