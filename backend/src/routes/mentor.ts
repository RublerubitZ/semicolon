import { Router, Response } from 'express';
import { authMiddleware, mentorOnly, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { parseUTCDate, getDateRange, getTodayUTC } from '../lib/date-utils';

const router = Router();

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
            grade: true,
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

        // 과제 제출 기준으로 달성률 계산 (submissions가 있는 과제)
        const completedCount = await prisma.task.count({
          where: {
            menteeId: r.menteeId,
            submissions: { some: {} },
          },
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
    const mentorId = req.user!.userId;
    const { id: menteeId } = req.params as { id: string };

    // 권한 검증: 현재 멘토가 이 멘티를 담당하는지 확인
    const relation = await prisma.mentorMentee.findUnique({
      where: {
        mentorId_menteeId: {
          mentorId,
          menteeId,
        },
      },
    });

    if (!relation) {
      return res.status(403).json({ error: '해당 멘티에 접근할 권한이 없습니다.' });
    }

    const mentee = await prisma.user.findUnique({
      where: { id: menteeId },
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        grade: true,
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

    // 날짜 범위로 조회 (UTC 기준, 타임존 문제 해결)
    const [targetDate, nextDay] = date
      ? getDateRange(date as string)
      : (() => {
          const today = getTodayUTC();
          const tomorrow = new Date(today);
          tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
          return [today, tomorrow];
        })();

    const tasks = await prisma.task.findMany({
      where: {
        menteeId: id as string,
        date: {
          gte: targetDate,
          lt: nextDay,
        },
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
        date: {
          gte: targetDate,
          lt: nextDay,
        },
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

    // 날짜 범위로 조회 (UTC 기준, 타임존 문제 해결)
    const [targetDate, nextDay] = date
      ? getDateRange(date as string)
      : (() => {
          const today = getTodayUTC();
          const tomorrow = new Date(today);
          tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
          return [today, tomorrow];
        })();

    const tasks = await prisma.task.findMany({
      where: {
        menteeId: id as string,
        date: {
          gte: targetDate,
          lt: nextDay,
        },
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
        date: {
          gte: targetDate,
          lt: nextDay,
        },
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

    // UTC 기준으로 주 시작일 파싱 (타임존 문제 해결)
    const start = startDate ? parseUTCDate(startDate as string) : getTodayUTC();
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);

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
      // 과제 제출 기준으로 달성률 계산
      completedTasks: tasks.filter((t) => t.submissions && t.submissions.length > 0).length,
      totalStudyTime: 0,
      subjectStats: {} as Record<string, { total: number; completed: number; studyTime: number }>,
    };

    tasks.forEach((task) => {
      const subject = task.subject;
      if (!stats.subjectStats[subject]) {
        stats.subjectStats[subject] = { total: 0, completed: 0, studyTime: 0 };
      }
      stats.subjectStats[subject].total++;
      // 과제 제출 기준으로 달성률 계산
      if (task.submissions && task.submissions.length > 0) {
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

    // UTC 기준으로 월 시작일/종료일 계산 (타임존 문제 해결)
    const today = getTodayUTC();
    const targetYear = year ? parseInt(year as string) : today.getUTCFullYear();
    const targetMonth = month ? parseInt(month as string) : today.getUTCMonth() + 1;

    const start = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const end = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

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
      // 과제 제출 기준으로 달성률 계산
      completedTasks: tasks.filter((t) => t.submissions && t.submissions.length > 0).length,
      totalStudyTime: tasks.reduce(
        (sum: number, task) => sum + task.studyLogs.reduce((s: number, log: any) => s + log.duration, 0),
        0
      ),
      subjectStats: {} as Record<string, { total: number; completed: number; studyTime: number }>,
    };

    tasks.forEach((task) => {
      const subject = task.subject;
      if (!stats.subjectStats[subject]) {
        stats.subjectStats[subject] = { total: 0, completed: 0, studyTime: 0 };
      }
      stats.subjectStats[subject].total++;
      // 과제 제출 기준으로 달성률 계산
      if (task.submissions && task.submissions.length > 0) {
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
    const { menteeId, title, description, subject, date, worksheetId, pdfUrl, learningGoals } = req.body;

    // UTC 기준으로 날짜 파싱 (타임존 문제 해결)
    const taskDate = parseUTCDate(date);

    // 멘티와 멘토 정보 조회 (알림용)
    const [mentee, mentor] = await Promise.all([
      prisma.user.findUnique({ where: { id: menteeId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: mentorId }, select: { name: true } }),
    ]);

    // 트랜잭션으로 Task와 LearningGoal 함께 생성
    const task = await prisma.$transaction(async (tx) => {
      // 1. Task 생성
      const newTask = await tx.task.create({
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

      // 2. LearningGoal 생성 (있는 경우)
      if (learningGoals && Array.isArray(learningGoals) && learningGoals.length > 0) {
        await tx.learningGoal.create({
          data: {
            taskId: newTask.id,
            items: {
              create: learningGoals
                .filter((title: string) => title && title.trim())
                .map((title: string, index: number) => ({
                  title: title.trim(),
                  order: index,
                })),
            },
          },
        });
      }

      return newTask;
    });

    // 멘티에게 알림 전송
    if (mentee && mentor) {
      try {
        const { notifyNewTask } = await import('../lib/notifications');
        await notifyNewTask({
          menteeId,
          mentorName: mentor.name,
          taskTitle: title,
          taskId: task.id,
        });
      } catch (notifError) {
        console.error('[Notification Error] Failed to send new task notification:', notifError);
        // 알림 실패는 과제 생성 자체를 실패시키지 않음
      }
    }

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: '할 일 생성에 실패했습니다.' });
  }
});

// 할 일 수정
router.put('/tasks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { id } = req.params as { id: string };
    const { title, description, subject, date, worksheetId, pdfUrl, learningGoals } = req.body;

    // 권한 검증: 해당 과제가 존재하고 현재 멘토가 소유자인지 확인
    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: { mentorId: true, menteeId: true },
    });

    if (!existingTask) {
      return res.status(404).json({ error: '과제를 찾을 수 없습니다.' });
    }

    // 과제를 생성한 멘토이거나, 담당 멘토여야 함
    if (existingTask.mentorId !== mentorId) {
      const relation = await prisma.mentorMentee.findFirst({
        where: {
          mentorId,
          menteeId: existingTask.menteeId,
        },
      });

      if (!relation) {
        return res.status(403).json({ error: '수정 권한이 없습니다.' });
      }
    }

    // UTC 기준으로 날짜 파싱 (타임존 문제 해결)
    const taskDate = date ? parseUTCDate(date) : undefined;

    // 트랜잭션으로 Task 업데이트와 LearningGoal 처리
    const task = await prisma.$transaction(async (tx) => {
      // 1. Task 업데이트
      const updatedTask = await tx.task.update({
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

      // 2. LearningGoal 업데이트 (learningGoals가 제공된 경우에만)
      if (learningGoals !== undefined) {
        // 기존 LearningGoal 삭제
        await tx.learningGoal.deleteMany({ where: { taskId: id } });

        // 새로운 LearningGoal 생성 (빈 배열이 아닌 경우)
        if (Array.isArray(learningGoals) && learningGoals.length > 0) {
          await tx.learningGoal.create({
            data: {
              taskId: id,
              items: {
                create: learningGoals
                  .filter((title: string) => title && title.trim())
                  .map((title: string, index: number) => ({
                    title: title.trim(),
                    order: index,
                  })),
              },
            },
          });
        }
      }

      return updatedTask;
    });

    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: '할 일 수정에 실패했습니다.' });
  }
});

// 할 일 승인 (멘토가 멘티의 과제 완료를 승인 - 달성률 반영)
router.patch('/tasks/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const mentorId = req.user!.userId;
    const { isApproved } = req.body as { isApproved: boolean };

    // 과제 확인
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { mentee: true },
    });

    if (!existingTask) {
      return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
    }

    // 멘토-멘티 관계 확인 (담당 멘토인지)
    const relation = await prisma.mentorMentee.findFirst({
      where: {
        mentorId,
        menteeId: existingTask.menteeId,
      },
    });

    // 담당 멘토이거나 과제를 생성한 멘토인 경우에만 승인 가능
    if (!relation && existingTask.mentorId !== mentorId) {
      return res.status(403).json({ error: '이 과제를 승인할 권한이 없습니다.' });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        isApproved,
        approvedAt: isApproved ? new Date() : null,
        approvedBy: isApproved ? mentorId : null,
        // 멘토 승인시 기존 isCompleted도 동기화 (하위 호환성)
        isCompleted: isApproved,
      },
    });

    res.json({
      task,
      message: isApproved ? '과제가 승인되었습니다.' : '승인이 취소되었습니다.'
    });
  } catch (error) {
    console.error('Approve task error:', error);
    res.status(500).json({ error: '과제 승인에 실패했습니다.' });
  }
});

// 할 일 삭제
router.delete('/tasks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { id } = req.params as { id: string };

    // 권한 검증: 해당 과제가 존재하고 현재 멘토가 소유자인지 확인
    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: { mentorId: true, menteeId: true },
    });

    if (!existingTask) {
      return res.status(404).json({ error: '과제를 찾을 수 없습니다.' });
    }

    // 과제를 생성한 멘토이거나, 담당 멘토여야 함
    if (existingTask.mentorId !== mentorId) {
      const relation = await prisma.mentorMentee.findFirst({
        where: {
          mentorId,
          menteeId: existingTask.menteeId,
        },
      });

      if (!relation) {
        return res.status(403).json({ error: '삭제 권한이 없습니다.' });
      }
    }

    // 트랜잭션으로 관련 데이터를 모두 삭제
    await prisma.$transaction(async (tx) => {
      // 1. 제출 내역 삭제
      await tx.taskSubmission.deleteMany({ where: { taskId: id } });

      // 2. 피드백 삭제
      await tx.feedback.deleteMany({ where: { taskId: id } });

      // 3. 공부 시간 로그 삭제
      await tx.studyTimeLog.deleteMany({ where: { taskId: id } });

      // 4. 과제 삭제
      await tx.task.delete({ where: { id } });
    });

    res.json({ message: '할 일이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: '할 일 삭제에 실패했습니다.' });
  }
});

