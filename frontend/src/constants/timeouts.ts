/**
 * 타임아웃 관련 상수 (밀리초 단위)
 */

export const TIMEOUTS = {
  // API 요청 타임아웃
  API_REQUEST: 10000, // 10초
  API_REQUEST_SHORT: 5000, // 5초
  API_REQUEST_LONG: 30000, // 30초

  // UI 인터랙션
  DEBOUNCE_DEFAULT: 300, // 기본 디바운스
  DEBOUNCE_SEARCH: 500, // 검색 디바운스
  DEBOUNCE_PLANNER: 100, // 플래너 데이터 페칭 디바운스
  TOAST_DURATION: 3000, // 토스트 표시 시간

  // 자동 새로고침
  AUTO_REFRESH: 30000, // 30초
  POLLING_INTERVAL: 60000, // 1분

  // 자동 로그아웃
  AUTO_LOGOUT_IDLE: 30 * 60 * 1000, // 30분 (비활성 시)
  AUTO_LOGOUT_WARNING: 5 * 60 * 1000, // 5분 전 경고
  TOKEN_REFRESH_INTERVAL: 25 * 60 * 1000, // 25분마다 토큰 갱신
} as const;
