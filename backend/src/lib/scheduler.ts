import cron from 'node-cron';
import { prisma } from './prisma';
import { getTodayUTC } from './date-utils';
import { createNotification, notifyStreakBroken } from './notifications';
import { CRON_SCHEDULES, SCHEDULER_TIMEZONE } from '../constants';

/**
 * 리마인더 스케줄러
 * - 매일 오전 9시: 오늘의 과제 리마인더
 * - 매일 저녁 9시: 미완료 과제 알림
 */

// 오전 9시 - 오늘의 과제 리마인더
export const sendDailyTaskReminder = async () => {
  try {
    console.log('[Scheduler] Running daily task reminder at 9 AM (KST)...');

    const today = getTodayUTC();

    // 오늘 날짜의 모든 과제 조회 (isFixed = true인 멘토 지정 과제만)
    const tasks = await prisma.task.findMany({
      where: {
        date: today,
        isFixed: true,
        isApproved: false, // 아직 승인되지 않은 과제
      },
      include: {
        mentee: { select: { id: true, name: true } },
      },
    });

    console.log(`[Scheduler] Found ${tasks.length} tasks for today`);

    // 멘티별로 그룹화
    const tasksByMentee = tasks.reduce((acc, task) => {
      const menteeId = task.menteeId;
      if (!acc[menteeId]) {
        acc[menteeId] = [];
      }
      acc[menteeId].push(task);
      return acc;
    }, {} as Record<string, typeof tasks>);

    // 각 멘티에게 알림 전송
    for (const [menteeId, menteeTasks] of Object.entries(tasksByMentee)) {
      const taskCount = menteeTasks.length;
      const taskTitles = menteeTasks.map((t) => t.title).join(', ');

      await createNotification({
        userId: menteeId,
        type: 'REMINDER',
        title: `오늘의 과제 ${taskCount}개가 있습니다`,
        content: `${taskTitles}`,
      });

      console.log(`[Scheduler] Sent reminder to mentee ${menteeId} for ${taskCount} tasks`);
    }

    console.log('[Scheduler] Daily task reminder completed');
  } catch (error) {
    console.error('[Scheduler Error] Failed to send daily task reminder:', error);
  }
};

// 저녁 9시 - 미완료 과제 알림
export const sendIncompleteTaskNotification = async () => {
  try {
    console.log('[Scheduler] Running incomplete task notification at 9 PM (KST)...');

    const today = getTodayUTC();

    // 오늘 날짜의 미완료 과제 조회 (제출되지 않은 과제)
    const incompleteTasks = await prisma.task.findMany({
      where: {
        date: today,
        isFixed: true,
        isApproved: false, // 아직 승인되지 않음
        submissions: {
          none: {}, // 제출 내역이 없음
        },
      },
      include: {
        mentee: { select: { id: true, name: true } },
      },
    });

    console.log(`[Scheduler] Found ${incompleteTasks.length} incomplete tasks for today`);

    // 멘티별로 그룹화
    const tasksByMentee = incompleteTasks.reduce((acc, task) => {
      const menteeId = task.menteeId;
      if (!acc[menteeId]) {
        acc[menteeId] = [];
      }
      acc[menteeId].push(task);
      return acc;
    }, {} as Record<string, typeof incompleteTasks>);

    // 각 멘티에게 알림 전송
    for (const [menteeId, menteeTasks] of Object.entries(tasksByMentee)) {
      const taskCount = menteeTasks.length;
      const taskTitles = menteeTasks.map((t) => t.title).join(', ');

      await createNotification({
        userId: menteeId,
        type: 'TASK_INCOMPLETE',
        title: `미완료 과제 ${taskCount}개가 있습니다`,
        content: `${taskTitles}`,
      });

      console.log(`[Scheduler] Sent incomplete task notification to mentee ${menteeId} for ${taskCount} tasks`);
    }

    console.log('[Scheduler] Incomplete task notification completed');
  } catch (error) {
    console.error('[Scheduler Error] Failed to send incomplete task notification:', error);
  }
};

