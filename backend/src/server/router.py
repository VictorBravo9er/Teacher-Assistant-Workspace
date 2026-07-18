import os

from fastapi import APIRouter, HTTPException
from src.lib.logger import logger
from src.service.chat import ChatService
from src.types.schemas import ChatPayload

# OpenRouter / LangChain Config
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")

router = APIRouter(prefix="/api")


@router.get("/health")
async def health_check():
    return {"status": "ok"}


@router.post("/chat")
async def chat_endpoint(payload: ChatPayload):
    logger.info("POST /api/chat received")
    try:
        result = await ChatService.process_chat_message(payload, OPENROUTER_MODEL)
        logger.info("POST /api/chat processed successfully")
        return result
    except Exception as e:
        logger.error("Error processing POST /api/chat: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
