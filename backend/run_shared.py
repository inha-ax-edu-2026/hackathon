"""별도 테스트 DB의 FastAPI와 임시 HTTPS 터널을 함께 실행한다."""

import argparse
import hashlib
import json
import os
import re
import secrets
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from dotenv import dotenv_values, set_key

ROOT = Path(__file__).resolve().parent
RUNTIME = ROOT / ".runtime" / "shared"
SHARED_ENV = ROOT / ".env.shared"
CLOUDFLARED_VERSION = "2026.11.0"
CLOUDFLARED_URL = f"https://github.com/cloudflare/cloudflared/releases/download/{CLOUDFLARED_VERSION}/cloudflared-windows-amd64.exe"
CLOUDFLARED_SHA256 = "d5c1d82031da6253dcdcff64c944cd0fe063016edeb2e4fd088075fc9bd52d0a"


def prepare():
    from app.config import Settings
    settings = Settings.from_env()
    if not settings.api_key:
        raise ValueError("backend/.env에 BAZE_API_KEY를 먼저 입력하세요.")
    RUNTIME.mkdir(parents=True, exist_ok=True)
    values = dict(dotenv_values(SHARED_ENV, encoding="utf-8-sig"))
    defaults = {
        "FRONTEND_ACCESS_TOKEN": secrets.token_urlsafe(32),
        "TEACHER_ACCESS_TOKEN": secrets.token_urlsafe(32),
        "COUNSEL_DATABASE_PATH": "data/shared.sqlite3",
        "FRONTEND_AI_MODE": "baze",
    }
    for name, default in defaults.items():
        if not values.get(name):
            set_key(str(SHARED_ENV), name, default, quote_mode="always")
            values[name] = default
    # 주소는 새 터널을 열 때마다 바뀐다. 이전 주소로 서버를 먼저 열지 않는다.
    from dataclasses import replace
    replace(settings, frontend_access_token=values["FRONTEND_ACCESS_TOKEN"], teacher_token=values["TEACHER_ACCESS_TOKEN"])
    return values


def checksum(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def install_tunnel():
    if sys.platform != "win32":
        raise ValueError("이 간편 실행기는 Windows용입니다. 다른 OS는 Docker 실행 방법을 사용하세요.")
    folder = ROOT / ".runtime" / "cloudflared"
    folder.mkdir(parents=True, exist_ok=True)
    binary = folder / "cloudflared.exe"
    if binary.is_file() and checksum(binary) == CLOUDFLARED_SHA256:
        return binary
    print("공식 Cloudflare 터널 프로그램 다운로드·SHA256 확인 중…", flush=True)
    target = folder / "cloudflared.download"
    with urllib.request.urlopen(CLOUDFLARED_URL, timeout=45) as source, target.open("wb") as output:
        total = 0
        while block := source.read(1024 * 1024):
            total += len(block)
            if total > 128 * 1024 * 1024:
                raise ValueError("터널 프로그램 크기가 예상 범위를 벗어났습니다.")
            output.write(block)
    if checksum(target) != CLOUDFLARED_SHA256:
        raise ValueError("터널 프로그램 SHA256이 공식 배포본과 다릅니다. 실행하지 않았습니다.")
    target.replace(binary)
    return binary


def stop(process):
    if process is not None and process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=3)


def request(url, headers=None):
    try:
        req = urllib.request.Request(url, headers=headers or {})
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, {}
    except (OSError, ValueError):
        return 0, {}


def public_checks(url, values):
    status, body = request(url + "/health")
    if status != 200 or body.get("shared_server_mode") is not True:
        return False
    path = url + "/api/student/counsel/cases"
    if request(path)[0] != 403:
        return False
    if request(path, {"X-Frontend-Access": values["FRONTEND_ACCESS_TOKEN"]})[0] != 200:
        return False
    return request(url + "/api/teacher/document-drafts", {"X-Teacher-Key": values["TEACHER_ACCESS_TOKEN"]})[0] == 200


