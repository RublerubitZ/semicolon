import { prisma } from './prisma';
import { getTodayUTC } from './date-utils';

export interface WeeklyRankingItem {
  menteeId: string;
  menteeName: string;
  profileImage: string | null;
  totalStudyTime: number; // 분 단위
  completedTasks: number;
  rank: number;
}

/**
 * 주의 시작일 (월요일) 계산
 * @param date - 기준 날짜 (기본값: 오늘)
 * @returns 주의 시작일 (월요일 00:00 UTC)
 */
function getWeekStart(date?: Date): Date {
  const d = date ? new Date(date) : getTodayUTC();
  const day = d.getUTCDay(); // 0 (일요일) ~ 6 (토요일)

  // 월요일 (1)을 주의 시작으로 설정
  const diff = day === 0 ? -6 : 1 - day; // 일요일이면 -6, 그 외는 1 - day

  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);

  return monday;
}

/**
 * 주간 랭킹 계산 (같은 멘토 소속 멘티들)
 * @param mentorId - 멘토 ID
 * @param weekStartDate - 주 시작일 (월요일, 기본값: 이번 주 월요일)
 * @returns 랭킹 배열 (학습 시간 내림차순)
 */
export async function calculateWeeklyRanking(
  mentorId: string,
  weekStartDate?: Date
): Promise<WeeklyRankingItem[]> {
  try {
    // 1. 주 범위 계산 (월요일 ~ 일요일)
    const start = weekStartDate ? getWeekStart(weekStartDate) : getWeekStart();
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6); // +6일 = 일요일
    end.setUTCHours(23, 59, 59, 999);

    console.log(
      `[Ranking] Calculating weekly ranking for mentor ${mentorId} from ${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`
    );

    // 2. 같은 멘토 소속 멘티들 조회
    const mentorRelations = await prisma.mentorMentee.findMany({
      where: { mentorId },
      include: {
        mentee: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
      },
    });

    if (mentorRelations.length === 0) {
      console.log(`[Ranking] No mentees found for mentor ${mentorId}`);
      return [];
    }

    // 3. 각 멘티의 주간 통계 계산 (N+1 쿼리 해결)
    const menteeIds = mentorRelations.map((r) => r.menteeId);

    // 모든 멘티의 학습 시간 한 번에 조회
    const [studyLogs, tasks] = await Promise.all([
      prisma.studyTimeLog.findMany({
        where: {
          menteeId: { in: menteeIds },
          date: {
            gte: start,
            lte: end,
          },
        },
        select: {
          menteeId: true,
          duration: true,
        },
      }),
      prisma.task.findMany({
        where: {
          menteeId: { in: menteeIds },
          date: {
            gte: start,
            lte: end,
          },
          isApproved: true,
        },
        select: {
          menteeId: true,
        },
      }),
    ]);

    // 멘티별로 그룹화
    const studyTimeByMentee = studyLogs.reduce(
      (acc, log) => {
        acc[log.menteeId] = (acc[log.menteeId] || 0) + log.duration;
        return acc;
      },
      {} as Record<string, number>
    );

    const taskCountByMentee = tasks.reduce(
      (acc, task) => {
        acc[task.menteeId] = (acc[task.menteeId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // 랭킹 데이터 생성
    const rankings: Omit<WeeklyRankingItem, 'rank'>[] = mentorRelations.map(
      (relation) => ({
        menteeId: relation.menteeId,
        menteeName: relation.mentee.name,
        profileImage: relation.mentee.profileImage,
        totalStudyTime: studyTimeByMentee[relation.menteeId] || 0,
        completedTasks: taskCountByMentee[relation.menteeId] || 0,
      })
    );

    // 4. 학습 시간 기준 내림차순 정렬
    rankings.sort((a, b) => {
      // 1순위: 학습 시간
      if (b.totalStudyTime !== a.totalStudyTime) {
        return b.totalStudyTime - a.totalStudyTime;
      }
      // 2순위: 완료 과제 수
      return b.completedTasks - a.completedTasks;
    });

    // 5. rank 할당
    const rankingsWithRank: WeeklyRankingItem[] = rankings.map(
      (item, index) => ({
        ...item,
        rank: index + 1,
      })
    );

    console.log(
      `[Ranking] Generated ranking for ${rankingsWithRank.length} mentees`
    );

    return rankingsWithRank;
  } catch (error) {
    console.error('[Ranking Error] Failed to calculate weekly ranking:', {
      mentorId,
      weekStartDate: weekStartDate?.toISOString(),
      error,
    });
    throw error;
  }
}

/**
 * 멘티가 속한 멘토의 주간 랭킹 조회 (멘티용)
 * @param menteeId - 멘티 ID
 * @param weekStartDate - 주 시작일 (월요일, 기본값: 이번 주 월요일)
 * @returns 랭킹 배열 및 본인 랭킹 정보
 */
export async function getMenteeWeeklyRanking(
  menteeId: string,
  weekStartDate?: Date
): Promise<{
  rankings: WeeklyRankingItem[];
  myRank: WeeklyRankingItem | null;
}> {
  try {
    // 1. 멘티가 속한 멘토 찾기
    const relation = await prisma.mentorMentee.findFirst({
      where: { menteeId },
    });

    if (!relation) {
      console.log(`[Ranking] No mentor found for mentee ${menteeId}`);
      return { rankings: [], myRank: null };
    }

    // 2. 해당 멘토의 주간 랭킹 조회
    const rankings = await calculateWeeklyRanking(
      relation.mentorId,
      weekStartDate
    );

    // 3. 본인 랭킹 찾기
    const myRank = rankings.find((r) => r.menteeId === menteeId) || null;

    return { rankings, myRank };
  } catch (error) {
    console.error(
      '[Ranking Error] Failed to get mentee weekly ranking:',
      {
        menteeId,
        weekStartDate: weekStartDate?.toISOString(),
        error,
      }
    );
    throw error;
  }
}
