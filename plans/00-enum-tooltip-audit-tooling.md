# Plan 00: Developer Tooling, Enum Verification, Full-Stack Logging & Mock Data Elimination

> **Status**: ✅ **COMPLETED** (Verified with `npm run build`, `uv run poe lint`, and `_verify_enum_tooltips.py`)

## 1. Problem Statement & Context
As Teach&Learn scales its LMS capabilities, developers, testers, and AI agents face four visibility, developer-experience, and code hygiene gaps:

1. **Enum Verification Gap**:
   - Whenever PostgreSQL enums are modified, developers can easily forget to provide accompanying UI tooltips in `frontend/src/utils/enumTooltips.ts`.
   - Without automated tooling, missing explanations are only noticed through manual UI inspection.
2. **Frontend Observability Gap**:
   - Currently, frontend errors and state operations are logged haphazardly using bare `console.error(e)` calls or completely swallowed.
   - PostgREST query failures (RLS violations, foreign key errors, constraint violations) lack timing metrics, query arguments, and schema hints in the console.
   - State hooks (`useClassOperations.ts`) lack visibility into optimistic transitions, making desynchronization bugs hard to diagnose.
   - File uploads and pseudo-URI downloads (`text://`, `grade://`) lack trace logs during student assignment turn-ins.
3. **Backend Observability Gap**:
   - Currently, `backend/src/lib/logger.py` only outputs plain text to `sys.stdout` via basic `StreamHandler`.
   - Backend logs are not persisted to disk. When Uvicorn or the terminal session terminates, all request histories, exception traces, and timing records are lost.
   - There is no structured JSON log stream (`backend.jsonl`) or dedicated error log (`backend-error.log`), hindering AI agents and automated tools from analyzing backend telemetry post-mortem.
   - Requests lack a standardized correlation ID (`x-request-id`) to correlate frontend API calls with backend execution traces.
   - LLM calls (`llm.invoke`) and JSON parsing (`parse_llm_response`) lack timing telemetry and diagnostic dumps on malformed model outputs.
