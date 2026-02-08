import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { parseUTCDate, getDateRange, getTodayUTC, isValidDateStr } from '../lib/date-utils';
import { updateStreak, getStreak } from '../lib/streak-manager';
import { generateHeatmapData } from '../lib/heatmap-generator';
import { getMenteeWeeklyRanking } from '../lib/ranking-manager';
import { MS_PER_DAY } from '../constants';
import { isTaskCompleted } from '../lib/task-utils';
import { handleError } from '../lib/error-handler';

const router = Router();

router.use(authMiddleware);

// 일일 플래너 조회
router.get('/planner/daily', async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.query;
    if (date && !isValidDateStr(date as string)) {
      return res.status(400).json({ error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' });
    }
    const menteeId = req.user!.userId;
    const [targetDate, nextDay] = date ? getDateRange(date as string) : [getTodayUTC(), new Date(getTodayUTC().getTime() + MS_PER_DAY)];

    const tasks = await prisma.task.findMany({
      where: { menteeId, date: { gte: targetDate, lt: nextDay } },
      include: {
        worksheet: true,
        materials: { orderBy: { order: 'asc' } },
        submissions: true,
        studyLogs: true,
        learningGoal: { include: { items: { orderBy: { order: 'asc' } } } },
        feedbacks: { include: { mentor: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const comment = await prisma.plannerComment.findFirst({
      where: { menteeId, date: { gte: targetDate, lt: nextDay } },
    });

    res.json({ tasks, comment, date: targetDate });
  } catch (error) {
    handleError(
      res,
      {
        endpoint: '/api/mentee/planner/daily',
        userId: req.user?.userId,
        date: req.query.date as string,
      },
      error,
      '플래너 조회에 실패했습니다.',
      'PLANNER_FETCH_FAILED'
    );
  }
});

// 하위 호환용 planner 라우트
router.get('/planner', async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.query;
    if (date && !isValidDateStr(date as string)) {
      return res.status(400).json({ error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' });
    }
    const menteeId = req.user!.userId;
    const [targetDate, nextDay] = date ? getDateRange(date as string) : [getTodayUTC(), new Date(getTodayUTC().getTime() + MS_PER_DAY)];

    const tasks = await prisma.task.findMany({
      where: { menteeId, date: { gte: targetDate, lt: nextDay } },
      include: {
        worksheet: true,
        materials: { orderBy: { order: 'asc' } },
        submissions: true,
        studyLogs: true,
        learningGoal: { include: { items: { orderBy: { order: 'asc' } } } },
        feedbacks: { include: { mentor: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ tasks, date: targetDate });
  } catch (error) {
    console.error('플래너 조회 오류:', error);
    res.status(500).json({ error: '플래너 조회 실패' });
  }
});

// 주간 플래너 조회
router.get('/planner/weekly', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate } = req.query;
    if (startDate && !isValidDateStr(startDate as string)) {
      return res.status(400).json({ error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' });
    }
    const menteeId = req.user!.userId;
    const start = startDate ? parseUTCDate(startDate as string) : getTodayUTC();
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 6);

    const tasks = await prisma.task.findMany({
      where: { menteeId, date: { gte: start, lte: end } },
      include: {
        worksheet: true,
        submissions: true,
        studyLogs: true,
        learningGoal: { include: { items: { orderBy: { order: 'asc' } } } },
        feedbacks: { include: { mentor: { select: { name: true } } } },
      },
      orderBy: { date: 'asc' },
    });

    res.json({ tasks, startDate: start, endDate: end });
  } catch (error) {
    console.error('주간 플래너 조회 오류:', error);
    res.status(500).json({ error: '주간 플래너 조회 실패' });
  }
});

// 월간 플래너 조회 (통계 포함)
router.get('/planner/monthly', async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query;
    const menteeId = req.user!.userId;
    const today = getTodayUTC();
    const targetYear = year ? parseInt(year as string) : today.getUTCFullYear();
    const targetMonth = month ? parseInt(month as string) : today.getUTCMonth() + 1;

    const start = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const end = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    const tasks = await prisma.task.findMany({
      where: { menteeId, date: { gte: start, lte: end } },
      include: { 
        submissions: true, 
        studyLogs: true, 
        learningGoal: { include: { items: true } },
        feedbacks: true
      },
      orderBy: { date: 'asc' },
    });

    const dailyFeedbacks = await prisma.dailyFeedback.findMany({
      where: { menteeId, date: { gte: start, lte: end } },
    });

    const tasksByDate: Record<string, any[]> = {};
    const feedbacksByDate: Record<string, any> = {};
    const subjectStats: Record<string, { total: number; completed: number; studyTime: number }> = {};

    dailyFeedbacks.forEach(fb => {
      const dateKey = fb.date.toISOString().split('T')[0];
      feedbacksByDate[dateKey] = fb;
    });

    let totalStudyTime = 0;
    let completedTasks = 0;
    let totalMentorTasks = 0;

    tasks.forEach(task => {
      const dateKey = task.date.toISOString().split('T')[0];
      if (!tasksByDate[dateKey]) tasksByDate[dateKey] = [];
      tasksByDate[dateKey].push(task);

      const completed = isTaskCompleted(task);
      const taskStudyTime = task.studyLogs.reduce((sum, log) => sum + log.duration, 0);

      if (task.isFixed) {
        totalMentorTasks++;
        if (!subjectStats[task.subject]) {
          subjectStats[task.subject] = { total: 0, completed: 0, studyTime: 0 };
        }
        subjectStats[task.subject].total++;
        if (completed) {
          subjectStats[task.subject].completed++;
          completedTasks++;
        }
      }

      // 학습 시간은 멘티 과제 포함 전체 합산
      if (subjectStats[task.subject]) {
        subjectStats[task.subject].studyTime += taskStudyTime;
      }
      totalStudyTime += taskStudyTime;
    });

    res.json({ 
      tasksByDate, 
      feedbacksByDate,
      year: targetYear, 
      month: targetMonth,
      stats: {
        totalTasks: totalMentorTasks,
        completedTasks,
        totalStudyTime,
        subjectStats
      }
    });
  } catch (error) {
    console.error('월간 플래너 조회 오류:', error);
    res.status(500).json({ error: '월간 플래너 조회 실패' });
  }
});

// 전체 통계 조회
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const menteeId = req.user!.userId;
    const tasks = await prisma.task.findMany({
      where: { menteeId, isFixed: true },
      include: { submissions: true }
    });

    const stats: Record<string, { total: number; completed: number }> = {};

    tasks.forEach(task => {
      if (!stats[task.subject]) {
        stats[task.subject] = { total: 0, completed: 0 };
      }
      stats[task.subject].total++;
      if (task.submissions.length > 0) {
        stats[task.subject].completed++;
      }
    });

    res.json(stats);
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({ error: '통계 조회 실패' });
  }
});

// 할 일 추가
router.post('/tasks', async (req: AuthRequest, res: Response) => {
  try {
    const menteeId = req.user!.userId;
    const { title, description, subject, date } = req.body;
    const task = await prisma.task.create({
      data: { menteeId, title, description, subject, date: parseUTCDate(date), isFixed: false },
    });
    res.status(201).json(task);
  } catch (error) {
    console.error('할 일 생성 오류:', error);
    res.status(500).json({ error: '할 일 생성 실패' });
  }
});

// 할 일 수정
router.put('/tasks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const menteeId = req.user!.userId;
    const { title, description, subject, date } = req.body;
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing || existing.menteeId !== menteeId || existing.isFixed) return res.status(403).json({ error: '수정 권한 없음' });

    const task = await prisma.task.update({
      where: { id },
      data: { 
        title, 
        description, 
        subject,
        ...(date && { date: parseUTCDate(date) })
      },
    });
    res.json(task);
  } catch (error) {
    console.error('할 일 수정 오류:', error);
    res.status(500).json({ error: '할 일 수정 실패' });
  }
});

