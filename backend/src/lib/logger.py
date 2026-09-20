"""Teach&Learn Backend Exhaustive Logging Utility.

Provides namespaced loggers, async execution measurement, contextvars-based
request ID correlation, timestamped log file cohorts, and coordinated entry-count rotation in ./logs/.
"""

from collections.abc import Callable, Coroutine
import contextvars
from datetime import datetime
import json
import logging
import os
from pathlib import Path
import sys
import threading
import time
from typing import TypeVar, final, override

# Correlation ContextVar: holds current HTTP request ID across async tasks
request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

# Environment-aware logging flags
ENVIRONMENT = os.environ.get("ENVIRONMENT", "production").lower()
ENABLE_FILE_LOGGING = os.environ.get(
    "ENABLE_FILE_LOGGING", "true" if ENVIRONMENT != "production" else "false"
).lower() in ("true", "1", "yes")

# Determine log directory: check env var first, fall back to coded relative path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
_env_logs = os.environ.get("LOGS_DIR")
LOGS_DIR: Path = Path(_env_logs) if _env_logs else (ROOT_DIR / "logs")

# Ensure log directory exists only when file logging is enabled
if ENABLE_FILE_LOGGING:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

MAX_LOG_ENTRIES = int(os.environ.get("LOG_MAX_ENTRIES", "5000"))


def get_log_timestamp(dt: datetime | None = None) -> str:
    """Return YYYY-MM-DD-HH-mm-ss formatted timestamp for log filenames."""
    if dt is None:
        dt = datetime.now()
    return dt.strftime("%Y-%m-%d-%H-%M-%S")


@final
class RequestIdFilter(logging.Filter):
    """Injects the current request_id from contextvars into every LogRecord."""

    @override
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        return True


@final
class JSONLinesFormatter(logging.Formatter):
    """Formats log records as single-line JSON objects for agent analysis."""

    @override
    def format(self, record: logging.LogRecord) -> str:
        log_obj: dict[str, object] = {
            "timestamp": self.formatTime(record, self.datefmt or "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "request_id": getattr(record, "request_id", "-"),
            "message": record.getMessage(),
        }
        if hasattr(record, "duration_ms"):
            log_obj["duration_ms"] = getattr(record, "duration_ms")
        if hasattr(record, "data"):
            log_obj["data"] = getattr(record, "data")
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj)


class TimestampedFileHandler(logging.FileHandler):
    """FileHandler that supports dynamic in-place stream rollover to new timestamped targets."""

    baseFilename: str

    def rotate_to(self, new_path: Path) -> None:
        self.acquire()
        try:
            self.close()
            self.baseFilename = os.path.abspath(str(new_path))
            setattr(self, "stream", self._open())
        finally:
            self.release()


def _ensure_cohort_files(logs_dir: Path, layer: str, ts: str) -> tuple[Path, Path, Path]:
    """Instantly creates the 3 log cohort files at boot or rotation time."""
    app_path = logs_dir / f"{layer}-{ts}.log"
    jsonl_path = logs_dir / f"{layer}-{ts}.jsonl"
    error_path = logs_dir / f"{layer}-{ts}-error.log"
    app_path.touch(exist_ok=True)
    jsonl_path.touch(exist_ok=True)
    error_path.touch(exist_ok=True)
    return app_path, error_path, jsonl_path


@final
class CoordinatedLogRotator:
    """Tracks entry counts on the primary non-error log stream.

    When entries exceed max_entries, coordinates a simultaneous rotation of all
    streams (.log, -error.log, .jsonl) to a matching timestamped cohort name:
    backend-YYYY-MM-DD-HH-mm-ss[-error].log/.jsonl.
    """

    logs_dir: Path
    max_entries: int
    count: int
    lock: threading.Lock
    current_ts: str
    app_handler: TimestampedFileHandler | None
    error_handler: TimestampedFileHandler | None
    jsonl_handler: TimestampedFileHandler | None

    def __init__(self, logs_dir: Path, max_entries: int = 5000) -> None:
        self.logs_dir = logs_dir
        self.max_entries = max_entries
        self.count = 0
        self.lock = threading.Lock()
        self.current_ts = get_log_timestamp()
        self.app_handler = None
        self.error_handler = None
        self.jsonl_handler = None

    def register_handlers(
        self,
        app_h: TimestampedFileHandler,
        err_h: TimestampedFileHandler,
        jsonl_h: TimestampedFileHandler,
    ) -> None:
        self.app_handler = app_h
        self.error_handler = err_h
        self.jsonl_handler = jsonl_h

    def on_primary_entry(self) -> None:
        with self.lock:
            self.count += 1
            if self.count >= self.max_entries:
                self.current_ts = get_log_timestamp()
                self.count = 0
                app_path, error_path, jsonl_path = _ensure_cohort_files(
                    self.logs_dir, "backend", self.current_ts
                )
                if self.app_handler is not None:
                    self.app_handler.rotate_to(app_path)
                if self.error_handler is not None:
                    self.error_handler.rotate_to(error_path)
                if self.jsonl_handler is not None:
                    self.jsonl_handler.rotate_to(jsonl_path)


