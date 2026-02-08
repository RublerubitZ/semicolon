import { Router, Response } from 'express';
import { authMiddleware, mentorOnly, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { parseUTCDate, getDateRange, getTodayUTC, isValidDateStr } from '../lib/date-utils';
import { updateStreak, getStreak } from '../lib/streak-manager';
import { generateHeatmapData } from '../lib/heatmap-generator';
import { calculateWeeklyRanking } from '../lib/ranking-manager';
import { isTaskCompleted, countCompletedTasks } from '../lib/task-utils';

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
            email: true,
            grade: true,
            profileImage: true,
          },
        },
      },
    });

    const menteeIds = relations.map(r => r.menteeId);

    // 한 번의 쿼리로 모든 과제 조회 후 메모리에서 집계 (N+1 쿼리 방지)
    const allTasks = await prisma.task.findMany({
      where: { menteeId: { in: menteeIds } },
      select: {
        menteeId: true,
        submissions: { select: { id: true } },
      },
    });

    // 메모리에서 통계 집계
    const stats = allTasks.reduce((acc, task) => {
      if (!acc[task.menteeId]) {
        acc[task.menteeId] = { total: 0, completed: 0 };
      }
      acc[task.menteeId].total++;
      if (isTaskCompleted(task)) {
        acc[task.menteeId].completed++;
      }
      return acc;
    }, {} as Record<string, { total: number; completed: number }>);

    const totalMap = Object.fromEntries(
      Object.entries(stats).map(([id, s]) => [id, s.total])
    );
    const completedMap = Object.fromEntries(
      Object.entries(stats).map(([id, s]) => [id, s.completed])
    );

    const mentees = relations.map(r => ({
      ...r.mentee,
      totalTasks: totalMap[r.menteeId] || 0,
      completedTasks: completedMap[r.menteeId] || 0,
    }));

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

// 멘티의 과제 목록 조회
router.get('/mentees/:id/tasks', async (req: AuthRequest, res: Response) => {
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

    const tasks = await prisma.task.findMany({
      where: { menteeId },
      orderBy: { date: 'desc' },
      include: {
        submissions: true,
        feedbacks: true,
        studyLogs: true,
        worksheet: {
          select: {
            id: true,
            title: true,
            subject: true,
            pdfUrl: true,
          },
        },
      },
    });

    res.json(tasks);
  } catch (error) {
    console.error('Mentee tasks error:', error);
    res.status(500).json({ error: '과제 목록을 불러오는데 실패했습니다.' });
  }
});

// 과제 상세 조회 (멘토용)
router.get('/tasks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        mentee: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          }
        },
        worksheet: true,
        submissions: {
          orderBy: { createdAt: 'desc' }
        },
        studyLogs: true,
        learningGoal: { 
          include: { 
            items: { orderBy: { order: 'asc' } } 
          } 
        },
        feedbacks: { 
          include: { 
            mentor: { 
              select: { 
                id: true,
                name: true, 
                profileImage: true 
              } 
            } 
          } 
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: '과제를 찾을 수 없습니다.' });
    }

    res.json(task);
  } catch (error) {
    console.error('Mentor task detail error:', error);
    res.status(500).json({ error: '조회 실패' });
  }
});

