import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, mentorOnly, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 모든 멘토 라우트에 인증 및 멘토 권한 미들웨어 적용
router.use(authMiddleware);
router.use(mentorOnly);

// 담당 멘티 목록
router.get('/mentees', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;

    const relations = await prisma.mentorMentee.findMany({
      where: { mentorId },
      include: {
        mentee: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    const mentees = await Promise.all(
      relations.map(async (r) => {
        const taskStats = await prisma.task.aggregate({
          where: { menteeId: r.menteeId },
          _count: { _all: true },
        });

        const completedCount = await prisma.task.count({
          where: { menteeId: r.menteeId, isCompleted: true },
        });

        return {
          ...r.mentee,
          totalTasks: taskStats._count._all,
          completedTasks: completedCount,
        };
      })
    );

    res.json(mentees);
  } catch (error) {
    console.error('Mentees error:', error);
    res.status(500).json({ error: '멘티 목록을 불러오는데 실패했습니다.' });
  }
});

// 멘티 상세 조회
router.get('/mentees/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const mentee = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        profileImage: true,
        menteeTasks: {
          orderBy: { date: 'desc' },
          take: 10,
          include: {
            submissions: true,
            feedbacks: true,
            studyLogs: true,
          },
        },
      },
    });

    if (!mentee) {
      return res.status(404).json({ error: '멘티를 찾을 수 없습니다.' });
    }

    res.json(mentee);
  } catch (error) {
    console.error('Mentee detail error:', error);
    res.status(500).json({ error: '멘티 정보를 불러오는데 실패했습니다.' });
  }
});

// 멘티 일일 플래너 조회
router.get('/mentees/:id/planner/daily', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const tasks = await prisma.task.findMany({
      where: {
        menteeId: id as string,
        date: targetDate,
      },
      include: {
        worksheet: true,
        submissions: true,
        feedbacks: true,
        studyLogs: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const comment = await prisma.plannerComment.findFirst({
      where: {
        menteeId: id as string,
        date: targetDate,
      },
    });

    res.json({ tasks, comment, date: targetDate });
  } catch (error) {
    console.error('Mentee planner error:', error);
    res.status(500).json({ error: '플래너를 불러오는데 실패했습니다.' });
  }
});

// 멘티 플래너 조회 (하위 호환성)
router.get('/mentees/:id/planner', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const tasks = await prisma.task.findMany({
      where: {
        menteeId: id as string,
        date: targetDate,
      },
      include: {
        worksheet: true,
        submissions: true,
        feedbacks: true,
        studyLogs: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const comment = await prisma.plannerComment.findFirst({
      where: {
        menteeId: id as string,
        date: targetDate,
      },
    });

    res.json({ tasks, comment, date: targetDate });
  } catch (error) {
    console.error('Mentee planner error:', error);
    res.status(500).json({ error: '플래너를 불러오는데 실패했습니다.' });
  }
});

// 멘티 주간 플래너 조회
router.get('/mentees/:id/planner/weekly', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { startDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const tasks = await prisma.task.findMany({
      where: {
        menteeId: id as string,
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        worksheet: true,
        submissions: true,
        feedbacks: true,
        studyLogs: true,
      },
      orderBy: { date: 'asc' },
    });

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

      const studyTime = task.studyLogs.reduce((sum: number, log: any) => sum + log.duration, 0);
      stats.subjectStats[subject].studyTime += studyTime;
      stats.totalStudyTime += studyTime;
    });

    res.json({ tasks, stats, startDate: start, endDate: end });
  } catch (error) {
    console.error('Mentee weekly planner error:', error);
    res.status(500).json({ error: '주간 플래너를 불러오는데 실패했습니다.' });
  }
});

