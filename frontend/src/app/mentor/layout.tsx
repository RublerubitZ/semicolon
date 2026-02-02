'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MentorLayout({
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
      if (user.role !== 'MENTOR') {
        router.push('/mentee');
      }
    } catch (error) {
      console.error('Failed to parse user:', error);
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 멘토 전용 레이아웃 (PC 최적화) */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">설스터디 - 멘토</h1>
          <button
            onClick={() => {
              localStorage.clear();
              router.push('/login');
            }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* 사이드바 (추후 구현) */}
        <aside className="w-64 bg-white border-r min-h-screen p-4">
          <nav className="space-y-2">
            <a href="/mentor" className="block px-4 py-2 rounded bg-gray-100">
              멘티 관리
            </a>
            <a href="#" className="block px-4 py-2 rounded text-gray-600 hover:bg-gray-50">
              학습지 관리
            </a>
            <a href="#" className="block px-4 py-2 rounded text-gray-600 hover:bg-gray-50">
              피드백 작성
            </a>
          </nav>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