// 멘티 일일 플래너 조회
router.get('/mentees/:id/planner/daily', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { date } = req.query;
    if (date && !isValidDateStr(date as string)) {
      return res.status(400).json({ error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' });
    }

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
    if (date && !isValidDateStr(date as string)) {
      return res.status(400).json({ error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' });
    }

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
    if (startDate && !isValidDateStr(startDate as string)) {
      return res.status(400).json({ error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' });
    }

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
      completedTasks: countCompletedTasks(tasks),
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
      if (isTaskCompleted(task)) {
        stats.subjectStats[subject].completed++;
      }

      const studyTime = task.studyLogs.reduce((sum, log) => sum + log.duration, 0);
      stats.subjectStats[subject].studyTime += studyTime;
      stats.totalStudyTime += studyTime;
    });

    res.json({ tasks, stats, startDate: start, endDate: end });
  } catch (error) {
    console.error('주간 플래너를 불러오는데 실패했습니다 오류:', error);
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

    // 해당 월의 일일 피드백(DailyFeedback)도 함께 조회
    const dailyFeedbacks = await prisma.dailyFeedback.findMany({
      where: {
        menteeId: id as string,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    const tasksByDate: Record<string, any[]> = {};
    tasks.forEach((task) => {
      const dateKey = task.date.toISOString().split('T')[0];
      if (!tasksByDate[dateKey]) {
        tasksByDate[dateKey] = [];
      }
      tasksByDate[dateKey].push(task);
    });

    const feedbacksByDate: Record<string, any> = {};
    dailyFeedbacks.forEach((fb) => {
      const dateKey = fb.date.toISOString().split('T')[0];
      feedbacksByDate[dateKey] = fb;
    });

    const stats = {
      totalTasks: tasks.length,
      // 과제 제출 기준으로 달성률 계산
      completedTasks: countCompletedTasks(tasks),
      totalStudyTime: tasks.reduce(
        (sum, task) => sum + task.studyLogs.reduce((s, log) => s + log.duration, 0),
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
      if (isTaskCompleted(task)) {
        stats.subjectStats[subject].completed++;
      }

      const studyTime = task.studyLogs.reduce((sum, log) => sum + log.duration, 0);
      stats.subjectStats[subject].studyTime += studyTime;
    });

    res.json({ tasksByDate, feedbacksByDate, stats, year: targetYear, month: targetMonth });
  } catch (error) {
    console.error('월간 플래너를 불러오는데 실패했습니다 오류:', error);
    res.status(500).json({ error: '월간 플래너를 불러오는데 실패했습니다.' });
  }
});

// 할 일 생성 (고정 과제)
router.post('/tasks', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { menteeId, title, description, subject, date, worksheetId, pdfUrl, learningGoals, materials } = req.body;

    // materials 배열 검증 (새로운 방식)
    if (materials && Array.isArray(materials)) {
      const { MAX_TASK_MATERIALS } = await import('../constants/limits');

      // 최소 1개 검증
      if (materials.length === 0) {
        return res.status(400).json({ error: '최소 1개의 학습 자료를 등록해주세요.' });
      }

      // 최대 개수 검증
      if (materials.length > MAX_TASK_MATERIALS) {
        return res.status(400).json({
          error: `학습 자료는 최대 ${MAX_TASK_MATERIALS}개까지 등록 가능합니다.`
        });
      }

      // 각 material 타입별 필수 필드 검증
      for (const material of materials) {
        if (material.type === 'PDF' && !material.pdfUrl) {
          return res.status(400).json({ error: 'PDF 타입은 pdfUrl이 필요합니다.' });
        }
        if (material.type === 'COLUMN' && !material.columnTitle && !material.columnContent) {
          return res.status(400).json({
            error: '칼럼 타입은 제목 또는 내용이 필요합니다.'
          });
        }
      }
    }

    // UTC 기준으로 날짜 파싱 (타임존 문제 해결)
    const taskDate = parseUTCDate(date);

    // 멘티와 멘토 정보 조회 (알림용)
    const [mentee, mentor] = await Promise.all([
      prisma.user.findUnique({ where: { id: menteeId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: mentorId }, select: { name: true } }),
    ]);

    // 트랜잭션으로 Task, TaskMaterial, LearningGoal 함께 생성
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
          worksheetId, // 하위 호환성 유지
          pdfUrl,      // 하위 호환성 유지
          isFixed: true,
        },
      });

      // 2. TaskMaterial 일괄 생성 (새로운 방식)
      if (materials && Array.isArray(materials) && materials.length > 0) {
        await tx.taskMaterial.createMany({
          data: materials.map((m: any, idx: number) => ({
            taskId: newTask.id,
            type: m.type,
            order: m.order !== undefined ? m.order : idx,
            pdfUrl: m.pdfUrl || null,
            pdfFileName: m.pdfFileName || null, // PDF 원본 파일명
            columnTitle: m.columnTitle || null,
            columnContent: m.columnContent || null,
          })),
        });
      }

      // 3. LearningGoal 생성 (있는 경우)
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
    console.error('할 일 생성에 실패했습니다. 오류:', error);
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
    console.error('할 일 수정에 실패했습니다. 오류:', error);
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

    // 스트릭 업데이트 (과제 승인 시)
    if (isApproved) {
      try {
        await updateStreak(task.menteeId, task.date);
      } catch (streakError) {
        console.error('[Streak Error] Failed to update streak on task approval:', streakError);
        // 스트릭 업데이트 실패해도 과제 승인은 계속 진행
      }
    }

    res.json({
      task,
      message: isApproved ? '과제가 승인되었습니다.' : '승인이 취소되었습니다.'
    });
  } catch (error) {
    console.error('과제 승인에 실패했습니다. 오류:', error);
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
    console.error('할 일 삭제에 실패했습니다. 오류:', error);
    res.status(500).json({ error: '할 일 삭제에 실패했습니다.' });
  }
});

