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

    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const tasks = await prisma.task.findMany({
      where: {
        menteeId,
        date: targetDate,
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
        date: targetDate,
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

    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const tasks = await prisma.task.findMany({
      where: {
        menteeId,
        date: targetDate,
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
        date: targetDate,
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

    // 주간 통계 계산
    const stats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.isCompleted).length,
      totalStudyTime: 0,
      subjectStats: {
        KOREAN: { total: 0, completed: 0, studyTime: 0 },
        ENGLISH: { total: 0, completed: 0, studyTime: 0 },
        MATH: { total: 0, completed: 0, studyTime: 0 },
      },
    };

    tasks.forEach((task) => {
      const subject = task.subject as 'KOREAN' | 'ENGLISH' | 'MATH';
      stats.subjectStats[subject].total++;
      if (task.isCompleted) {
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

    // 월간 통계
    const stats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.isCompleted).length,
      totalStudyTime: tasks.reduce(
        (sum, task) => sum + task.studyLogs.reduce((s, log) => s + log.duration, 0),
        0
      ),
      subjectStats: {
        KOREAN: { total: 0, completed: 0, studyTime: 0 },
        ENGLISH: { total: 0, completed: 0, studyTime: 0 },
        MATH: { total: 0, completed: 0, studyTime: 0 },
      },
    };

    tasks.forEach((task) => {
      const subject = task.subject as 'KOREAN' | 'ENGLISH' | 'MATH';
      stats.subjectStats[subject].total++;
      if (task.isCompleted) {
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

    await prisma.task.delete({ where: { id } });

    res.json({ message: '할 일이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: '할 일 삭제에 실패했습니다.' });
  }
});

// 할 일 완료 처리
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

// 통계 조회 (과목별 달성률)
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const menteeId = req.user!.userId;

    const tasks = await prisma.task.groupBy({
      by: ['subject', 'isCompleted'],
      where: { menteeId },
      _count: true,
    });

    const stats = {
      KOREAN: { total: 0, completed: 0 },
      ENGLISH: { total: 0, completed: 0 },
      MATH: { total: 0, completed: 0 },
    };

    tasks.forEach((t) => {
      const subject = t.subject as 'KOREAN' | 'ENGLISH' | 'MATH';
      stats[subject].total += t._count;
      if (t.isCompleted) {
        stats[subject].completed += t._count;
      }
    });

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: '통계를 불러오는데 실패했습니다.' });
  }
});

export default router;
