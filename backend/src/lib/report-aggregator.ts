/**
 * 리포트 데이터 집계 유틸리티
 * 주간/월간 리포트, 학습 패턴 분석, 과목별 트렌드
 */

import { prisma } from './prisma';
import { isTaskCompleted } from './task-utils';

interface SubjectStat {
  subject: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  studyTime: number;
}

interface DailyStat {
  date: string;
  totalTasks: number;
  completedTasks: number;
  studyTime: number;
  subjects: string[];
}

interface StudyPattern {
  busiestDay: string | null;
  busiestDayMinutes: number;
  averageDaily: number;
  dayOfWeekDistribution: { day: string; minutes: number }[];
  timeSlotDistribution: { slot: string; minutes: number }[];
}

export interface WeeklyReport {
  startDate: string;
  endDate: string;
  summary: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalStudyTime: number;
    feedbackCount: number;
  };
  dailyStats: DailyStat[];
  subjectStats: SubjectStat[];
  studyPattern: StudyPattern;
  comparison: {
    completionRateChange: number;
    studyTimeChange: number;
    taskCountChange: number;
  } | null;
}

export interface MonthlyReport {
  year: number;
  month: number;
  summary: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalStudyTime: number;
    feedbackCount: number;
  };
  weeklyBreakdown: {
    weekNumber: number;
    startDate: string;
    endDate: string;
    totalTasks: number;
    completedTasks: number;
    studyTime: number;
  }[];
  subjectStats: SubjectStat[];
  studyPattern: StudyPattern;
  comparison: {
    completionRateChange: number;
    studyTimeChange: number;
    taskCountChange: number;
  } | null;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const TIME_SLOTS = [
  { label: '새벽 (0-6시)', start: 0, end: 6 },
  { label: '오전 (6-12시)', start: 6, end: 12 },
  { label: '오후 (12-18시)', start: 12, end: 18 },
  { label: '저녁 (18-24시)', start: 18, end: 24 },
];

/**
 * 기간 내 태스크 + 관련 데이터 조회
 */
async function fetchTasksForPeriod(menteeId: string, start: Date, end: Date) {
  return prisma.task.findMany({
    where: { menteeId, date: { gte: start, lte: end } },
    include: {
      submissions: { select: { id: true } },
      studyLogs: true,
      feedbacks: { select: { id: true } },
    },
    orderBy: { date: 'asc' },
  });
}

/**
 * 학습 패턴 분석
 */
function analyzeStudyPattern(
  tasks: Awaited<ReturnType<typeof fetchTasksForPeriod>>
): StudyPattern {
  const dayMinutes: Record<number, number> = {};
  const slotMinutes: Record<string, number> = {};

  for (const task of tasks) {
    const dayOfWeek = task.date.getUTCDay();
    for (const log of task.studyLogs) {
      dayMinutes[dayOfWeek] = (dayMinutes[dayOfWeek] || 0) + log.duration;

      if (log.startTime) {
        const hour = parseInt(log.startTime.split(':')[0], 10);
        const slot = TIME_SLOTS.find(s => hour >= s.start && hour < s.end);
        if (slot) {
          slotMinutes[slot.label] = (slotMinutes[slot.label] || 0) + log.duration;
        }
      }
    }
  }

  const dayOfWeekDistribution = DAY_NAMES.map((day, i) => ({
    day,
    minutes: dayMinutes[i] || 0,
  }));

  const timeSlotDistribution = TIME_SLOTS.map(s => ({
    slot: s.label,
    minutes: slotMinutes[s.label] || 0,
  }));

  let busiestDay: string | null = null;
  let busiestDayMinutes = 0;
  for (const entry of dayOfWeekDistribution) {
    if (entry.minutes > busiestDayMinutes) {
      busiestDay = entry.day;
      busiestDayMinutes = entry.minutes;
    }
  }

  const activeDays = dayOfWeekDistribution.filter(d => d.minutes > 0).length;
  const totalMinutes = dayOfWeekDistribution.reduce((sum, d) => sum + d.minutes, 0);
  const averageDaily = activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0;

  return {
    busiestDay,
    busiestDayMinutes,
    averageDaily,
    dayOfWeekDistribution,
    timeSlotDistribution,
  };
}

