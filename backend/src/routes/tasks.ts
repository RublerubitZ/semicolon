import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authMiddleware);

// 댓글 생성 API
router.post('/tasks/:taskId/comments', async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const { content } = req.body;
    const userId = req.user!.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '댓글 내용을 입력해주세요.' });
    }

    // Task 존재 여부 확인
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        menteeId: true,
        mentorId: true,
      },
    });

    if (!task) {
      return res.status(404).json({ error: '과제를 찾을 수 없습니다.' });
    }

    // 권한 검증: 과제의 멘토 또는 멘티만 댓글 작성 가능
    let isAuthorized = task.menteeId === userId || task.mentorId === userId;

    // 만약 task.mentorId가 없으면(멘티가 직접 만든 과제), 현재 사용자가 해당 멘티의 담당 멘토인지 확인
    if (!isAuthorized && userId !== task.menteeId) {
      const relation = await prisma.mentorMentee.findUnique({
        where: {
          mentorId_menteeId: {
            mentorId: userId,
            menteeId: task.menteeId,
          },
        },
      });
      if (relation) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: '이 과제에 댓글을 작성할 권한이 없습니다.' });
    }

    // 댓글 생성
    const comment = await prisma.feedbackComment.create({
      data: {
        taskId,
        userId,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            
            profileImage: true,
            role: true,
          },
        },
      },
    });

    // 알림 전송 (댓글 작성자가 아닌 상대방에게)
    const recipientId = userId === task.menteeId ? task.mentorId : task.menteeId;

    if (recipientId && recipientId.trim() !== '') {
      try {
        const sender = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });

        await prisma.notification.create({
          data: {
            userId: recipientId,
            type: 'NEW_FEEDBACK',
            title: '새로운 댓글이 도착했습니다',
            content: `${sender?.name}님이 댓글을 남겼습니다: ${content.slice(0, 50)}${content.length > 50 ? '...' : ''}`,
            relatedId: taskId,
          },
        });
      } catch (notifError) {
        console.error('댓글 알림 전송 오류 (무시됨):', notifError);
        // 알림 전송 실패가 댓글 생성 실패로 이어지지 않도록 함
      }
    }

    res.json(comment);
  } catch (error) {
    console.error('댓글 생성 오류:', error);
    res.status(500).json({ error: '댓글 생성 중 오류가 발생했습니다.', details: error instanceof Error ? error.message : String(error) });
  }
});

// 댓글 조회 API
router.get('/tasks/:taskId/comments', async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const userId = req.user!.userId;

    // Task 존재 여부 및 권한 확인
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        menteeId: true,
        mentorId: true,
      },
    });

    if (!task) {
      return res.status(404).json({ error: '과제를 찾을 수 없습니다.' });
    }

    // 권한 검증: 과제의 멘토 또는 멘티만 댓글 조회 가능
    let isAuthorized = task.menteeId === userId || task.mentorId === userId;

    if (!isAuthorized && userId !== task.menteeId) {
      const relation = await prisma.mentorMentee.findUnique({
        where: {
          mentorId_menteeId: {
            mentorId: userId,
            menteeId: task.menteeId,
          },
        },
      });
      if (relation) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: '이 과제의 댓글을 조회할 권한이 없습니다.' });
    }

    // 댓글 조회 (시간순 정렬)
    const comments = await prisma.feedbackComment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            
            profileImage: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ comments });
  } catch (error) {
    console.error('댓글 조회 오류:', error);
    res.status(500).json({ error: '댓글 조회 중 오류가 발생했습니다.' });
  }
});

// 댓글 삭제 API (선택사항)
router.delete('/tasks/:taskId/comments/:commentId', async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const commentId = req.params.commentId as string;
    const userId = req.user!.userId;

    // 댓글 조회
    const comment = await prisma.feedbackComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        taskId: true,
        userId: true,
      },
    });

    if (!comment) {
      return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    }

    if (comment.taskId !== taskId) {
      return res.status(400).json({ error: '잘못된 요청입니다.' });
    }

    // 권한 검증: 댓글 작성자만 삭제 가능
    if (comment.userId !== userId) {
      return res.status(403).json({ error: '댓글을 삭제할 권한이 없습니다.' });
    }

    // 댓글 삭제
    await prisma.feedbackComment.delete({
      where: { id: commentId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    res.status(500).json({ error: '댓글 삭제 중 오류가 발생했습니다.' });
  }
});

export default router;
