/**
 * 날짜 유틸리티 함수
 * YYYY-MM-DD 형식의 문자열을 UTC 기준으로 파싱하여 타임존 문제 해결
 */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * YYYY-MM-DD 형식 검증
 */
export const isValidDateStr = (dateStr: string): boolean => {
  if (!DATE_REGEX.test(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00.000Z');
  return !isNaN(d.getTime());
};

/**
 * YYYY-MM-DD 형식의 날짜 문자열을 UTC 기준 Date 객체로 변환
 * 예: "2026-02-04" -> UTC 2026-02-04 00:00:00
 * @throws {Error} 날짜 형식이 올바르지 않거나 유효하지 않은 날짜인 경우
 */
export const parseUTCDate = (dateStr: string): Date => {
  if (!isValidDateStr(dateStr)) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
  }
  const date = new Date(dateStr + 'T00:00:00.000Z');
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${dateStr}`);
  }
  return date;
};

/**
 * Date 객체를 UTC 기준 0시로 설정
 */
export const setUTCMidnight = (date: Date): Date => {
  const utcDate = new Date(date);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
};

/**
 * 날짜 범위 생성 (UTC 기준)
 * @param dateStr YYYY-MM-DD 형식 문자열
 * @returns [startDate, nextDate] - startDate 이상 nextDate 미만으로 조회
 */
export const getDateRange = (dateStr: string): [Date, Date] => {
  const startDate = parseUTCDate(dateStr);
  const nextDate = new Date(startDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  return [startDate, nextDate];
};

/**
 * 현재 날짜를 UTC 기준 0시로 반환
 * 한국 시간대(Asia/Seoul) 기준 오늘 날짜를 UTC 00:00:00으로 변환
 * 서버가 어느 타임존에서 실행되든 항상 한국 시간 기준으로 동작
 */
export const getTodayUTC = (): Date => {
  // 한국 시간대로 현재 날짜를 YYYY-MM-DD 형식으로 변환
  // 'sv-SE' 로케일을 사용하면 ISO 형식(YYYY-MM-DD)으로 출력됨
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(new Date()); // "2026-02-04" 형식 (현재 날짜)
  // UTC 기준으로 파싱하여 반환
  return parseUTCDate(dateStr);
};
