// API URL을 동적으로 생성하는 함수
// 로컬 개발 환경에서는 로컬 백엔드를 확인하고, 프로덕션에서는 Railway 사용

const PRODUCTION_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://semicolon-production.up.railway.app';
const LOCAL_API_PORT = process.env.NEXT_PUBLIC_LOCAL_API_PORT || '4000';

function isProduction(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('192.168.');
}

// 동적 로컬 URL 생성 함수
function getLocalUrl(): string {
  if (typeof window === 'undefined') {
    return `http://localhost:${LOCAL_API_PORT}`;
  }
  const hostname = window.location.hostname;
  return `http://${hostname}:${LOCAL_API_PORT}`;
}

let cachedApiUrl: string | null = null;

/**
 * 로컬 백엔드 서버 확인
 */
async function checkLocalBackend(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    const response = await fetch(`${getLocalUrl()}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * API URL 가져오기 (동기)
 */
export function getApiUrl(): string {
  if (typeof window === 'undefined') {
    return getLocalUrl();
  }

  if (cachedApiUrl) {
    return cachedApiUrl;
  }

  // 프로덕션에서는 항상 프로덕션 API 사용
  if (isProduction()) {
    cachedApiUrl = PRODUCTION_API_URL;
    return PRODUCTION_API_URL;
  }

  return getLocalUrl();
}

/**
 * API URL 초기화 (비동기)
 */
export async function initializeApiUrl(): Promise<string> {
  if (typeof window === 'undefined') {
    return getLocalUrl();
  }

  // 프로덕션에서는 로컬 체크 없이 바로 프로덕션 API 사용
  if (isProduction()) {
    cachedApiUrl = PRODUCTION_API_URL;
    console.log(`[API] Initialized: ${PRODUCTION_API_URL}`);
    return PRODUCTION_API_URL;
  }

  const isLocalAvailable = await checkLocalBackend();
  const url = isLocalAvailable ? getLocalUrl() : PRODUCTION_API_URL;
  cachedApiUrl = url;

  console.log(`[API] Initialized: ${url}`);
  return url;
}

/**
 * 캐시 초기화 (백엔드 전환 시 사용)
 */
export function resetApiUrl(): void {
  cachedApiUrl = null;
}

/**
 * Access Token 갱신
 * @returns 새로운 Access Token 또는 null (실패 시)
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    console.warn('[Auth] No refresh token found');
    return null;
  }

  try {
    const response = await fetch(`${getApiUrl()}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      console.error('[Auth] Token refresh failed:', response.status);
      // Refresh 실패 시 로컬스토리지 정리
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      return null;
    }

    const data = await response.json();
    const newToken = data.token;

    // 새 토큰 저장
    localStorage.setItem('token', newToken);
    console.log('[Auth] Token refreshed successfully');

    return newToken;
  } catch (error) {
    console.error('[Auth] Token refresh error:', error);
    // 에러 시 로컬스토리지 정리
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return null;
  }
}

/**
 * 지연 함수 (재시도 간격용)
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 네트워크 에러인지 판별
 */
function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && (
    (error.message?.includes('fetch') || error.message?.includes('network') || error.message === 'Failed to fetch')
  );
}

/**
 * 지연 로딩으로 에러 추적 (순환 참조 방지)
 */
function trackApiError(url: string, status: number, errorId?: string): void {
  import('./error-tracker').then(({ trackError }) => {
    trackError(`API ${status} Error`, {
      url,
      status,
      errorId,
      source: 'fetchWithAuth',
    });
  }).catch(() => {});
}

/**
 * 자동 토큰 갱신 + 재시도 기능이 포함된 fetch 래퍼
 * - 네트워크 에러: 최대 3회 재시도 (exponential backoff)
 * - 5xx 서버 에러: 최대 2회 재시도
 * - 401 에러: 자동 토큰 갱신 후 재시도
 */
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // 오프라인 감지
  if (typeof window !== 'undefined' && !navigator.onLine) {
    throw new Error('offline');
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = new Headers(options.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.method !== 'GET' && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // 네트워크/서버 에러 재시도 로직
  const MAX_RETRIES = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      let response = await fetch(url, { ...options, headers });

      // 5xx 서버 에러 → 재시도 (최대 2회)
      if (response.status >= 500 && attempt < 2) {
        await delay(1000 * 2 ** attempt);
        continue;
      }

      // 5xx 에러 로깅 (재시도 소진 후)
      if (response.status >= 500) {
        const body = await response.clone().json().catch(() => ({}));
        trackApiError(url, response.status, body?.errorId);
      }

      // 401 에러가 아니면 그대로 반환
      if (response.status !== 401) {
        return response;
      }

      // 401 에러 발생 - 토큰 갱신 시도
      if (isRefreshing && refreshPromise) {
        const newToken = await refreshPromise;
        if (!newToken) {
          if (typeof window !== 'undefined') {
            window.location.href = '/login?reason=expired';
          }
          return response;
        }
        headers.set('Authorization', `Bearer ${newToken}`);
        return fetch(url, { ...options, headers });
      }

      isRefreshing = true;
      refreshPromise = refreshAccessToken();

      try {
        const newToken = await refreshPromise;

        if (!newToken) {
          if (typeof window !== 'undefined') {
            window.location.href = '/login?reason=expired';
          }
          return response;
        }

        headers.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(url, { ...options, headers });
        return response;
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    } catch (error) {
      lastError = error;
      // 네트워크 에러만 재시도
      if (isNetworkError(error) && attempt < MAX_RETRIES - 1) {
        await delay(1000 * 2 ** attempt);
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

/**
 * API GET 요청 헬퍼 함수
 * @param endpoint - API 엔드포인트 (예: '/api/tasks')
 * @returns Response 객체
 */
export async function apiGet(endpoint: string): Promise<Response> {
  const url = `${getApiUrl()}${endpoint}`;
  return fetchWithAuth(url, { method: 'GET' });
}

/**
 * API POST 요청 헬퍼 함수
 * @param endpoint - API 엔드포인트
 * @param data - 전송할 데이터
 * @returns Response 객체
 */
export async function apiPost(endpoint: string, data?: unknown): Promise<Response> {
  const url = `${getApiUrl()}${endpoint}`;
  return fetchWithAuth(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * API PUT 요청 헬퍼 함수
 * @param endpoint - API 엔드포인트
 * @param data - 전송할 데이터
 * @returns Response 객체
 */
export async function apiPut(endpoint: string, data?: unknown): Promise<Response> {
  const url = `${getApiUrl()}${endpoint}`;
  return fetchWithAuth(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * API PATCH 요청 헬퍼 함수
 * @param endpoint - API 엔드포인트
 * @param data - 전송할 데이터
 * @returns Response 객체
 */
export async function apiPatch(endpoint: string, data?: unknown): Promise<Response> {
  const url = `${getApiUrl()}${endpoint}`;
  return fetchWithAuth(url, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * API DELETE 요청 헬퍼 함수
 * @param endpoint - API 엔드포인트
 * @returns Response 객체
 */
export async function apiDelete(endpoint: string): Promise<Response> {
  const url = `${getApiUrl()}${endpoint}`;
  return fetchWithAuth(url, { method: 'DELETE' });
}

/**
 * API 파일 업로드 헬퍼 함수 (FormData)
 * @param endpoint - API 엔드포인트
 * @param formData - FormData 객체
 * @returns Response 객체
 */
export async function apiUpload(endpoint: string, formData: FormData): Promise<Response> {
  const url = `${getApiUrl()}${endpoint}`;
  return fetchWithAuth(url, {
    method: 'POST',
    body: formData,
  });
}
