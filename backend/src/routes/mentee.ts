import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 모든 멘티 라우트에 인증 미들웨어 적용
router.use(authMiddleware);

// 일일 플래너 조회
router.get('/planner/daily', async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.query;
    const menteeId = req.user!.userId;

    // 날짜 범위로 조회 (시간대 문제 해결)
    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const tasks = await prisma.task.findMany({
      where: {
        menteeId,
        date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      include: {
        worksheet: true,
        submissions: true,
        studyLogs: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const comment = await prisma.plannerComment.findFirst({
      where: {
        menteeId,
        date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
    });

    res.json({ tasks, comment, date: targetDate });
  } catch (error) {
    console.error('Planner error:', error);
    res.status(500).json({ error: '플래너를 불러오는데 실패했습니다.' });
  }
});

// 일일 플래너 조회 (하위 호환성)
router.get('/planner', async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.query;
    const menteeId = req.user!.userId;

    // 날짜 범위로 조회 (시간대 문제 해결)
    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const tasks = await prisma.task.findMany({
      where: {
        menteeId,
        date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      include: {
        worksheet: true,
        submissions: true,
        studyLogs: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const comment = await prisma.plannerComment.findFirst({
      where: {
        menteeId,
        date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
    });

    res.json({ tasks, comment, date: targetDate });
  } catch (error) {
    console.error('Planner error:', error);
    res.status(500).json({ error: '플래너를 불러오는데 실패했습니다.' });
  }
});

// 주간 플래너 조회
router.get('/planner/weekly', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate } = req.query;
    const menteeId = req.user!.userId;

    const start = startDate ? new Date(startDate as string) : new Date();
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const tasks = await prisma.task.findMany({
      where: {
        menteeId,
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        worksheet: true,
        submissions: true,
        studyLogs: true,
      },
      orderBy: { date: 'asc' },
    });

    // 주간 통계 계산 (과제 제출 기준)
    const stats: {
      totalTasks: number;
      completedTasks: number;
      totalStudyTime: number;
      subjectStats: Record<string, { total: number; completed: number; studyTime: number }>;
    } = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.submissions && t.submissions.length > 0).length,
      totalStudyTime: 0,
      subjectStats: {},
    };

    tasks.forEach((task) => {
      const subject = task.subject;
      // 과목별 동적 추가
      if (!stats.subjectStats[subject]) {
        stats.subjectStats[subject] = { total: 0, completed: 0, studyTime: 0 };
      }
      stats.subjectStats[subject].total++;
      // 과제 제출 기준으로 달성률 계산
      if (task.submissions && task.submissions.length > 0) {
        stats.subjectStats[subject].completed++;
      }

      const studyTime = task.studyLogs.reduce((sum, log) => sum + log.duration, 0);
      stats.subjectStats[subject].studyTime += studyTime;
      stats.totalStudyTime += studyTime;
    });

    res.json({ tasks, stats, startDate: start, endDate: end });
  } catch (error) {
    console.error('Weekly planner error:', error);
    res.status(500).json({ error: '주간 플래너를 불러오는데 실패했습니다.' });
  }
});

// 월간 플래너 조회
router.get('/planner/monthly', async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query;
    const menteeId = req.user!.userId;

    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;

    const start = new Date(targetYear, targetMonth - 1, 1);
    const end = new Date(targetYear, targetMonth, 0);

    const tasks = await prisma.task.findMany({
      where: {
        menteeId,
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        worksheet: true,
        submissions: true,
        studyLogs: true,
      },
      orderBy: { date: 'asc' },
    });

    // 날짜별로 그룹화
    const tasksByDate: Record<string, any[]> = {};
    tasks.forEach((task) => {
      const dateKey = task.date.toISOString().split('T')[0];
      if (!tasksByDate[dateKey]) {
        tasksByDate[dateKey] = [];
      }
      tasksByDate[dateKey].push(task);
    });

    // 월간 통계 (과제 제출 기준)
    const stats: {
      totalTasks: number;
      completedTasks: number;
      totalStudyTime: number;
      subjectStats: Record<string, { total: number; completed: number; studyTime: number }>;
    } = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.submissions && t.submissions.length > 0).length,
      totalStudyTime: tasks.reduce(
        (sum, task) => sum + task.studyLogs.reduce((s, log) => s + log.duration, 0),
        0
      ),
      subjectStats: {},
    };

    tasks.forEach((task) => {
      const subject = task.subject;
      // 과목별 동적 추가
      if (!stats.subjectStats[subject]) {
        stats.subjectStats[subject] = { total: 0, completed: 0, studyTime: 0 };
      }
      stats.subjectStats[subject].total++;
      // 과제 제출 기준으로 달성률 계산
      if (task.submissions && task.submissions.length > 0) {
        stats.subjectStats[subject].completed++;
      }

      const studyTime = task.studyLogs.reduce((sum, log) => sum + log.duration, 0);
      stats.subjectStats[subject].studyTime += studyTime;
    });

    res.json({ tasksByDate, stats, year: targetYear, month: targetMonth });
  } catch (error) {
    console.error('Monthly planner error:', error);
    res.status(500).json({ error: '월간 플래너를 불러오는데 실패했습니다.' });
  }
});