// 저녁 10시 - 데일리 피드백 미작성 알림
export const sendDailyFeedbackReminder = async () => {
  try {
    console.log('[Scheduler] Running daily feedback reminder at 10 PM (KST)...');

    const today = getTodayUTC();

    // 모든 멘토-멘티 관계 조회
    const mentorMentees = await prisma.mentorMentee.findMany({
      include: {
        mentor: {
          select: {
            id: true,
            name: true,
          },
        },
        mentee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`[Scheduler] Found ${mentorMentees.length} mentor-mentee relationships`);

    // 멘토별로 그룹화
    const mentorGroups = mentorMentees.reduce((acc, relation) => {
      const mentorId = relation.mentorId;
      if (!acc[mentorId]) {
        acc[mentorId] = {
          mentorName: relation.mentor.name,
          mentees: [],
        };
      }
      acc[mentorId].mentees.push({
        id: relation.menteeId,
        name: relation.mentee.name,
      });
      return acc;
    }, {} as Record<string, { mentorName: string; mentees: { id: string; name: string }[] }>);

    // 각 멘토에 대해 오늘 피드백 작성 여부 확인
    for (const [mentorId, { mentees }] of Object.entries(mentorGroups)) {
      // 오늘 작성된 데일리 피드백 조회
      const todayFeedbacks = await prisma.dailyFeedback.findMany({
        where: {
          mentorId,
          date: today,
        },
        select: {
          menteeId: true,
        },
      });

      const feedbackWrittenMenteeIds = new Set(todayFeedbacks.map((fb) => fb.menteeId));

      // 피드백을 작성하지 않은 멘티 찾기
      const menteesWithoutFeedback = mentees.filter((mentee) => !feedbackWrittenMenteeIds.has(mentee.id));

      // 피드백을 작성하지 않은 멘티가 있으면 알림 전송
      if (menteesWithoutFeedback.length > 0) {
        const menteeNames = menteesWithoutFeedback.map((m) => m.name).join(', ');

        await createNotification({
          userId: mentorId,
          type: 'DAILY_FEEDBACK_REMINDER',
          title: `오늘의 데일리 피드백을 작성해주세요`,
          content: `${menteesWithoutFeedback.length}명의 멘티에게 피드백이 필요합니다: ${menteeNames}`,
        });

        console.log(
          `[Scheduler] Sent feedback reminder to mentor ${mentorId} for ${menteesWithoutFeedback.length} mentees`
        );
      }
    }

    console.log('[Scheduler] Daily feedback reminder completed');
  } catch (error) {
    console.error('[Scheduler Error] Failed to send daily feedback reminder:', error);
  }
};

// 자정 1시 - 스트릭 깨짐 체크
export const checkStreakBreaks = async () => {
  try {
    console.log('[Scheduler] Running streak break check at 1 AM (KST)...');

    // 어제 날짜 계산
    const yesterday = getTodayUTC();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    // 어제보다 이전에 마지막 학습한 멘티들 조회 (currentStreak > 0)
    const activeStreaks = await prisma.studyStreak.findMany({
      where: {
        currentStreak: { gt: 0 },
        lastStudyDate: { lt: yesterday },
      },
      include: {
        mentee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`[Scheduler] Found ${activeStreaks.length} streaks to break`);

    // 각 멘티의 스트릭 초기화 + 멘토에게 알림
    for (const streak of activeStreaks) {
      try {
        // 멘토 찾기
        const mentorRelation = await prisma.mentorMentee.findFirst({
          where: { menteeId: streak.menteeId },
          include: { mentor: true },
        });

        if (!mentorRelation) {
          console.log(`[Scheduler] No mentor found for mentee ${streak.menteeId}`);
          continue;
        }

        // 스트릭 초기화
        await prisma.studyStreak.update({
          where: { id: streak.id },
          data: { currentStreak: 0 },
        });

        // 멘토에게 알림 전송
        await notifyStreakBroken({
          mentorId: mentorRelation.mentorId,
          menteeName: streak.mentee.name,
          streakDays: streak.currentStreak,
          lastStudyDate: streak.lastStudyDate?.toISOString().split('T')[0] || '',
          menteeId: streak.menteeId,
        });

        console.log(
          `[Scheduler] Broke ${streak.currentStreak}-day streak for mentee ${streak.mentee.name} and notified mentor`
        );
      } catch (streakError) {
        console.error('[Scheduler Error] Failed to process streak break:', {
          menteeId: streak.menteeId,
          error: streakError,
        });
        // 개별 스트릭 처리 실패해도 계속 진행
      }
    }

    console.log('[Scheduler] Streak break check completed');
  } catch (error) {
    console.error('[Scheduler Error] Failed to check streak breaks:', error);
  }
};

/**
 * 스케줄러 시작
 */
export const startScheduler = () => {
  console.log('[Scheduler] Starting schedulers...');

  // 매일 오전 9시 (한국 시간 기준) - 일일 과제 리마인더
  cron.schedule(CRON_SCHEDULES.DAILY_TASK_REMINDER, sendDailyTaskReminder, {
    timezone: SCHEDULER_TIMEZONE,
  });

  // 매일 저녁 9시 (한국 시간 기준) - 미완료 과제 알림
  cron.schedule(CRON_SCHEDULES.INCOMPLETE_TASK_NOTIFICATION, sendIncompleteTaskNotification, {
    timezone: SCHEDULER_TIMEZONE,
  });

  // 매일 저녁 10시 (한국 시간 기준) - 데일리 피드백 미작성 알림
  cron.schedule(CRON_SCHEDULES.DAILY_FEEDBACK_REMINDER, sendDailyFeedbackReminder, {
    timezone: SCHEDULER_TIMEZONE,
  });

  // 매일 자정 1시 (한국 시간 기준) - 스트릭 체크
  cron.schedule(CRON_SCHEDULES.STREAK_CHECK, checkStreakBreaks, {
    timezone: SCHEDULER_TIMEZONE,
  });

  console.log('[Scheduler] Schedulers started');
  console.log('[Scheduler] - Daily task reminder: Every day at 9 AM (KST)');
  console.log('[Scheduler] - Incomplete task notification: Every day at 9 PM (KST)');
  console.log('[Scheduler] - Daily feedback reminder: Every day at 10 PM (KST)');
  console.log('[Scheduler] - Streak break check: Every day at 1 AM (KST)');
};
