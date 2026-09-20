import os

from fastapi import APIRouter, HTTPException
from src.lib.logger import chat_logger, eval_logger, http_logger
from src.service.chat import ChatService
from src.service.evaluator import EvaluatorService
from src.types.ai import (
    GradeRequest,
    GradeResponse,
    MaterialAnalyzeRequest,
    MaterialAnalyzeResponse,
)
from src.types.schemas import ChatPayload

# OpenRouter / LangChain Config
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")

router = APIRouter(prefix="/api")


@router.get("/health")
async def health_check() -> dict[str, str]:
    http_logger.debug("GET /api/health probe received")
    return {"status": "ok"}


@router.post("/chat")
async def chat_endpoint(payload: ChatPayload):
    chat_logger.info("POST /api/chat received")
    try:
        result = await ChatService.process_chat_message(payload, OPENROUTER_MODEL)
        chat_logger.info("POST /api/chat processed successfully")
        return result
    except Exception as e:
        chat_logger.error("Error processing POST /api/chat: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/grade", response_model=GradeResponse)
async def grade_endpoint(req: GradeRequest) -> GradeResponse:
    eval_logger.info("POST /api/grade received for submission_id=%s", req.submission_id)
    try:
        result = await EvaluatorService.grade_submission(req, OPENROUTER_MODEL)
        eval_logger.info("POST /api/grade completed for submission_id=%s", req.submission_id)
        return result
    except Exception as e:
        eval_logger.error("Error processing POST /api/grade: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/materials/analyze", response_model=MaterialAnalyzeResponse)
async def analyze_material_endpoint(req: MaterialAnalyzeRequest) -> MaterialAnalyzeResponse:
    eval_logger.info("POST /api/materials/analyze received for material_id=%s", req.material_id)
    try:
        result = await EvaluatorService.analyze_material(req, OPENROUTER_MODEL)
        eval_logger.info("POST /api/materials/analyze completed for material_id=%s", req.material_id)
        return result
    except Exception as e:
        eval_logger.error("Error processing POST /api/materials/analyze: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e