// 할 일 추가 (멘티 자체 등록)
router.post('/tasks', async (req: AuthRequest, res: Response) => {
  try {
    const menteeId = req.user!.userId;
    const { title, description, subject, date } = req.body;

    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);

    const task = await prisma.task.create({
      data: {
        menteeId,
        title,
        description,
        subject,
        date: taskDate,
        isFixed: false,
      },
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: '할 일 생성에 실패했습니다.' });
  }
});

// 할 일 수정 (멘티 자체 등록만 가능)
router.put('/tasks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const menteeId = req.user!.userId;
    const { title, description, subject, date } = req.body as {
      title?: string;
      description?: string;
      subject?: string;
      date?: string;
    };

    // 자신이 만든 할 일이고 isFixed=false인지 확인
    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
    }

    if (existingTask.menteeId !== menteeId) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    if (existingTask.isFixed) {
      return res.status(403).json({ error: '멘토가 등록한 할 일은 수정할 수 없습니다.' });
    }

    let taskDate;
    if (date) {
      taskDate = new Date(date);
      taskDate.setHours(0, 0, 0, 0);
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(subject && { subject }),
        ...(taskDate && { date: taskDate }),
      },
    });

    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: '할 일 수정에 실패했습니다.' });
  }
});

// 할 일 삭제 (멘티 자체 등록만 가능)
router.delete('/tasks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const menteeId = req.user!.userId;

    // 자신이 만든 할 일이고 isFixed=false인지 확인
    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
    }

    if (existingTask.menteeId !== menteeId) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    if (existingTask.isFixed) {
      return res.status(403).json({ error: '멘토가 등록한 할 일은 삭제할 수 없습니다.' });
    }

    // Cascade delete: 관련 데이터를 모두 삭제
    await prisma.$transaction(async (tx) => {
      // 1. 과제 제출 내역 삭제
      await tx.taskSubmission.deleteMany({ where: { taskId: id } });

      // 2. 피드백 삭제
      await tx.feedback.deleteMany({ where: { taskId: id } });

      // 3. 공부 시간 기록 삭제
      await tx.studyTimeLog.deleteMany({ where: { taskId: id } });

      // 4. 할 일 삭제
      await tx.task.delete({ where: { id } });
    });

    res.json({ message: '할 일이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: '할 일 삭제에 실패했습니다.' });
  }
});

// 할 일 완료 처리 (DEPRECATED - 하위 호환용)
router.patch('/tasks/:id/complete', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { isCompleted } = req.body;

    const task = await prisma.task.update({
      where: { id },
      data: { isCompleted },
    });

    res.json(task);
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: '할 일 완료 처리에 실패했습니다.' });
  }
});

// 멘티 자가점검 (V, △, X, ○) - 달성률 영향 없음
router.patch('/tasks/:id/self-check', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const menteeId = req.user!.userId;
    const { selfCheck } = req.body as { selfCheck: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'NOT_DONE' };

    // 유효한 상태값인지 확인
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'DONE', 'NOT_DONE'];
    if (!validStatuses.includes(selfCheck)) {
      return res.status(400).json({ error: '유효하지 않은 상태값입니다.' });
    }

    // 자신의 과제인지 확인
    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) {
      return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
    }
    if (existingTask.menteeId !== menteeId) {
      return res.status(403).json({ error: '자가점검 권한이 없습니다.' });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        selfCheck,
        selfCheckedAt: new Date(),
      },
    });

    res.json({
      task,
      message: '자가점검이 저장되었습니다.',
    });
  } catch (error) {
    console.error('Self check error:', error);
    res.status(500).json({ error: '자가점검 저장에 실패했습니다.' });
  }
});

// 공부 시간 기록
router.post('/tasks/:id/time', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const menteeId = req.user!.userId;
    const { duration, date } = req.body;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
    }

    const studyLog = await prisma.studyTimeLog.create({
      data: {
        menteeId,
        taskId: id,
        subject: task.subject,
        date: new Date(date),
        duration,
      },
    });

    res.status(201).json(studyLog);
  } catch (error) {
    console.error('Study time error:', error);
    res.status(500).json({ error: '공부 시간 기록에 실패했습니다.' });
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
        feedbacks: {
          include: { mentor: { select: { name: true } } },
        },
        studyLogs: true,
        mentee: {
          select: {
            id: true,
            name: true,
            nickname: true,
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: '과제를 찾을 수 없습니다.' });
    }

    res.json(task);
  } catch (error) {
    console.error('Task detail error:', error);
    res.status(500).json({ error: '과제를 불러오는데 실패했습니다.' });
  }
});

// 과제 제출
router.post('/tasks/:id/submit', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const menteeId = req.user!.userId;
    const { imageUrls, comment } = req.body;

    const submission = await prisma.taskSubmission.create({
      data: {
        taskId: id,
        menteeId,
        imageUrls,
        comment,
      },
    });

    res.status(201).json(submission);
  } catch (error) {
    console.error('Submit task error:', error);
    res.status(500).json({ error: '과제 제출에 실패했습니다.' });
  }
});