// 멘티 월간 플래너 조회
router.get('/mentees/:id/planner/monthly', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { year, month } = req.query;

    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;

    const start = new Date(targetYear, targetMonth - 1, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetYear, targetMonth, 0);
    end.setHours(23, 59, 59, 999);

    const tasks = await prisma.task.findMany({
      where: {
        menteeId: id as string,
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        worksheet: true,
        submissions: true,
        feedbacks: true,
        studyLogs: true,
      },
      orderBy: { date: 'asc' },
    });

    const tasksByDate: Record<string, any[]> = {};
    tasks.forEach((task) => {
      const dateKey = task.date.toISOString().split('T')[0];
      if (!tasksByDate[dateKey]) {
        tasksByDate[dateKey] = [];
      }
      tasksByDate[dateKey].push(task);
    });

    const stats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.isCompleted).length,
      totalStudyTime: tasks.reduce(
        (sum: number, task) => sum + task.studyLogs.reduce((s: number, log: any) => s + log.duration, 0),
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

      const studyTime = task.studyLogs.reduce((sum: number, log: any) => sum + log.duration, 0);
      stats.subjectStats[subject].studyTime += studyTime;
    });

    res.json({ tasksByDate, stats, year: targetYear, month: targetMonth });
  } catch (error) {
    console.error('Mentee monthly planner error:', error);
    res.status(500).json({ error: '월간 플래너를 불러오는데 실패했습니다.' });
  }
});

// 할 일 생성 (고정 과제)
router.post('/tasks', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { menteeId, title, description, subject, date, worksheetId, pdfUrl } = req.body;

    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);

    const task = await prisma.task.create({
      data: {
        menteeId,
        mentorId,
        title,
        description,
        subject,
        date: taskDate,
        worksheetId,
        pdfUrl,
        isFixed: true,
      },
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: '할 일 생성에 실패했습니다.' });
  }
});

// 할 일 수정
router.put('/tasks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { title, description, subject, date, worksheetId, pdfUrl } = req.body;

    let taskDate;
    if (date) {
      taskDate = new Date(date);
      taskDate.setHours(0, 0, 0, 0);
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        subject,
        date: taskDate,
        worksheetId,
        pdfUrl,
      },
    });

    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: '할 일 수정에 실패했습니다.' });
  }
});

// 할 일 삭제
router.delete('/tasks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    await prisma.task.delete({ where: { id } });

    res.json({ message: '할 일이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: '할 일 삭제에 실패했습니다.' });
  }
});

// 피드백 작성
router.post('/feedbacks', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { taskId, content, summary, subject, feedbackDate } = req.body;

    const fbDate = new Date(feedbackDate);
    fbDate.setHours(0, 0, 0, 0);

    const feedback = await prisma.feedback.create({
      data: {
        taskId,
        mentorId,
        content,
        summary,
        subject,
        feedbackDate: fbDate,
      },
    });

    res.status(201).json(feedback);
  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({ error: '피드백 작성에 실패했습니다.' });
  }
});

// 피드백 수정
router.put('/feedbacks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { content, summary } = req.body;

    const feedback = await prisma.feedback.update({
      where: { id },
      data: { content, summary },
    });

    res.json(feedback);
  } catch (error) {
    console.error('Update feedback error:', error);
    res.status(500).json({ error: '피드백 수정에 실패했습니다.' });
  }
});

// 학습지 목록
router.get('/worksheets', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { subject } = req.query;

    const worksheets = await prisma.worksheet.findMany({
      where: {
        createdById: mentorId,
        ...(subject && { subject: subject as any }),
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(worksheets);
  } catch (error) {
    console.error('Worksheets error:', error);
    res.status(500).json({ error: '학습지 목록을 불러오는데 실패했습니다.' });
  }
});

// 학습지 생성
router.post('/worksheets', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { title, subject, content, pdfUrl, type } = req.body;

    const worksheet = await prisma.worksheet.create({
      data: {
        createdById: mentorId,
        title,
        subject,
        content,
        pdfUrl,
        type,
      },
    });

    res.status(201).json(worksheet);
  } catch (error) {
    console.error('Create worksheet error:', error);
    res.status(500).json({ error: '학습지 생성에 실패했습니다.' });
  }
});

export default router;
