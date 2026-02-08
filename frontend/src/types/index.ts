/**
 * 프론트엔드 공유 타입 정의
 * Prisma 스키마 기반으로 API 응답에 사용되는 타입들
 */

/** 과제 제출 */
export interface TaskSubmission {
  id: string;
  taskId: string;
  menteeId: string;
  imageUrls: string[];
  comment?: string;
  createdAt: string;
}

/** 공부 시간 기록 */
export interface StudyTimeLog {
  id: string;
  menteeId: string;
  taskId?: string;
  subject: string;
  date: string;
  duration: number;
  startTime?: string;
  endTime?: string;
  createdAt: string;
}

/** 피드백 */
export interface Feedback {
  id: string;
  taskId: string;
  mentorId: string;
  content: string;
  summary?: string;
  subject: string;
  feedbackDate: string;
  createdAt: string;
  updatedAt: string;
  mentor?: { name: string };
}

/** 데일리 피드백 */
export interface DailyFeedback {
  id: string;
  menteeId: string;
  mentorId: string;
  date: string;
  content: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}
