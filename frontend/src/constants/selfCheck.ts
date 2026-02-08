/**
 * 자가점검 관련 상수 정의
 * 모든 컴포넌트에서 이 파일의 상수를 사용해야 합니다.
 */

export type SelfCheckStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'NOT_DONE';

export interface SelfCheckConfig {
  value: SelfCheckStatus;
  label: string;
  icon: string;
  color: string;
}

/**
 * 자가점검 상태 목록
 * 색상: 미시작-회색, 진행중-노랑, 완료-초록, 미진행-빨강
 */
export const SELF_CHECK_OPTIONS: SelfCheckConfig[] = [
  {
    value: 'PENDING',
    label: '미시작',
    icon: '○',
    color: 'text-gray-400',
  },
  {
    value: 'IN_PROGRESS',
    label: '진행중',
    icon: '△',
    color: 'text-yellow-500',
  },
  {
    value: 'DONE',
    label: '완료',
    icon: '✓',
    color: 'text-green-500',
  },
  {
    value: 'NOT_DONE',
    label: '미진행',
    icon: '✕',
    color: 'text-red-500',
  },
];

/**
 * 자가점검 상태별 정보 매핑
 */
export const SELF_CHECK_DISPLAY: Record<SelfCheckStatus, { label: string; icon: string; color: string }> = {
  PENDING: { label: '미시작', icon: '○', color: 'text-gray-400' },
  IN_PROGRESS: { label: '진행중', icon: '△', color: 'text-yellow-500' },
  DONE: { label: '완료', icon: '✓', color: 'text-green-500' },
  NOT_DONE: { label: '미진행', icon: '✕', color: 'text-red-500' },
};

/**
 * 유틸리티 함수: 자가점검 상태로 라벨 가져오기
 */
export function getSelfCheckLabel(status: SelfCheckStatus): string {
  return SELF_CHECK_DISPLAY[status]?.label || status;
}

/**
 * 유틸리티 함수: 자가점검 상태로 아이콘 가져오기
 */
export function getSelfCheckIcon(status: SelfCheckStatus): string {
  return SELF_CHECK_DISPLAY[status]?.icon || '○';
}

/**
 * 유틸리티 함수: 자가점검 상태로 색상 가져오기
 */
export function getSelfCheckColor(status: SelfCheckStatus): string {
  return SELF_CHECK_DISPLAY[status]?.color || 'text-gray-400';
}

/**
 * 유틸리티 함수: 자가점검 상태 정보 전체 가져오기
 */
export function getSelfCheckInfo(status: SelfCheckStatus): { label: string; icon: string; color: string } {
  return SELF_CHECK_DISPLAY[status] || SELF_CHECK_DISPLAY.PENDING;
}