/**
 * 태스크 배열에서 통계 추출
 */
function extractStats(tasks: Awaited<ReturnType<typeof fetchTasksForPeriod>>) {
  const mentorTasks = tasks.filter(t => t.isFixed);
  const completedMentorTasks = mentorTasks.filter(isTaskCompleted);
  const totalStudyTime = tasks.reduce(
    (sum, t) => sum + t.studyLogs.reduce((s, l) => s + l.duration, 0),
    0
  );
  const feedbackCount = tasks.reduce((sum, t) => sum + t.feedbacks.length, 0);

  return {
    totalTasks: mentorTasks.length,
    completedTasks: completedMentorTasks.length,
    completionRate: mentorTasks.length > 0
      ? Math.round((completedMentorTasks.length / mentorTasks.length) * 100)
      : 0,
    totalStudyTime,
    feedbackCount,
  };
}

/**
 * 과목별 통계
 */
function extractSubjectStats(tasks: Awaited<ReturnType<typeof fetchTasksForPeriod>>): SubjectStat[] {
  const map: Record<string, { total: number; completed: number; studyTime: number }> = {};

  for (const task of tasks) {
    if (!task.isFixed) continue;
    if (!map[task.subject]) {
      map[task.subject] = { total: 0, completed: 0, studyTime: 0 };
    }
    map[task.subject].total++;
    if (isTaskCompleted(task)) {
      map[task.subject].completed++;
    }
    map[task.subject].studyTime += task.studyLogs.reduce((s, l) => s + l.duration, 0);
  }

  return Object.entries(map).map(([subject, stat]) => ({
    subject,
    totalTasks: stat.total,
    completedTasks: stat.completed,
    completionRate: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0,
    studyTime: stat.studyTime,
  }));
}

/**
 * 일별 통계
 */
function extractDailyStats(tasks: Awaited<ReturnType<typeof fetchTasksForPeriod>>): DailyStat[] {
  const map: Record<string, DailyStat> = {};

  for (const task of tasks) {
    const dateKey = task.date.toISOString().split('T')[0];
    if (!map[dateKey]) {
      map[dateKey] = { date: dateKey, totalTasks: 0, completedTasks: 0, studyTime: 0, subjects: [] };
    }
    if (task.isFixed) {
      map[dateKey].totalTasks++;
      if (isTaskCompleted(task)) map[dateKey].completedTasks++;
    }
    map[dateKey].studyTime += task.studyLogs.reduce((s, l) => s + l.duration, 0);
    if (!map[dateKey].subjects.includes(task.subject)) {
      map[dateKey].subjects.push(task.subject);
    }
  }

  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 주간 리포트 집계
 */
export async function aggregateWeeklyReport(
  menteeId: string,
  startDateStr: string
): Promise<WeeklyReport> {
  const start = new Date(startDateStr + 'T00:00:00.000Z');
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);

  // 이전 주
  const prevStart = new Date(start);
  prevStart.setUTCDate(prevStart.getUTCDate() - 7);
  const prevEnd = new Date(start);
  prevEnd.setUTCMilliseconds(-1);

  const [tasks, prevTasks] = await Promise.all([
    fetchTasksForPeriod(menteeId, start, end),
    fetchTasksForPeriod(menteeId, prevStart, prevEnd),
  ]);

  const summary = extractStats(tasks);
  const prevSummary = extractStats(prevTasks);

  const comparison = prevTasks.length > 0
    ? {
        completionRateChange: summary.completionRate - prevSummary.completionRate,
        studyTimeChange: summary.totalStudyTime - prevSummary.totalStudyTime,
        taskCountChange: summary.totalTasks - prevSummary.totalTasks,
      }
    : null;

  return {
    startDate: startDateStr,
    endDate: end.toISOString().split('T')[0],
    summary,
    dailyStats: extractDailyStats(tasks),
    subjectStats: extractSubjectStats(tasks),
    studyPattern: analyzeStudyPattern(tasks),
    comparison,
  };
}

