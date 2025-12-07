globalThis.process ??= {}; globalThis.process.env ??= {};
const defaultConfig = {
  minLevel: "warn" ,
  includeStackTrace: false,
  formatter: (log2) => JSON.stringify(log2, null, 2)
};
let config = { ...defaultConfig };
const levelPriority = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
function shouldLog(level) {
  return levelPriority[level] >= levelPriority[config.minLevel];
}
function log(logEntry) {
  if (!shouldLog(logEntry.level)) {
    return;
  }
  const logToOutput = config.includeStackTrace ? logEntry : { ...logEntry, stack_trace: void 0 };
  const formattedLog = config.formatter(logToOutput);
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
}
function logError(logData) {
  log({
    ...logData,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    level: "error"
  });
}
function logWarning(logData) {
  log({
    ...logData,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    level: "warn"
  });
}
function logInfo(logData) {
  log({
    ...logData,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    level: "info"
  });
}
function extractErrorInfo(error) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    };
  }
  if (typeof error === "string") {
    return {
      message: error,
      type: "String"
    };
  }
  if (typeof error === "object" && error !== null) {
    return {
      message: JSON.stringify(error),
      type: "Object"
    };
  }
  return {
    message: "Unknown error",
    type: "Unknown"
  };
}
function sanitizeContext(context) {
  const sensitiveKeys = [
    "password",
    "token",
    "authorization",
    "api_key",
    "secret",
    "private_key",
    "access_token",
    "refresh_token"
  ];
  const sanitized = {};
  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeContext(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export { logError as a, logInfo as b, extractErrorInfo as e, logWarning as l, sanitizeContext as s };