// 할 일 삭제
router.delete('/tasks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const menteeId = req.user!.userId;
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing || existing.menteeId !== menteeId || existing.isFixed) return res.status(403).json({ error: '삭제 권한 없음' });

    await prisma.$transaction([
      prisma.taskSubmission.deleteMany({ where: { taskId: id } }),
      prisma.feedback.deleteMany({ where: { taskId: id } }),
      prisma.studyTimeLog.deleteMany({ where: { taskId: id } }),
      prisma.task.delete({ where: { id } }),
    ]);
    res.json({ message: '삭제 완료' });
  } catch (error) {
    console.error('할 일 삭제 오류:', error);
    res.status(500).json({ error: '할 일 삭제 실패' });
  }
});

// 자가점검
router.patch('/tasks/:id/self-check', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { selfCheck } = req.body;
    
    if (selfCheck === 'PENDING') {
      // 체크 해제 시 관련 시간 기록 삭제 (트랜잭션 사용)
      await prisma.$transaction([
        prisma.studyTimeLog.deleteMany({ where: { taskId: id } }),
        prisma.task.update({ where: { id }, data: { selfCheck, selfCheckedAt: null } })
      ]);
    } else {
      await prisma.task.update({ where: { id }, data: { selfCheck, selfCheckedAt: new Date() } });
    }
    
    res.json({ message: '저장 완료' });
  } catch (error) {
    console.error('자가점검 저장 오류:', error);
    res.status(500).json({ error: '자가점검 저장 실패' });
  }
});

