/**
 * 시간 관련 상수
 */

// 밀리초 단위 시간
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;
export const MS_PER_WEEK = 7 * MS_PER_DAY;
export const MS_PER_YEAR = 365 * MS_PER_DAY;

// 초 단위 시간
export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
export const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
export const SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY;
export const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;

// 분 단위 시간
export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

// 주 시작일 (0 = 일요일, 1 = 월요일)
export const WEEK_START_DAY = 1; // 월요일
