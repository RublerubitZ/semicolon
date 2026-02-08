import { prisma } from './prisma';
import { getTodayUTC, setUTCMidnight } from './date-utils';
import { HEATMAP_DAYS, HEATMAP_TASK_WEIGHT, scoreToLevel } from '../constants';

export interface HeatmapData {
  date: string; // YYYY-MM-DD
  taskCount: number; // 승인된 과제 수
  studyTime: number; // 학습 시간 (분)
  score: number; // 혼합 점수
  level: 0 | 1 | 2 | 3 | 4; // 색상 농도 레벨
}

/**
 * 히트맵 데이터 생성
 * @param menteeId - 멘티 ID
 * @param endDate - 종료일 (기본값: 오늘, UTC 기준)
 * @returns HEATMAP_DAYS일치 히트맵 데이터 배열
 */
export async function generateHeatmapData(
  menteeId: string,
  endDate?: Date
): Promise<HeatmapData[]> {
  try {
    // 종료일 (기본값: 오늘)
    const end = endDate ? setUTCMidnight(endDate) : getTodayUTC();

    // 시작일 (HEATMAP_DAYS일 전)
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (HEATMAP_DAYS - 1)); // 오늘 포함

    console.log(
      `[Heatmap] Generating heatmap for mentee ${menteeId} from ${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`
    );

    // 1. 승인된 과제 조회 (isApproved = true)
    const tasks = await prisma.task.findMany({
      where: {
        menteeId,
        date: {
          gte: start,
          lte: end,
        },
        isApproved: true,
      },
      select: {
        date: true,
      },
    });

    // 2. 학습 시간 로그 조회
    const studyLogs = await prisma.studyTimeLog.findMany({
      where: {
        menteeId,
        date: {
          gte: start,
          lte: end,
        },
      },
      select: {
        date: true,
        duration: true,
      },
    });

    // 3. 날짜별로 그룹화
    const dataMap = new Map<
      string,
      { taskCount: number; studyTime: number }
    >();

    // 과제 카운트
    for (const task of tasks) {
      const dateKey = task.date.toISOString().split('T')[0];
      const existing = dataMap.get(dateKey) || { taskCount: 0, studyTime: 0 };
      existing.taskCount += 1;
      dataMap.set(dateKey, existing);
    }

    // 학습 시간 합산
    for (const log of studyLogs) {
      const dateKey = log.date.toISOString().split('T')[0];
      const existing = dataMap.get(dateKey) || { taskCount: 0, studyTime: 0 };
      existing.studyTime += log.duration;
      dataMap.set(dateKey, existing);
    }

    // 4. HEATMAP_DAYS일치 배열 생성 (빈 날짜 포함)
    const heatmapData: HeatmapData[] = [];
    const currentDate = new Date(start);

    for (let i = 0; i < HEATMAP_DAYS; i++) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const data = dataMap.get(dateKey) || { taskCount: 0, studyTime: 0 };

      // 혼합 점수 계산: 과제 가중치 적용
      const score = data.taskCount * HEATMAP_TASK_WEIGHT + data.studyTime;
      const level = scoreToLevel(score);

      heatmapData.push({
        date: dateKey,
        taskCount: data.taskCount,
        studyTime: data.studyTime,
        score,
        level,
      });

      // 다음 날로 이동
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    console.log(
      `[Heatmap] Generated ${heatmapData.length} days of data for mentee ${menteeId}`
    );

    return heatmapData;
  } catch (error) {
    console.error('[Heatmap Error] Failed to generate heatmap data:', {
      menteeId,
      endDate: endDate?.toISOString(),
      error,
    });
    throw error;
  }
}

/**
 * 특정 연도의 히트맵 데이터 생성
 * @param menteeId - 멘티 ID
 * @param year - 연도 (예: 2026)
 * @returns 해당 연도의 히트맵 데이터
 */
export async function generateYearlyHeatmap(
  menteeId: string,
  year: number
): Promise<HeatmapData[]> {
  // 해당 연도의 마지막 날 (12월 31일)
  const endDate = new Date(Date.UTC(year, 11, 31));

  return generateHeatmapData(menteeId, endDate);
}
