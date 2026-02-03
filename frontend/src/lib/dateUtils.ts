/**
 * 날짜 포맷팅 유틸리티 함수
 */

/**
 * 날짜만 표시 (예: 2024. 2. 5.)
 */
export function formatDate(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 날짜 + 시간 표시 (예: 2024. 2. 5. 오후 3:00)
 */
export function formatDateTime(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 간단한 날짜 표시 (예: 2/5)
 */
export function formatShortDate(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
  });
}

/**
 * 상대 시간 표시 (예: 방금 전, 5분 전, 2시간 전, 어제, 3일 전)
 */
export function formatRelativeTime(dateString: string | Date): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;

  return formatDate(date);
}
