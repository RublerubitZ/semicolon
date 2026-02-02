'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, startOfWeek, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH';
type ViewMode = 'daily' | 'weekly' | 'monthly';

interface Task {
  id: string;
  title: string;
  description: string | null;
  subject: Subject;
  date: string;
  isCompleted: boolean;
  isFixed: boolean;
  worksheet?: {
    id: string;
    title: string;
  } | null;
  submissions: any[];
  feedbacks: any[];
  studyLogs: { duration: number }[];
}

interface Mentee {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  profileImage?: string;
}

export default function MenteePlannerPage() {
  const params = useParams();
  const router = useRouter();
  const menteeId = params.id as string;

  const [mentee, setMentee] = useState<Mentee | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // 멘티 정보 가져오기
  const fetchMentee = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/api/mentor/mentees/${menteeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('멘티 정보를 불러오는데 실패했습니다.');

      const data = await res.json();
      setMentee(data);
    } catch (err) {
      console.error('Fetch mentee error:', err);
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  // 플래너 데이터 가져오기
  const fetchPlanner = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = '';

      if (viewMode === 'daily') {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        url = `http://localhost:4000/api/mentor/mentees/${menteeId}/planner/daily?date=${dateStr}`;
      } else if (viewMode === 'weekly') {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
        const dateStr = format(weekStart, 'yyyy-MM-dd');
        url = `http://localhost:4000/api/mentor/mentees/${menteeId}/planner/weekly?startDate=${dateStr}`;
      } else if (viewMode === 'monthly') {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth() + 1;
        url = `http://localhost:4000/api/mentor/mentees/${menteeId}/planner/monthly?year=${year}&month=${month}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('플래너를 불러오는데 실패했습니다.');

      const data = await res.json();
      setTasks(data.tasks || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Fetch planner error:', err);
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMentee();
  }, [menteeId]);

  useEffect(() => {
    fetchPlanner();
  }, [viewMode, selectedDate, menteeId]);

  const getSubjectLabel = (subject: Subject) => {
    const labels = { KOREAN: '국어', ENGLISH: '영어', MATH: '수학' };
    return labels[subject];
  };

  const getSubjectColor = (subject: Subject) => {
    const colors = {
      KOREAN: 'bg-blue-100 text-blue-700',
      ENGLISH: 'bg-green-100 text-green-700',
      MATH: 'bg-orange-100 text-orange-700',
    };
    return colors[subject];
  };

  const changeDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'daily') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'monthly') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const formatDateDisplay = () => {
    if (viewMode === 'daily') {
      return format(selectedDate, 'yyyy년 M월 d일 (E)', { locale: ko });
    } else if (viewMode === 'weekly') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const weekEnd = addDays(weekStart, 6);
      return `${format(weekStart, 'M월 d일', { locale: ko })} - ${format(weekEnd, 'M월 d일', { locale: ko })}`;
    } else {
      return format(selectedDate, 'yyyy년 M월', { locale: ko });
    }
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-600 hover:text-gray-900 mb-2"
        >
          ← 뒤로가기
        </button>

        {mentee && (
          <div className="flex items-center gap-3">
            {mentee.profileImage ? (
              <img
                src={mentee.profileImage}
                alt={mentee.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold">
                  {mentee.nickname?.[0] || mentee.name[0]}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">
                {mentee.nickname || mentee.name}
                {mentee.nickname && (
                  <span className="text-lg font-normal text-gray-600 ml-2">
                    ({mentee.name})
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-600">{mentee.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* 보기 모드 선택 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('daily')}
          className={`px-4 py-2 rounded-lg text-sm ${
            viewMode === 'daily'
              ? 'bg-black text-white'
              : 'bg-white border hover:bg-gray-50'
          }`}
        >
          일일
        </button>
        <button
          onClick={() => setViewMode('weekly')}
          className={`px-4 py-2 rounded-lg text-sm ${
            viewMode === 'weekly'
              ? 'bg-black text-white'
              : 'bg-white border hover:bg-gray-50'
          }`}
        >
          주간
        </button>
        <button
          onClick={() => setViewMode('monthly')}
          className={`px-4 py-2 rounded-lg text-sm ${
            viewMode === 'monthly'
              ? 'bg-black text-white'
              : 'bg-white border hover:bg-gray-50'
          }`}
        >
          월간
        </button>
      </div>

      {/* 날짜 네비게이션 */}
      <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-lg border">
        <button
          onClick={() => changeDate('prev')}
          className="p-2 hover:bg-gray-100 rounded"
        >
          ←
        </button>
        <h3 className="text-lg font-semibold">{formatDateDisplay()}</h3>
        <button
          onClick={() => changeDate('next')}
          className="p-2 hover:bg-gray-100 rounded"
        >
          →
        </button>
      </div>

      {/* 통계 */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-600 mb-1">전체 할 일</p>
            <p className="text-2xl font-bold">{stats.totalTasks}개</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-600 mb-1">완료</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.completedTasks}개
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-600 mb-1">공부 시간</p>
            <p className="text-2xl font-bold">
              {Math.floor(stats.totalStudyTime / 60)}시간
            </p>
          </div>
        </div>
      )}

      {/* 할 일 목록 */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">할 일 목록</h3>
          <button
            onClick={() => router.push(`/mentor/tasks/new?menteeId=${menteeId}`)}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
          >
            + 할 일 추가
          </button>
        </div>

        {isLoading ? (
          <p className="text-center text-gray-500">로딩 중...</p>
        ) : tasks.length === 0 ? (
          <p className="text-center text-gray-500">할 일이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const studyTime = task.studyLogs.reduce((sum, log) => sum + log.duration, 0);

              return (
                <div
                  key={task.id}
                  className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-xs px-2 py-1 rounded ${getSubjectColor(
                            task.subject
                          )}`}
                        >
                          {getSubjectLabel(task.subject)}
                        </span>
                        {task.isFixed && (
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                            고정 과제
                          </span>
                        )}
                        {task.isCompleted && (
                          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                            ✓ 완료
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold mb-1">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>제출: {task.submissions.length}개</span>
                        <span>피드백: {task.feedbacks.length}개</span>
                        <span>공부 시간: {Math.floor(studyTime / 60)}분</span>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        router.push(`/mentor/feedbacks/new?taskId=${task.id}`)
                      }
                      className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                    >
                      피드백 작성
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
