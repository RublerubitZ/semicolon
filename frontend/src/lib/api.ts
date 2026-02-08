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
