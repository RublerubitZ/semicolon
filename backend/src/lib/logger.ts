/**
 * 로깅 유틸리티 (winston 기반)
 * 구조화된 로그 출력, 환경별 포맷팅, 요청 추적
 */

import winston from 'winston';
import crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    isProduction
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `[${timestamp}] ${level}: ${message}${metaStr}`;
          })
        )
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

export default logger;

// 하위 호환 유지
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogContext {
  [key: string]: unknown;
}

export const logDebug = (message: string, context?: LogContext): void => {
  logger.debug(message, context);
};

export const logInfo = (message: string, context?: LogContext): void => {
  logger.info(message, context);
};

export const logWarn = (message: string, context?: LogContext): void => {
  logger.warn(message, context);
};

export const logError = (message: string, error?: unknown, context?: LogContext): void => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error(message, {
    ...context,
    error: errorMessage,
    stack: errorStack,
  });
};

export const logApiRequest = (method: string, path: string, userId?: string, duration?: number): void => {
  logger.debug('API Request', {
    method,
    path,
    userId: userId ? userId.substring(0, 8) + '...' : undefined,
    duration: duration ? `${duration}ms` : undefined,
  });
};

export const logApiError = (method: string, path: string, error: unknown, userId?: string): void => {
  logError('API Error', error, {
    method,
    path,
    userId: userId ? userId.substring(0, 8) + '...' : undefined,
  });
};

/**
 * 고유 에러 ID 생성 (프론트엔드 에러 추적용)
 */
export function generateErrorId(): string {
  return crypto.randomBytes(4).toString('hex');
}