// 멘토의 모든 피드백 목록 조회
router.get('/feedbacks', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;

    const feedbacks = await prisma.feedback.findMany({
      where: { mentorId },
      include: {
        task: {
          include: {
            mentee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 프론트엔드에서 기대하는 형식으로 변환
    const formattedFeedbacks = feedbacks.map(f => ({
      id: f.id,
      menteeId: f.task.menteeId,
      menteeName: f.task.mentee.name,
      taskTitle: f.task.title,
      subject: f.subject,
      summary: f.summary,
      content: f.content,
      createdAt: f.createdAt,
      taskId: f.taskId,
    }));

    res.json(formattedFeedbacks);
  } catch (error) {
    console.error('피드백 목록 조회 오류:', error);
    res.status(500).json({ error: '피드백 목록을 불러오는데 실패했습니다.' });
  }
});

// 특정 멘티의 피드백 목록 조회
router.get('/mentees/:menteeId/feedbacks', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { menteeId } = req.params as { menteeId: string };

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

    const feedbacks = await prisma.feedback.findMany({
      where: {
        mentorId,
        task: {
          menteeId,
        },
      },
      include: {
        task: {
          include: {
            mentee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 프론트엔드에서 기대하는 형식으로 변환
    const formattedFeedbacks = feedbacks.map(f => ({
      id: f.id,
      menteeId: f.task.menteeId,
      menteeName: f.task.mentee.name,
      taskTitle: f.task.title,
      subject: f.subject,
      summary: f.summary,
      content: f.content,
      createdAt: f.createdAt,
      taskId: f.taskId,
    }));

    res.json(formattedFeedbacks);
  } catch (error) {
    console.error('피드백 목록 조회 오류:', error);
    res.status(500).json({ error: '피드백 목록을 불러오는데 실패했습니다.' });
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
        taskId: taskId,
      });
    } catch (notifError) {
      console.error('[Notification Error] Failed to send feedback notification:', notifError);
      // 알림 실패는 피드백 작성 자체를 실패시키지 않음
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('피드백 작성에 실패했습니다. 오류:', error);
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
    console.error('피드백 조회에 실패했습니다. 오류:', error);
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
    console.error('피드백 수정에 실패했습니다. 오류:', error);
    res.status(500).json({ error: '피드백 수정에 실패했습니다.' });
  }
});

// 피드백 삭제
router.delete('/feedbacks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { id } = req.params as { id: string };

    // 권한 검증: 해당 피드백이 존재하고 현재 멘토가 작성자인지 확인
    const existingFeedback = await prisma.feedback.findUnique({
      where: { id },
      select: { mentorId: true },
    });

    if (!existingFeedback) {
      return res.status(404).json({ error: '피드백을 찾을 수 없습니다.' });
    }

    if (existingFeedback.mentorId !== mentorId) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    await prisma.feedback.delete({
      where: { id },
    });

    res.json({ message: '피드백이 삭제되었습니다.' });
  } catch (error) {
    console.error('피드백 삭제에 실패했습니다. 오류:', error);
    res.status(500).json({ error: '피드백 삭제에 실패했습니다.' });
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
    console.error('학습지 목록을 불러오는데 실패했습니다 오류:', error);
    res.status(500).json({ error: '학습지 목록을 불러오는데 실패했습니다.' });
  }
});

// 학습지 생성
router.post('/worksheets', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { title, subject, content, pdfUrl, pdfFileName, type } = req.body;

    // 검증 1: PDF와 칼럼 동시 등록 방지
    const hasPdf = pdfUrl && pdfUrl.trim();
    const hasColumn = content && content.trim();

    if (hasPdf && hasColumn) {
      return res.status(400).json({
        error: 'PDF와 칼럼을 동시에 등록할 수 없습니다.'
      });
    }

    // 검증 2: 둘 다 없는 경우 방지
    if (!hasPdf && !hasColumn) {
      return res.status(400).json({
        error: '학습지 내용(PDF 또는 칼럼)을 등록해주세요.'
      });
    }

    // 검증 3: type 자동 결정
    const finalType = hasColumn ? 'COLUMN' : 'PDF';

    const worksheet = await prisma.worksheet.create({
      data: {
        createdById: mentorId,
        title,
        subject,
        content,
        pdfUrl,
        pdfFileName: pdfFileName || null,
        type: finalType,
      },
    });

    res.status(201).json(worksheet);
  } catch (error) {
    console.error('학습지 생성에 실패했습니다. 오류:', error);
    res.status(500).json({ error: '학습지 생성에 실패했습니다.' });
  }
});

