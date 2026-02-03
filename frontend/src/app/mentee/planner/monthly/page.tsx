'use client';
import { getApiUrl } from '@/lib/api';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Task {
  id: string;
  title: string;
  subject: string;
  isCompleted: boolean;
  date: string;
}

interface MonthlyStats {
  totalTasks: number;
  completedTasks: number;
  totalStudyTime: number;
  subjectStats: Record<string, {
    total: number;
    completed: number;
    studyTime: number;
  }>;
}

interface MonthlyData {
  tasksByDate: Record<string, Task[]>;
  stats: MonthlyStats;
  year: number;
  month: number;
}

const DEFAULT_SUBJECT_LABELS: Record<string, { label: string; color: string }> = {
  KOREAN: { label: '국어', color: 'bg-blue-100 text-blue-800' },
  ENGLISH: { label: '영어', color: 'bg-green-100 text-green-800' },
  MATH: { label: '수학', color: 'bg-purple-100 text-purple-800' },
};

const getSubjectLabel = (subject: string) => {
  return DEFAULT_SUBJECT_LABELS[subject]?.label || subject;
};

const getSubjectColor = (subject: string) => {
  return DEFAULT_SUBJECT_LABELS[subject]?.color || 'bg-gray-100 text-gray-800';
};

export default function MonthlyPlanner() {
  const router = useRouter();
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMonthlyData = async (year: number, month: number) => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(
        `${getApiUrl()}/api/mentee/planner/monthly?year=${year}&month=${month}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error('월간 플래너를 불러오는데 실패했습니다.');
      }

      const data = await res.json();
      setMonthlyData(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getCalendarDates = () => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const dates: (Date | null)[] = [];

    // 이전 달 빈 칸
    for (let i = 0; i < startingDayOfWeek; i++) {
      dates.push(null);
    }

    // 현재 달
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(new Date(currentYear, currentMonth - 1, day));
    }

    return dates;
  };

  const getTasksForDate = (date: Date | null) => {
    if (!date || !monthlyData) return [];
    const dateStr = date.toISOString().split('T')[0];
    return monthlyData.tasksByDate[dateStr] || [];
  };

  const getCompletionRate = (tasks: Task[]) => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.isCompleted).length;
    return Math.round((completed / tasks.length) * 100);
  };

  useEffect(() => {
    fetchMonthlyData(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const calendarDates = getCalendarDates();
  const completionRate =
    monthlyData && monthlyData.stats.totalTasks > 0
      ? Math.round((monthlyData.stats.completedTasks / monthlyData.stats.totalTasks) * 100)
      : 0;

  return (
    <div className="p-4 pb-20">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/mentee')} className="text-gray-900 dark:text-gray-100">
          ← 뒤로
        </button>
        <h2 className="text-xl font-bold dark:text-white">월간 플래너</h2>
        <div className="w-12" />
      </div>

      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
          ←
        </button>
        <div className="text-center">
          <p className="text-lg font-semibold dark:text-white">
            {currentYear}년 {currentMonth}월
          </p>
        </div>
        <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
          →
        </button>
      </div>

      {/* 월간 통계 */}
      {monthlyData && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 mb-6">
          <h3 className="font-semibold mb-3 dark:text-white">월간 통계</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-900 dark:text-gray-300">완료율</p>
              <p className="text-xl font-bold dark:text-white">{completionRate}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-900 dark:text-gray-300">총 할 일</p>
              <p className="text-xl font-bold dark:text-white">{monthlyData.stats.totalTasks}</p>
            </div>
            <div>
              <p className="text-sm text-gray-900 dark:text-gray-300">학습 시간</p>
              <p className="text-xl font-bold dark:text-white">{Math.round(monthlyData.stats.totalStudyTime / 60)}h</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {Object.keys(monthlyData.stats.subjectStats).map((subject) => {
              const stats = monthlyData.stats.subjectStats[subject];
              const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

              return (
                <div key={subject} className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded ${getSubjectColor(subject)}`}>
                    {getSubjectLabel(subject)}
                  </span>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="dark:text-gray-100">{rate}%</span>
                    <span className="text-gray-900 dark:text-gray-300">
                      ({stats.completed}/{stats.total})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 월간 캘린더 */}
      {isLoading ? (
        <p className="text-gray-900 dark:text-gray-100">불러오는 중...</p>
      ) : (
        <div>
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-900 dark:text-gray-100 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDates.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }

              const tasks = getTasksForDate(date);
              const rate = getCompletionRate(tasks);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => {
                    const dateStr = date.toISOString().split('T')[0];
                    router.push(`/mentee?date=${dateStr}`);
                  }}
                  className={`aspect-square border dark:border-gray-700 rounded-lg p-1 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 ${
                    isToday ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'bg-white dark:bg-gray-800'
                  } ${rate === 100 && tasks.length > 0 ? 'bg-green-50 dark:bg-green-900/30' : ''}`}
                >
                  <div className="text-sm font-semibold dark:text-white">{date.getDate()}</div>
                  {tasks.length > 0 && (
                    <div className="mt-1">
                      <div className="text-xs text-gray-900 dark:text-gray-300">{tasks.length}개</div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1 mt-1">
                        <div
                          className="bg-blue-500 dark:bg-blue-400 h-1 rounded-full"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
