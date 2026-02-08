/**
 * 로깅 유틸리티
 * 일관된 형식으로 로그를 출력하고 환경별로 로그 레벨 관리
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogContext {
  [key: string]: unknown;
}

/**
 * 로그 레벨에 따른 출력 여부 결정
 */
const shouldLog = (level: LogLevel): boolean => {
  const env = process.env.NODE_ENV;

  // 프로덕션에서는 WARN, ERROR만 출력
  if (env === 'production') {
    return level === LogLevel.WARN || level === LogLevel.ERROR;
  }

  // 개발 환경에서는 모든 레벨 출력
  return true;
};

/**
 * 로그 포맷팅
 */
const formatLog = (level: LogLevel, message: string, context?: LogContext) => {
  const timestamp = new Date().toISOString();
  const base = {
    timestamp,
    level,
    message,
  };

  return context ? { ...base, ...context } : base;
};

/**
 * DEBUG 레벨 로그
 */
export const logDebug = (message: string, context?: LogContext): void => {
  if (!shouldLog(LogLevel.DEBUG)) return;
  console.log(formatLog(LogLevel.DEBUG, message, context));
};

/**
 * INFO 레벨 로그
 */
export const logInfo = (message: string, context?: LogContext): void => {
  if (!shouldLog(LogLevel.INFO)) return;
  console.log(formatLog(LogLevel.INFO, message, context));
};

/**
 * WARN 레벨 로그
 */
export const logWarn = (message: string, context?: LogContext): void => {
  if (!shouldLog(LogLevel.WARN)) return;
  console.warn(formatLog(LogLevel.WARN, message, context));
};

/**
 * ERROR 레벨 로그
 */
export const logError = (message: string, error?: unknown, context?: LogContext): void => {
  if (!shouldLog(LogLevel.ERROR)) return;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(formatLog(LogLevel.ERROR, message, {
    ...context,
    error: errorMessage,
    stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
  }));
};

/**
 * API 요청 로그 (성공)
 */
export const logApiRequest = (method: string, path: string, userId?: string, duration?: number): void => {
  logInfo('API Request', {
    method,
    path,
    userId: userId ? userId.substring(0, 8) + '...' : undefined,
    duration: duration ? `${duration}ms` : undefined,
  });
};

/**
 * API 에러 로그
 */
export const logApiError = (method: string, path: string, error: unknown, userId?: string): void => {
  logError('API Error', error, {
    method,
    path,
    userId: userId ? userId.substring(0, 8) + '...' : undefined,
  });
};