// 학습지 수정
router.put('/worksheets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const worksheetId = req.params.id as string;
    const { title, subject, content, pdfUrl, pdfFileName, type } = req.body;

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
        pdfFileName: pdfFileName !== undefined ? pdfFileName : undefined,
        type,
      },
    });

    res.json(updatedWorksheet);
  } catch (error) {
    console.error('학습지 수정에 실패했습니다. 오류:', error);
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
    console.error('학습지 삭제에 실패했습니다. 오류:', error);
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
          },
        },
      },
    });

    res.status(201).json(dailyFeedback);
  } catch (error) {
    console.error('일일 피드백 작성에 실패했습니다. 오류:', error);
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
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('일일 피드백 수정에 실패했습니다. 오류:', error);
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
    console.error('일일 피드백을 불러오는데 실패했습니다 오류:', error);
    res.status(500).json({ error: '일일 피드백을 불러오는데 실패했습니다.' });
  }
});

// ========== 월간 총평 API ==========

// 월간 총평 작성
router.post('/monthly-feedbacks', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { menteeId, year, month, overallComment, strengths, improvements, nextMonthGoals } = req.body;

    if (!menteeId || !year || !month || !overallComment || !strengths || !improvements || !nextMonthGoals) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    // 멘토-멘티 관계 확인
    const relation = await prisma.mentorMentee.findFirst({
      where: { mentorId, menteeId },
    });

    if (!relation) {
      return res.status(403).json({ error: '해당 멘티에 대한 권한이 없습니다.' });
    }

    // 이미 존재하는지 확인
    const existing = await prisma.monthlyFeedback.findUnique({
      where: {
        menteeId_year_month: { menteeId, year: Number(year), month: Number(month) },
      },
    });

    if (existing) {
      return res.status(400).json({
        error: '이미 해당 월의 총평이 존재합니다. 수정 기능을 사용해주세요.',
        existingId: existing.id,
      });
    }

    const monthlyFeedback = await prisma.monthlyFeedback.create({
      data: {
        mentorId,
        menteeId,
        year: Number(year),
        month: Number(month),
        overallComment,
        strengths,
        improvements,
        nextMonthGoals,
      },
      include: {
        mentee: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(monthlyFeedback);
  } catch (error) {
    console.error('월간 총평 작성에 실패했습니다. 오류:', error);
    res.status(500).json({ error: '월간 총평 작성에 실패했습니다.' });
  }
});

// 월간 총평 수정
router.put('/monthly-feedbacks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { id } = req.params as { id: string };
    const { overallComment, strengths, improvements, nextMonthGoals } = req.body;

    if (!overallComment || !strengths || !improvements || !nextMonthGoals) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    const existing = await prisma.monthlyFeedback.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: '월간 총평을 찾을 수 없습니다.' });
    }

    if (existing.mentorId !== mentorId) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    const updated = await prisma.monthlyFeedback.update({
      where: { id },
      data: { overallComment, strengths, improvements, nextMonthGoals },
      include: {
        mentee: { select: { id: true, name: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('월간 총평 수정에 실패했습니다. 오류:', error);
    res.status(500).json({ error: '월간 총평 수정에 실패했습니다.' });
  }
});

// 특정 멘티의 월간 총평 조회
router.get('/mentees/:menteeId/monthly-feedbacks', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const menteeId = req.params.menteeId as string;
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: '년도와 월을 입력해주세요.' });
    }

    // 멘토-멘티 관계 확인
    const relation = await prisma.mentorMentee.findUnique({
      where: { mentorId_menteeId: { mentorId, menteeId } },
    });

    if (!relation) {
      return res.status(403).json({ error: '해당 멘티의 총평을 조회할 권한이 없습니다.' });
    }

    const monthlyFeedback = await prisma.monthlyFeedback.findUnique({
      where: {
        menteeId_year_month: {
          menteeId,
          year: Number(year),
          month: Number(month),
        },
      },
    });

    res.json(monthlyFeedback);
  } catch (error) {
    console.error('월간 총평을 불러오는데 실패했습니다. 오류:', error);
    res.status(500).json({ error: '월간 총평을 불러오는데 실패했습니다.' });
  }
});

