'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MenteeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'MENTEE') {
        router.push('/mentor');
      }
    } catch (error) {
      console.error('Failed to parse user:', error);
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 멘티 전용 레이아웃 (모바일 최적화) */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-bold">설스터디</h1>
          <button
            onClick={() => {
              localStorage.clear();
              router.push('/login');
            }}
            className="text-sm text-gray-600"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto">{children}</main>

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-md mx-auto px-4 py-2 flex justify-around">
          <button
            onClick={() => router.push('/mentee')}
            className="px-4 py-2 text-sm hover:text-blue-600"
          >
            📅 플래너
          </button>
          <button
            onClick={() => router.push('/mentee/feedbacks')}
            className="px-4 py-2 text-sm hover:text-blue-600"
          >
            💬 피드백
          </button>
          <button
            onClick={() => router.push('/mentee/mypage')}
            className="px-4 py-2 text-sm hover:text-blue-600"
          >
            👤 마이
          </button>
        </div>
      </nav>
    </div>
  );
}
