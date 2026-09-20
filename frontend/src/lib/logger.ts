/**
 * Teach&Learn Exhaustive Frontend Logging Utility
 * Provides namespaced, level-filtered, contextual logging with diagnostic buffering.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type LogNamespace =
  | 'AUTH'
  | 'CLASS_SERVICE'
  | 'STUDENT_SERVICE'
  | 'STUDENT_PORTAL'
  | 'ANNOUNCEMENT'
  | 'NOTIFICATION'
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
  data?: unknown;
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
  STUDENT_PORTAL: '#06b6d4', // Cyan
  ANNOUNCEMENT: '#f97316', // Orange
  NOTIFICATION: '#e11d48', // Rose
  MATERIAL_SERVICE: '#f59e0b', // Amber
  INSTRUCTION_SERVICE: '#ec4899', // Pink
  CLASS_OPERATIONS: '#6366f1', // Indigo
  SUBMISSION: '#14b8a6', // Teal
  STORAGE: '#eab308', // Yellow
  ROUTER: '#a855f7', // Purple
  APP: '#64748b', // Slate
};

function formatConsoleBadge(namespace: LogNamespace, level: LogLevel): [string, string, string] {
  const color = NAMESPACE_COLORS[namespace] || '#64748b';
  return [
    `%c[${level}] %c[${namespace}]`,
    `color: ${level === 'ERROR' ? '#ef4444' : level === 'WARN' ? '#f59e0b' : '#94a3b8'}; font-weight: bold;`,
    `color: ${color}; font-weight: bold;`,
  ];
}

export const logger = {
  debug(namespace: LogNamespace, message: string, data?: unknown, durationMs?: number) {
    if (LEVEL_WEIGHTS['DEBUG'] < LEVEL_WEIGHTS[currentLevel]) return;
    this._record('DEBUG', namespace, message, data, durationMs);
    const [fmt, lStyle, nStyle] = formatConsoleBadge(namespace, 'DEBUG');
    console.debug(fmt, lStyle, nStyle, message, data ?? '', durationMs ? `(${durationMs.toFixed(1)}ms)` : '');
  },

  info(namespace: LogNamespace, message: string, data?: unknown, durationMs?: number) {
    if (LEVEL_WEIGHTS['INFO'] < LEVEL_WEIGHTS[currentLevel]) return;
    this._record('INFO', namespace, message, data, durationMs);
    const [fmt, lStyle, nStyle] = formatConsoleBadge(namespace, 'INFO');
    console.info(fmt, lStyle, nStyle, message, data ?? '', durationMs ? `(${durationMs.toFixed(1)}ms)` : '');
  },

  warn(namespace: LogNamespace, message: string, data?: unknown) {
    if (LEVEL_WEIGHTS['WARN'] < LEVEL_WEIGHTS[currentLevel]) return;
    this._record('WARN', namespace, message, data);
    const [fmt, lStyle, nStyle] = formatConsoleBadge(namespace, 'WARN');
    console.warn(fmt, lStyle, nStyle, message, data ?? '');
  },

  error(namespace: LogNamespace, message: string, error?: unknown) {
    this._record('ERROR', namespace, message, error);
    const [fmt, lStyle, nStyle] = formatConsoleBadge(namespace, 'ERROR');

    // Unpack Supabase PostgREST error details if available
    const errorObj = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
    const errorDetails = errorObj && (errorObj.message || errorObj.details || errorObj.hint) ? {
      message: errorObj.message,
      code: errorObj.code,
      details: errorObj.details,
      hint: errorObj.hint,
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

  _record(level: LogLevel, namespace: LogNamespace, message: string, data?: unknown, durationMs?: number) {
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
  (window as unknown as { __TEACH_LEARN_LOGS__?: () => readonly LogEntry[] }).__TEACH_LEARN_LOGS__ = () => logger.getLogs();
}
