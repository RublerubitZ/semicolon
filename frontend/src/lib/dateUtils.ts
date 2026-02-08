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

/**
 * YYYY-MM-DD 형식으로 변환
 * @param date - Date 객체 또는 날짜 문자열
 * @returns YYYY-MM-DD 형식 문자열
 */
export function toYYYYMMDD(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Date 객체를 API 요청용 YYYY-MM-DD 형식으로 변환
 * 한국 시간대(Asia/Seoul) 기준으로 날짜를 반환하여 백엔드와 일치
 * @param date - Date 객체
 * @returns YYYY-MM-DD 형식 문자열
 */
export function formatDateForApi(date: Date): string {
  // 한국 시간대로 날짜를 YYYY-MM-DD 형식으로 변환
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // "2026-02-08" 형식
}

/**
 * Date 객체를 자정(00:00:00.000)으로 설정
 * @param date - Date 객체
 * @returns 자정으로 설정된 새 Date 객체
 */
export function setToMidnight(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환 (한국 시간대 기준)
 */
export function getTodayString(): string {
  return formatDateForApi(new Date());
}

/**
 * 두 날짜가 같은 날인지 비교 (시간 무시)
 * @param date1 - 첫 번째 날짜
 * @param date2 - 두 번째 날짜
 * @returns 같은 날이면 true
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = setToMidnight(typeof date1 === 'string' ? new Date(date1) : date1);
  const d2 = setToMidnight(typeof date2 === 'string' ? new Date(date2) : date2);
  return d1.getTime() === d2.getTime();
}

/**
 * date1이 date2보다 이후 날짜인지 비교 (시간 무시)
 * @param date1 - 비교할 날짜
 * @param date2 - 기준 날짜
 * @returns date1이 date2보다 이후면 true
 */
export function isAfterDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = setToMidnight(typeof date1 === 'string' ? new Date(date1) : date1);
  const d2 = setToMidnight(typeof date2 === 'string' ? new Date(date2) : date2);
  return d1.getTime() > d2.getTime();
}

/**
 * date1이 date2보다 이전 날짜인지 비교 (시간 무시)
 * @param date1 - 비교할 날짜
 * @param date2 - 기준 날짜
 * @returns date1이 date2보다 이전이면 true
 */
export function isBeforeDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = setToMidnight(typeof date1 === 'string' ? new Date(date1) : date1);
  const d2 = setToMidnight(typeof date2 === 'string' ? new Date(date2) : date2);
  return d1.getTime() < d2.getTime();
}

/**
 * 날짜에 일수를 더함
 * @param date - 기준 날짜
 * @param days - 더할 일수 (음수 가능)
 * @returns 새로운 Date 객체
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * HH:MM 형식으로 시간 포맷
 * @param hours - 시간 (0-23)
 * @param minutes - 분 (0-59)
 * @returns HH:MM 형식 문자열
 */
export function formatTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * 분을 시:분 형식으로 변환
 * @param minutes - 총 분
 * @returns "2시간 30분" 형식 문자열
 */
export function minutesToHoursMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
}
