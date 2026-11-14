"""교사용 보고함·상담 기록 API. 별도 접속키 없이 조회한다."""

from fastapi import APIRouter, HTTPException, Query, Request


router = APIRouter(prefix="/api/teacher", tags=["교사 보고·상담 보관"])


@router.get("/reports", summary="교사 보고 목록 (긴급·미확인 우선)")
async def reports(request: Request, limit: int = Query(default=50, ge=1, le=100)):
    return {"items": request.app.state.archive.list_reports(limit), "delivery": "local_teacher_inbox", "external_sent": False}


@router.get("/reports/{report_id}", summary="보고 근거·요약·상담 대화 상세")
async def report_detail(report_id: str, request: Request):
    record = request.app.state.archive.report_detail(report_id)
    if not record:
        raise HTTPException(404, "교사 보고가 없습니다.")
    return record


@router.post("/reports/{report_id}/acknowledge", summary="교사가 보고 내용을 확인한 상태로 표시")
async def acknowledge(report_id: str, request: Request):
    if not request.app.state.archive.acknowledge(report_id):
        raise HTTPException(404, "교사 보고가 없습니다.")
    return {"acknowledged": True}


@router.get("/conversations", summary="보관한 상담 목록")
async def conversations(request: Request, limit: int = Query(default=50, ge=1, le=100)):
    return {"items": request.app.state.archive.list_conversations(limit)}


@router.get("/conversations/{session_id}", summary="상담 요약·정리·발언·위험 감지 기록")
async def conversation_detail(session_id: str, request: Request):
    record = request.app.state.archive.detail(session_id)
    if not record:
        raise HTTPException(404, "저장된 상담이 없습니다.")
    return record