def main():
    parser = argparse.ArgumentParser(description="SAFE-PATH 팀 테스트용 HTTPS 서버")
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--prepare-only", action="store_true", help="키 파일만 준비하고 서버·터널을 열지 않음")
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535 or args.port == 8000:
        parser.error("기존 로컬 서버와 다른 포트(기본 8001)를 사용하세요.")
    server = tunnel = None
    status_written = False
    status_file = RUNTIME / "status.json"
    try:
        values = prepare()
        if args.prepare_only:
            print("공유 서버 설정 준비 완료. 접속키 위치: backend/.env.shared (값은 출력하지 않음)")
            return 0
        # 현재 환경의 소켓 차단을 먼저 확인한다. 보안 설정은 변경하지 않는다.
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", args.port))
            listener.listen(1)
            with socket.create_connection(listener.getsockname(), timeout=2):
                connection, _ = listener.accept()
                connection.close()
        binary = install_tunnel()
        empty_config = RUNTIME / "tunnel-config.yml"
        empty_config.write_text("{}\n", encoding="utf-8")
        tunnel_log = RUNTIME / "tunnel.log"
        creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        with tunnel_log.open("w", encoding="utf-8") as output:
            tunnel = subprocess.Popen([str(binary), "tunnel", "--config", str(empty_config), "--no-autoupdate",
                "--protocol", "http2", "--url", f"http://127.0.0.1:{args.port}", "--http-host-header", "localhost"],
                cwd=ROOT, stdout=output, stderr=subprocess.STDOUT, creationflags=creationflags)
            print("임시 HTTPS 주소를 발급하고 있습니다…", flush=True)
            deadline = time.monotonic() + 50
            public_url = ""
            while time.monotonic() < deadline and tunnel.poll() is None:
                match = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", tunnel_log.read_text(encoding="utf-8", errors="replace"))
                if match:
                    public_url = match.group()
                    break
                time.sleep(0.3)
            if not public_url:
                raise ValueError("터널 주소를 받지 못했습니다. backend/.runtime/shared/tunnel.log를 확인하세요.")
            set_key(str(SHARED_ENV), "PUBLIC_BASE_URL", public_url, quote_mode="always")
            # 부모 환경의 이전 주소/키가 .env.shared를 덮어쓰지 않도록 이 실행에만 지정한다.
            child_env = dict(os.environ)
            child_env.update(values)
            child_env.update(PUBLIC_BASE_URL=public_url, PYTHONUTF8="1")
            child_env.pop("SHARED_SERVER_MODE", None)
            with (RUNTIME / "server.log").open("w", encoding="utf-8") as server_output:
                server = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.shared:create_shared_app", "--factory",
                    "--host", "127.0.0.1", "--port", str(args.port), "--no-access-log", "--no-proxy-headers"],
                    cwd=ROOT, env=child_env, stdout=server_output, stderr=subprocess.STDOUT, creationflags=creationflags)
                deadline = time.monotonic() + 25
                ready = False
                while time.monotonic() < deadline and server.poll() is None and tunnel.poll() is None:
                    code, body = request(f"http://127.0.0.1:{args.port}/health")
                    if code == 200 and body.get("shared_server_mode") is True:
                        ready = True
                        break
                    time.sleep(0.3)
                if not ready:
                    raise ValueError("공유 서버 시작 실패. backend/.runtime/shared/server.log를 확인하세요.")
                verified = False
                for _ in range(3):
                    if public_checks(public_url, values):
                        verified = True
                        break
                    if server.poll() is not None or tunnel.poll() is not None:
                        break
                    time.sleep(1)
                if not verified:
                    raise ValueError("공개 주소의 인증 검증에 실패했습니다. 서버·터널을 종료합니다. 로그를 확인하세요.")
                status_file.write_text(json.dumps({"url": public_url, "https_verified": True,
                    "started_at": datetime.now(timezone.utc).isoformat(), "running": True}, indent=2), encoding="utf-8")
                status_written = True
                print("\n공유 서버:", public_url, flush=True)
                print("API 테스트:", public_url + "/docs", flush=True)
                print("서류 작업실:", public_url + "/document-demo", flush=True)
                print("접속키 위치: backend/.env.shared — 별도 전달, Git·공개 URL·VITE_*에 넣지 마세요.", flush=True)
                print("공개 HTTPS와 미인증 차단·프론트키·교사키 확인 완료. AI 추론은 이 점검에서 호출하지 않았습니다.", flush=True)
                print("이 창과 PC를 켜두세요. 종료는 Ctrl+C. 다음 실행 시 주소가 바뀝니다.", flush=True)
                while server.poll() is None and tunnel.poll() is None:
                    time.sleep(0.5)
                raise ValueError("서버 또는 터널이 종료됐습니다. 다시 실행하세요.")
    except KeyboardInterrupt:
        print("\n공유 서버를 종료합니다.")
        return 0
    except ValueError as error:
        print(str(error), flush=True)
        return 1
    except OSError as error:
        print("네트워크 또는 파일 접근에 실패했습니다. 일반 PowerShell에서 backend/start_shared.cmd를 실행하세요.")
        print("오류 번호:", getattr(error, "winerror", None) or error.errno)
        return 1
    finally:
        stop(server)
        stop(tunnel)
        if status_written and status_file.exists():
            try:
                status = json.loads(status_file.read_text(encoding="utf-8"))
                status["running"] = False
                status_file.write_text(json.dumps(status, indent=2), encoding="utf-8")
            except (OSError, ValueError):
                pass


if __name__ == "__main__":
    sys.exit(main())