// ========== 주간 총평 API ==========

// 주간 총평 작성
router.post('/weekly-feedbacks', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { menteeId, year, month, weekNumber, overallComment, strengths, improvements, nextWeekGoals } = req.body;

    if (!menteeId || !year || !month || !weekNumber || !overallComment || !strengths || !improvements || !nextWeekGoals) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    const relation = await prisma.mentorMentee.findFirst({
      where: { mentorId, menteeId },
    });

    if (!relation) {
      return res.status(403).json({ error: '해당 멘티에 대한 권한이 없습니다.' });
    }

    const existing = await prisma.weeklyFeedback.findUnique({
      where: {
        menteeId_year_month_weekNumber: {
          menteeId,
          year: Number(year),
          month: Number(month),
          weekNumber: Number(weekNumber),
        },
      },
    });

    if (existing) {
      return res.status(400).json({
        error: '이미 해당 주차의 총평이 존재합니다. 수정 기능을 사용해주세요.',
        existingId: existing.id,
      });
    }

    const weeklyFeedback = await prisma.weeklyFeedback.create({
      data: {
        mentorId,
        menteeId,
        year: Number(year),
        month: Number(month),
        weekNumber: Number(weekNumber),
        overallComment,
        strengths,
        improvements,
        nextWeekGoals,
      },
      include: {
        mentee: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(weeklyFeedback);
  } catch (error) {
    console.error('주간 총평 작성에 실패했습니다. 오류:', error);
    res.status(500).json({ error: '주간 총평 작성에 실패했습니다.' });
  }
});

// 주간 총평 수정
router.put('/weekly-feedbacks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const { id } = req.params as { id: string };
    const { overallComment, strengths, improvements, nextWeekGoals } = req.body;

    if (!overallComment || !strengths || !improvements || !nextWeekGoals) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    const existing = await prisma.weeklyFeedback.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: '주간 총평을 찾을 수 없습니다.' });
    }

    if (existing.mentorId !== mentorId) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    const updated = await prisma.weeklyFeedback.update({
      where: { id },
      data: { overallComment, strengths, improvements, nextWeekGoals },
      include: {
        mentee: { select: { id: true, name: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('주간 총평 수정에 실패했습니다. 오류:', error);
    res.status(500).json({ error: '주간 총평 수정에 실패했습니다.' });
  }
});

// 특정 멘티의 주간 총평 조회 (단일 주차)
router.get('/mentees/:menteeId/weekly-feedbacks', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const menteeId = req.params.menteeId as string;
    const { year, month, weekNumber } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: '년도와 월을 입력해주세요.' });
    }

    const relation = await prisma.mentorMentee.findUnique({
      where: { mentorId_menteeId: { mentorId, menteeId } },
    });

    if (!relation) {
      return res.status(403).json({ error: '해당 멘티의 총평을 조회할 권한이 없습니다.' });
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
        orderBy: { weekNumber: 'asc' },
      });
      res.json(weeklyFeedbacks);
    }
  } catch (error) {
    console.error('주간 총평을 불러오는데 실패했습니다. 오류:', error);
    res.status(500).json({ error: '주간 총평을 불러오는데 실패했습니다.' });
  }
});

