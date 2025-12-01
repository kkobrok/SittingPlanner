/* eslint-disable no-console */
/**
 * Structured logging utility for API errors and events
 *
 * This module provides type-safe logging functions with structured output.
 * For MVP: Logs to console in JSON format
 * For Production: Can be extended to send logs to external services (Sentry, Datadog, etc.)
 */

/**
 * Log severity levels
 */
export type LogLevel = "error" | "warn" | "info" | "debug";

/**
 * Structured error log interface
 * Contains all necessary context for debugging and monitoring
 */
export interface ErrorLog {
  /** ISO 8601 timestamp of when the error occurred */
  timestamp: string;
  /** Severity level of the log */
  level: LogLevel;
  /** Unique identifier for this request (for tracing) */
  request_id: string;
  /** Authenticated user's ID (if available) */
  user_id?: string;
  /** API endpoint that was called */
  endpoint: string;
  /** HTTP method used */
  method: string;
  /** Error type/class name */
  error_type: string;
  /** Human-readable error message */
  error_message: string;
  /** Full error stack trace (only logged, never sent to client) */
  stack_trace?: string;
  /** Additional contextual information */
  context?: Record<string, unknown>;
}

/**
 * Configuration for the logger
 */
interface LoggerConfig {
  /** Minimum log level to output (default: 'info') */
  minLevel?: LogLevel;
  /** Whether to include stack traces (default: true in dev, false in prod) */
  includeStackTrace?: boolean;
  /** Custom formatter function */
  formatter?: (log: ErrorLog) => string;
}

// Default configuration
const defaultConfig: Required<LoggerConfig> = {
  minLevel: (import.meta.env.MODE === "production" ? "warn" : "debug") as LogLevel,
  includeStackTrace: import.meta.env.MODE !== "production",
  formatter: (log: ErrorLog) => JSON.stringify(log, null, 2),
};

// Current configuration (can be updated)
let config: Required<LoggerConfig> = { ...defaultConfig };

/**
 * Update logger configuration
 */
export function configureLogger(newConfig: Partial<LoggerConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Log level priority for filtering
 */
const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Check if a log level should be output based on configuration
 */
function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[config.minLevel];
}

/**
 * Core logging function
 */
function log(logEntry: ErrorLog): void {
  if (!shouldLog(logEntry.level)) {
    return;
  }

  // Remove stack trace if configured
  const logToOutput = config.includeStackTrace ? logEntry : { ...logEntry, stack_trace: undefined };

  // Format the log
  const formattedLog = config.formatter(logToOutput);

  // Output based on level
  switch (logEntry.level) {
    case "error":
      console.error(formattedLog);
      break;
    case "warn":
      console.warn(formattedLog);
      break;
    case "info":
      console.info(formattedLog);
      break;
    case "debug":
      console.debug(formattedLog);
      break;
  }

  // In production, you would also send to external logging service here:
  // if (import.meta.env.MODE === 'production') {
  //   sendToSentry(logEntry);
  //   sendToDatadog(logEntry);
  // }
}

/**
 * Log an error-level event
 *
 * Use for: Server errors (500), database failures, unexpected exceptions
 *
 * @example
 * logError({
 *   request_id: crypto.randomUUID(),
 *   user_id: user.id,
 *   endpoint: '/api/events',
 *   method: 'GET',
 *   error_type: 'DatabaseError',
 *   error_message: 'Failed to connect to database',
 *   stack_trace: error.stack,
 *   context: { query: 'SELECT * FROM events' }
 * });
 */
export function logError(logData: Omit<ErrorLog, "timestamp" | "level">): void {
  log({
    ...logData,
    timestamp: new Date().toISOString(),
    level: "error",
  });
}

/**
 * Log a warning-level event
 *
 * Use for: Validation errors (400), authentication failures (401), rate limiting
 *
 * @example
 * logWarning({
 *   request_id: crypto.randomUUID(),
 *   user_id: undefined,
 *   endpoint: '/api/events',
 *   method: 'GET',
 *   error_type: 'ValidationError',
 *   error_message: 'Invalid limit parameter',
 *   context: { limit: 500 }
 * });
 */
export function logWarning(logData: Omit<ErrorLog, "timestamp" | "level">): void {
  log({
    ...logData,
    timestamp: new Date().toISOString(),
    level: "warn",
  });
}

/**
 * Log an info-level event
 *
 * Use for: Successful operations, user actions, system events
 *
 * @example
 * logInfo({
 *   request_id: crypto.randomUUID(),
 *   user_id: user.id,
 *   endpoint: '/api/events',
 *   method: 'GET',
 *   error_type: 'Success',
 *   error_message: 'Events retrieved successfully',
 *   context: { count: 10, page: 1 }
 * });
 */
export function logInfo(logData: Omit<ErrorLog, "timestamp" | "level">): void {
  log({
    ...logData,
    timestamp: new Date().toISOString(),
    level: "info",
  });
}

/**
 * Log a debug-level event
 *
 * Use for: Development debugging, detailed operation info
 *
 * @example
 * logDebug({
 *   request_id: crypto.randomUUID(),
 *   endpoint: '/api/events',
 *   method: 'GET',
 *   error_type: 'Debug',
 *   error_message: 'Query execution time',
 *   context: { duration_ms: 45 }
 * });
 */
export function logDebug(logData: Omit<ErrorLog, "timestamp" | "level">): void {
  log({
    ...logData,
    timestamp: new Date().toISOString(),
    level: "debug",
  });
}

/**
 * Extract error information from unknown error types
 *
 * Safely extracts message and stack from Error objects or other types
 */
export function extractErrorInfo(error: unknown): {
  message: string;
  stack?: string;
  type: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name,
    };
  }

  if (typeof error === "string") {
    return {
      message: error,
      type: "String",
    };
  }

  if (typeof error === "object" && error !== null) {
    return {
      message: JSON.stringify(error),
      type: "Object",
    };
  }

  return {
    message: "Unknown error",
    type: "Unknown",
  };
}

/**
 * Sanitize sensitive data from context before logging
 *
 * Removes common sensitive fields like passwords, tokens, etc.
 */
export function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    "password",
    "token",
    "authorization",
    "api_key",
    "secret",
    "private_key",
    "access_token",
    "refresh_token",
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeContext(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