// 피드백 목록 조회
router.get('/feedbacks', async (req: AuthRequest, res: Response) => {
  try {
    const menteeId = req.user!.userId;
    const { subject } = req.query;

    const tasks = await prisma.task.findMany({
      where: {
        menteeId,
        feedbacks: { some: {} },
        ...(subject && { subject: subject as any }),
      },
      include: {
        feedbacks: {
          include: { mentor: { select: { name: true } } },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json(tasks);
  } catch (error) {
    console.error('Feedbacks error:', error);
    res.status(500).json({ error: '피드백을 불러오는데 실패했습니다.' });
  }
});

// 코멘트/질문 작성
router.post('/comments', async (req: AuthRequest, res: Response) => {
  try {
    const menteeId = req.user!.userId;
    const { date, content } = req.body;

    const comment = await prisma.plannerComment.upsert({
      where: {
        id: '', // placeholder for upsert
      },
      create: {
        menteeId,
        date: new Date(date),
        content,
      },
      update: {
        content,
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Comment error:', error);
    res.status(500).json({ error: '코멘트 저장에 실패했습니다.' });
  }
});

// 통계 조회 (과목별 달성률 - 과제 제출 기준)
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const menteeId = req.user!.userId;

    // 모든 과제 조회 후 통계 계산
    const tasks = await prisma.task.findMany({
      where: { menteeId },
      include: {
        submissions: true,
      },
    });

    const stats: Record<string, { total: number; completed: number }> = {};

    tasks.forEach((t) => {
      const subject = t.subject;
      if (!stats[subject]) {
        stats[subject] = { total: 0, completed: 0 };
      }
      stats[subject].total++;
      // 과제 제출 기준으로 달성률 계산
      if (t.submissions && t.submissions.length > 0) {
        stats[subject].completed++;
      }
    });

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: '통계를 불러오는데 실패했습니다.' });
  }
});

// 과제 목록 조회 (다가오는/진행중/완료)
router.get('/assignments', async (req: AuthRequest, res: Response) => {
  try {
    const menteeId = req.user!.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 멘토가 지정한 과제만 조회 (isFixed: true)
    const allTasks = await prisma.task.findMany({
      where: {
        menteeId,
        isFixed: true,
      },
      include: {
        worksheet: true,
        submissions: true,
      },
      orderBy: { date: 'asc' },
    });

    // 분류
    // - upcoming: 마감일이 내일 이후 (오늘 제외)
    // - inProgress: 마감일이 오늘인 미제출 과제
    // - completed: 제출된 과제 + 마감일이 지난 미제출 과제 (미제출 표시)
    const upcoming: any[] = [];
    const inProgress: any[] = [];
    const completed: any[] = [];

    allTasks.forEach((task) => {
      const taskDate = new Date(task.date);
      taskDate.setHours(0, 0, 0, 0);

      // 과제 제출 여부로 완료 판단
      const isSubmitted = task.submissions && task.submissions.length > 0;

      if (isSubmitted) {
        // 제출된 과제
        completed.push({ ...task, status: 'completed' });
      } else if (taskDate < today) {
        // 마감일이 지난 미제출 과제 -> 완료 탭으로 이동, 미제출 표시
        completed.push({ ...task, status: 'missed' });
      } else if (taskDate.getTime() === today.getTime()) {
        // 오늘 마감인 과제
        inProgress.push({ ...task, status: 'inProgress' });
      } else {
        // 마감일이 내일 이후
        upcoming.push({ ...task, status: 'upcoming' });
      }
    });

    // 완료된 과제는 최신순 정렬
    completed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ upcoming, inProgress, completed });
  } catch (error) {
    console.error('Assignments error:', error);
    res.status(500).json({ error: '과제 목록을 불러오는데 실패했습니다.' });
  }
});

// 오늘 학습 진행율 + 어제 피드백 요약 조회
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const menteeId = req.user!.userId;

    // 오늘 날짜 (날짜 범위로 조회)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 어제 날짜
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 오늘의 과제 조회 (날짜 범위)
    const todayTasks = await prisma.task.findMany({
      where: {
        menteeId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        submissions: true,
      },
    });

    // 과제 제출 기준으로 달성률 계산
    const submittedCount = todayTasks.filter((t) => t.submissions && t.submissions.length > 0).length;
    const todayStats = {
      total: todayTasks.length,
      completed: submittedCount,
      progressRate: todayTasks.length > 0
        ? Math.round((submittedCount / todayTasks.length) * 100)
        : 0,
    };

    // 어제 받은 피드백 조회
    const yesterdayFeedbacks = await prisma.feedback.findMany({
      where: {
        task: {
          menteeId,
        },
        feedbackDate: {
          gte: yesterday,
          lt: today,
        },
      },
      include: {
        task: {
          select: {
            title: true,
            subject: true,
          },
        },
        mentor: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        feedbackDate: 'desc',
      },
    });

    res.json({
      todayStats,
      yesterdayFeedbacks,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: '대시보드 정보를 불러오는데 실패했습니다.' });
  }
});

export default router;
