'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';

type TabType = 'upcoming' | 'inProgress' | 'completed';

interface Task {
  id: string;
  title: string;
  description?: string;
  subject: string;
  isCompleted: boolean;
  isFixed: boolean;
  date: string;
  status: 'upcoming' | 'inProgress' | 'completed' | 'missed';
  worksheet?: {
    id: string;
    title: string;
  };
  submissions: any[];
}

const SUBJECT_LABELS: Record<string, { label: string; color: string }> = {
  KOREAN: { label: '국어', color: 'bg-red-100 text-red-800' },
  ENGLISH: { label: '영어', color: 'bg-blue-100 text-blue-800' },
  MATH: { label: '수학', color: 'bg-green-100 text-green-800' },
};

export default function AssignmentsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [tasks, setTasks] = useState<{
    upcoming: Task[];
    inProgress: Task[];
    completed: Task[];
  }>({
    upcoming: [],
    inProgress: [],
    completed: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentee/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return '오늘';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return '내일';
    }

    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff > 0 && diff <= 7) {
      return `${diff}일 후`;
    }

    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const getDaysRemaining = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const currentTasks = tasks[activeTab];

  return (
    <div className="p-4 pb-20">
      {/* 헤더 */}
      <div className="mb-6">
        <h2 className="text-xl font-bold">과제 목록</h2>
        <p className="text-sm text-gray-600 mt-1">
          멘토가 배정한 과제를 확인하세요
        </p>
      </div>

      {/* 탭 */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'upcoming'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          다가오는 과제
          {tasks.upcoming.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
              {tasks.upcoming.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('inProgress')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'inProgress'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          진행중
          {tasks.inProgress.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full">
              {tasks.inProgress.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'completed'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          완료
          {tasks.completed.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
              {tasks.completed.length}
            </span>
          )}
        </button>
      </div>

      {/* 과제 목록 */}
      {isLoading ? (
        <p className="text-gray-500 text-center py-8">불러오는 중...</p>
      ) : currentTasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {activeTab === 'upcoming' && '다가오는 과제가 없습니다'}
            {activeTab === 'inProgress' && '진행중인 과제가 없습니다'}
            {activeTab === 'completed' && '완료된 과제가 없습니다'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentTasks.map((task) => {
            const daysRemaining = getDaysRemaining(task.date);
            const isUrgent = daysRemaining <= 1 && activeTab !== 'completed';

            return (
              <div
                key={task.id}
                onClick={() => router.push(`/mentee/tasks/${task.id}`)}
                className={`bg-white p-4 rounded-lg border cursor-pointer hover:border-gray-400 transition-colors ${
                  isUrgent ? 'border-red-300 bg-red-50' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${SUBJECT_LABELS[task.subject]?.color || 'bg-gray-100'}`}>
                      {SUBJECT_LABELS[task.subject]?.label || task.subject}
                    </span>
                    {task.isFixed && (
                      <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                        멘토 지정
                      </span>
                    )}
                  </div>
                  <span className={`text-xs ${isUrgent ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                    {formatDate(task.date)}
                  </span>
                </div>

                <h3 className="font-semibold mb-1">{task.title}</h3>

                {task.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{task.description}</p>
                )}

                {task.worksheet && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>📄</span>
                    <span>{task.worksheet.title}</span>
                  </div>
                )}

                {activeTab === 'inProgress' && task.submissions.length > 0 && (
                  <div className="mt-2 text-xs text-blue-600">
                    제출 {task.submissions.length}회
                  </div>
                )}

                {activeTab === 'completed' && task.status === 'completed' && (
                  <div className="mt-2 text-xs text-green-600">
                    ✓ 완료됨
                  </div>
                )}

                {activeTab === 'completed' && task.status === 'missed' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-medium">
                      ⚠️ 미제출
                    </span>
                    <span className="text-xs text-gray-500">
                      마감일 지남
                    </span>
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
