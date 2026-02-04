import cron from 'node-cron';
import { prisma } from './prisma';
import { getTodayUTC } from './date-utils';
import { createNotification } from './notifications';

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

/**
 * 스케줄러 시작
 */
export const startScheduler = () => {
  console.log('[Scheduler] Starting schedulers...');

  // 매일 오전 9시 (한국 시간 기준)
  // Cron: 분 시 일 월 요일
  cron.schedule('0 9 * * *', sendDailyTaskReminder, {
    timezone: 'Asia/Seoul',
  });

  // 매일 저녁 9시 (한국 시간 기준)
  cron.schedule('0 21 * * *', sendIncompleteTaskNotification, {
    timezone: 'Asia/Seoul',
  });

  console.log('[Scheduler] Schedulers started');
  console.log('[Scheduler] - Daily task reminder: Every day at 9 AM (KST)');
  console.log('[Scheduler] - Incomplete task notification: Every day at 9 PM (KST)');
};