// ========== 멘티 종합 통계 대시보드 API ==========

router.get('/mentees/:menteeId/stats/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const menteeId = req.params.menteeId as string;
    const { year, month } = req.query;

    const today = getTodayUTC();
    const targetYear = year ? Number(year) : today.getUTCFullYear();
    const targetMonth = month ? Number(month) : today.getUTCMonth() + 1;

    // 멘토-멘티 관계 확인
    const relation = await prisma.mentorMentee.findUnique({
      where: { mentorId_menteeId: { mentorId, menteeId } },
    });

    if (!relation) {
      return res.status(403).json({ error: '해당 멘티의 통계를 조회할 권한이 없습니다.' });
    }

    // 현재 월 범위
    const monthStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const monthEnd = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));
    const daysInMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();

    // 이전 월 범위
    const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
    const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
    const prevMonthStart = new Date(Date.UTC(prevYear, prevMonth - 1, 1));
    const prevMonthEnd = new Date(Date.UTC(prevYear, prevMonth, 0, 23, 59, 59, 999));

    // 현재 월 과제 조회
    const currentTasks = await prisma.task.findMany({
      where: {
        menteeId,
        date: { gte: monthStart, lte: monthEnd },
      },
      include: {
        submissions: true,
        feedbacks: true,
        studyLogs: true,
        learningGoal: { include: { items: true } },
      },
    });

    // 이전 월 과제 조회
    const prevTasks = await prisma.task.findMany({
      where: {
        menteeId,
        date: { gte: prevMonthStart, lte: prevMonthEnd },
      },
      include: {
        submissions: true,
        feedbacks: true,
        studyLogs: true,
      }
    });

    // === 현재 월 통계 계산 ===
    const currentTotal = currentTasks.length;
    const currentCompleted = countCompletedTasks(currentTasks);
    const currentCompletionRate = currentTotal > 0 ? Math.round((currentCompleted / currentTotal) * 100) : 0;
    const currentStudyTime = currentTasks.reduce((sum, t) =>
      sum + t.studyLogs.reduce((s, log) => s + log.duration, 0), 0);
    const currentFeedbacks = currentTasks.reduce((sum, t) => sum + t.feedbacks.length, 0);

    // 과목별 통계
    const subjectStats: Record<string, { total: number; completed: number; completionRate: number; studyTime: number }> = {};
    currentTasks.forEach(task => {
      const subject = task.subject;
      if (!subjectStats[subject]) {
        subjectStats[subject] = { total: 0, completed: 0, completionRate: 0, studyTime: 0 };
      }
      subjectStats[subject].total++;
      if (isTaskCompleted(task)) subjectStats[subject].completed++;
      subjectStats[subject].studyTime += task.studyLogs.reduce((s, log) => s + log.duration, 0);
    });
    Object.values(subjectStats).forEach(stat => {
      stat.completionRate = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
    });

    // 주차별 통계
    const weeklyBreakdown: Array<{
      weekNumber: number;
      totalTasks: number;
      completedTasks: number;
      completionRate: number;
      studyTime: number;
    }> = [];

    const totalWeeks = Math.ceil(daysInMonth / 7);
    for (let week = 0; week < totalWeeks; week++) {
      const weekStartDay = week * 7 + 1;
      const weekEndDay = Math.min((week + 1) * 7, daysInMonth);
      const weekStart = new Date(Date.UTC(targetYear, targetMonth - 1, weekStartDay));
      const weekEnd = new Date(Date.UTC(targetYear, targetMonth - 1, weekEndDay, 23, 59, 59, 999));

      const weekTasks = currentTasks.filter(t => {
        const d = new Date(t.date);
        return d >= weekStart && d <= weekEnd;
      });

      const total = weekTasks.length;
      const completed = countCompletedTasks(weekTasks);
      const studyTime = weekTasks.reduce((sum, t) =>
        sum + t.studyLogs.reduce((s, log) => s + log.duration, 0), 0);

      weeklyBreakdown.push({
        weekNumber: week + 1,
        totalTasks: total,
        completedTasks: completed,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        studyTime,
      });
    }

    // === 이전 월 통계 ===
    const prevTotal = prevTasks.length;
    const prevCompleted = countCompletedTasks(prevTasks);
    const prevCompletionRate = prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : 0;
    const prevStudyTime = prevTasks.reduce((sum, t) =>
      sum + t.studyLogs.reduce((s, log) => s + log.duration, 0), 0);

    // === 피드백 응답률 ===
    const tasksSubmitted = countCompletedTasks(currentTasks);
    const feedbacksGiven = currentTasks.filter(t => t.feedbacks.length > 0).length;
    const feedbackRate = tasksSubmitted > 0 ? Math.round((feedbacksGiven / tasksSubmitted) * 100) : 0;

    // === 학습 목표 달성도 ===
    let totalGoalItems = 0;
    let completedGoalItems = 0;
    currentTasks.forEach(task => {
      if (task.learningGoal) {
        totalGoalItems += task.learningGoal.items.length;
        completedGoalItems += task.learningGoal.items.filter(item => item.isCompleted).length;
      }
    });
    const achievementRate = totalGoalItems > 0 ? Math.round((completedGoalItems / totalGoalItems) * 100) : 0;

    res.json({
      currentMonth: {
        year: targetYear,
        month: targetMonth,
        totalTasks: currentTotal,
        completedTasks: currentCompleted,
        completionRate: currentCompletionRate,
        totalStudyTime: currentStudyTime,
        totalFeedbacks: currentFeedbacks,
        subjectStats,
        weeklyBreakdown,
      },
      previousMonth: {
        totalTasks: prevTotal,
        completedTasks: prevCompleted,
        completionRate: prevCompletionRate,
        totalStudyTime: prevStudyTime,
      },
      monthOverMonth: {
        completionRateChange: currentCompletionRate - prevCompletionRate,
        studyTimeChange: currentStudyTime - prevStudyTime,
        taskCountChange: currentTotal - prevTotal,
      },
      feedbackResponseRate: {
        tasksSubmitted,
        feedbacksGiven,
        rate: feedbackRate,
      },
      learningGoalAchievement: {
        totalGoalItems,
        completedGoalItems,
        achievementRate,
      },
    });
  } catch (error) {
    console.error('통계를 불러오는데 실패했습니다. 오류:', error);
    res.status(500).json({ error: '통계를 불러오는데 실패했습니다.' });
  }
});

