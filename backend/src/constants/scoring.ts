/**
 * 점수 및 히트맵 관련 상수
 */

// 히트맵 과제 가중치
export const HEATMAP_TASK_WEIGHT = parseInt(process.env.HEATMAP_TASK_WEIGHT || '30', 10);

// 히트맵 레벨 임계값
export const HEATMAP_LEVEL_THRESHOLDS = {
  LEVEL_0: 0,
  LEVEL_1: parseInt(process.env.HEATMAP_LEVEL_1 || '60', 10),
  LEVEL_2: parseInt(process.env.HEATMAP_LEVEL_2 || '180', 10),
  LEVEL_3: parseInt(process.env.HEATMAP_LEVEL_3 || '300', 10),
} as const;

/**
 * 점수를 히트맵 레벨로 변환
 * @param score 점수 (과제 수 * 가중치 + 학습 시간)
 * @returns 0-4 사이의 레벨
 */
export function scoreToLevel(score: number): 0 | 1 | 2 | 3 | 4 {
  if (score === 0) return 0;
  if (score <= HEATMAP_LEVEL_THRESHOLDS.LEVEL_1) return 1;
  if (score <= HEATMAP_LEVEL_THRESHOLDS.LEVEL_2) return 2;
  if (score <= HEATMAP_LEVEL_THRESHOLDS.LEVEL_3) return 3;
  return 4;
}
