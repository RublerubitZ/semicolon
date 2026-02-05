import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { parseUTCDate, getDateRange, getTodayUTC, isValidDateStr } from '../lib/date-utils';

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
    const [targetDate, nextDay] = date ? getDateRange(date as string) : [getTodayUTC(), new Date(getTodayUTC().getTime() + 86400000)];

    const tasks = await prisma.task.findMany({
      where: { menteeId, date: { gte: targetDate, lt: nextDay } },
      include: {
        worksheet: true,
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
    console.error('플래너 조회 오류:', error);
    res.status(500).json({ error: '플래너 조회 실패' });
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
    const [targetDate, nextDay] = date ? getDateRange(date as string) : [getTodayUTC(), new Date(getTodayUTC().getTime() + 86400000)];

    const tasks = await prisma.task.findMany({
      where: { menteeId, date: { gte: targetDate, lt: nextDay } },
      include: {
        worksheet: true,
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

      const isCompleted = task.submissions.length > 0;
      const taskStudyTime = task.studyLogs.reduce((sum, log) => sum + log.duration, 0);

      if (task.isFixed) {
        totalMentorTasks++;
        if (!subjectStats[task.subject]) {
          subjectStats[task.subject] = { total: 0, completed: 0, studyTime: 0 };
        }
        subjectStats[task.subject].total++;
        if (isCompleted) {
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
    const { title, description, subject } = req.body;
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing || existing.menteeId !== menteeId || existing.isFixed) return res.status(403).json({ error: '수정 권한 없음' });

    const task = await prisma.task.update({
      where: { id },
      data: { title, description, subject },
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
    await prisma.task.update({ where: { id }, data: { selfCheck, selfCheckedAt: new Date() } });
    res.json({ message: '저장 완료' });
  } catch (error) {
    console.error('자가점검 저장 오류:', error);
    res.status(500).json({ error: '자가점검 저장 실패' });
  }
});

// 공부 시간 기록
router.post('/tasks/:id/time', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const menteeId = req.user!.userId;
    const { duration, date, startTime, endTime } = req.body;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: '과제 없음' });

    const log = await prisma.studyTimeLog.create({
      data: { menteeId, taskId: id, subject: task.subject, date: parseUTCDate(date), duration, startTime, endTime },
    });
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
        worksheet: true, submissions: true, studyLogs: true,
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
    const nextDay = new Date(targetDate.getTime() + 86400000);
    const prevDay = new Date(targetDate.getTime() - 86400000);

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

export default router;
