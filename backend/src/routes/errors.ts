import { Router, Request, Response } from 'express';
import logger from '../lib/logger';

const router = Router();

// Rate limiting: IP별 분당 30건
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

/**
 * POST /api/errors - 프론트엔드 에러 수신
 * 인증 불필요 (에러 발생 시 토큰이 없을 수 있음)
 */
router.post('/', (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  const { message, stack, url, userAgent, userId, context } = req.body;

  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  logger.error('Frontend error', {
    source: 'frontend',
    message,
    stack,
    url,
    userAgent,
    userId: userId ? String(userId).substring(0, 8) + '...' : undefined,
    context,
    ip,
  });

  res.json({ received: true });
});

export default router;