// 피드백 작성 (자동 승인 포함)
router.post('/feedbacks', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { taskId, content, summary, subject, feedbackDate } = req.body;

    // UTC 기준으로 날짜 파싱 (타임존 문제 해결)
    // feedbackDate가 없거나 빈 문자열이면 오늘 날짜 사용
    const fbDate = feedbackDate?.trim() ? parseUTCDate(feedbackDate) : getTodayUTC();

    // Task 정보 조회 (알림용)
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        mentee: { select: { id: true, name: true } },
        mentor: { select: { name: true } },
      },
    });

    if (!task) {
      return res.status(404).json({ error: '과제를 찾을 수 없습니다.' });
    }

    // 트랜잭션으로 피드백 작성 + 자동 승인
    const result = await prisma.$transaction(async (tx) => {
      // 피드백 생성
      const feedback = await tx.feedback.create({
        data: {
          taskId,
          mentorId,
          content,
          summary,
          subject,
          feedbackDate: fbDate,
        },
      });

      // 과제 자동 승인 (피드백 작성 = 멘토 확인 완료)
      await tx.task.update({
        where: { id: taskId },
        data: {
          isApproved: true,
          approvedAt: new Date(),
          approvedBy: mentorId,
          isCompleted: true,
        },
      });

      return feedback;
    });

    // 멘티에게 알림 전송
    try {
      const { notifyNewFeedback } = await import('../lib/notifications');
      await notifyNewFeedback({
        menteeId: task.mentee.id,
        mentorName: task.mentor?.name || '멘토',
        taskTitle: task.title,
        feedbackId: result.id,
      });
    } catch (notifError) {
      console.error('[Notification Error] Failed to send feedback notification:', notifError);
      // 알림 실패는 피드백 작성 자체를 실패시키지 않음
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({ error: '피드백 작성에 실패했습니다.' });
  }
});

