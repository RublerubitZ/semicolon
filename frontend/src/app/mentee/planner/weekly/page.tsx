'use client';
import { getApiUrl } from '@/lib/api';
import { getSubjectLabel, getSubjectBadgeColor } from '@/constants/subjects';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Task {
  id: string;
  title: string;
  subject: string;
  isCompleted: boolean;
  date: string;
}

interface WeeklyStats {
  totalTasks: number;
  completedTasks: number;
  totalStudyTime: number;
  subjectStats: Record<string, {
    total: number;
    completed: number;
    studyTime: number;
  }>;
}

interface WeeklyData {
  tasks: Task[];
  stats: WeeklyStats;
  startDate: string;
  endDate: string;
}


export default function WeeklyPlanner() {
  const router = useRouter();
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    return new Date(today.setDate(diff));
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchWeeklyData = async (startDate: Date) => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const dateStr = startDate.toISOString().split('T')[0];

      const res = await fetch(`${getApiUrl()}/api/mentee/planner/weekly?startDate=${dateStr}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('주간 플래너를 불러오는데 실패했습니다.');
      }

      const data = await res.json();
      setWeeklyData(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const getWeekDates = () => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getTasksForDate = (date: Date) => {
    if (!weeklyData) return [];
    const dateStr = date.toISOString().split('T')[0];
    return weeklyData.tasks.filter((task) => task.date.startsWith(dateStr));
  };

  useEffect(() => {
    fetchWeeklyData(currentWeekStart);
  }, [currentWeekStart]);

  const weekDates = getWeekDates();
  const completionRate =
    weeklyData && weeklyData.stats.totalTasks > 0
      ? Math.round((weeklyData.stats.completedTasks / weeklyData.stats.totalTasks) * 100)
      : 0;

  return (
    <div className="p-4 pb-20">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/mentee')} className="text-gray-900 dark:text-gray-100">
          ← 뒤로
        </button>
        <h2 className="text-xl font-bold dark:text-white">주간 플래너</h2>
        <div className="w-12" />
      </div>

      {/* 주 네비게이션 */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={goToPreviousWeek} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
          ←
        </button>
        <div className="text-center">
          <p className="text-sm text-gray-900 dark:text-gray-100">
            {currentWeekStart.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} -{' '}
            {weekDates[6].toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={goToNextWeek} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
          →
        </button>
      </div>

      {/* 주간 통계 */}
      {weeklyData && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 mb-6">
          <h3 className="font-semibold mb-3 dark:text-white">주간 통계</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-900 dark:text-gray-300">완료율</p>
              <p className="text-2xl font-bold dark:text-white">{completionRate}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-900 dark:text-gray-300">학습 시간</p>
              <p className="text-2xl font-bold dark:text-white">{Math.round(weeklyData.stats.totalStudyTime / 60)}h</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {Object.keys(weeklyData.stats.subjectStats).map((subject) => {
              const stats = weeklyData.stats.subjectStats[subject];
              const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

              return (
                <div key={subject} className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded ${getSubjectBadgeColor(subject)}`}>
                    {getSubjectLabel(subject)}
                  </span>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="dark:text-gray-100">{rate}%</span>
                    <span className="text-gray-900 dark:text-gray-300">
                      ({stats.completed}/{stats.total})
                    </span>
                    <span className="text-gray-900 dark:text-gray-300">{Math.round(stats.studyTime / 60)}h</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 주간 캘린더 */}
      {isLoading ? (
        <p className="text-gray-900 dark:text-gray-100">불러오는 중...</p>
      ) : (
        <div className="space-y-2">
          {weekDates.map((date) => {
            const tasks = getTasksForDate(date);
            const completedCount = tasks.filter((t) => t.isCompleted).length;
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <div
                key={date.toISOString()}
                onClick={() => {
                  const dateStr = date.toISOString().split('T')[0];
                  router.push(`/mentee?date=${dateStr}`);
                }}
                className={`bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 ${
                  isToday ? 'border-blue-500 dark:border-blue-400' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold dark:text-white">
                      {date.toLocaleDateString('ko-KR', { weekday: 'short', month: 'long', day: 'numeric' })}
                      {isToday && <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">오늘</span>}
                    </p>
                  </div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {tasks.length > 0 ? (
                      <span>
                        {completedCount}/{tasks.length}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">할 일 없음</span>
                    )}
                  </div>
                </div>

                {tasks.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tasks.slice(0, 3).map((task) => (
                      <span
                        key={task.id}
                        className={`text-xs px-2 py-1 rounded ${
                          task.isCompleted ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-300 line-through' : getSubjectBadgeColor(task.subject)
                        }`}
                      >
                        {task.title}
                      </span>
                    ))}
                    {tasks.length > 3 && (
                      <span className="text-xs text-gray-900 dark:text-gray-300">+{tasks.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
