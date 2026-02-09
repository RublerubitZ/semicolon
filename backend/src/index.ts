import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import menteeRoutes from './routes/mentee';
import mentorRoutes from './routes/mentor';
import uploadRoutes from './routes/upload';
import notificationRoutes from './routes/notification';
import tasksRoutes from './routes/tasks';
import errorsRoutes from './routes/errors';
import reportsRoutes from './routes/reports';
import { startScheduler } from './lib/scheduler';
import logger from './lib/logger';
import { requestLoggerMiddleware, globalErrorHandler } from './lib/error-handler';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || 'http://localhost:3000')
    : true,
  credentials: true,
}));
app.use(express.json());

// 요청 로깅 미들웨어
app.use(requestLoggerMiddleware);

// 정적 파일 서빙 (업로드된 이미지, PDF 등)
app.use('/uploads', express.static('uploads'));

// Health check (인증 불필요 - 반드시 다른 라우트보다 먼저 등록)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '설스터디 API 서버 정상 작동 중' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mentee', menteeRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', tasksRoutes);
app.use('/api/errors', errorsRoutes);
app.use('/api/reports', reportsRoutes);

// 글로벌 에러 핸들러 (라우트 등록 후 마지막에)
app.use(globalErrorHandler);

// 미처리 에러 핸들링
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason: String(reason) });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  logger.info(`모든 네트워크 인터페이스에서 접근 가능합니다.`);

  // 스케줄러 시작
  startScheduler();
});
