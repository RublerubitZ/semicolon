import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.trim() === '') {
  throw new Error('JWT_SECRET environment variable is required and must not be empty');
}

// JWT_SECRET 타입 가드 - 런타임에 안전하게 사용
const getJwtSecret = (): string => {
  if (!JWT_SECRET || JWT_SECRET.trim() === '') {
    throw new Error('JWT_SECRET not configured');
  }
  return JWT_SECRET;
};

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: 'MENTEE' | 'MENTOR' | 'ADMIN';
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || !parts[1]) {
      return res.status(401).json({ error: '잘못된 인증 헤더 형식입니다.' });
    }
    const token = parts[1];
    const decoded = jwt.verify(token, getJwtSecret()) as {
      userId: string;
      email: string;
      role: 'MENTEE' | 'MENTOR' | 'ADMIN';
    };

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
};

export const mentorOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'MENTOR' && req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: '멘토만 접근할 수 있습니다.' });
  }
  next();
};

export const menteeOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'MENTEE') {
    return res.status(403).json({ error: '멘티만 접근할 수 있습니다.' });
  }
  next();
};
