import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import menteeRoutes from './routes/mentee';
import mentorRoutes from './routes/mentor';
import uploadRoutes from './routes/upload';
import notificationRoutes from './routes/notification';
import { startScheduler } from './lib/scheduler';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Middleware
// 개발 환경에서는 모든 origin 허용 (모바일 테스트 지원)
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || 'http://localhost:3000')
    : true,
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mentee', menteeRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '설스터디 API 서버 정상 작동 중' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`모든 네트워크 인터페이스에서 접근 가능합니다.`);

  // 스케줄러 시작
  startScheduler();
});
