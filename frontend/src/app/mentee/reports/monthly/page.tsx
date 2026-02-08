'use client';
import { getApiUrl } from '@/lib/api';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface MonthlyReport {
  year: number;
  month: number;
  summary: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalStudyTime: number; // 분 단위
    totalFeedbacks: number;
  };
  subjectStats: {
    subject: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalStudyTime: number;
    totalFeedbacks: number;
  }[];
  dailyProgress: {
    date: string;
    totalTasks: number;
    completedTasks: number;
    progressRate: number;
  }[];
}

const getSubjectLabel = (subject: string) => {
  const labels: Record<string, string> = {
    KOREAN: '국어',
    ENGLISH: '영어',
    MATH: '수학',
  };
  return labels[subject] || subject;
};

const getSubjectColor = (subject: string) => {
  const colors: Record<string, string> = {
    KOREAN: 'bg-blue-100 text-blue-800 border-blue-200',
    ENGLISH: 'bg-green-100 text-green-800 border-green-200',
    MATH: 'bg-orange-100 text-orange-800 border-orange-200',
  };
  return colors[subject] || 'bg-gray-100 text-gray-800 border-gray-200';
};

interface MonthlyFeedback {
  id: string;
  overallComment: string;
  strengths: string;
  improvements: string;
  nextMonthGoals: string;
  updatedAt: string;
  mentor: { id: string; name: string };
}

interface WeeklyFeedback {
  id: string;
  weekNumber: number;
  overallComment: string;
  strengths: string;
  improvements: string;
  nextWeekGoals: string;
  updatedAt: string;
  mentor: { id: string; name: string };
}

