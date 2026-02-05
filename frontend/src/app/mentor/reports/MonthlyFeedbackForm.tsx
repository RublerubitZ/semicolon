'use client';
import { getApiUrl } from '@/lib/api';
import { useEffect, useState } from 'react';

interface MonthlyFeedback {
  id: string;
  menteeId: string;
  mentorId: string;
  year: number;
  month: number;
  overallComment: string;
  strengths: string;
  improvements: string;
  nextMonthGoals: string;
  createdAt: string;
  updatedAt: string;
}

interface MonthlyStats {
  totalTasks: number;
  completedTasks: number;
  totalStudyTime: number;
  subjectStats: Record<string, { total: number; completed: number; studyTime: number }>;
}

const getSubjectLabel = (subject: string) => {
  const labels: Record<string, string> = { KOREAN: '국어', ENGLISH: '영어', MATH: '수학' };
  return labels[subject] || subject;
};

const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
};

export default function MonthlyFeedbackForm({ menteeId }: { menteeId: string }) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const [feedback, setFeedback] = useState<MonthlyFeedback | null>(null);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [overallComment, setOverallComment] = useState('');
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [nextMonthGoals, setNextMonthGoals] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [feedbackRes, statsRes] = await Promise.all([
        fetch(
          `${getApiUrl()}/api/mentor/mentees/${menteeId}/monthly-feedbacks?year=${selectedYear}&month=${selectedMonth}`,
          { headers }
        ),
        fetch(
          `${getApiUrl()}/api/mentor/mentees/${menteeId}/planner/monthly?year=${selectedYear}&month=${selectedMonth}`,
          { headers }
        ),
      ]);

      if (feedbackRes.ok) {
        const fbData = await feedbackRes.json();
        setFeedback(fbData);
        if (fbData) {
          setOverallComment(fbData.overallComment);
          setStrengths(fbData.strengths);
          setImprovements(fbData.improvements);
          setNextMonthGoals(fbData.nextMonthGoals);
        } else {
          setOverallComment('');
          setStrengths('');
          setImprovements('');
          setNextMonthGoals('');
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }
    } catch (err) {
      console.error('데이터 로딩 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [menteeId, selectedYear, selectedMonth]);

  const changeMonth = (direction: 'prev' | 'next') => {
    let newYear = selectedYear;
    let newMonth = selectedMonth;
    if (direction === 'next') {
      newMonth += 1;
      if (newMonth > 12) { newMonth = 1; newYear += 1; }
    } else {
      newMonth -= 1;
      if (newMonth < 1) { newMonth = 12; newYear -= 1; }
    }
    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
  };

  const handleSave = async () => {
    if (!overallComment.trim() || !strengths.trim() || !improvements.trim() || !nextMonthGoals.trim()) {
      alert('모든 항목을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const body = { overallComment, strengths, improvements, nextMonthGoals };

      let res;
      if (feedback) {
        // 수정
        res = await fetch(`${getApiUrl()}/api/mentor/monthly-feedbacks/${feedback.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body),
        });
      } else {
        // 생성
        res = await fetch(`${getApiUrl()}/api/mentor/monthly-feedbacks`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...body,
            menteeId,
            year: selectedYear,
            month: selectedMonth,
          }),
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '저장에 실패했습니다.');
      }

      const result = await res.json();
      setFeedback(result);
      alert(feedback ? '월간 총평이 수정되었습니다.' : '월간 총평이 저장되었습니다.');
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-gray-500 py-8 text-center">로딩 중...</p>;
  }

  const completionRate = stats && stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  return (
    <div>
      {/* 년/월 선택기 */}
      <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-lg border">
        <button onClick={() => changeMonth('prev')} className="p-2 hover:bg-gray-100 rounded text-lg">
          ←
        </button>
        <h3 className="text-lg font-semibold">
          {selectedYear}년 {selectedMonth}월
        </h3>
        <button onClick={() => changeMonth('next')} className="p-2 hover:bg-gray-100 rounded text-lg">
          →
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 통계 요약 */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-base font-semibold text-gray-700">월간 통계 요약</h3>

          {/* 요약 카드 */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg p-4">
            <p className="text-sm opacity-90 mb-1">과제 완료율</p>
            <p className="text-3xl font-bold">{completionRate}%</p>
            <p className="text-xs opacity-75 mt-1">
              {stats?.completedTasks || 0}/{stats?.totalTasks || 0} 과제
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border">
            <p className="text-sm text-gray-600 mb-1">총 학습시간</p>
            <p className="text-xl font-bold text-green-600">
              {formatTime(stats?.totalStudyTime || 0)}
            </p>
          </div>

          {/* 과목별 */}
          {stats?.subjectStats && Object.keys(stats.subjectStats).length > 0 && (
            <div className="bg-white rounded-lg p-4 border">
              <p className="text-sm font-semibold text-gray-700 mb-3">과목별 현황</p>
              <div className="space-y-3">
                {Object.entries(stats.subjectStats).map(([subject, stat]) => {
                  const rate = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
                  return (
                    <div key={subject}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{getSubjectLabel(subject)}</span>
                        <span className="font-semibold">{rate}% ({stat.completed}/{stat.total})</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${
                            subject === 'KOREAN' ? 'bg-blue-500' :
                            subject === 'ENGLISH' ? 'bg-green-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 우측: 총평 작성 폼 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-700">
              {feedback ? '월간 총평 수정' : '월간 총평 작성'}
            </h3>
            {feedback && (
              <span className="text-xs text-gray-400">
                최근 수정: {new Date(feedback.updatedAt).toLocaleDateString('ko-KR')}
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                이번달 총평
              </label>
              <textarea
                value={overallComment}
                onChange={(e) => setOverallComment(e.target.value)}
                placeholder="이번 달 전반적인 학습 상황에 대한 총평을 작성해주세요."
                className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-900"
                rows={4}
              />
            </div>

            <div className="bg-white rounded-lg p-4 border border-l-4 border-l-green-500">
              <label className="block text-sm font-semibold text-green-700 mb-2">
                잘한 점
              </label>
              <textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="이번 달 학습에서 잘한 부분을 작성해주세요."
                className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-300 text-gray-900"
                rows={3}
              />
            </div>

            <div className="bg-white rounded-lg p-4 border border-l-4 border-l-orange-500">
              <label className="block text-sm font-semibold text-orange-700 mb-2">
                개선할 점
              </label>
              <textarea
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                placeholder="개선이 필요한 부분과 구체적인 방법을 작성해주세요."
                className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-900"
                rows={3}
              />
            </div>

            <div className="bg-white rounded-lg p-4 border border-l-4 border-l-purple-500">
              <label className="block text-sm font-semibold text-purple-700 mb-2">
                다음달 목표
              </label>
              <textarea
                value={nextMonthGoals}
                onChange={(e) => setNextMonthGoals(e.target.value)}
                placeholder="다음 달에 달성할 학습 목표를 작성해주세요."
                className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-900"
                rows={3}
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '저장 중...' : feedback ? '수정하기' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