// 피드백 조회 (수정용)
router.get('/feedbacks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { id } = req.params as { id: string };

    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            mentee: {
              select: {
                id: true,
                name: true,
                nickname: true,
              },
            },
            submissions: {
              orderBy: {
                createdAt: 'desc',
              },
            },
            worksheet: true,
          },
        },
      },
    });

    if (!feedback) {
      return res.status(404).json({ error: '피드백을 찾을 수 없습니다.' });
    }

    // 멘토 권한 확인
    if (feedback.mentorId !== mentorId) {
      return res.status(403).json({ error: '피드백을 조회할 권한이 없습니다.' });
    }

    res.json(feedback);
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: '피드백 조회에 실패했습니다.' });
  }
});

// 피드백 수정
router.put('/feedbacks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { id } = req.params as { id: string };
    const { content, summary } = req.body;

    // 권한 검증: 해당 피드백이 존재하고 현재 멘토가 작성자인지 확인
    const existingFeedback = await prisma.feedback.findUnique({
      where: { id },
      select: { mentorId: true },
    });

    if (!existingFeedback) {
      return res.status(404).json({ error: '피드백을 찾을 수 없습니다.' });
    }

    if (existingFeedback.mentorId !== mentorId) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

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

// 학습지 수정
router.put('/worksheets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const worksheetId = req.params.id as string;
    const { title, subject, content, pdfUrl, type } = req.body;

    // 권한 확인
    const worksheet = await prisma.worksheet.findUnique({
      where: { id: worksheetId },
    });

    if (!worksheet) {
      return res.status(404).json({ error: '학습지를 찾을 수 없습니다.' });
    }

    if (worksheet.createdById !== mentorId) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    const updatedWorksheet = await prisma.worksheet.update({
      where: { id: worksheetId },
      data: {
        title,
        subject,
        content,
        pdfUrl,
        type,
      },
    });

    res.json(updatedWorksheet);
  } catch (error) {
    console.error('Update worksheet error:', error);
    res.status(500).json({ error: '학습지 수정에 실패했습니다.' });
  }
});