export default function MonthlyReportPage() {
  const router = useRouter();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [monthlyFeedback, setMonthlyFeedback] = useState<MonthlyFeedback | null>(null);
  const [weeklyFeedbacks, setWeeklyFeedbacks] = useState<WeeklyFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 현재 날짜 기준으로 초기 년/월 설정
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  // 리포트 데이터 가져오기
  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [reportRes, feedbackRes, weeklyRes] = await Promise.all([
        fetch(
          `${getApiUrl()}/api/mentee/reports/monthly?year=${selectedYear}&month=${selectedMonth}`,
          { headers }
        ),
        fetch(
          `${getApiUrl()}/api/mentee/monthly-feedbacks?year=${selectedYear}&month=${selectedMonth}`,
          { headers }
        ),
        fetch(
          `${getApiUrl()}/api/mentee/weekly-feedbacks?year=${selectedYear}&month=${selectedMonth}`,
          { headers }
        ),
      ]);

      if (!reportRes.ok) throw new Error('리포트를 불러오는데 실패했습니다.');
      const data = await reportRes.json();
      setReport(data);

      if (feedbackRes.ok) {
        const fbData = await feedbackRes.json();
        setMonthlyFeedback(fbData);
      }

      if (weeklyRes.ok) {
        const wfData = await weeklyRes.json();
        setWeeklyFeedbacks(Array.isArray(wfData) ? wfData : []);
      }
    } catch (err) {
      console.error('Fetch report error:', err);
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedYear, selectedMonth]);

  // 이전/다음 월로 이동
  const changeMonth = (direction: 'prev' | 'next') => {
    let newYear = selectedYear;
    let newMonth = selectedMonth;

    if (direction === 'next') {
      newMonth += 1;
      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      }
    } else {
      newMonth -= 1;
      if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
      }
    }

    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
  };

  // 시간 포맷 (분 -> 시간/분)
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}분`;
    if (mins === 0) return `${hours}시간`;
    return `${hours}시간 ${mins}분`;
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center h-64">
        <p className="text-gray-900">로딩 중...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-4 flex justify-center items-center h-64">
        <p className="text-gray-900">리포트를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      {/* 헤더 */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-900 hover:text-gray-900 mb-2"
        >
          ← 뒤로가기
        </button>
        <h2 className="text-2xl font-bold mb-2">월간 리포트</h2>
        <p className="text-gray-600">한 달 동안의 학습 통계를 확인하세요</p>
      </div>

      {/* 년/월 선택기 */}
      <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-lg border">
        <button
          onClick={() => changeMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded"
        >
          ←
        </button>
        <h3 className="text-lg font-semibold">
          {selectedYear}년 {selectedMonth}월
        </h3>
        <button
          onClick={() => changeMonth('next')}
          className="p-2 hover:bg-gray-100 rounded"
        >
          →
        </button>
      </div>

      {/* 전체 요약 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">전체 요약</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-600 mb-1">완료율</p>
            <p className="text-2xl font-bold text-blue-600">{report.summary.completionRate}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {report.summary.completedTasks}/{report.summary.totalTasks} 과제
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-600 mb-1">총 공부 시간</p>
            <p className="text-2xl font-bold text-green-600">
              {formatTime(report.summary.totalStudyTime)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-600 mb-1">전체 과제</p>
            <p className="text-2xl font-bold">{report.summary.totalTasks}개</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-600 mb-1">받은 피드백</p>
            <p className="text-2xl font-bold text-orange-600">
              {report.summary.totalFeedbacks}개
            </p>
          </div>
        </div>
      </div>

      {/* 과목별 통계 */}
      {report.subjectStats.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">과목별 통계</h3>
          <div className="space-y-3">
            {report.subjectStats.map((stat) => (
              <div
                key={stat.subject}
                className={`border rounded-lg p-4 ${getSubjectColor(stat.subject)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">{getSubjectLabel(stat.subject)}</h4>
                  <span className="text-2xl font-bold">{stat.completionRate}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs opacity-75">과제</p>
                    <p className="font-medium">
                      {stat.completedTasks}/{stat.totalTasks}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs opacity-75">공부 시간</p>
                    <p className="font-medium">{formatTime(stat.totalStudyTime)}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-75">피드백</p>
                    <p className="font-medium">{stat.totalFeedbacks}개</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 일별 달성률 */}
      {report.dailyProgress.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">일별 달성률</h3>
          <div className="bg-white rounded-lg border p-4">
            <div className="space-y-2">
              {report.dailyProgress
                .filter((day) => day.totalTasks > 0) // 과제가 있는 날만 표시
                .map((day) => {
                  const date = new Date(day.date);
                  const dayLabel = `${date.getMonth() + 1}/${date.getDate()}`;

                  return (
                    <div key={day.date} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-12">{dayLabel}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div
                          className={`h-full flex items-center justify-center text-xs font-medium text-white ${
                            day.progressRate === 100
                              ? 'bg-green-500'
                              : day.progressRate >= 50
                              ? 'bg-blue-500'
                              : 'bg-orange-500'
                          }`}
                          style={{ width: `${Math.max(day.progressRate, 8)}%` }}
                        >
                          {day.progressRate}%
                        </div>
                      </div>
                      <span className="text-xs text-gray-600 w-16">
                        {day.completedTasks}/{day.totalTasks}
                      </span>
                    </div>
                  );
                })}
            </div>

            {report.dailyProgress.filter((day) => day.totalTasks > 0).length === 0 && (
              <p className="text-center text-gray-500 py-4">해당 월에 과제가 없습니다.</p>
            )}
          </div>
        </div>
      )}

      {/* 멘토 주간 총평 */}
      {weeklyFeedbacks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">멘토 주간 총평</h3>
          <div className="space-y-4">
            {weeklyFeedbacks.map((wf) => (
              <div key={wf.id} className="bg-white rounded-lg border overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">{wf.weekNumber}주차</span>
                  <span className="text-xs text-gray-400">
                    {wf.mentor.name} 멘토 | {new Date(wf.updatedAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="border-l-4 border-l-blue-500 pl-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">이번주 총평</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{wf.overallComment}</p>
                  </div>
                  <div className="border-l-4 border-l-green-500 pl-3">
                    <p className="text-xs font-semibold text-green-700 mb-1">잘한 점</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{wf.strengths}</p>
                  </div>
                  <div className="border-l-4 border-l-orange-500 pl-3">
                    <p className="text-xs font-semibold text-orange-700 mb-1">개선할 점</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{wf.improvements}</p>
                  </div>
                  <div className="border-l-4 border-l-purple-500 pl-3">
                    <p className="text-xs font-semibold text-purple-700 mb-1">다음주 목표</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{wf.nextWeekGoals}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 멘토 월간 총평 */}
      {monthlyFeedback && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">멘토 월간 총평</h3>
          <p className="text-xs text-gray-400 mb-3">
            {monthlyFeedback.mentor.name} 멘토 | {new Date(monthlyFeedback.updatedAt).toLocaleDateString('ko-KR')} 작성
          </p>
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 border border-l-4 border-l-blue-500">
              <h4 className="font-semibold text-sm text-blue-700 mb-2">이번달 총평</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{monthlyFeedback.overallComment}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-l-4 border-l-green-500">
              <h4 className="font-semibold text-sm text-green-700 mb-2">잘한 점</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{monthlyFeedback.strengths}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-l-4 border-l-orange-500">
              <h4 className="font-semibold text-sm text-orange-700 mb-2">개선할 점</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{monthlyFeedback.improvements}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-l-4 border-l-purple-500">
              <h4 className="font-semibold text-sm text-purple-700 mb-2">다음달 목표</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{monthlyFeedback.nextMonthGoals}</p>
            </div>
          </div>
        </div>
      )}

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 월간 리포트는 멘토 승인된 과제 기준으로 계산됩니다.
        </p>
      </div>
    </div>
  );
}
