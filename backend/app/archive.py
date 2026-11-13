"""상담·요약·위험 신호·교사 보고를 보관하는 SQLite 저장소. 키·원음은 저장하지 않는다."""

import json
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from app.safety import SafetySignal


def now():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def encode(value):
    return json.dumps(value, ensure_ascii=False)


def decode(value, fallback=None):
    return json.loads(value) if value else fallback


class ArchiveStore:
    def __init__(self, path: Path, threshold: int = 3):
        self.path, self.threshold = Path(path), threshold
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connection() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.executescript("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY, alias TEXT NOT NULL, mode TEXT NOT NULL,
                    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, ended_at TEXT,
                    status TEXT NOT NULL DEFAULT 'active', summary_json TEXT NOT NULL DEFAULT '{}'
                );
                CREATE TABLE IF NOT EXISTS turns (
                    session_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                    request_id TEXT NOT NULL, user_text TEXT NOT NULL, created_at TEXT NOT NULL,
                    results_json TEXT NOT NULL DEFAULT '{}',
                    PRIMARY KEY(session_id, request_id)
                );
                CREATE TABLE IF NOT EXISTS risk_events (
                    session_id TEXT NOT NULL, request_id TEXT NOT NULL,
                    immediate INTEGER NOT NULL DEFAULT 0, kind TEXT NOT NULL,
                    reason TEXT NOT NULL, evidence_json TEXT NOT NULL, sources_json TEXT NOT NULL,
                    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
                    PRIMARY KEY(session_id, request_id),
                    FOREIGN KEY(session_id, request_id) REFERENCES turns(session_id, request_id) ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS teacher_reports (
                    id TEXT PRIMARY KEY, session_id TEXT NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
                    trigger_kind TEXT NOT NULL, severity TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'unread',
                    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, acknowledged_at TEXT,
                    risk_count INTEGER NOT NULL, last_urgent_request_id TEXT,
                    reason TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS report_status_time ON teacher_reports(status, updated_at);
            """)

    @contextmanager
    def connection(self):
        db = sqlite3.connect(self.path, timeout=5)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        try:
            with db:
                yield db
        finally:
            db.close()

    def create_session(self, sid: str, mode: str):
        stamp = now()
        with self.connection() as db:
            db.execute("INSERT INTO conversations(id,alias,mode,created_at,updated_at) VALUES(?,?,?,?,?)",
                (sid, "익명 상담 " + sid[:6], mode, stamp, stamp))

    def register_turn(self, sid: str, rid: str, text: str):
        with self.connection() as db:
            row = db.execute("SELECT user_text FROM turns WHERE session_id=? AND request_id=?", (sid, rid)).fetchone()
            if row:
                if row["user_text"] != text:
                    raise ValueError("같은 요청 ID로 다른 문장을 저장할 수 없습니다.")
                return
            count = db.execute("SELECT COUNT(*) FROM turns WHERE session_id=?", (sid,)).fetchone()[0]
            if count >= 40:
                raise ValueError("이 상담의 40회 발언 제한에 도달했습니다.")
            stamp = now()
            db.execute("INSERT INTO turns(session_id,request_id,user_text,created_at) VALUES(?,?,?,?)", (sid, rid, text, stamp))
            db.execute("UPDATE conversations SET updated_at=? WHERE id=?", (stamp, sid))

    def observe(self, sid: str, rid: str, signal: SafetySignal, source: str):
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            stamp = now()
            if signal.detected:
                old = db.execute("SELECT * FROM risk_events WHERE session_id=? AND request_id=?", (sid, rid)).fetchone()
                if old:
                    evidence = list(dict.fromkeys(decode(old["evidence_json"], []) + list(signal.evidence)))[:8]
                    sources = list(dict.fromkeys(decode(old["sources_json"], []) + [source]))
                    immediate = bool(old["immediate"]) or signal.immediate
                    # 낮은 신호가 나중에 도착해도 이전 긴급 근거를 덮지 않는다.
                    reason = old["reason"] if old["immediate"] and not signal.immediate else signal.reason
                    kind = old["kind"] if old["immediate"] and not signal.immediate else signal.kind
                    db.execute("UPDATE risk_events SET immediate=?,kind=?,reason=?,evidence_json=?,sources_json=?,updated_at=? WHERE session_id=? AND request_id=?",
                        (immediate, kind, reason, encode(evidence), encode(sources), stamp, sid, rid))
                else:
                    db.execute("INSERT INTO risk_events VALUES(?,?,?,?,?,?,?,?,?)",
                        (sid, rid, signal.immediate, signal.kind, signal.reason, encode(list(signal.evidence)), encode([source]), stamp, stamp))
            count = db.execute("SELECT COUNT(*) FROM risk_events WHERE session_id=?", (sid,)).fetchone()[0]
            report = db.execute("SELECT * FROM teacher_reports WHERE session_id=?", (sid,)).fetchone()
            immediate = signal.detected and signal.immediate
            if not report and (immediate or count >= self.threshold):
                report_id = secrets.token_urlsafe(18)
                reason = signal.reason if immediate else f"서로 다른 학생 발언에서 위험 신호가 누적 {count}회 감지됐습니다."
                db.execute("INSERT INTO teacher_reports(id,session_id,trigger_kind,severity,created_at,updated_at,risk_count,last_urgent_request_id,reason) VALUES(?,?,?,?,?,?,?,?,?)",
                    (report_id, sid, "immediate" if immediate else "repeated", "urgent" if immediate else "attention",
                        stamp, stamp, count, rid if immediate else None, reason))
            elif report:
                new_urgent = immediate and report["last_urgent_request_id"] != rid
                db.execute("UPDATE teacher_reports SET updated_at=?,risk_count=?,severity=?,trigger_kind=?,status=?,acknowledged_at=?,last_urgent_request_id=?,reason=? WHERE session_id=?",
                    (stamp, count, "urgent" if immediate else report["severity"], "immediate" if immediate else report["trigger_kind"],
                        "unread" if new_urgent else report["status"], None if new_urgent else report["acknowledged_at"],
                        rid if immediate else report["last_urgent_request_id"], signal.reason if immediate else report["reason"], sid))
            return self._safety(db, sid)

    def _safety(self, db, sid):
        count = db.execute("SELECT COUNT(*) FROM risk_events WHERE session_id=?", (sid,)).fetchone()[0]
        urgent = db.execute("SELECT 1 FROM risk_events WHERE session_id=? AND immediate=1 LIMIT 1", (sid,)).fetchone()
        report = db.execute("SELECT id,severity,status,trigger_kind,created_at FROM teacher_reports WHERE session_id=?", (sid,)).fetchone()
        return {"risk_count": count, "threshold": self.threshold, "immediate": bool(urgent),
            "reported": bool(report), "report": dict(report) if report else None,
            "delivery": "local_teacher_inbox" if report else "not_reported",
            "external_sent": False}

    def safety(self, sid):
        with self.connection() as db:
            return self._safety(db, sid)

    def save_result(self, sid, rid, variant, result):
        with self.connection() as db:
            row = db.execute("SELECT results_json FROM turns WHERE session_id=? AND request_id=?", (sid, rid)).fetchone()
            if not row:
                return
            results = decode(row["results_json"], {})
            results[variant] = result
            db.execute("UPDATE turns SET results_json=? WHERE session_id=? AND request_id=?", (encode(results), sid, rid))
            db.execute("UPDATE conversations SET updated_at=? WHERE id=?", (now(), sid))

    def finish(self, sid, summary=None, status="finished"):
        with self.connection() as db:
            row = db.execute("SELECT status,summary_json FROM conversations WHERE id=?", (sid,)).fetchone()
            if not row or row["status"] != "active":
                return
            stamp = now()
            organized = self._organize(db, sid)
            organized["comparison_summary"] = summary
            db.execute("UPDATE conversations SET status=?,summary_json=?,updated_at=?,ended_at=? WHERE id=?",
                (status, encode(organized), stamp, stamp, sid))

    def _organize(self, db, sid):
        rows = db.execute("SELECT user_text,results_json FROM turns WHERE session_id=? ORDER BY created_at,rowid", (sid,)).fetchall()
        summaries = {}
        for row in rows:
            for variant, result in decode(row["results_json"], {}).items():
                if result.get("status") == "ok":
                    summaries[variant] = {"model": result["model"], "summary": result["assessment"]["summary"], "assessment": result["assessment"]}
        return {"model_summaries": summaries, "turn_count": len(rows),
            "summary_status": "model_summary" if summaries else "pending_or_unavailable",
            "student_statement_preview": [r["user_text"] for r in rows[-3:]], "safety": self._safety(db, sid)}

    def list_reports(self, limit=50):
        with self.connection() as db:
            rows = db.execute("SELECT r.*,c.alias,c.mode,c.status AS conversation_status FROM teacher_reports r JOIN conversations c ON c.id=r.session_id ORDER BY CASE r.status WHEN 'unread' THEN 0 ELSE 1 END,CASE r.severity WHEN 'urgent' THEN 0 ELSE 1 END,r.updated_at DESC LIMIT ?", (limit,)).fetchall()
            return [dict(row) for row in rows]

    def list_conversations(self, limit=50):
        with self.connection() as db:
            rows = db.execute("SELECT id,alias,mode,created_at,updated_at,ended_at,status FROM conversations ORDER BY updated_at DESC LIMIT ?", (limit,)).fetchall()
            return [{**dict(row), "safety": self._safety(db, row["id"])} for row in rows]

    def detail(self, sid):
        with self.connection() as db:
            row = db.execute("SELECT * FROM conversations WHERE id=?", (sid,)).fetchone()
            if not row:
                return None
            record = dict(row)
            saved = decode(record.pop("summary_json"), {})
            record["summary"] = saved if saved else self._organize(db, sid)
            record["safety"] = self._safety(db, sid)
            turns = db.execute("SELECT request_id,user_text,created_at,results_json FROM turns WHERE session_id=? ORDER BY created_at,rowid", (sid,)).fetchall()
            record["turns"] = [{"request_id": t["request_id"], "text": t["user_text"], "created_at": t["created_at"], "results": decode(t["results_json"], {})} for t in turns]
            events = db.execute("SELECT * FROM risk_events WHERE session_id=? ORDER BY created_at,rowid", (sid,)).fetchall()
            record["risk_events"] = [{"request_id": e["request_id"], "immediate": bool(e["immediate"]), "kind": e["kind"], "reason": e["reason"],
                "evidence": decode(e["evidence_json"], []), "sources": decode(e["sources_json"], []), "created_at": e["created_at"]} for e in events]
            return record

    def report_detail(self, report_id):
        with self.connection() as db:
            row = db.execute("SELECT * FROM teacher_reports WHERE id=?", (report_id,)).fetchone()
            report = dict(row) if row else None
        if report:
            report["conversation"] = self.detail(report["session_id"])
        return report

    def acknowledge(self, report_id):
        with self.connection() as db:
            stamp = now()
            result = db.execute("UPDATE teacher_reports SET status='acknowledged',acknowledged_at=? WHERE id=?", (stamp, report_id))
            return result.rowcount > 0