// 특정 멘티의 스트릭 정보 조회
router.get('/mentees/:id/streak', async (req: AuthRequest, res: Response) => {
  try {
    const { id: menteeId } = req.params as { id: string };
    const mentorId = req.user!.userId;

    // 권한 검증 (본인 멘티인지 확인)
    const relation = await prisma.mentorMentee.findFirst({
      where: { mentorId, menteeId },
    });

    if (!relation) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    const streak = await getStreak(menteeId);

    if (!streak) {
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

// 특정 멘티의 히트맵 데이터 조회
router.get('/mentees/:id/heatmap', async (req: AuthRequest, res: Response) => {
  try {
    const { id: menteeId } = req.params as { id: string };
    const mentorId = req.user!.userId;
    const { year } = req.query;

    // 권한 검증
    const relation = await prisma.mentorMentee.findFirst({
      where: { mentorId, menteeId },
    });

    if (!relation) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    let endDate: Date | undefined;
    if (year) {
      const yearNum = parseInt(year as string, 10);
      if (isNaN(yearNum)) {
        return res.status(400).json({ error: '올바른 연도를 입력해주세요.' });
      }
      endDate = new Date(Date.UTC(yearNum, 11, 31));
    }

    const data = await generateHeatmapData(menteeId, endDate);
    const resultYear = endDate ? endDate.getUTCFullYear() : getTodayUTC().getUTCFullYear();

    res.json({ data, year: resultYear });
  } catch (error) {
    console.error('히트맵 조회 오류:', error);
    res.status(500).json({ error: '히트맵 조회 실패' });
  }
});

// 본인 소속 멘티들의 주간 랭킹 조회
router.get('/ranking', async (req: AuthRequest, res: Response) => {
  try {
    const mentorId = req.user!.userId;
    const rankings = await calculateWeeklyRanking(mentorId);

    res.json({ rankings });
  } catch (error) {
    console.error('랭킹 조회 오류:', error);
    res.status(500).json({ error: '랭킹 조회 실패' });
  }
});

export default router;