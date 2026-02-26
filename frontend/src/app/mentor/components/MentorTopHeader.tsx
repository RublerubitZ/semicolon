'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import NotificationBell from '@/components/NotificationBell';
import { apiGet } from '@/lib/api';

interface MentorTopHeaderProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  handleLogout: () => void;
}

export default function MentorTopHeader({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  handleLogout,
}: MentorTopHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ role: string; name?: string; email?: string; profileImage?: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await apiGet('/api/auth/profile');

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };

    fetchProfile();
  }, []);

  // 경로에 따른 타이틀 설정
  const getTitle = () => {
    if (pathname === '/mentor') return '멘티관리';
    if (pathname.startsWith('/mentor/mentees/')) return '멘티 상세';
    if (pathname.startsWith('/mentor/tasks/new')) return '학습 과제 등록';
    if (pathname.startsWith('/mentor/feedbacks')) return '피드백 관리';
    if (pathname.startsWith('/mentor/worksheets')) return '학습지 관리';
    if (pathname.startsWith('/mentor/reports')) return '학습 리포트';
    return '멘토 대시보드';
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex h-[65px] items-center justify-between px-4 border-b bg-white sticky top-0 z-30">
        <div className={`flex items-center gap-2 transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}>
          <Image src="/logo.png" alt="설스터디 로고" width={32} height={32} className="flex-shrink-0" />
          <span className="text-zinc-800 text-xl font-bold">설스터디</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600">
            {isMobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            )}
          </button>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex h-[72px] items-center justify-between border-b border-gray-100 px-10 bg-white sticky top-0 z-10">
        {/* 왼쪽 타이틀 */}
        <div className="text-[20px] font-bold text-gray-900">{getTitle()}</div>

        {/* 오른쪽: 종 + 프로필 */}
        <div className="flex items-center gap-4">
          <NotificationBell />

          <div className="h-6 w-px bg-gray-200" />

          <div className="text-right">
            <div className="text-[12px] font-bold text-gray-900">{user?.name || '멘토'} 멘토</div>
            <div className="text-[11px] text-gray-400">{user?.email || ''}</div>
          </div>

          <div 
            className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-[12px] font-bold overflow-hidden cursor-pointer"
            onClick={() => router.push('/mypage')}
          >
            {user?.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user?.name?.[0] || '?'
            )}
          </div>
        </div>
      </div>
    </>
  );
}
