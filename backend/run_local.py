"""더블클릭 실행기의 진입점. 서버·브라우저 시작 및 시작 실패 진단."""

import argparse
import importlib.util
import json
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def status(url):
    try:
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(url + "health", timeout=1) as response:
            body = json.load(response)
        if not isinstance(body, dict) or body.get("status") != "ok" or "counsel_key_configured" not in body:
            return 0
        return 2 if body.get("counsel_contract") == "archive-report-v1" else 1
    except (OSError, ValueError, urllib.error.URLError):
        return 0


def stop(child):
    if child.poll() is None:
        child.terminate()
        try:
            child.wait(timeout=5)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait(timeout=3)


def main():
    parser = argparse.ArgumentParser(description="SAFE-PATH 로컬 비교실 시작")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("포트는 1024~65535 범위로 입력하세요.")
    missing = [name for name in ("fastapi", "uvicorn", "httpx", "dotenv", "pydantic") if importlib.util.find_spec(name) is None]
    if missing:
        print("필요한 패키지가 없습니다: " + ", ".join(missing))
        print("backend 폴더에서 python -m pip install -r requirements.txt 를 실행하세요.")
        return 1

    # asyncio의 Windows 내부 TCP socketpair가 멈추기 전에 환경 제한을 확인한다.
    try:
        with socket.socket() as listener:
            listener.settimeout(2)
            listener.bind(("127.0.0.1", 0))
            listener.listen(1)
            with socket.create_connection(listener.getsockname(), timeout=2):
                connection, _ = listener.accept()
                connection.close()
    except OSError as exc:
        print("로컬 네트워크를 열지 못했습니다. Windows 또는 실행 환경의 네트워크 권한을 확인하세요.")
        print("이 실행기를 일반 PowerShell에서 실행해 주세요. 보안 설정을 자동 변경하지 않습니다.")
        print("오류 번호:", getattr(exc, "winerror", None) or exc.errno)
        return 1

    url = f"http://127.0.0.1:{args.port}/"
    running = status(url)
    if running == 1:
        print("이전 버전의 SAFE-PATH 서버가 실행 중입니다. 해당 서버 창에서 Ctrl+C로 종료한 뒤 다시 실행하세요.")
        print("새 교사 확인함과 기록 저장 기능은 서버를 재시작해야 적용됩니다.")
        return 1
    if running == 2:
        print("이미 실행 중인 SAFE-PATH 서버:", url)
        if not args.no_browser:
            webbrowser.open(url)
        return 0
    try:
        from app.config import Settings
        settings = Settings.from_env()
    except (ValueError, OSError):
        print("backend/.env의 설정 형식을 확인하세요. 키는 이 창에 표시하지 않습니다.")
        return 1
    print("고품질형:", settings.quality_model)
    print("가성비형:", settings.economy_model)
    print("API 키:", "설정됨 (인증은 화면에서 연결 확인)" if settings.api_key else "미설정 (화면의 API 설정에서 입력)")
    child = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1",
        "--port", str(args.port), "--no-access-log"], cwd=ROOT)
    try:
        deadline = time.monotonic() + 20
        while time.monotonic() < deadline:
            if child.poll() is not None:
                print("서버 시작에 실패했습니다. 위 오류와 포트 사용 여부를 확인하세요.")
                return 1
            if status(url) == 2:
                print("비교 화면:", url)
                print("교사 확인함:", url + "teacher")
                print("교사 접근키: backend/.env의 TEACHER_ACCESS_TOKEN 값 (브라우저에서 입력)")
                print("이 창을 유지하세요. 서버 종료: Ctrl+C")
                if not args.no_browser:
                    webbrowser.open(url)
                return child.wait()
            time.sleep(0.3)
        print("서버 시작 대기 시간을 초과했습니다. 위 오류를 확인하세요.")
        return 1
    except KeyboardInterrupt:
        print("\nSAFE-PATH 서버를 종료합니다.")
        return 0
    finally:
        stop(child)


if __name__ == "__main__":
    sys.exit(main())
