'use client';
import { getApiUrl } from '@/lib/api';
import { useEffect, useState } from 'react';

interface DashboardData {
  currentMonth: {
    year: number;
    month: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalStudyTime: number;
    totalFeedbacks: number;
    subjectStats: Record<string, { total: number; completed: number; completionRate: number; studyTime: number }>;
    weeklyBreakdown: Array<{
      weekNumber: number;
      totalTasks: number;
      completedTasks: number;
      completionRate: number;
      studyTime: number;
    }>;
  };
  previousMonth: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalStudyTime: number;
  };
  monthOverMonth: {
    completionRateChange: number;
    studyTimeChange: number;
    taskCountChange: number;
  };
  feedbackResponseRate: {
    tasksSubmitted: number;
    feedbacksGiven: number;
    rate: number;
  };
  learningGoalAchievement: {
    totalGoalItems: number;
    completedGoalItems: number;
    achievementRate: number;
  };
}

const getSubjectLabel = (subject: string) => {
  const labels: Record<string, string> = { KOREAN: '국어', ENGLISH: '영어', MATH: '수학' };
  return labels[subject] || subject;
};

const getSubjectColor = (subject: string) => {
  const colors: Record<string, string> = {
    KOREAN: 'bg-blue-500',
    ENGLISH: 'bg-green-500',
    MATH: 'bg-orange-500',
  };
  return colors[subject] || 'bg-gray-500';
};

const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
};

const ChangeIndicator = ({ value, unit = '%p' }: { value: number; unit?: string }) => {
  if (value === 0) return <span className="text-xs text-gray-400">변동 없음</span>;
  const isPositive = value > 0;
  return (
    <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
      {isPositive ? '▲' : '▼'} {Math.abs(value)}{unit}
    </span>
  );
};

export default function MentorDashboard({ menteeId }: { menteeId: string }) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${getApiUrl()}/api/mentor/mentees/${menteeId}/stats/dashboard?year=${selectedYear}&month=${selectedMonth}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const result = await res.json();
      setData(result);
    } catch {
      console.error('통계 로딩 실패');
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

  if (isLoading) {
    return <p className="text-gray-500 py-8 text-center">로딩 중...</p>;
  }

  if (!data) {
    return <p className="text-gray-500 py-8 text-center">통계를 불러올 수 없습니다.</p>;
  }

  const { currentMonth, monthOverMonth, feedbackResponseRate, learningGoalAchievement } = data;

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

      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-lg p-4">
          <p className="text-xs opacity-90 mb-1">완료율</p>
          <p className="text-2xl font-bold">{currentMonth.completionRate}%</p>
          <div className="mt-1">
            <ChangeIndicator value={monthOverMonth.completionRateChange} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-500 text-white rounded-lg p-4">
          <p className="text-xs opacity-90 mb-1">총 학습시간</p>
          <p className="text-2xl font-bold">{formatTime(currentMonth.totalStudyTime)}</p>
          <div className="mt-1">
            <ChangeIndicator value={monthOverMonth.studyTimeChange} unit="분" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-500 text-white rounded-lg p-4">
          <p className="text-xs opacity-90 mb-1">피드백 응답률</p>
          <p className="text-2xl font-bold">{feedbackResponseRate.rate}%</p>
          <p className="text-xs opacity-75 mt-1">
            {feedbackResponseRate.feedbacksGiven}/{feedbackResponseRate.tasksSubmitted}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-600 to-orange-500 text-white rounded-lg p-4">
          <p className="text-xs opacity-90 mb-1">학습 목표 달성</p>
          <p className="text-2xl font-bold">{learningGoalAchievement.achievementRate}%</p>
          <p className="text-xs opacity-75 mt-1">
            {learningGoalAchievement.completedGoalItems}/{learningGoalAchievement.totalGoalItems}
          </p>
        </div>
      </div>

      {/* 전월 대비 요약 */}
      <div className="bg-white rounded-lg p-4 border mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">전월 대비 변화</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500 mb-1">완료율</p>
            <ChangeIndicator value={monthOverMonth.completionRateChange} />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">학습시간</p>
            <ChangeIndicator value={monthOverMonth.studyTimeChange} unit="분" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">과제 수</p>
            <ChangeIndicator value={monthOverMonth.taskCountChange} unit="개" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 과목별 진도율 */}
        {Object.keys(currentMonth.subjectStats).length > 0 && (
          <div className="bg-white rounded-lg p-4 border">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">과목별 진도율</h4>
            <div className="space-y-4">
              {Object.entries(currentMonth.subjectStats).map(([subject, stat]) => (
                <div key={subject}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">{getSubjectLabel(subject)}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold">{stat.completionRate}%</span>
                      <span className="text-xs text-gray-400 ml-2">
                        ({stat.completed}/{stat.total})
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all ${getSubjectColor(subject)}`}
                      style={{ width: `${stat.completionRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">학습시간: {formatTime(stat.studyTime)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 주차별 추이 */}
        {currentMonth.weeklyBreakdown.length > 0 && (
          <div className="bg-white rounded-lg p-4 border">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">주차별 완료율 추이</h4>
            <div className="space-y-3">
              {currentMonth.weeklyBreakdown.map((week) => (
                <div key={week.weekNumber} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-14 flex-shrink-0">{week.weekNumber}주차</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full flex items-center justify-center text-xs font-medium text-white rounded-full ${
                        week.completionRate === 100
                          ? 'bg-green-500'
                          : week.completionRate >= 50
                          ? 'bg-blue-500'
                          : week.completionRate > 0
                          ? 'bg-orange-500'
                          : 'bg-gray-300'
                      }`}
                      style={{ width: `${Math.max(week.completionRate, week.totalTasks > 0 ? 8 : 0)}%` }}
                    >
                      {week.completionRate > 0 && `${week.completionRate}%`}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right flex-shrink-0">
                    {week.completedTasks}/{week.totalTasks}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 전체 통계 요약 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          이번 달 총 <strong>{currentMonth.totalTasks}개</strong> 과제 중{' '}
          <strong>{currentMonth.completedTasks}개</strong> 완료 |{' '}
          피드백 <strong>{currentMonth.totalFeedbacks}개</strong> 제공
        </p>
      </div>
    </div>
  );
}