// 학습지 삭제
router.delete('/worksheets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const worksheetId = req.params.id as string;

    // 권한 확인
    const worksheet = await prisma.worksheet.findUnique({
      where: { id: worksheetId },
    });

    if (!worksheet) {
      return res.status(404).json({ error: '학습지를 찾을 수 없습니다.' });
    }

    if (worksheet.createdById !== mentorId) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    await prisma.worksheet.delete({
      where: { id: worksheetId },
    });

    res.json({ message: '학습지가 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete worksheet error:', error);
    res.status(500).json({ error: '학습지 삭제에 실패했습니다.' });
  }
});

// ========== 일일 전체 피드백 API ==========

// 일일 피드백 작성
router.post('/daily-feedbacks', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { menteeId, date, content, summary } = req.body;

    if (!menteeId || !date || !content) {
      return res.status(400).json({ error: '필수 필드를 입력해주세요.' });
    }

    // 멘토-멘티 관계 확인
    const relation = await prisma.mentorMentee.findFirst({
      where: { mentorId, menteeId },
    });

    if (!relation) {
      return res.status(403).json({ error: '해당 멘티에 대한 권한이 없습니다.' });
    }

    // 같은 날짜에 이미 피드백이 있는지 확인 (UTC 기준, 타임존 문제 해결)
    const [targetDate, nextDay] = getDateRange(date);

    const existing = await prisma.dailyFeedback.findFirst({
      where: {
        menteeId,
        date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
    });

    if (existing) {
      return res.status(400).json({
        error: '이미 해당 날짜에 일일 피드백이 존재합니다. 수정 기능을 사용해주세요.',
        existingId: existing.id,
      });
    }

    const dailyFeedback = await prisma.dailyFeedback.create({
      data: {
        mentorId,
        menteeId,
        date: targetDate,
        content,
        summary,
      },
      include: {
        mentee: {
          select: {
            id: true,
            name: true,
            nickname: true,
          },
        },
      },
    });

    res.status(201).json(dailyFeedback);
  } catch (error) {
    console.error('Daily feedback create error:', error);
    res.status(500).json({ error: '일일 피드백 작성에 실패했습니다.' });
  }
});

// 일일 피드백 수정
router.put('/daily-feedbacks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { id } = req.params as { id: string };
    const { content, summary } = req.body;

    if (!content) {
      return res.status(400).json({ error: '피드백 내용을 입력해주세요.' });
    }

    // 피드백 존재 및 권한 확인
    const existing = await prisma.dailyFeedback.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: '일일 피드백을 찾을 수 없습니다.' });
    }

    if (existing.mentorId !== mentorId) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    const updated = await prisma.dailyFeedback.update({
      where: { id },
      data: {
        content,
        summary,
      },
      include: {
        mentee: {
          select: {
            id: true,
            name: true,
            nickname: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Daily feedback update error:', error);
    res.status(500).json({ error: '일일 피드백 수정에 실패했습니다.' });
  }
});

// 특정 멘티의 일일 피드백 조회 (날짜별)
router.get('/mentees/:menteeId/daily-feedbacks', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const menteeId = req.params.menteeId as string;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: '날짜를 입력해주세요.' });
    }

    // 멘토-멘티 관계 확인
    const relation = await prisma.mentorMentee.findUnique({
      where: {
        mentorId_menteeId: {
          mentorId,
          menteeId,
        },
      },
    });

    if (!relation) {
      return res.status(403).json({ error: '해당 멘티의 피드백을 조회할 권한이 없습니다.' });
    }

    // 날짜 범위로 조회 (UTC 기준, 타임존 문제 해결)
    const [targetDate, nextDay] = getDateRange(date as string);

    const dailyFeedback = await prisma.dailyFeedback.findFirst({
      where: {
        menteeId,
        mentorId,
        date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
    });

    res.json(dailyFeedback);
  } catch (error) {
    console.error('Daily feedback fetch error:', error);
    res.status(500).json({ error: '일일 피드백을 불러오는데 실패했습니다.' });
  }
});

export default router;
