/**
 * 학습 리포트 API
 * 주간/월간 상세 리포트, 과목별 트렌드
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, mentorOnly } from '../middleware/auth';
import { isValidDateStr, getTodayUTC } from '../lib/date-utils';
import { handleError } from '../lib/error-handler';
import {
  aggregateWeeklyReport,
  aggregateMonthlyReport,
  calculateSubjectTrends,
} from '../lib/report-aggregator';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/reports/weekly?startDate=YYYY-MM-DD
 * 주간 상세 리포트 (현재 주 + 이전 주 비교)
 */
router.get('/weekly', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate } = req.query;
    if (startDate && !isValidDateStr(startDate as string)) {
      return res.status(400).json({ error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' });
    }

    const menteeId = req.user!.userId;
    const dateStr = startDate as string || getMonday(getTodayUTC());
    const report = await aggregateWeeklyReport(menteeId, dateStr);

    res.json(report);
  } catch (error) {
    handleError(
      res,
      { endpoint: '/api/reports/weekly', userId: req.user?.userId },
      error,
      '주간 리포트 조회에 실패했습니다.',
      'WEEKLY_REPORT_FAILED'
    );
  }
});

/**
 * GET /api/reports/monthly?year=N&month=N
 * 월간 상세 리포트 (현재 월 + 이전 월 비교)
 */
router.get('/monthly', async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query;
    const today = getTodayUTC();
    const targetYear = year ? parseInt(year as string) : today.getUTCFullYear();
    const targetMonth = month ? parseInt(month as string) : today.getUTCMonth() + 1;

    if (isNaN(targetYear) || isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({ error: '유효하지 않은 연도/월입니다.' });
    }

    const menteeId = req.user!.userId;
    const report = await aggregateMonthlyReport(menteeId, targetYear, targetMonth);

    res.json(report);
  } catch (error) {
    handleError(
      res,
      { endpoint: '/api/reports/monthly', userId: req.user?.userId },
      error,
      '월간 리포트 조회에 실패했습니다.',
      'MONTHLY_REPORT_FAILED'
    );
  }
});

/**
 * GET /api/reports/trends?menteeId=X&months=6
 * 과목별 N개월 트렌드 (멘토용 - menteeId 필수 / 멘티 본인도 사용 가능)
 */
router.get('/trends', async (req: AuthRequest, res: Response) => {
  try {
    const { menteeId, months } = req.query;
    const monthCount = months ? parseInt(months as string) : 6;

    if (isNaN(monthCount) || monthCount < 1 || monthCount > 12) {
      return res.status(400).json({ error: '조회 기간은 1~12개월입니다.' });
    }

    let targetMenteeId: string;

    if (req.user!.role === 'MENTEE') {
      // 멘티는 본인 데이터만
      targetMenteeId = req.user!.userId;
    } else {
      // 멘토/관리자는 menteeId 필수
      if (!menteeId) {
        return res.status(400).json({ error: 'menteeId가 필요합니다.' });
      }
      targetMenteeId = menteeId as string;

      // 멘토-멘티 관계 확인
      if (req.user!.role === 'MENTOR') {
        const relation = await prisma.mentorMentee.findUnique({
          where: {
            mentorId_menteeId: {
              mentorId: req.user!.userId,
              menteeId: targetMenteeId,
            },
          },
        });
        if (!relation) {
          return res.status(403).json({ error: '담당 멘티가 아닙니다.' });
        }
      }
    }

    const trends = await calculateSubjectTrends(targetMenteeId, monthCount);
    res.json(trends);
  } catch (error) {
    handleError(
      res,
      { endpoint: '/api/reports/trends', userId: req.user?.userId },
      error,
      '트렌드 데이터 조회에 실패했습니다.',
      'TRENDS_FETCH_FAILED'
    );
  }
});

/**
 * 해당 날짜가 속한 주의 월요일 날짜를 반환
 */
function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

export default router;
