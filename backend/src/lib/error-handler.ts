/**
 * 에러 처리 유틸리티
 * 에러 로깅 및 응답 포맷팅을 일관되게 처리
 */

import { Request, Response, NextFunction } from 'express';
import logger, { generateErrorId, logApiRequest } from './logger';

export interface ErrorLogContext {
  endpoint: string;
  userId?: string;
  [key: string]: unknown;
}

export interface ErrorResponse {
  error: string;
  code: string;
  errorId?: string;
  details?: string;
}

/**
 * 에러 로깅
 */
export const logError = (context: ErrorLogContext, error: unknown): void => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error('[API Error]', {
    ...context,
    error: errorMessage,
    stack: errorStack,
  });
};

/**
 * 클라이언트에 에러 응답 전송
 */
export const sendErrorResponse = (
  res: Response,
  statusCode: number,
  message: string,
  code: string,
  error?: unknown
): void => {
  const errorId = generateErrorId();
  const response: ErrorResponse = {
    error: message,
    code,
    errorId,
  };

  if (process.env.NODE_ENV === 'development' && error) {
    response.details = error instanceof Error ? error.message : String(error);
  }

  res.status(statusCode).json(response);
};

/**
 * 공통 에러 핸들러
 */
export const handleError = (
  res: Response,
  context: ErrorLogContext,
  error: unknown,
  userMessage: string,
  code: string
): void => {
  logError(context, error);
  sendErrorResponse(res, 500, userMessage, code, error);
};

/**
 * 요청 로깅 미들웨어
 * - 프로덕션: 에러(4xx/5xx) + 느린 요청(>1초)만 info 레벨로 기록
 * - 개발: 모든 요청 기록
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = (req as any).user?.userId;
    const status = res.statusCode;
    const isError = status >= 400;
    const isSlow = duration > 1000;

    // 프로덕션: 정상 요청은 로그 생략
    if (process.env.NODE_ENV === 'production' && !isError && !isSlow) {
      return;
    }

    const meta = {
      method: req.method,
      path: req.originalUrl,
      status,
      duration: `${duration}ms`,
      userId: userId ? userId.substring(0, 8) + '...' : undefined,
    };

    if (isError) {
      logger.warn('API Error Response', meta);
    } else if (isSlow) {
      logger.warn('Slow request', meta);
    } else {
      // 개발 환경에서만 도달
      logger.debug('API Request', meta);
    }
  });

  next();
}

/**
 * 글로벌 에러 핸들러 미들웨어
 * 라우트에서 미처리된 에러를 캐치
 */
export function globalErrorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const errorId = generateErrorId();
  const userId = (req as any).user?.userId;

  logger.error('Unhandled error', {
    errorId,
    method: req.method,
    path: req.originalUrl,
    userId: userId ? userId.substring(0, 8) + '...' : undefined,
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    error: '서버 내부 오류가 발생했습니다.',
    code: 'INTERNAL_ERROR',
    errorId,
  });
}
