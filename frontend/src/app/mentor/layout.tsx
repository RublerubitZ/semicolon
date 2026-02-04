'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, X } from 'lucide-react'; // Using lucide-react for icons if available, otherwise simple SVG

export default function MentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userStr);
      setUser(parsedUser);
      if (parsedUser.role !== 'MENTOR') {
        router.push('/mentee');
      }
    } catch (error) {
      console.error('Failed to parse user:', error);
      router.push('/login');
    }
  }, [router]);

  const menuItems = [
    { name: '멘티관리', path: '/mentor' },
    { name: '학습 과제 등록', path: '/mentor/tasks/new' },
    { name: '피드백', path: '/mentor/feedbacks' },
  ];

  const handleLogout = () => {
    if (confirm('정말 로그아웃 하시겠습니까?')) {
      localStorage.clear();
      router.push('/');
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white font-['Pretendard']">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-white sticky top-0 z-20">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-gray-200 rounded-md flex-shrink-0" />
           <span className="text-zinc-800 text-xl font-bold font-['S-Core_Dream']">설스터디</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
           {isMobileMenuOpen ? (
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
           ) : (
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
           )}
        </button>
      </div>

      {/* Sidebar (Desktop: Visible, Mobile: Toggle) */}
      <aside className={`
        fixed inset-0 z-10 bg-white md:relative md:z-0 md:flex md:w-80 flex-shrink-0 border-r border-gray-200 flex-col justify-between p-[60px] pt-[72px] pb-[60px]
        ${isMobileMenuOpen ? 'flex' : 'hidden'}
      `}>
        <div>
          {/* Logo (Desktop only) */}
          <div className="hidden md:flex mb-[60px] items-center gap-3">
            <div className="w-11 h-9 bg-gray-200 rounded-md flex-shrink-0" /> 
            <span className="text-zinc-800 text-4xl font-bold font-['S-Core_Dream'] leading-none">설스터디</span>
          </div>

          {/* Navigation */}
          <nav className="space-y-6 mt-10 md:mt-0">
            {menuItems.map((item) => {
              let isActive = false;
              if (item.path === '/mentor') {
                 isActive = pathname === '/mentor' || pathname.startsWith('/mentor/mentees');
              } else {
                 isActive = pathname.startsWith(item.path);
              }

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-3 text-lg font-semibold rounded-[10px] transition-colors ${
                    isActive
                      ? 'bg-sky-200 text-sky-950'
                      : 'text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profile */}
        <div className="flex items-center gap-4 mt-10 md:mt-0">
            <div className="w-12 h-12 bg-zinc-300 rounded-full flex items-center justify-center text-gray-500 text-xl font-semibold">
              {user?.name?.[0] || '손'}
            </div>
            <div className="flex-1">
              <div className="text-slate-800 text-base font-semibold">{user?.name || '손지우'} 멘토</div>
              <div className="text-gray-500 text-xs font-medium">서울대 수학교육과</div>
            </div>
             {/* Logout Button (Mobile & Desktop) */}
            <button 
              onClick={handleLogout}
              className="md:hidden text-sm text-gray-500 underline"
            >
              로그아웃
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-gray-50 relative overflow-y-auto h-[calc(100vh-65px)] md:h-screen">
        <div className="p-6 md:p-[60px] md:pt-[72px] min-h-full">
            {/* Header Area (Top Right - Desktop) */}
            <div className="hidden md:flex absolute top-[71px] right-[60px] gap-8 text-lg font-medium text-gray-700">
                <button onClick={handleLogout} className="hover:text-black">로그아웃</button>
                <button onClick={() => router.push('/mypage')} className="hover:text-black">마이페이지</button>
            </div>
            {children}
        </div>
      </main>
    </div>
  );
}