/**
 * 월간 리포트 집계
 */
export async function aggregateMonthlyReport(
  menteeId: string,
  year: number,
  month: number
): Promise<MonthlyReport> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  // 이전 월
  const prevStart = new Date(Date.UTC(year, month - 2, 1));
  const prevEnd = new Date(Date.UTC(year, month - 1, 0, 23, 59, 59, 999));

  const [tasks, prevTasks] = await Promise.all([
    fetchTasksForPeriod(menteeId, start, end),
    fetchTasksForPeriod(menteeId, prevStart, prevEnd),
  ]);

  const summary = extractStats(tasks);
  const prevSummary = extractStats(prevTasks);

  const comparison = prevTasks.length > 0
    ? {
        completionRateChange: summary.completionRate - prevSummary.completionRate,
        studyTimeChange: summary.totalStudyTime - prevSummary.totalStudyTime,
        taskCountChange: summary.totalTasks - prevSummary.totalTasks,
      }
    : null;

  // 주차별 분류
  const weeklyBreakdown: MonthlyReport['weeklyBreakdown'] = [];
  let weekStart = new Date(start);
  let weekNum = 1;

  while (weekStart <= end) {
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const actualEnd = weekEnd > end ? end : weekEnd;

    const weekTasks = tasks.filter(t => t.date >= weekStart && t.date <= actualEnd);
    const weekMentorTasks = weekTasks.filter(t => t.isFixed);

    weeklyBreakdown.push({
      weekNumber: weekNum,
      startDate: weekStart.toISOString().split('T')[0],
      endDate: actualEnd.toISOString().split('T')[0],
      totalTasks: weekMentorTasks.length,
      completedTasks: weekMentorTasks.filter(isTaskCompleted).length,
      studyTime: weekTasks.reduce(
        (sum, t) => sum + t.studyLogs.reduce((s, l) => s + l.duration, 0),
        0
      ),
    });

    weekStart = new Date(weekEnd);
    weekStart.setUTCDate(weekStart.getUTCDate() + 1);
    weekNum++;
  }

  return {
    year,
    month,
    summary,
    weeklyBreakdown,
    subjectStats: extractSubjectStats(tasks),
    studyPattern: analyzeStudyPattern(tasks),
    comparison,
  };
}

/**
 * 과목별 N개월 트렌드
 */
export async function calculateSubjectTrends(
  menteeId: string,
  months: number = 6
) {
  const now = new Date();
  const trends: {
    month: string;
    subjects: Record<string, { studyTime: number; completionRate: number; taskCount: number }>;
  }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1 - i;
    const adjYear = month <= 0 ? year - 1 : year;
    const adjMonth = month <= 0 ? month + 12 : month;

    const start = new Date(Date.UTC(adjYear, adjMonth - 1, 1));
    const end = new Date(Date.UTC(adjYear, adjMonth, 0, 23, 59, 59, 999));

    const tasks = await fetchTasksForPeriod(menteeId, start, end);
    const subjects: Record<string, { studyTime: number; completionRate: number; taskCount: number }> = {};

    for (const task of tasks) {
      if (!task.isFixed) continue;
      if (!subjects[task.subject]) {
        subjects[task.subject] = { studyTime: 0, completionRate: 0, taskCount: 0 };
      }
      subjects[task.subject].taskCount++;
      subjects[task.subject].studyTime += task.studyLogs.reduce((s, l) => s + l.duration, 0);
    }

    // 완료율 계산
    for (const subj of Object.keys(subjects)) {
      const subjectTasks = tasks.filter(t => t.isFixed && t.subject === subj);
      const completed = subjectTasks.filter(isTaskCompleted).length;
      subjects[subj].completionRate = subjectTasks.length > 0
        ? Math.round((completed / subjectTasks.length) * 100)
        : 0;
    }

    trends.push({
      month: `${adjYear}-${String(adjMonth).padStart(2, '0')}`,
      subjects,
    });
  }

  return trends;
}
