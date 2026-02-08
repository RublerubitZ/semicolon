/**
 * 과제 완료 여부 판단 유틸리티
 *
 * 과제 완료 기준: 멘티가 제출했는지 여부 (submissions.length > 0)
 * 이 기준은 프로젝트 전체에서 일관되게 사용되어야 합니다.
 */

export interface TaskWithSubmissions {
  submissions?: Array<{ id: string }> | null;
}

/**
 * 과제가 완료되었는지 판단 (제출 여부 기준)
 * @param task 과제 객체 (submissions 포함)
 * @returns 제출 여부
 */
export const isTaskCompleted = (task: TaskWithSubmissions): boolean => {
  return task.submissions != null && task.submissions.length > 0;
};

/**
 * 과제 배열에서 완료된 과제 개수 계산
 * @param tasks 과제 배열
 * @returns 완료된 과제 개수
 */
export const countCompletedTasks = (tasks: TaskWithSubmissions[]): number => {
  return tasks.filter(isTaskCompleted).length;
};

/**
 * 과제 완료율 계산
 * @param tasks 과제 배열
 * @returns 완료율 (0-100)
 */
export const calculateCompletionRate = (tasks: TaskWithSubmissions[]): number => {
  if (tasks.length === 0) return 0;
  const completedCount = countCompletedTasks(tasks);
  return Math.round((completedCount / tasks.length) * 100);
};
