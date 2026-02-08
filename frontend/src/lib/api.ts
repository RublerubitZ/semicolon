// API URL을 동적으로 생성하는 함수
// 로컬 백엔드가 실행 중이면 로컬 사용, 아니면 Railway 사용

const RAILWAY_URL = 'https://semicolon-production.up.railway.app';

// 동적 로컬 URL 생성 함수
function getLocalUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }
  // IP 접속 시 같은 IP의 백엔드 사용
  const hostname = window.location.hostname;
  return `http://${hostname}:4000`;
}

let cachedApiUrl: string | null = null;
let isCheckingBackend = false;

/**
 * 로컬 백엔드 서버 확인
 */
async function checkLocalBackend(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000); // 1초 타임아웃

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
 * - 캐시된 URL이 있으면 즉시 반환
 * - 없으면 로컬 URL 반환 (개발 환경 우선)
 */
export function getApiUrl(): string {
  // 서버 사이드에서는 항상 로컬 사용
  if (typeof window === 'undefined') {
    return getLocalUrl();
  }

  // 캐시된 URL이 있으면 반환
  if (cachedApiUrl) {
    return cachedApiUrl;
  }

  // 백그라운드에서 로컬 백엔드 확인 (최초 1회만)
  if (!isCheckingBackend) {
    isCheckingBackend = true;
    checkLocalBackend().then((isLocalAvailable) => {
      cachedApiUrl = isLocalAvailable ? getLocalUrl() : RAILWAY_URL;
      console.log(`[API] Using ${cachedApiUrl}`);
    });
  }

  // 첫 호출 시에는 로컬 URL 반환 (개발 환경 우선)
  return getLocalUrl();
}

/**
 * API URL 초기화 (비동기)
 * - 앱 시작 시 또는 필요할 때 호출하여 올바른 백엔드 확인
 */
export async function initializeApiUrl(): Promise<string> {
  if (typeof window === 'undefined') {
    return getLocalUrl();
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
  isCheckingBackend = false;
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
