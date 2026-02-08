import { prisma } from './prisma';
import { setUTCMidnight } from './date-utils';

/**
 * 스트릭 업데이트 함수
 * @description 과제 승인 또는 학습 시간 기록 시 호출
 * @param menteeId - 멘티 ID
 * @param studyDate - 학습 날짜 (UTC Date)
 */
export async function updateStreak(
  menteeId: string,
  studyDate: Date
): Promise<void> {
  try {
    // studyDate를 UTC 자정으로 정규화
    const normalizedDate = setUTCMidnight(studyDate);

    // StudyStreak 조회 (없으면 생성)
    let streak = await prisma.studyStreak.findUnique({
      where: { menteeId },
    });

    if (!streak) {
      // 처음 생성: 현재 스트릭 1일
      streak = await prisma.studyStreak.create({
        data: {
          menteeId,
          currentStreak: 1,
          longestStreak: 1,
          lastStudyDate: normalizedDate,
        },
      });
      console.log(
        `[Streak] Created new streak for mentee ${menteeId}: 1 day`
      );
      return;
    }

    // lastStudyDate가 없는 경우 (초기 상태)
    if (!streak.lastStudyDate) {
      await prisma.studyStreak.update({
        where: { id: streak.id },
        data: {
          currentStreak: 1,
          longestStreak: Math.max(1, streak.longestStreak),
          lastStudyDate: normalizedDate,
        },
      });
      console.log(
        `[Streak] Initialized streak for mentee ${menteeId}: 1 day`
      );
      return;
    }

    // lastStudyDate를 UTC 자정으로 정규화
    const lastDate = setUTCMidnight(streak.lastStudyDate);

    // 날짜 차이 계산 (일 단위)
    const daysDiff = Math.floor(
      (normalizedDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 0) {
      // 같은 날: 변화 없음 (중복 호출 방지)
      console.log(
        `[Streak] Same day for mentee ${menteeId}, no change`
      );
      return;
    } else if (daysDiff === 1) {
      // 연속 (어제 + 1일 = 오늘): currentStreak++
      const newStreak = streak.currentStreak + 1;
      const newLongestStreak = Math.max(newStreak, streak.longestStreak);

      await prisma.studyStreak.update({
        where: { id: streak.id },
        data: {
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
          lastStudyDate: normalizedDate,
        },
      });

      console.log(
        `[Streak] Extended streak for mentee ${menteeId}: ${newStreak} days (longest: ${newLongestStreak})`
      );
    } else if (daysDiff > 1) {
      // 건너뜀 (1일 이상 차이): currentStreak = 1 (초기화)
      const newLongestStreak = Math.max(1, streak.longestStreak);

      await prisma.studyStreak.update({
        where: { id: streak.id },
        data: {
          currentStreak: 1,
          longestStreak: newLongestStreak,
          lastStudyDate: normalizedDate,
        },
      });

      console.log(
        `[Streak] Reset streak for mentee ${menteeId} (gap: ${daysDiff} days), new streak: 1 day`
      );
    } else {
      // daysDiff < 0: 과거 날짜 (무시)
      console.log(
        `[Streak] Ignoring past date for mentee ${menteeId}: ${normalizedDate.toISOString()}`
      );
    }
  } catch (error) {
    console.error('[Streak Error] Failed to update streak:', {
      menteeId,
      studyDate: studyDate.toISOString(),
      error,
    });
    // 스트릭 업데이트 실패가 메인 플로우를 중단하지 않도록 에러를 던지지 않음
  }
}

/**
 * 멘티의 현재 스트릭 정보 조회
 * @param menteeId - 멘티 ID
 * @returns 스트릭 정보 또는 null
 */
export async function getStreak(menteeId: string) {
  try {
    const streak = await prisma.studyStreak.findUnique({
      where: { menteeId },
    });

    return streak;
  } catch (error) {
    console.error('[Streak Error] Failed to get streak:', {
      menteeId,
      error,
    });
    return null;
  }
}