// 공부 시간 기록 (기존 기록이 있으면 업데이트, 없으면 생성)
router.post('/tasks/:id/time', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const menteeId = req.user!.userId;
    const { duration, date, startTime, endTime } = req.body;

    // 날짜 형식 검증
    if (!date || !isValidDateStr(date)) {
      return res.status(400).json({ error: '유효하지 않은 날짜 형식입니다. YYYY-MM-DD 형식을 사용해주세요.' });
    }

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: '과제 없음' });

    // 해당 과제에 대한 기존 기록들을 트랜잭션으로 삭제 후 생성 (중복 생성 방지)
    const [_, log] = await prisma.$transaction([
      prisma.studyTimeLog.deleteMany({
        where: { taskId: id }
      }),
      prisma.studyTimeLog.create({
        data: { 
          menteeId, 
          taskId: id, 
          subject: task.subject, 
          date: parseUTCDate(date), 
          duration, 
          startTime, 
          endTime 
        },
      })
    ]);

    // 스트릭 업데이트 (학습 시간 기록 시)
    try {
      await updateStreak(menteeId, parseUTCDate(date));
    } catch (streakError) {
      console.error('[Streak Error] Failed to update streak on study time log:', streakError);
      // 스트릭 업데이트 실패해도 학습 시간 기록은 계속 진행
    }

    res.status(201).json(log);
  } catch (error) {
    console.error('시간 기록 오류:', error);
    res.status(500).json({ error: '시간 기록 실패' });
  }
});

// 과제 상세 조회
router.get('/tasks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        worksheet: true,
        submissions: true,
        studyLogs: true,
        materials: { orderBy: { order: 'asc' } },
        learningGoal: { include: { items: { orderBy: { order: 'asc' } } } },
        feedbacks: { include: { mentor: { select: { id: true, name: true, profileImage: true } } } },
      },
    });
    res.json(task);
  } catch (error) {
    console.error('과제 조회 오류:', error);
    res.status(500).json({ error: '조회 실패' });
  }
});

// 과제 제출
router.post('/tasks/:id/submit', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const menteeId = req.user!.userId;
    const { imageUrls, comment } = req.body;

    // 과제 정보 먼저 조회
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return res.status(404).json({ error: '과제를 찾을 수 없습니다.' });
    }

    const hasImages = imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0;
    const hasComment = comment && comment.trim();

    if (task.isFixed) {
      // 멘토 지정 과제: 이미지 필수
      if (!hasImages) {
        return res.status(400).json({ error: '멘토 지정 과제는 이미지를 최소 1개 이상 업로드해주세요.' });
      }
    } else {
      // 멘티 자체 과제: 이미지 또는 코멘트 중 하나 필수
      if (!hasImages && !hasComment) {
        return res.status(400).json({ error: '이미지 또는 코멘트를 최소 하나 이상 입력해주세요.' });
      }
    }

    const submission = await prisma.taskSubmission.create({
      data: { taskId: id, menteeId, imageUrls: hasImages ? imageUrls : [], comment },
    });

    // 멘토에게 알림 전송
    try {
      if (task.mentorId) {
        const mentee = await prisma.user.findUnique({
          where: { id: menteeId },
          select: { name: true },
        });
        if (mentee) {
          const { notifyTaskSubmitted } = await import('../lib/notifications');
          await notifyTaskSubmitted({
            mentorId: task.mentorId,
            menteeName: mentee.name,
            taskTitle: task.title,
            taskId: id,
          });
        }
      }
    } catch (notifError) {
      console.error('[Notification Error] Failed to send task submission notification:', notifError);
    }

    res.status(201).json(submission);
  } catch (error) {
    console.error('과제 제출 오류:', error);
    res.status(500).json({ error: '제출 실패' });
  }
});

