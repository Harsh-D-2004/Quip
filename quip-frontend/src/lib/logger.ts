type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Set minimum log level (can be configured via environment)
const MIN_LOG_LEVEL: LogLevel = "debug";

const formatTimestamp = (): string => {
  return new Date().toISOString();
};

const formatLogEntry = (entry: LogEntry): string => {
  const { timestamp, level, module, message } = entry;
  const levelStr = level.toUpperCase().padEnd(5);
  return `[${timestamp}] [${levelStr}] [${module}] ${message}`;
};

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
};

const writeLog = (entry: LogEntry): void => {
  if (!shouldLog(entry.level)) return;

  const formattedMessage = formatLogEntry(entry);
  
  // Use appropriate console method for terminal output
  switch (entry.level) {
    case "debug":
      // Using console.debug for debug level
      console.debug(formattedMessage, entry.data ?? "");
      break;
    case "info":
      console.info(formattedMessage, entry.data ?? "");
      break;
    case "warn":
      console.warn(formattedMessage, entry.data ?? "");
      break;
    case "error":
      console.error(formattedMessage, entry.data ?? "");
      break;
  }
};

export const createLogger = (module: string) => {
  return {
    debug: (message: string, data?: unknown) => {
      writeLog({
        timestamp: formatTimestamp(),
        level: "debug",
        module,
        message,
        data,
      });
    },
    info: (message: string, data?: unknown) => {
      writeLog({
        timestamp: formatTimestamp(),
        level: "info",
        module,
        message,
        data,
      });
    },
    warn: (message: string, data?: unknown) => {
      writeLog({
        timestamp: formatTimestamp(),
        level: "warn",
        module,
        message,
        data,
      });
    },
    error: (message: string, data?: unknown) => {
      writeLog({
        timestamp: formatTimestamp(),
        level: "error",
        module,
        message,
        data,
      });
    },
  };
};

// Pre-configured loggers for common modules
export const logger = {
  api: createLogger("API"),
  auth: createLogger("AUTH"),
  session: createLogger("SESSION"),
  meeting: createLogger("MEETING"),
  app: createLogger("APP"),
};
