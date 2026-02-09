/**
 * 스케줄러 관련 상수
 */

// Cron 스케줄 설정
export const CRON_SCHEDULES = {
  // 오전 9시 - 일일 과제 알림
  DAILY_TASK_REMINDER: process.env.DAILY_REMINDER_CRON || '0 9 * * *',

  // 저녁 9시 - 미완료 과제 알림
  INCOMPLETE_TASK_NOTIFICATION: process.env.INCOMPLETE_TASK_CRON || '0 21 * * *',

  // 저녁 10시 - 데일리 피드백 미작성 알림
  DAILY_FEEDBACK_REMINDER: process.env.DAILY_FEEDBACK_REMINDER_CRON || '0 22 * * *',

  // 자정 1시 - 스트릭 체크
  STREAK_CHECK: process.env.STREAK_CHECK_CRON || '0 1 * * *',
} as const;

// 스케줄러 타임존
export const SCHEDULER_TIMEZONE = process.env.TZ || 'Asia/Seoul';