// 대시보드 통계 및 전날 과제 피드백 요약
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const menteeId = req.user!.userId;
    const { date } = req.query;
    if (date && !isValidDateStr(date as string)) {
      return res.status(400).json({ error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' });
    }
    const targetDate = date ? parseUTCDate(date as string) : getTodayUTC();
    const nextDay = new Date(targetDate.getTime() + MS_PER_DAY);
    const prevDay = new Date(targetDate.getTime() - MS_PER_DAY);

    const tasks = await prisma.task.findMany({
      where: { menteeId, date: { gte: targetDate, lt: nextDay } },
      include: { submissions: true },
    });

    const mentorTasks = tasks.filter(t => t.isFixed);
    const completedCount = mentorTasks.filter(t => t.submissions.length > 0).length;

    const yesterdayTasksWithFeedbacks = await prisma.task.findMany({
      where: { menteeId, date: { gte: prevDay, lt: targetDate } },
      include: { feedbacks: { include: { mentor: { select: { name: true } } } } }
    });

    const yesterdayFeedbacks = yesterdayTasksWithFeedbacks
      .filter(t => t.feedbacks.length > 0)
      .map(t => ({
        taskId: t.id,
        taskTitle: t.title,
        subject: t.subject,
        feedback: t.feedbacks[0]
      }));

    res.json({
      todayStats: { 
        total: mentorTasks.length, 
        completed: completedCount, 
        progressRate: mentorTasks.length > 0 ? Math.round((completedCount / mentorTasks.length) * 100) : 0 
      },
      yesterdayFeedbacks,
    });
  } catch (error) {
    console.error('대시보드 조회 오류:', error);
    res.status(500).json({ error: '대시보드 실패' });
  }
});

// 일일 피드백 조회
router.get('/daily-feedbacks', async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.query;
    const menteeId = req.user!.userId;
    const [targetDate, nextDay] = getDateRange(date as string);
    const feedback = await prisma.dailyFeedback.findFirst({
      where: { menteeId, date: { gte: targetDate, lt: nextDay } },
    });
    res.json(feedback);
  } catch (error) {
    console.error('피드백 조회 오류:', error);
    res.status(500).json({ error: '피드백 조회 실패' });
  }
});

// 월간 총평 조회
router.get('/monthly-feedbacks', async (req: AuthRequest, res: Response) => {
  try {
    const menteeId = req.user!.userId;
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: '년도와 월을 입력해주세요.' });
    }

    const monthlyFeedback = await prisma.monthlyFeedback.findUnique({
      where: {
        menteeId_year_month: {
          menteeId,
          year: Number(year),
          month: Number(month),
        },
      },
      include: {
        mentor: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
      },
    });

    res.json(monthlyFeedback);
  } catch (error) {
    console.error('월간 총평 조회 오류:', error);
    res.status(500).json({ error: '월간 총평 조회 실패' });
  }
});

