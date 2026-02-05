'use client';
import { getApiUrl } from '@/lib/api';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH';

interface SubjectStats {
  total: number;
  completed: number;
}

interface Stats {
  KOREAN: SubjectStats;
  ENGLISH: SubjectStats;
  MATH: SubjectStats;
}

interface User {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  role: string;
  grade?: string;
  profileImage?: string;
}

const SUBJECT_LABELS: Record<Subject, { label: string; color: string; bgColor: string }> = {
  KOREAN: {
    label: '국어',
    color: 'text-blue-600',
    bgColor: 'bg-blue-600'
  },
  ENGLISH: {
    label: '영어',
    color: 'text-green-600',
    bgColor: 'bg-green-600'
  },
  MATH: {
    label: '수학',
    color: 'text-purple-600',
    bgColor: 'bg-purple-600'
  },
};

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 통계 조회
  const fetchStats = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/mentee/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('통계를 불러오는데 실패했습니다.');
      }

      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Stats error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 달성률 계산
  const calculateProgress = (completed: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  // 전체 달성률 계산
  const calculateOverallProgress = (): number => {
    if (!stats) return 0;

    const totalTasks = stats.KOREAN.total + stats.ENGLISH.total + stats.MATH.total;
    const completedTasks = stats.KOREAN.completed + stats.ENGLISH.completed + stats.MATH.completed;

    if (totalTasks === 0) return 0;
    return Math.round((completedTasks / totalTasks) * 100);
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
    }
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 pb-20">
        <p className="text-center text-gray-900 dark:text-gray-100">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10">
        <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => router.back()} className="text-xl sm:text-2xl dark:text-white">
              ←
            </button>
            <h1 className="text-base sm:text-lg md:text-xl font-bold dark:text-white">학습 리포트</h1>
          </div>
        </div>
      </div>

      {/* 전체 달성률 */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="px-4 sm:px-6 md:px-8 py-5 sm:py-6 text-white">
          <div className="bg-white/10 rounded-lg p-3 sm:p-4 md:p-5 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm">전체 달성률</span>
              <span className="text-xl sm:text-2xl md:text-3xl font-bold">{calculateOverallProgress()}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2.5 sm:h-3 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${calculateOverallProgress()}%` }}
              />
            </div>
            {stats && (
              <div className="mt-2 sm:mt-3 flex items-center justify-between text-xs sm:text-sm text-blue-100">
                <span>
                  완료: {stats.KOREAN.completed + stats.ENGLISH.completed + stats.MATH.completed}개
                </span>
                <span>
                  전체: {stats.KOREAN.total + stats.ENGLISH.total + stats.MATH.total}개
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 통계 요약 카드 */}
      {stats && (
        <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700 text-center">
              <p className="text-xs text-gray-900 dark:text-gray-300 mb-1">총 할 일</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {stats.KOREAN.total + stats.ENGLISH.total + stats.MATH.total}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700 text-center">
              <p className="text-xs text-gray-900 dark:text-gray-300 mb-1">완료</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.KOREAN.completed + stats.ENGLISH.completed + stats.MATH.completed}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700 text-center">
              <p className="text-xs text-gray-900 dark:text-gray-300 mb-1">미완료</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {(stats.KOREAN.total - stats.KOREAN.completed) +
                  (stats.ENGLISH.total - stats.ENGLISH.completed) +
                  (stats.MATH.total - stats.MATH.completed)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 과목별 달성률 */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5">
        <h3 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 dark:text-white">과목별 달성률</h3>

        <div className="space-y-3 sm:space-y-4">
          {(Object.keys(SUBJECT_LABELS) as Subject[]).map((subject) => {
            const subjectStats = stats?.[subject] || { total: 0, completed: 0 };
            const progress = calculateProgress(subjectStats.completed, subjectStats.total);

            return (
              <div key={subject} className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${SUBJECT_LABELS[subject as Subject]?.bgColor || 'bg-gray-600'}`} />
                    <span className="font-semibold dark:text-white">{SUBJECT_LABELS[subject as Subject]?.label || subject}</span>
                  </div>
                  <span className={`text-xl font-bold ${SUBJECT_LABELS[subject as Subject]?.color || 'text-gray-600'}`}>
                    {progress}%
                  </span>
                </div>

                {/* 프로그레스 바 */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${SUBJECT_LABELS[subject as Subject]?.bgColor || 'bg-gray-600'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* 상세 정보 */}
                <div className="flex items-center justify-between text-sm text-gray-900 dark:text-gray-300">
                  <span>완료: {subjectStats.completed}개</span>
                  <span>전체: {subjectStats.total}개</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 월 리포트 버튼 */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5">
        <button
          onClick={() => router.push('/mentee/reports/monthly')}
          className="block w-full py-3 sm:py-4 md:py-5 bg-gradient-to-r from-green-500 to-blue-500 text-white text-center rounded-lg text-sm sm:text-base font-bold shadow-lg hover:shadow-xl transition-shadow"
        >
          📊 월간 리포트 보기
        </button>
        <p className="text-xs sm:text-sm text-gray-900 dark:text-gray-300 text-center mt-2">
          한 달 동안의 학습 통계를 확인하세요
        </p>
      </div>

      {/* 하단 여백 */}
      <div className="h-4" />
    </div>
  );
}