4. **Mock Data Pollution & Silent Failures**:
   - [`frontend/src/lib/mockChat.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/lib/mockChat.ts) contains hardcoded dummy AI responses ("Sofia Patel", "Classroom Score Distribution", etc.).
   - [`frontend/src/hooks/useAIChat.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/hooks/useAIChat.ts#L102-L117) catches backend network failures and silently masks them by returning synthetic responses from `mockChat.ts`.
   - This masks real API connection failures, hides 500 errors from developers, and prevents the newly introduced logging engine from capturing real error states.
   - [`frontend/src/features/account/AccountModals.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/account/AccountModals.tsx#L145) contains fake mock toast messages ("Mock Upgrade Successful: Welcome to Pro!").

---

## 2. Architecture & Design

```
                                      PLAN 00
              Developer Tooling, Full-Stack Observability & Hygiene
                                         │
     ┌───────────────────────┬───────────┴───────────┬───────────────────────┐
     ▼                       ▼                       ▼                       ▼
Part A: Python          Part B: Frontend        Part C: Backend         Part D: Mock Data
Enum Verifier           Tri-Stream Logger       Rotating Async Logger   Elimination
     │                       │                       │                       │
scripts/                frontend/src/lib/       backend/src/lib/        - Purge mockChat.ts
_verify_enum_tooltips   logger.ts               logger.py               - Remove mock fallback
- Compares db.ts        - Browser Console (F12) - Rotating backend.log    in useAIChat.ts
  with tooltips.ts      - Vite HMR terminal     - Filtered backend-     - Clean mock toasts
- Runs in db_setup.py   - Circular buffer         error.log               in AccountModals.tsx
  & _generate_types.py  - Streams to ./logs/    - ContextVar request_id - Pure live API
                             │                  - Diagnostic dumps        contracts only
                             │                       │
                             └───────────┬───────────┘
                                         ▼
                              Unified ./logs/ Storage
                            (frontend.log, backend.log,
                             frontend.jsonl, backend.jsonl,
                             error logs)
```

---

## 3. Part A: Python Tooling & Enum Verification

### Step 3.1: Create [`scripts/_verify_enum_tooltips.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/_verify_enum_tooltips.py)
Automates the audit between `frontend/src/types/db.ts` and `frontend/src/utils/enumTooltips.ts`:
```python
#!/usr/bin/env python3
"""
Enum Tooltip Completeness Verifier
Audits generated frontend/src/types/db.ts enums against frontend/src/utils/enumTooltips.ts
and outputs clear warnings for any undocumented enum values.
"""

import re
import sys
from pathlib import Path

AUDIT_TARGET_ENUMS = [
    "instruction_type",
    "teaching_style",
    "assessment_preference",
    "content_category",
    "submission_status",
    "experience_level",
]

def extract_enums_from_db_ts(db_ts_path: Path) -> dict[str, list[str]]:
    content = db_ts_path.read_text(encoding="utf-8")
    enums: dict[str, list[str]] = {}
    for enum_name in AUDIT_TARGET_ENUMS:
        pattern = rf"{enum_name}:\s*\[(.*?)\]"
        match = re.search(pattern, content, re.DOTALL)
        if match:
            items = re.findall(r'"([^"]+)"', match.group(1))
            enums[enum_name] = items
    return enums

def extract_tooltips(tooltips_path: Path) -> set[str]:
    if not tooltips_path.exists():
        return set()
    content = tooltips_path.read_text(encoding="utf-8")
    return set(re.findall(r"['\"]([^'\"]+)['\"]\s*:\s*['\"]", content))

def audit_enum_tooltips():
    root_dir = Path(__file__).resolve().parent.parent
    db_ts = root_dir / "frontend" / "src" / "types" / "db.ts"
    tooltips_ts = root_dir / "frontend" / "src" / "utils" / "enumTooltips.ts"

    if not db_ts.exists():
        return

    enums = extract_enums_from_db_ts(db_ts)
    defined_tooltips = extract_tooltips(tooltips_ts)

    print("\n🔍 Auditing Enum Pedagogical Tooltips:")
    has_warnings = False
    for enum_name, values in enums.items():
        missing = [v for v in values if v not in defined_tooltips]
        total = len(values)
        documented = total - len(missing)
        if not missing:
            print(f"   ✅ {enum_name}: {documented}/{total} documented")
        else:
            has_warnings = True
            print(f"   ⚠️  {enum_name}: {documented}/{total} documented")
            for item in missing:
                print(f"       Missing tooltip for: '{item}'")

    if has_warnings:
        print(f"\n   💡 Tip: Add missing descriptions in {tooltips_ts.relative_to(root_dir)}")
    else:
        print("   🎉 All target enums have pedagogical tooltips!")

if __name__ == "__main__":
    audit_enum_tooltips()
```

### Step 3.2: Hook into [`scripts/_generate_types.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/_generate_types.py) and [`scripts/db_setup.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/scripts/db_setup.py)
Trigger `audit_enum_tooltips()` immediately after TypeScript generation completes.

---

## 4. Part B: Exhaustive Frontend Logging Engine

### Step 4.1: Create Core Logger Utility ([`frontend/src/lib/logger.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/lib/logger.ts))
Create a structured, level-aware, namespaced logger with execution timers and circular buffer memory:

```typescript
/**
 * Teach&Learn Exhaustive Frontend Logging Utility
 * Provides namespaced, level-filtered, contextual logging with diagnostic buffering.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type LogNamespace = 
  | 'AUTH'
  | 'CLASS_SERVICE'
  | 'STUDENT_SERVICE'
  | 'MATERIAL_SERVICE'
  | 'INSTRUCTION_SERVICE'
  | 'CLASS_OPERATIONS'
  | 'SUBMISSION'
  | 'STORAGE'
  | 'ROUTER'
  | 'APP';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  namespace: LogNamespace;
  message: string;
  data?: any;
  durationMs?: number;
}

// In-memory circular buffer for debugging and export
const MAX_LOG_BUFFER_SIZE = 250;
const logBuffer: LogEntry[] = [];

// Configure minimum active log level (configurable via VITE_LOG_LEVEL)
const LEVEL_WEIGHTS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLevel: LogLevel = 
  (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 
  (import.meta.env.DEV ? 'DEBUG' : 'WARN');

const NAMESPACE_COLORS: Record<LogNamespace, string> = {
  AUTH: '#8b5cf6', // Violet
  CLASS_SERVICE: '#0ea5e9', // Sky Blue
  STUDENT_SERVICE: '#10b981', // Emerald
  MATERIAL_SERVICE: '#f59e0b', // Amber
  INSTRUCTION_SERVICE: '#ec4899', // Pink
  CLASS_OPERATIONS: '#6366f1', // Indigo
  SUBMISSION: '#14b8a6', // Teal
  STORAGE: '#eab308', // Yellow
  ROUTER: '#a855f7', // Purple
  APP: '#64748b', // Slate
};

function formatConsoleBadge(namespace: LogNamespace, level: LogLevel): [string, string] {
  const color = NAMESPACE_COLORS[namespace] || '#64748b';
  return [
    `%c[${level}] %c[${namespace}]`,
    `color: ${level === 'ERROR' ? '#ef4444' : level === 'WARN' ? '#f59e0b' : '#94a3b8'}; font-weight: bold;`,
    `color: ${color}; font-weight: bold;`,
  ];
}

export const logger = {
  debug(namespace: LogNamespace, message: string, data?: any, durationMs?: number) {
    if (LEVEL_WEIGHTS['DEBUG'] < LEVEL_WEIGHTS[currentLevel]) return;
    this._record('DEBUG', namespace, message, data, durationMs);
    const [fmt, lStyle, nStyle] = formatConsoleBadge(namespace, 'DEBUG');
    console.debug(fmt, lStyle, nStyle, message, data ?? '', durationMs ? `(${durationMs.toFixed(1)}ms)` : '');
  },

  info(namespace: LogNamespace, message: string, data?: any, durationMs?: number) {
    if (LEVEL_WEIGHTS['INFO'] < LEVEL_WEIGHTS[currentLevel]) return;
    this._record('INFO', namespace, message, data, durationMs);
    const [fmt, lStyle, nStyle] = formatConsoleBadge(namespace, 'INFO');
    console.info(fmt, lStyle, nStyle, message, data ?? '', durationMs ? `(${durationMs.toFixed(1)}ms)` : '');
  },

  warn(namespace: LogNamespace, message: string, data?: any) {
    if (LEVEL_WEIGHTS['WARN'] < LEVEL_WEIGHTS[currentLevel]) return;
    this._record('WARN', namespace, message, data);
    const [fmt, lStyle, nStyle] = formatConsoleBadge(namespace, 'WARN');
    console.warn(fmt, lStyle, nStyle, message, data ?? '');
  },

  error(namespace: LogNamespace, message: string, error?: any) {
    this._record('ERROR', namespace, message, error);
    const [fmt, lStyle, nStyle] = formatConsoleBadge(namespace, 'ERROR');
    
    // Unpack Supabase PostgREST error details if available
    const errorDetails = error?.message || error?.details || error?.hint ? {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      raw: error,
    } : error;

    console.error(fmt, lStyle, nStyle, message, errorDetails);
  },

  /** Measures async execution time and logs outcome */
  async measure<T>(namespace: LogNamespace, operationName: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    logger.debug(namespace, `▶️ Starting ${operationName}`);
    try {
      const result = await fn();
      const duration = performance.now() - start;
      logger.info(namespace, `✅ Finished ${operationName}`, undefined, duration);
      return result;
    } catch (err) {
      const duration = performance.now() - start;
      logger.error(namespace, `❌ Failed ${operationName} (${duration.toFixed(1)}ms)`, err);
      throw err;
    }
  },

  _record(level: LogLevel, namespace: LogNamespace, message: string, data?: any, durationMs?: number) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      namespace,
      message,
      data,
      durationMs,
    };
    logBuffer.push(entry);
    if (logBuffer.length > MAX_LOG_BUFFER_SIZE) {
      logBuffer.shift();
    }

    // Stream to Vite Dev Server via HMR WebSocket for terminal output & file writing
    if (import.meta.hot) {
      try {
        import.meta.hot.send('client:log', entry);
      } catch {
        // Gracefully ignore if socket is reconnecting
      }
    }
  },

  /** Exports the circular buffer for diagnostics */
  getLogs(): readonly LogEntry[] {
    return Object.freeze([...logBuffer]);
  },
};

// Expose buffer globally for console debugging
if (typeof window !== 'undefined') {
  (window as any).__TEACH_LEARN_LOGS__ = () => logger.getLogs();
}
```

---

### Step 4.2: Terminal Streaming & Timestamped Disk Log Maintenance ([`frontend/vite.config.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/vite.config.ts))
Because browser sandboxes cannot write directly to local disk, the Vite dev server (running in Node.js) receives the `client:log` WebSocket event and performs two essential tasks:
1. **Streams live formatted logs to terminal stdout** alongside backend logs.
2. **Appends structured logs directly to `./logs/`** using timestamped cohort names (`frontend-YYYY-MM-DD-HH-mm-ss.log`, `frontend-error-YYYY-MM-DD-HH-mm-ss.log`, `frontend-YYYY-MM-DD-HH-mm-ss.jsonl`).
3. **Coordinated Log-Count Rotation**: Rather than measuring byte size, the logger tracks the number of log entries on the primary non-error log stream. When the count exceeds `MAX_LOG_ENTRIES` (default 5,000 entries), all files (`.log`, `-error.log`, and `.jsonl`) rotate together to a new timestamped cohort, ensuring all streams share matching timestamps.

Add this plugin in `frontend/vite.config.ts`:
```typescript
import fs from 'fs';
import path from 'path';

// Inside plugins array of vite.config.ts:
{
  name: 'client-log-broadcaster',
  configureServer(server) {
    const rootLogsDir = path.resolve(__dirname, '../logs');
    if (!fs.existsSync(rootLogsDir)) {
      fs.mkdirSync(rootLogsDir, { recursive: true });
    }

    const formatLogTimestamp = (date = new Date()): string => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = date.getFullYear();
      const mm = pad(date.getMonth() + 1);
      const dd = pad(date.getDate());
      const hh = pad(date.getHours());
      const min = pad(date.getMinutes());
      const ss = pad(date.getSeconds());
      return `${yyyy}-${mm}-${dd}-${hh}-${min}-${ss}`;
    };

    const MAX_LOG_ENTRIES = parseInt(process.env.VITE_LOG_MAX_ENTRIES || '5000', 10);
    let currentLogCount = 0;
    let currentSessionTs = formatLogTimestamp();

    const getLogPaths = (ts: string) => ({
      appLog: path.join(rootLogsDir, `frontend-${ts}.log`),
      errorLog: path.join(rootLogsDir, `frontend-error-${ts}.log`),
      jsonlLog: path.join(rootLogsDir, `frontend-${ts}.jsonl`),
    });

    let currentPaths = getLogPaths(currentSessionTs);

    server.ws.on('client:log', (entry) => {
      // 1. Coordinated Log Count Rotation: Track primary stream count
      currentLogCount++;
      if (currentLogCount > MAX_LOG_ENTRIES) {
        currentSessionTs = formatLogTimestamp();
        currentPaths = getLogPaths(currentSessionTs);
        currentLogCount = 1;
      }

      // 2. Terminal stdout with ANSI colors
      const levelColor = 
        entry.level === 'ERROR' ? '\x1b[31m' : 
        entry.level === 'WARN' ? '\x1b[33m' : 
        entry.level === 'INFO' ? '\x1b[32m' : '\x1b[90m';
      const reset = '\x1b[0m';
      const durationStr = entry.durationMs ? ` \x1b[35m(${entry.durationMs.toFixed(1)}ms)\x1b[0m` : '';

      console.log(
        `${levelColor}[FRONTEND ${entry.level}]${reset} \x1b[36m[${entry.namespace}]\x1b[0m ${entry.message}${durationStr}`
      );

      // 3. Append Human-Readable Entry to logs/frontend-<timestamp>.log
      const formattedLine = `[${entry.timestamp}] [${entry.level}] [${entry.namespace}] ${entry.message}${
        entry.durationMs ? ` (${entry.durationMs.toFixed(1)}ms)` : ''
      }${entry.data ? ` data=${JSON.stringify(entry.data)}` : ''}\n`;
      fs.appendFileSync(currentPaths.appLog, formattedLine, 'utf-8');

      // 4. Append JSON Lines to logs/frontend-<timestamp>.jsonl (For AI Agent and Tooling Analysis)
      fs.appendFileSync(currentPaths.jsonlLog, JSON.stringify(entry) + '\n', 'utf-8');

      // 5. If error, append to logs/frontend-error-<timestamp>.log for rapid error triaging
      if (entry.level === 'ERROR') {
        fs.appendFileSync(currentPaths.errorLog, formattedLine, 'utf-8');
      }
    });
  }
}
```

---

## 5. Part C: Exhaustive Backend Logging Engine

### Step 5.1: Core Backend Logger with Timestamped Cohorts & Coordinated Entry-Count Rotation ([`backend/src/lib/logger.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/lib/logger.py))

```python
"""
Teach&Learn Backend Exhaustive Logging Utility
Provides namespaced loggers, async execution measurement, contextvars-based
request ID correlation, timestamped log file cohorts, and coordinated entry-count rotation in ./logs/.
"""

import contextvars
from datetime import datetime
import json
import logging
import os
from pathlib import Path
import sys
import threading
import time
from typing import Any, Callable, Coroutine, TypeVar

# Correlation ContextVar: holds current HTTP request ID across async tasks
request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

# Locate root ./logs directory (relative to workspace root)
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
LOGS_DIR = ROOT_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

MAX_LOG_ENTRIES = int(os.environ.get("LOG_MAX_ENTRIES", "5000"))

def get_log_timestamp(dt: datetime | None = None) -> str:
    """Returns YYYY-MM-DD-HH-mm-ss formatted timestamp for log filenames."""
    if dt is None:
        dt = datetime.now()
    return dt.strftime("%Y-%m-%d-%H-%M-%S")


class RequestIdFilter(logging.Filter):
    """Injects the current request_id from contextvars into every LogRecord."""
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        return True


class JSONLinesFormatter(logging.Formatter):
    """Formats log records as single-line JSON objects for agent analysis."""
    def format(self, record: logging.LogRecord) -> str:
        log_obj: dict[str, Any] = {
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
    def rotate_to(self, new_path: Path):
        self.acquire()
        try:
            if self.stream:
                self.stream.flush()
                self.stream.close()
                self.stream = None
            self.baseFilename = os.path.abspath(str(new_path))
            self.stream = self._open()
        finally:
            self.release()


class CoordinatedLogRotator:
    """
    Tracks entry counts on the primary non-error log stream. When entries exceed
    max_entries, coordinates a simultaneous rotation of all streams (.log, -error.log, .jsonl)
    to a matching timestamped cohort name: backend[-error]-YYYY-MM-DD-HH-mm-ss.log/.jsonl.
    """
    def __init__(self, logs_dir: Path, max_entries: int = 5000):
        self.logs_dir = logs_dir
        self.max_entries = max_entries
        self.count = 0
        self.lock = threading.Lock()
        self.current_ts = get_log_timestamp()

        self.app_handler: TimestampedFileHandler | None = None
        self.error_handler: TimestampedFileHandler | None = None
        self.jsonl_handler: TimestampedFileHandler | None = None

    def register_handlers(
        self,
        app_h: TimestampedFileHandler,
        err_h: TimestampedFileHandler,
        jsonl_h: TimestampedFileHandler
    ):
        self.app_handler = app_h
        self.error_handler = err_h
        self.jsonl_handler = jsonl_h

    def on_primary_entry(self):
        with self.lock:
            self.count += 1
            if self.count >= self.max_entries:
                self.current_ts = get_log_timestamp()
                self.count = 0
                if self.app_handler:
                    self.app_handler.rotate_to(self.logs_dir / f"backend-{self.current_ts}.log")
                if self.error_handler:
                    self.error_handler.rotate_to(self.logs_dir / f"backend-error-{self.current_ts}.log")
                if self.jsonl_handler:
                    self.jsonl_handler.rotate_to(self.logs_dir / f"backend-{self.current_ts}.jsonl")


class PrimaryCountingFileHandler(TimestampedFileHandler):
    """App log handler that increments the entry counter on the coordinated rotator."""
    def __init__(self, rotator: CoordinatedLogRotator, *args: Any, **kwargs: Any):
        super().__init__(*args, **kwargs)
        self.rotator = rotator

    def emit(self, record: logging.LogRecord):
        super().emit(record)
        self.rotator.on_primary_entry()


def setup_logger(name: str = "teach-learn") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    if logger.handlers:
        return logger

    req_filter = RequestIdFilter()
    logger.addFilter(req_filter)

    # 1. Console Stream Handler (stdout)
    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setLevel(logging.INFO)
    stdout_formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] [%(request_id)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    stdout_handler.setFormatter(stdout_formatter)
    stdout_handler.addFilter(req_filter)
    logger.addHandler(stdout_handler)

    # 2. Coordinated Rotator & Timestamped Handlers
    rotator = CoordinatedLogRotator(LOGS_DIR, max_entries=MAX_LOG_ENTRIES)
    init_ts = rotator.current_ts

    app_path = LOGS_DIR / f"backend-{init_ts}.log"
    app_handler = PrimaryCountingFileHandler(rotator, app_path, encoding="utf-8")
    app_handler.setLevel(logging.INFO)
    app_handler.setFormatter(stdout_formatter)
    app_handler.addFilter(req_filter)

    error_path = LOGS_DIR / f"backend-error-{init_ts}.log"
    error_handler = TimestampedFileHandler(error_path, encoding="utf-8")
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(stdout_formatter)
    error_handler.addFilter(req_filter)

    jsonl_path = LOGS_DIR / f"backend-{init_ts}.jsonl"
    jsonl_handler = TimestampedFileHandler(jsonl_path, encoding="utf-8")
    jsonl_handler.setLevel(logging.DEBUG)
    jsonl_handler.setFormatter(JSONLinesFormatter())
    jsonl_handler.addFilter(req_filter)

    rotator.register_handlers(app_handler, error_handler, jsonl_handler)

    logger.addHandler(app_handler)
    logger.addHandler(error_handler)
    logger.addHandler(jsonl_handler)

    return logger


# Base logger
logger = setup_logger()

# Subsystem Namespaced Loggers
http_logger = logging.getLogger("teach-learn.http")
chat_logger = logging.getLogger("teach-learn.chat")
eval_logger = logging.getLogger("teach-learn.eval")
llm_logger = logging.getLogger("teach-learn.llm")

T = TypeVar("T")

async def measure_async(target_logger: logging.Logger, operation_name: str, coro_fn: Callable[[], Coroutine[Any, Any, T]]) -> T:
    """Measures async execution time and logs start, completion, or failure."""
    start = time.perf_counter()
    target_logger.debug("▶️ Starting %s", operation_name)
    try:
        result = await coro_fn()
        duration_ms = (time.perf_counter() - start) * 1000.0
        target_logger.info("✅ Finished %s (%.1fms)", operation_name, duration_ms, extra={"duration_ms": round(duration_ms, 2)})
        return result
    except Exception as err:
        duration_ms = (time.perf_counter() - start) * 1000.0
        target_logger.error("❌ Failed %s (%.1fms): %s", operation_name, duration_ms, str(err), exc_info=True, extra={"duration_ms": round(duration_ms, 2)})
        raise
```

---

### Step 5.2: Request Correlation Middleware ([`backend/src/main.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/main.py))
Enhance the HTTP middleware to populate `request_id_ctx`, log query parameters, client IP, and track exact endpoint duration:

```python
import time
import uuid
from collections.abc import Awaitable, Callable
from fastapi import Request, Response
from src.lib.logger import http_logger, request_id_ctx

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

    http_logger.info("--> %s %s%s (client=%s)", request.method, request.url.path, query_str, client_ip)

    try:
        response: Response = await call_next(request)
        duration_ms = (time.perf_counter() - start_time) * 1000.0
        
        http_logger.info(
            "<-- %s %s | status=%d | duration=%.1fms",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            extra={"duration_ms": round(duration_ms, 2)}
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
            extra={"duration_ms": round(duration_ms, 2)}
        )
        raise
    finally:
        request_id_ctx.reset(token)
```

---

### Step 5.3: Exhaustive LLM Invocation & Parsing Diagnostics ([`backend/src/lib/llm.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/lib/llm.py))
Log LLM network durations, model targets, prompt character lengths, and provide detailed diagnostic error dumps on malformed JSON:

```python
import json
import time
from typing import cast
from langchain_openai import ChatOpenAI
from pydantic import SecretStr
from src.lib.logger import llm_logger

def get_openrouter_llm(model: str, api_key: str) -> ChatOpenAI:
    llm_logger.debug("Configuring OpenRouter LLM client: model=%s", model)
    return ChatOpenAI(
        model=model,
        api_key=SecretStr(api_key),
        base_url="https://openrouter.ai/api/v1",
        model_kwargs={
            "extra_headers": {
                "HTTP-Referer": "https://github.com/Google-Developer-Assistant/Teacher-Assistant",
                "X-Title": "Teacher Assistant Workspace",
            }
        },
        temperature=0.7,
    )

def parse_llm_response(raw_content: str | list[str | dict[str, object]]) -> dict[str, object]:
    """Clean Markdown formatting blocks and load string payload into structured dict with diagnostic logging."""
    if not isinstance(raw_content, str):
        raw_content = str(raw_content)

    clean_text = raw_content.strip()
    if clean_text.startswith("```json"):
        clean_text = clean_text[7:]
    if clean_text.endswith("```"):
        clean_text = clean_text[:-3]
    clean_text = clean_text.strip()

    try:
        parsed = cast(object, json.loads(clean_text))
        if isinstance(parsed, dict):
            llm_logger.debug("Successfully parsed LLM JSON response (keys=%s)", list(parsed.keys()))
            return cast(dict[str, object], parsed)
        llm_logger.warn("LLM response parsed into non-dict type: %s", type(parsed).__name__)
        return {"raw": parsed}
    except json.JSONDecodeError as err:
        llm_logger.error(
            "❌ Failed to parse LLM JSON response: %s\n--- RAW OUTPUT START ---\n%s\n--- RAW OUTPUT END ---",
            str(err),
            clean_text,
            exc_info=True,
        )
        raise ValueError(f"LLM returned malformed JSON: {err}") from err
```

---

### Step 5.4: Service Layer Instrumentation ([`backend/src/service/`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/service/))
Instrument `ChatService` and `EvaluatorService` to log domain-specific telemetry:
- **`ChatService`** (`src/service/chat.py`):
  - Log incoming message history count, student portfolio count, and config flags.
  - Measure total LLM round-trip duration via `measure_async(chat_logger, "chat_llm_invoke", ...)`.
  - Log whether response included a visualization widget (`charts`, `heatmap`, `ranking`, `timeline`, `stats`).
- **`EvaluatorService`** (`src/service/evaluator.py`):
  - `grade_submission`: Log submission ID, material name, rubric criteria count, submission text character count.
  - Log computed percentage grade, letter grade, and breakdown item count.
  - `analyze_material`: Log material ID, category, extracted text size in characters.
  - Log generated syllabus items count, prerequisite gaps detected count, and sample question count.

---

## 6. Part D: Unified `./logs/` Directory Management & Git Hygiene

1. In [`.gitignore`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/.gitignore), ensure `logs/`, `*.log`, and `*.jsonl` are ignored:
   ```text
   # Logs
   *.log
   *.jsonl
   logs/
   ```
2. **Directory Structure on Disk (Timestamped Cohorts)**:
   ```
   Teach&Learn Workspace/
   └── logs/
       ├── frontend-YYYY-MM-DD-HH-mm-ss.log          # Human-readable frontend events & PostgREST errors
       ├── frontend-YYYY-MM-DD-HH-mm-ss.jsonl        # Structured frontend JSON events (for AI agent analysis)
       ├── frontend-error-YYYY-MM-DD-HH-mm-ss.log    # Frontend-only errors (F12 unhandled, PostgREST failures)
       ├── backend-YYYY-MM-DD-HH-mm-ss.log           # Human-readable backend HTTP requests & service logs
       ├── backend-YYYY-MM-DD-HH-mm-ss.jsonl         # Structured backend JSON records with request_id & timings
       └── backend-error-YYYY-MM-DD-HH-mm-ss.log     # Backend-only 500s, model exceptions & tracebacks
   ```
3. **Coordinated Rotation by Log Entry Count**:
   - Both frontend and backend count log entries strictly on their **primary non-error log stream** (`frontend-<ts>.log` and `backend-<ts>.log`).
   - When the primary stream exceeds `MAX_LOG_ENTRIES` (default 5,000 entries, configurable via `VITE_LOG_MAX_ENTRIES` / `LOG_MAX_ENTRIES`):
     - A new timestamp `YYYY-MM-DD-HH-mm-ss` is generated.
     - All three active log file targets (`.log`, `-error.log`, and `.jsonl`) rotate simultaneously to the new timestamped cohort.
     - The counter resets to 0.
   - This ensures all three log streams share matching timestamp identifiers for any given operational session.

---

## 7. Part E: Complete Mock Data Elimination & Real Service Enforcement

To guarantee that the application only runs against real PostgreSQL data, real Supabase storage, and real FastAPI/OpenRouter endpoints, all mock files, synthetic fallback generators, and fake UI toast actions must be permanently eradicated:

### Step 7.1: Permanently Delete [`frontend/src/lib/mockChat.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/lib/mockChat.ts)
- Delete the 116-line mock response file entirely.
- Ensure no lingering imports remain in the codebase.

### Step 7.2: Eliminate Synthetic Fallbacks in [`frontend/src/hooks/useAIChat.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/hooks/useAIChat.ts)
Currently, `useAIChat.ts` catches backend network failures and falls back to `getMockChatResponse`.
- **Remove**:
  ```typescript
  import { getMockChatResponse } from '@/lib/mockChat'; // REMOVE
  ```
- **Replace Catch Block**: Instead of silently generating fake Sofia Patel data, log the genuine error via the new logging engine and present a real error toast:
  ```typescript
  } catch (err: any) {
    logger.error('APP', 'AI chat request failed', err);
    triggerToast(`AI Generation failed: ${err.message || 'Service unavailable'}`);
    // Clear generation state cleanly without injecting synthetic mock data
    setIsGeneratingAI(false);
  }
  ```

### Step 7.3: Clean Up Fake UI Handlers in [`frontend/src/features/account/AccountModals.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/account/AccountModals.tsx)
- Line 145 contains `onTriggerToast('Mock Upgrade Successful: Welcome to Pro!')`.
- Replace with real plan state or explicit disabled state ("Subscription management coming soon in enterprise edition"), ensuring no "Mock" branding or false confirmations appear to users.

### Step 7.4: Update Directory Documentation
- Update [`frontend/src/lib/code.DESC.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/lib/code.DESC.md): Remove references to `mockChat.ts` and "fallback mock generators".
- Update [`frontend/src/services/code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/code.ARCH.md) and [`frontend/src/services/code.DESC.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/code.DESC.md): Remove descriptions stating services fall back to local mock responses.

---

## 8. Exhaustive Instrumentation Roadmap Across All Layers

| Layer | Component | Log Events & Metrics Captured | Log Level | Target Files |
| :--- | :--- | :--- | :---: | :--- |
| **Frontend Auth** | `AuthContext.tsx` | Session restore, login, logout, resolved role, user UID | `INFO` | `frontend/src/contexts/AuthContext.tsx` |
| **Frontend Services** | `*Service.ts` | Query args, record counts, PostgREST error codes/hints/details, query execution duration (`logger.measure`) | `DEBUG` / `INFO` / `ERROR` | `frontend/src/services/*.ts` |
| **Frontend State** | `useClassOperations.ts` | Action dispatch, optimistic state application, rollback on failure | `DEBUG` / `WARN` | `frontend/src/hooks/useClassOperations.ts` |
| **Frontend Previews** | Modals | Upload MIME types & byte size, pseudo-protocols (`text://`, `grade://`) | `INFO` | `frontend/src/features/**/*.tsx` |
| **Backend HTTP** | `main.py` | Method, path, query string, client IP, status code, latency (ms), `x-request-id` header | `INFO` / `ERROR` | `backend/src/main.py` |
| **Backend Router** | `router.py` | Endpoint ingress, request validation, error re-raising with context | `INFO` / `ERROR` | `backend/src/server/router.py` |
| **Backend Chat** | `chat.py` | Context formatting, history length, student count, visualization payload type, roundtrip latency | `INFO` / `DEBUG` | `backend/src/service/chat.py` |
| **Backend Evaluator**| `evaluator.py` | Criteria count, submission text length, calculated grade/letter, gaps detected | `INFO` / `DEBUG` | `backend/src/service/evaluator.py` |
| **Backend LLM** | `llm.py` | Model slug, network duration, token/char counts, raw payload dump on JSON decode failure | `DEBUG` / `ERROR` | `backend/src/lib/llm.py` |
| **Hygiene Guard** | `mockChat.ts` | File deleted, mock fallbacks stripped from `useAIChat.ts` | `CLEANUP` | `frontend/src/lib/mockChat.ts` |

---

## 9. Verification Plan

### Automated Verification:
1. **Python Enum Tooltip Audit**:
   - Run `python scripts/_verify_enum_tooltips.py` and verify all target enums are audited.
2. **Backend Code Quality & Typing**:
   - Run `cd backend && uv run poe lint` to confirm zero Ruff and BasedPyright warnings with the new logger.
3. **Frontend Compilation Check**:
   - Run `cd frontend && npm run build` to confirm zero TypeScript compilation errors with `logger.ts` and after deleting `mockChat.ts`.
4. **Mock Data Grep Verification**:
   - Run search for `mockChat` and `getMockChatResponse` across `frontend/src/` to verify zero hits.

### Manual & Runtime Verification (Full-Stack Observability):
1. **Frontend Verification**:
   - Open Browser DevTools (`F12` -> Console). Verify color-coded badges `[INFO] [AUTH]`.
   - In browser console run `window.__TEACH_LEARN_LOGS__()` and inspect captured buffer.
2. **Backend Verification**:
   - Start backend server: `cd backend && uv run poe run-dev`.
   - Send an API request: verify request and response timings appear in terminal stdout with request ID.
3. **Unified `./logs/` Inspection**:
   - Confirm `./logs/frontend.log` and `./logs/backend.log` receive synchronized timestamps.
   - Confirm `./logs/frontend.jsonl` and `./logs/backend.jsonl` parse as valid JSON objects.
   - Trigger a deliberate backend error (e.g. invalid endpoint or bad body) and verify traceback is written to `./logs/backend-error.log`.
   - Trigger a deliberate frontend error and verify it is written to `./logs/frontend-error.log`.

---

## 10. Execution Order & Downstream Dependencies
- **Day 0 Execution**: This plan has zero database schema prerequisites and should be executed **first**.
- **Provides Observability for**: Plans 01 through 08.
- **Guarantees Honest Error States**: With mock fallbacks eliminated, any backend downtime or API errors will honestly fail and surface in `./logs/frontend-error.log` and `./logs/backend-error.log` instead of silently faking success with synthetic responses.