// 주간 총평 조회
router.get('/weekly-feedbacks', async (req: AuthRequest, res: Response) => {
  try {
    const menteeId = req.user!.userId;
    const { year, month, weekNumber } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: '년도와 월을 입력해주세요.' });
    }

    if (weekNumber) {
      // 특정 주차 조회
      const weeklyFeedback = await prisma.weeklyFeedback.findUnique({
        where: {
          menteeId_year_month_weekNumber: {
            menteeId,
            year: Number(year),
            month: Number(month),
            weekNumber: Number(weekNumber),
          },
        },
        include: {
          mentor: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
        },
      });
      res.json(weeklyFeedback);
    } else {
      // 해당 월의 모든 주간 총평 조회
      const weeklyFeedbacks = await prisma.weeklyFeedback.findMany({
        where: {
          menteeId,
          year: Number(year),
          month: Number(month),
        },
        include: {
          mentor: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
        },
        orderBy: { weekNumber: 'asc' },
      });
      res.json(weeklyFeedbacks);
    }
  } catch (error) {
    console.error('주간 총평 조회 오류:', error);
    res.status(500).json({ error: '주간 총평 조회 실패' });
  }
});

// 월간 리포트 통계 조회
router.get('/reports/monthly', async (req: AuthRequest, res: Response) => {
  try {
    const menteeId = req.user!.userId;
    const { year, month } = req.query;

    const today = getTodayUTC();
    const targetYear = year ? parseInt(year as string) : today.getUTCFullYear();
    const targetMonth = month ? parseInt(month as string) : today.getUTCMonth() + 1;

    const start = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const end = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    const tasks = await prisma.task.findMany({
      where: { menteeId, date: { gte: start, lte: end } },
      include: {
        submissions: true,
        studyLogs: true,
        feedbacks: true,
      },
    });

    // 통계 계산
    const mentorTasks = tasks.filter(t => t.isFixed);
    const totalTasks = mentorTasks.length;
    const completedTasks = mentorTasks.filter(t => isTaskCompleted(t)).length;
    const totalStudyTime = tasks.reduce((sum, t) => sum + t.studyLogs.reduce((s, log) => s + log.duration, 0), 0);
    const totalFeedbacks = tasks.reduce((sum, t) => sum + t.feedbacks.length, 0);

    // 과목별 통계
    const subjectStatsMap: Record<string, any> = {};
    mentorTasks.forEach(t => {
      if (!subjectStatsMap[t.subject]) {
        subjectStatsMap[t.subject] = {
          subject: t.subject,
          totalTasks: 0,
          completedTasks: 0,
          totalStudyTime: 0,
          totalFeedbacks: 0,
        };
      }
      subjectStatsMap[t.subject].totalTasks++;
      if (isTaskCompleted(t)) subjectStatsMap[t.subject].completedTasks++;
      subjectStatsMap[t.subject].totalFeedbacks += t.feedbacks.length;
    });

    // 과목별 공부 시간은 전체 과제(멘티 자율 포함) 기준으로 합산
    tasks.forEach(t => {
      if (subjectStatsMap[t.subject]) {
        subjectStatsMap[t.subject].totalStudyTime += t.studyLogs.reduce((s, log) => s + log.duration, 0);
      }
    });

    const subjectStats = Object.values(subjectStatsMap).map(s => ({
      ...s,
      completionRate: s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0,
    }));

    // 일별 진행도
    const dailyProgressMap: Record<string, any> = {};
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      dailyProgressMap[dateStr] = { date: dateStr, totalTasks: 0, completedTasks: 0 };
    }

    mentorTasks.forEach(t => {
      const dateStr = t.date.toISOString().split('T')[0];
      if (dailyProgressMap[dateStr]) {
        dailyProgressMap[dateStr].totalTasks++;
        if (isTaskCompleted(t)) dailyProgressMap[dateStr].completedTasks++;
      }
    });

    const dailyProgress = Object.values(dailyProgressMap).map(d => ({
      ...d,
      progressRate: d.totalTasks > 0 ? Math.round((d.completedTasks / d.totalTasks) * 100) : 0,
    }));

    res.json({
      year: targetYear,
      month: targetMonth,
      summary: {
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        totalStudyTime,
        totalFeedbacks,
      },
      subjectStats,
      dailyProgress,
    });
  } catch (error) {
    console.error('월간 리포트 통계 조회 오류:', error);
    res.status(500).json({ error: '월간 리포트 통계 조회 실패' });
  }
});

