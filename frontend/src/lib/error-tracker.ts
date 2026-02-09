import { getApiUrl } from './api';

const recentErrors = new Map<string, number>();
const DEDUP_INTERVAL = 5000; // 5초 내 동일 에러 재전송 방지

interface ErrorContext {
  url?: string;
  userId?: string;
  [key: string]: unknown;
}

function getErrorKey(message: string): string {
  return message.substring(0, 100);
}

function isDuplicate(message: string): boolean {
  const key = getErrorKey(message);
  const lastSent = recentErrors.get(key);
  if (lastSent && Date.now() - lastSent < DEDUP_INTERVAL) {
    return true;
  }
  recentErrors.set(key, Date.now());
  return false;
}

export function trackError(error: Error | string, context?: ErrorContext): void {
  const message = error instanceof Error ? error.message : error;
  const stack = error instanceof Error ? error.stack : undefined;

  if (isDuplicate(message)) return;

  // 콘솔에 출력 (개발용)
  if (process.env.NODE_ENV === 'development') {
    console.error('[ErrorTracker]', message, context);
  }

  // 백엔드로 전송
  const userId = context?.userId || getUserId();
  try {
    fetch(`${getApiUrl()}/api/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        stack,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        userId,
        context,
      }),
    }).catch(() => {
      // 에러 전송 자체가 실패하면 무시
    });
  } catch {
    // fetch 호출 자체가 실패하면 무시
  }
}

function getUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id;
    }
  } catch {
    // 무시
  }
  return undefined;
}

/**
 * 글로벌 에러 이벤트 리스너 초기화
 * layout.tsx 등에서 한 번 호출
 */
export function initErrorTracking(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    trackError(event.error || event.message, {
      source: 'window.onerror',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason instanceof Error
      ? event.reason.message
      : String(event.reason);
    trackError(event.reason instanceof Error ? event.reason : message, {
      source: 'unhandledrejection',
    });
  });
}
