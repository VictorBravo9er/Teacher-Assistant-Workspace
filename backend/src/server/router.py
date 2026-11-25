from __future__ import annotations

import os

from fastapi import APIRouter, HTTPException, Query
from src.lib.logger import chat_logger, eval_logger, http_logger
from src.service.chat import ChatService
from src.service.consolidation import ConsolidationService
from src.service.evaluator import EvaluatorService
from src.service.ontology import OntologyService
from src.service.tree_indexer import TreeIndexerService
from src.types.ai import (
    ConsolidationRequest,
    ConsolidationResponse,
    GradeRequest,
    GradeResponse,
    MaterialAnalyzeRequest,
    MaterialAnalyzeResponse,
    MaterialTreeRequest,
    MaterialTreeResponse,
    MisconceptionReviewRequest,
    OntologyMisconception,
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
async def analyze_material_endpoint(
    req: MaterialAnalyzeRequest,
) -> MaterialAnalyzeResponse:
    eval_logger.info("POST /api/materials/analyze received for material_id=%s", req.material_id)
    try:
        result = await EvaluatorService.analyze_material(req, OPENROUTER_MODEL)
        eval_logger.info(
            "POST /api/materials/analyze completed for material_id=%s", req.material_id
        )
        return result
    except Exception as e:
        eval_logger.error("Error processing POST /api/materials/analyze: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/materials/tree", response_model=MaterialTreeResponse)
async def get_or_build_material_tree(req: MaterialTreeRequest) -> MaterialTreeResponse:
    eval_logger.info("POST /api/materials/tree received for material_id=%s", req.material_id)
    try:
        existing = await TreeIndexerService.get_tree(req.material_id)
        if existing and not req.force_rebuild:
            return MaterialTreeResponse(
                material_id=req.material_id,
                tree=existing,
                cached=True,
                status="completed",
            )

        from src.lib.db import fetch_one

        mat_row = await fetch_one(
            "SELECT name, content FROM public.materials WHERE id = %s",
            (req.material_id,),
        )
        if not mat_row or not mat_row.get("content"):
            raise HTTPException(
                status_code=404,
                detail=f"Material {req.material_id} content not found to build tree.",
            )

        api_key_str = os.environ.get("OPENROUTER_API_KEY", "")
        tree = await TreeIndexerService.build_tree_from_text(
            material_id=req.material_id,
            material_name=str(mat_row["name"]),
            text=str(mat_row["content"]),
            model=OPENROUTER_MODEL,
            api_key=api_key_str,
        )
        await TreeIndexerService.persist_tree(tree)

        return MaterialTreeResponse(
            material_id=req.material_id,
            tree=tree,
            cached=False,
            status="completed",
        )
    except HTTPException:
        raise
    except Exception as e:
        eval_logger.error("Error processing POST /api/materials/tree: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/consolidation/run", response_model=ConsolidationResponse)
async def run_consolidation_endpoint(
    req: ConsolidationRequest,
) -> ConsolidationResponse:
    eval_logger.info("POST /api/consolidation/run received for class_id=%s", req.class_id)
    try:
        result = await ConsolidationService.run_daily_consolidation(
            req, OPENROUTER_MODEL
        )
        eval_logger.info("POST /api/consolidation/run completed successfully")
        return result
    except Exception as e:
        eval_logger.error("Error processing POST /api/consolidation/run: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/misconceptions/proposed", response_model=list[OntologyMisconception])
async def get_proposed_misconceptions_endpoint(
    class_id: str | None = Query(None),
) -> list[OntologyMisconception]:
    eval_logger.info("GET /api/misconceptions/proposed for class_id=%s", class_id)
    try:
        result = await OntologyService.get_proposed_misconceptions(class_id)
        return result
    except Exception as e:
        eval_logger.error("Error fetching proposed misconceptions: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/misconceptions/{misconception_id}/review")
async def review_misconception_endpoint(
    misconception_id: str,
    req: MisconceptionReviewRequest,
) -> dict[str, str]:
    eval_logger.info(
        "POST /api/misconceptions/%s/review to status=%s", misconception_id, req.status
    )
    try:
        await OntologyService.review_misconception(
            misconception_id, req.status, req.reviewer_id
        )
        return {"status": "ok", "misconception_id": misconception_id, "new_status": req.status}
    except Exception as e:
        eval_logger.error("Error reviewing misconception %s: %s", misconception_id, str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) from e
