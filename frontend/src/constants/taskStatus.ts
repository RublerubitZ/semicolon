import { format } from 'date-fns';

export type TaskStatus = 'FEEDBACK_DONE' | 'SUBMITTED' | 'NOT_SUBMITTED' | 'BEFORE_SUBMISSION';

export interface TaskStatusInfo {
  label: string;
  style: string;
}

export const TASK_STATUS_CONFIG: Record<TaskStatus, TaskStatusInfo> = {
  FEEDBACK_DONE: {
    label: '피드백완료',
    style: 'bg-green-100 text-green-600',
  },
  SUBMITTED: {
    label: '제출완료',
    style: 'bg-blue-100 text-blue-600',
  },
  NOT_SUBMITTED: {
    label: '미제출',
    style: 'bg-red-100 text-red-500',
  },
  BEFORE_SUBMISSION: {
    label: '제출전',
    style: 'bg-gray-100 text-gray-400',
  },
};

/**
 * 과제 상태를 판별하는 유틸리티 함수
 */
export function getTaskStatus(task: {
  date: string | Date;
  submissions?: { id: string }[];
  feedbacks?: { id: string }[];
}): TaskStatus {
  // 1. 피드백 완료 여부 우선 확인
  if (task.feedbacks && task.feedbacks.length > 0) {
    return 'FEEDBACK_DONE';
  }

  // 2. 제출 완료 여부 확인
  if (task.submissions && task.submissions.length > 0) {
    return 'SUBMITTED';
  }

  // 3. 미제출 또는 제출전 판별 (날짜 기준)
  const taskDate = new Date(task.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // task.date에서 시간 정보를 제거하고 날짜만 비교하기 위해 처리
  const compareDate = new Date(taskDate);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate < today) {
    return 'NOT_SUBMITTED';
  } else {
    return 'BEFORE_SUBMISSION';
  }
}

/**
 * 과제 상태에 따른 스타일과 라벨 정보를 가져오는 함수
 */
export function getTaskStatusInfo(task: {
  date: string | Date;
  submissions?: { id: string }[];
  feedbacks?: { id: string }[];
}): TaskStatusInfo {
  const status = getTaskStatus(task);
  return TASK_STATUS_CONFIG[status];
}
