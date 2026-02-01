'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH';

interface Task {
  id: string;
  title: string;
  subject: Subject;
  isCompleted: boolean;
  date: string;
}

interface MonthlyStats {
  totalTasks: number;
  completedTasks: number;
  totalStudyTime: number;
  subjectStats: {
    [key in Subject]: {
      total: number;
      completed: number;
      studyTime: number;
    };
  };
}

interface MonthlyData {
  tasksByDate: Record<string, Task[]>;
  stats: MonthlyStats;
  year: number;
  month: number;
}

const SUBJECT_LABELS: Record<Subject, { label: string; color: string }> = {
  KOREAN: { label: '국어', color: 'bg-blue-100 text-blue-800' },
  ENGLISH: { label: '영어', color: 'bg-green-100 text-green-800' },
  MATH: { label: '수학', color: 'bg-purple-100 text-purple-800' },
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
        `http://localhost:4000/api/mentee/planner/monthly?year=${year}&month=${month}`,
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
        <button onClick={() => router.push('/mentee')} className="text-gray-600">
          ← 뒤로
        </button>
        <h2 className="text-xl font-bold">월간 플래너</h2>
        <div className="w-12" />
      </div>

      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 rounded">
          ←
        </button>
        <div className="text-center">
          <p className="text-lg font-semibold">
            {currentYear}년 {currentMonth}월
          </p>
        </div>
        <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded">
          →
        </button>
      </div>

      {/* 월간 통계 */}
      {monthlyData && (
        <div className="bg-white p-4 rounded-lg border mb-6">
          <h3 className="font-semibold mb-3">월간 통계</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">완료율</p>
              <p className="text-xl font-bold">{completionRate}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">총 할 일</p>
              <p className="text-xl font-bold">{monthlyData.stats.totalTasks}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">학습 시간</p>
              <p className="text-xl font-bold">{Math.round(monthlyData.stats.totalStudyTime / 60)}h</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {(Object.keys(monthlyData.stats.subjectStats) as Subject[]).map((subject) => {
              const stats = monthlyData.stats.subjectStats[subject];
              const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

              return (
                <div key={subject} className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded ${SUBJECT_LABELS[subject].color}`}>
                    {SUBJECT_LABELS[subject].label}
                  </span>
                  <div className="flex items-center gap-2 text-sm">
                    <span>{rate}%</span>
                    <span className="text-gray-500">
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
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <div>
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
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
                  className={`aspect-square border rounded-lg p-1 cursor-pointer hover:border-gray-400 ${
                    isToday ? 'border-blue-500 bg-blue-50' : 'bg-white'
                  } ${rate === 100 && tasks.length > 0 ? 'bg-green-50' : ''}`}
                >
                  <div className="text-sm font-semibold">{date.getDate()}</div>
                  {tasks.length > 0 && (
                    <div className="mt-1">
                      <div className="text-xs text-gray-600">{tasks.length}개</div>
                      <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                        <div
                          className="bg-blue-500 h-1 rounded-full"
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
