'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import MenteeHeader from '@/components/MenteeHeader';
import BottomNav from '@/components/BottomNav';
import { AutoLogoutProvider } from '@/components/AutoLogoutProvider';

export default function MenteeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // 과제 상세 페이지 (/mentee/tasks/[id])에서는 헤더와 하단 네비게이션을 숨김
  const isTaskDetailPage = pathname?.startsWith('/mentee/tasks/') && pathname.split('/').length === 4;

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
    <AutoLogoutProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* 상단 공통 헤더 (과제 상세 페이지 제외) */}
        {!isTaskDetailPage && <MenteeHeader />}

        {/* 메인 콘텐츠 영역: 하단 네비게이션이 있을 때만 pb-32 추가 */}
        <main className={`max-w-md mx-auto bg-white min-h-[calc(100vh-160px)] ${!isTaskDetailPage ? 'pb-32' : ''}`}>
          {children}
        </main>

        {/* 하단 공통 네비게이션 (과제 상세 페이지 제외) */}
        {!isTaskDetailPage && <BottomNav />}
      </div>
    </AutoLogoutProvider>
  );
}