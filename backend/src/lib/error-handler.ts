/**
 * 에러 처리 유틸리티
 * 에러 로깅 및 응답 포맷팅을 일관되게 처리
 */

import { Response } from 'express';

export interface ErrorLogContext {
  endpoint: string;
  userId?: string;
  [key: string]: unknown;
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: string;
}

/**
 * 에러 로깅
 * @param context 에러 발생 컨텍스트 정보
 * @param error 발생한 에러
 */
export const logError = (context: ErrorLogContext, error: unknown): void => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error('[API Error]', {
    timestamp: new Date().toISOString(),
    ...context,
    error: errorMessage,
    stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
  });
};

/**
 * 클라이언트에 에러 응답 전송
 * @param res Express Response 객체
 * @param statusCode HTTP 상태 코드
 * @param message 사용자에게 보여줄 에러 메시지
 * @param code 에러 코드 (프론트엔드에서 구분용)
 * @param error 원본 에러 (개발 환경에서만 상세 정보 전송)
 */
export const sendErrorResponse = (
  res: Response,
  statusCode: number,
  message: string,
  code: string,
  error?: unknown
): void => {
  const response: ErrorResponse = {
    error: message,
    code,
  };

  // 개발 환경에서만 상세 에러 정보 전송
  if (process.env.NODE_ENV === 'development' && error) {
    response.details = error instanceof Error ? error.message : String(error);
  }

  res.status(statusCode).json(response);
};

/**
 * 공통 에러 핸들러
 * @param res Express Response 객체
 * @param context 에러 컨텍스트
 * @param error 발생한 에러
 * @param userMessage 사용자에게 보여줄 메시지
 * @param code 에러 코드
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
