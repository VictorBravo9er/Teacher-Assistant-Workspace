import time

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from src.lib.logger import logger
from src.server.router import router

load_dotenv()

app = FastAPI(
    title="Teacher Assistant RAG API",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    logger.info("--> %s %s", request.method, request.url.path)
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        logger.info(
            "<-- %s %s | status=%d | duration=%.3fs",
            request.method,
            request.url.path,
            response.status_code,
            duration,
        )
        return response
    except Exception as err:
        duration = time.time() - start_time
        logger.error(
            "Request failed: %s %s | duration=%.3fs | error=%s",
            request.method,
            request.url.path,
            duration,
            str(err),
            exc_info=True,
        )
        raise


# Include endpoint routes
app.include_router(router)
