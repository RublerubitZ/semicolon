import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sendDailyTaskReminder, sendIncompleteTaskNotification } from '../lib/scheduler';

const router = Router();

// 모든 알림 라우트에 인증 미들웨어 적용
router.use(authMiddleware);

// 알림 목록 조회
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { isRead } = req.query;

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(isRead !== undefined && { isRead: isRead === 'true' }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // 최근 50개만 조회
    });

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: '알림을 불러오는데 실패했습니다.' });
  }
});

// 읽지 않은 알림 개수 조회
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: '읽지 않은 알림 개수를 불러오는데 실패했습니다.' });
  }
});

// 알림 읽음 처리
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as { id: string };

    // 알림 소유자 확인
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ error: '알림을 수정할 권한이 없습니다.' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: '알림 읽음 처리에 실패했습니다.' });
  }
});

// 모든 알림 읽음 처리
router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ message: '모든 알림을 읽음 처리했습니다.' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: '알림 읽음 처리에 실패했습니다.' });
  }
});

// 테스트용: 오늘의 과제 리마인더 수동 실행
router.post('/test/daily-reminder', async (req: AuthRequest, res: Response) => {
  try {
    await sendDailyTaskReminder();
    res.json({ message: '오늘의 과제 리마인더를 전송했습니다.' });
  } catch (error) {
    console.error('Send daily reminder error:', error);
    res.status(500).json({ error: '리마인더 전송에 실패했습니다.' });
  }
});

// 테스트용: 미완료 과제 알림 수동 실행
router.post('/test/incomplete-tasks', async (req: AuthRequest, res: Response) => {
  try {
    await sendIncompleteTaskNotification();
    res.json({ message: '미완료 과제 알림을 전송했습니다.' });
  } catch (error) {
    console.error('Send incomplete tasks notification error:', error);
    res.status(500).json({ error: '알림 전송에 실패했습니다.' });
  }
});

export default router;
