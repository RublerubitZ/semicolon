// API URL을 동적으로 생성하는 함수
// 로컬 개발 환경에서는 로컬 백엔드를 확인하고, 프로덕션에서는 Railway 사용

const RAILWAY_URL = 'https://semicolon-production.up.railway.app';

function isProduction(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('192.168.');
}

// 동적 로컬 URL 생성 함수
function getLocalUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }
  const hostname = window.location.hostname;
  return `http://${hostname}:4000`;
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

  // 프로덕션에서는 항상 Railway 사용
  if (isProduction()) {
    cachedApiUrl = RAILWAY_URL;
    return cachedApiUrl;
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

  // 프로덕션에서는 로컬 체크 없이 바로 Railway 사용
  if (isProduction()) {
    cachedApiUrl = RAILWAY_URL;
    console.log(`[API] Initialized: ${cachedApiUrl}`);
    return cachedApiUrl;
  }

  const isLocalAvailable = await checkLocalBackend();
  cachedApiUrl = isLocalAvailable ? getLocalUrl() : RAILWAY_URL;

  console.log(`[API] Initialized: ${cachedApiUrl}`);
  return cachedApiUrl;
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
 * 자동 토큰 갱신 기능이 포함된 fetch 래퍼
 * 401 에러 발생 시 자동으로 토큰을 갱신하고 요청을 재시도합니다.
 *
 * @param url - 요청 URL
 * @param options - fetch 옵션
 * @returns fetch Response
 */
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // 첫 번째 요청
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = new Headers(options.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // 401 에러가 아니면 그대로 반환
  if (response.status !== 401) {
    return response;
  }

  // 401 에러 발생 - 토큰 갱신 시도
  console.log('[Auth] 401 error detected, attempting token refresh...');

  // 이미 다른 요청이 토큰을 갱신 중이면 그 결과를 기다림
  if (isRefreshing && refreshPromise) {
    const newToken = await refreshPromise;
    if (!newToken) {
      // 토큰 갱신 실패 - 로그인 페이지로 리다이렉트
      if (typeof window !== 'undefined') {
        window.location.href = '/login?reason=expired';
      }
      return response;
    }

    // 새 토큰으로 재시도
    headers.set('Authorization', `Bearer ${newToken}`);
    return fetch(url, { ...options, headers });
  }

  // 토큰 갱신 시작
  isRefreshing = true;
  refreshPromise = refreshAccessToken();

  try {
    const newToken = await refreshPromise;

    if (!newToken) {
      // Refresh token도 만료됨 - 로그인 페이지로 리다이렉트
      console.error('[Auth] Token refresh failed, redirecting to login');
      if (typeof window !== 'undefined') {
        window.location.href = '/login?reason=expired';
      }
      return response;
    }

    // 새 토큰으로 원래 요청 재시도
    console.log('[Auth] Retrying request with new token');
    headers.set('Authorization', `Bearer ${newToken}`);
    response = await fetch(url, {
      ...options,
      headers,
    });

    return response;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
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
