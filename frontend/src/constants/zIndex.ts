/**
 * z-index 레이어 관리
 * 모달과 오버레이의 z-index를 중앙에서 관리하여 충돌 방지
 */

export const Z_INDEX = {
  // 기본 레이어
  BASE: 1,

  // 네비게이션
  BOTTOM_NAV: 40,

  // 모달 관련
  MODAL_BACKDROP: 50,
  MODAL: 60,

  // 오버레이
  OVERLAY_BACKDROP: 100,
  OVERLAY: 110,

  // 알림
  NOTIFICATION_BELL: 110,
  NOTIFICATION_DROPDOWN: 120,

  // 마이페이지 오버레이
  MYPAGE_BACKDROP: 100,
  MYPAGE: 120,

  // 로그아웃 확인 모달 (최상위)
  LOGOUT_MODAL_BACKDROP: 140,
  LOGOUT_MODAL: 150,

  // 토스트/스낵바 (모든 것 위)
  TOAST: 200,
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;