// 스트릭 정보 조회
router.get('/streak', async (req: AuthRequest, res: Response) => {
  try {
    const menteeId = req.user!.userId;
    const streak = await getStreak(menteeId);

    if (!streak) {
      // 스트릭이 없으면 기본값 반환
      return res.json({
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
      });
    }

    res.json(streak);
  } catch (error) {
    console.error('스트릭 조회 오류:', error);
    res.status(500).json({ error: '스트릭 조회 실패' });
  }
});

// 히트맵 데이터 조회
router.get('/heatmap', async (req: AuthRequest, res: Response) => {
  try {
    const menteeId = req.user!.userId;
    const { year } = req.query;

    let endDate: Date | undefined;
    if (year) {
      const yearNum = parseInt(year as string, 10);
      if (isNaN(yearNum)) {
        return res.status(400).json({ error: '올바른 연도를 입력해주세요.' });
      }
      endDate = new Date(Date.UTC(yearNum, 11, 31)); // 해당 연도 12월 31일
    }

    const data = await generateHeatmapData(menteeId, endDate);
    const resultYear = endDate ? endDate.getUTCFullYear() : getTodayUTC().getUTCFullYear();

    res.json({ data, year: resultYear });
  } catch (error) {
    console.error('히트맵 조회 오류:', error);
    res.status(500).json({ error: '히트맵 조회 실패' });
  }
});

// 주간 랭킹 조회
router.get('/ranking', async (req: AuthRequest, res: Response) => {
  try {
    const menteeId = req.user!.userId;
    const { rankings, myRank } = await getMenteeWeeklyRanking(menteeId);

    res.json({ rankings, myRank });
  } catch (error) {
    console.error('랭킹 조회 오류:', error);
    res.status(500).json({ error: '랭킹 조회 실패' });
  }
});

// 푸시 알림 설정 조회
router.get('/notification-settings', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        notifyTaskIncomplete: true,
        notifyNewFeedback: true,
        notifyReminder: true,
        notifyNewTask: true,
        notifyTaskSubmitted: true,
        notifyTaskApproved: true,
        notifyStreakBroken: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    res.json(user);
  } catch (error) {
    console.error('알림 설정 조회 오류:', error);
    res.status(500).json({ error: '알림 설정 조회 실패' });
  }
});

// 푸시 알림 설정 업데이트
router.patch('/notification-settings', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      notifyTaskIncomplete,
      notifyNewFeedback,
      notifyReminder,
      notifyNewTask,
      notifyTaskSubmitted,
      notifyTaskApproved,
      notifyStreakBroken,
    } = req.body;

    // 변경할 필드만 추출
    type NotificationSettings = Partial<{
      notifyTaskIncomplete: boolean;
      notifyNewFeedback: boolean;
      notifyReminder: boolean;
      notifyNewTask: boolean;
      notifyTaskSubmitted: boolean;
      notifyTaskApproved: boolean;
      notifyStreakBroken: boolean;
    }>;

    const updateData: NotificationSettings = {};
    if (typeof notifyTaskIncomplete === 'boolean') updateData.notifyTaskIncomplete = notifyTaskIncomplete;
    if (typeof notifyNewFeedback === 'boolean') updateData.notifyNewFeedback = notifyNewFeedback;
    if (typeof notifyReminder === 'boolean') updateData.notifyReminder = notifyReminder;
    if (typeof notifyNewTask === 'boolean') updateData.notifyNewTask = notifyNewTask;
    if (typeof notifyTaskSubmitted === 'boolean') updateData.notifyTaskSubmitted = notifyTaskSubmitted;
    if (typeof notifyTaskApproved === 'boolean') updateData.notifyTaskApproved = notifyTaskApproved;
    if (typeof notifyStreakBroken === 'boolean') updateData.notifyStreakBroken = notifyStreakBroken;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: '업데이트할 설정이 없습니다.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        notifyTaskIncomplete: true,
        notifyNewFeedback: true,
        notifyReminder: true,
        notifyNewTask: true,
        notifyTaskSubmitted: true,
        notifyTaskApproved: true,
        notifyStreakBroken: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('알림 설정 업데이트 오류:', error);
    res.status(500).json({ error: '알림 설정 업데이트 실패' });
  }
});

export default router;
