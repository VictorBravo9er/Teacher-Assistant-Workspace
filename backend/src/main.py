from collections.abc import Awaitable, Callable
import time
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from src.lib.logger import http_logger, request_id_ctx
from src.server.router import router
from starlette.responses import Response

_ = load_dotenv()

app = FastAPI(
    title="Teacher Assistant RAG API",
    docs_url="/docs",
    redoc_url=None,
    openapi_url="/api/internal-data/openapi.json",
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
async def log_requests(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    # 1. Extract from client header or generate new ID
    req_id = request.headers.get("x-request-id", f"req-{uuid.uuid4().hex[:10]}")
    token = request_id_ctx.set(req_id)
    start_time = time.perf_counter()

    client_ip = request.client.host if request.client else "unknown"
    query_str = f"?{request.query_params}" if request.query_params else ""

    http_logger.info(
        "--> %s %s%s (client=%s)", request.method, request.url.path, query_str, client_ip
    )

    try:
        response: Response = await call_next(request)
        duration_ms = (time.perf_counter() - start_time) * 1000.0

        http_logger.info(
            "<-- %s %s | status=%d | duration=%.1fms",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            extra={"duration_ms": round(duration_ms, 2)},
        )
        response.headers["x-request-id"] = req_id
        return response

    except Exception as err:
        duration_ms = (time.perf_counter() - start_time) * 1000.0
        http_logger.error(
            "Request failed: %s %s | duration=%.1fms | error=%s",
            request.method,
            request.url.path,
            duration_ms,
            str(err),
            exc_info=True,
            extra={"duration_ms": round(duration_ms, 2)},
        )
        raise
    finally:
        request_id_ctx.reset(token)


# Include endpoint routes
app.include_router(router)
