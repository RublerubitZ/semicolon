'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MenteeHeader from '@/components/MenteeHeader';
import BottomNav from '@/components/BottomNav';

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 상단 공통 헤더 */}
      <MenteeHeader />
      
      {/* 메인 콘텐츠 영역: 하단 네비게이션 높이만큼 padding-bottom(pb-32) 추가 */}
      <main className="max-w-md mx-auto bg-white min-h-[calc(100vh-160px)] pb-32">
        {children}
      </main>

      {/* 하단 공통 네비게이션 */}
      <BottomNav />
    </div>
  );
}