@final
class PrimaryCountingFileHandler(TimestampedFileHandler):
    """App log handler that increments the entry counter on the coordinated rotator."""

    rotator: CoordinatedLogRotator

    def __init__(
        self,
        rotator: CoordinatedLogRotator,
        filename: str | Path,
        mode: str = "a",
        encoding: str | None = "utf-8",
        delay: bool = False,
        errors: str | None = None,
    ) -> None:
        super().__init__(filename, mode, encoding, delay, errors)
        self.rotator = rotator

    @override
    def emit(self, record: logging.LogRecord) -> None:
        super().emit(record)
        self.rotator.on_primary_entry()


def setup_logger(name: str = "teach-learn") -> logging.Logger:
    logger_instance = logging.getLogger(name)
    logger_instance.setLevel(logging.DEBUG)

    if logger_instance.handlers:
        return logger_instance

    req_filter = RequestIdFilter()
    logger_instance.addFilter(req_filter)

    # 1. Console Stream Handler (stdout)
    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setLevel(logging.INFO)
    stdout_formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] [%(request_id)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    stdout_handler.setFormatter(stdout_formatter)
    stdout_handler.addFilter(req_filter)
    logger_instance.addHandler(stdout_handler)

    # 2. Coordinated Rotator & Timestamped Handlers (Dev / File Logging Enabled Only)
    if ENABLE_FILE_LOGGING:
        rotator = CoordinatedLogRotator(LOGS_DIR, max_entries=MAX_LOG_ENTRIES)
        init_ts = rotator.current_ts

        app_path, error_path, jsonl_path = _ensure_cohort_files(LOGS_DIR, "backend", init_ts)

        app_handler = PrimaryCountingFileHandler(rotator, app_path, encoding="utf-8")
        app_handler.setLevel(logging.INFO)
        app_handler.setFormatter(stdout_formatter)
        app_handler.addFilter(req_filter)

        error_handler = TimestampedFileHandler(error_path, encoding="utf-8")
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(stdout_formatter)
        error_handler.addFilter(req_filter)

        jsonl_handler = TimestampedFileHandler(jsonl_path, encoding="utf-8")
        jsonl_handler.setLevel(logging.DEBUG)
        jsonl_handler.setFormatter(JSONLinesFormatter())
        jsonl_handler.addFilter(req_filter)

        rotator.register_handlers(app_handler, error_handler, jsonl_handler)

        logger_instance.addHandler(app_handler)
        logger_instance.addHandler(error_handler)
        logger_instance.addHandler(jsonl_handler)

    return logger_instance


# Base logger
logger = setup_logger()

# Subsystem Namespaced Loggers
http_logger = logging.getLogger("teach-learn.http")
chat_logger = logging.getLogger("teach-learn.chat")
eval_logger = logging.getLogger("teach-learn.eval")
llm_logger = logging.getLogger("teach-learn.llm")

T = TypeVar("T")


async def measure_async(
    target_logger: logging.Logger,
    operation_name: str,
    coro_fn: Callable[[], Coroutine[object, object, T]],
) -> T:
    """Measures async execution time and logs start, completion, or failure."""
    start = time.perf_counter()
    target_logger.debug("▶️ Starting %s", operation_name)
    try:
        result = await coro_fn()
        duration_ms = (time.perf_counter() - start) * 1000.0
        target_logger.info(
            "✅ Finished %s (%.1fms)",
            operation_name,
            duration_ms,
            extra={"duration_ms": round(duration_ms, 2)},
        )
        return result
    except Exception as err:
        duration_ms = (time.perf_counter() - start) * 1000.0
        target_logger.error(
            "❌ Failed %s (%.1fms): %s",
            operation_name,
            duration_ms,
            str(err),
            exc_info=True,
            extra={"duration_ms": round(duration_ms, 2)},
        )
        raise
