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

interface WeeklyStats {
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

interface WeeklyData {
  tasks: Task[];
  stats: WeeklyStats;
  startDate: string;
  endDate: string;
}

const SUBJECT_LABELS: Record<Subject, { label: string; color: string }> = {
  KOREAN: { label: '국어', color: 'bg-blue-100 text-blue-800' },
  ENGLISH: { label: '영어', color: 'bg-green-100 text-green-800' },
  MATH: { label: '수학', color: 'bg-purple-100 text-purple-800' },
};

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

      const res = await fetch(`http://localhost:4000/api/mentee/planner/weekly?startDate=${dateStr}`, {
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
        <button onClick={() => router.push('/mentee')} className="text-gray-600">
          ← 뒤로
        </button>
        <h2 className="text-xl font-bold">주간 플래너</h2>
        <div className="w-12" />
      </div>

      {/* 주 네비게이션 */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={goToPreviousWeek} className="p-2 hover:bg-gray-100 rounded">
          ←
        </button>
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {currentWeekStart.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} -{' '}
            {weekDates[6].toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={goToNextWeek} className="p-2 hover:bg-gray-100 rounded">
          →
        </button>
      </div>

      {/* 주간 통계 */}
      {weeklyData && (
        <div className="bg-white p-4 rounded-lg border mb-6">
          <h3 className="font-semibold mb-3">주간 통계</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">완료율</p>
              <p className="text-2xl font-bold">{completionRate}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">학습 시간</p>
              <p className="text-2xl font-bold">{Math.round(weeklyData.stats.totalStudyTime / 60)}h</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {(Object.keys(weeklyData.stats.subjectStats) as Subject[]).map((subject) => {
              const stats = weeklyData.stats.subjectStats[subject];
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
                    <span className="text-gray-500">{Math.round(stats.studyTime / 60)}h</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 주간 캘린더 */}
      {isLoading ? (
        <p className="text-gray-500">불러오는 중...</p>
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
                className={`bg-white p-4 rounded-lg border cursor-pointer hover:border-gray-400 ${
                  isToday ? 'border-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold">
                      {date.toLocaleDateString('ko-KR', { weekday: 'short', month: 'long', day: 'numeric' })}
                      {isToday && <span className="ml-2 text-xs text-blue-600">오늘</span>}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600">
                    {tasks.length > 0 ? (
                      <span>
                        {completedCount}/{tasks.length}
                      </span>
                    ) : (
                      <span className="text-gray-400">할 일 없음</span>
                    )}
                  </div>
                </div>

                {tasks.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tasks.slice(0, 3).map((task) => (
                      <span
                        key={task.id}
                        className={`text-xs px-2 py-1 rounded ${
                          task.isCompleted ? 'bg-gray-200 text-gray-600 line-through' : SUBJECT_LABELS[task.subject].color
                        }`}
                      >
                        {task.title}
                      </span>
                    ))}
                    {tasks.length > 3 && (
                      <span className="text-xs text-gray-500">+{tasks.length - 3}</span>
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
