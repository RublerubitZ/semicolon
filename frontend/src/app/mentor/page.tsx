'use client';
import { getApiUrl } from '@/lib/api';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Mentee {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  profileImage?: string;
  totalTasks: number;
  completedTasks: number;
}

export default function MentorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMentees = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/mentor/mentees`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('멘티 목록을 불러오는데 실패했습니다.');
      }

      const data = await res.json();
      setMentees(data);
    } catch (err) {
      console.error('Fetch mentees error:', err);
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
    fetchMentees();
  }, []);

  const calculateProgress = (completed: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">담당 멘티 관리</h2>
        <p className="text-gray-900 dark:text-gray-300">
          {user?.nickname || user?.name || '멘토'} 선생님의 대시보드
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
          <p className="text-sm text-gray-900 dark:text-gray-300 mb-1">담당 멘티</p>
          <p className="text-3xl font-bold">{mentees.length}명</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
          <p className="text-sm text-gray-900 dark:text-gray-300 mb-1">전체 할 일</p>
          <p className="text-3xl font-bold">
            {mentees.reduce((sum, m) => sum + m.totalTasks, 0)}개
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
          <p className="text-sm text-gray-900 dark:text-gray-300 mb-1">완료된 할 일</p>
          <p className="text-3xl font-bold">
            {mentees.reduce((sum, m) => sum + m.completedTasks, 0)}개
          </p>
        </div>
      </div>

      {/* 멘티 목록 */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">멘티 목록</h3>
          <button
            onClick={() => router.push('/mentor/tasks/new')}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
          >
            + 할 일 등록
          </button>
        </div>

        {isLoading ? (
          <p className="text-center text-gray-900 dark:text-gray-300">로딩 중...</p>
        ) : mentees.length === 0 ? (
          <p className="text-center text-gray-900 dark:text-gray-300">담당 멘티가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {mentees.map((mentee) => {
              const progress = calculateProgress(mentee.completedTasks, mentee.totalTasks);

              return (
                <div
                  key={mentee.id}
                  onClick={() => router.push(`/mentor/mentees/${mentee.id}`)}
                  className="bg-white dark:bg-gray-800 p-6 rounded-lg border hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-4">
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
                      <h4 className="font-semibold">
                        {mentee.nickname || mentee.name}
                        {mentee.nickname && (
                          <span className="text-sm font-normal text-gray-900 dark:text-gray-300">
                            ({mentee.name})
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-900 dark:text-gray-300">{mentee.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-900 dark:text-gray-300">전체 할 일</span>
                      <span className="font-medium">{mentee.totalTasks}개</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-900 dark:text-gray-300">완료</span>
                      <span className="font-medium text-green-600">
                        {mentee.completedTasks}개
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-900 dark:text-gray-300">달성률</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                  </div>

                  {/* 프로그레스 바 */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <button className="text-sm text-blue-600 hover:underline">
                      플래너 보기 →
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
