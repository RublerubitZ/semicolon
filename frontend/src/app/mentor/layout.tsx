'use client';

import { useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MentorSidebar from './components/MentorSidebar';
import MentorTopHeader from './components/MentorTopHeader';
import { AutoLogoutProvider } from '@/components/AutoLogoutProvider';
import { ConfirmModal } from '@/components/ConfirmModal';

export default function MentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user] = useState<{ role: string; name?: string; email?: string; profileImage?: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (!token || !userStr) return null;
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useLayoutEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'MENTOR') router.push('/mentee');
  }, [user, router]);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  return (
    <AutoLogoutProvider>
      <div className="flex flex-col md:flex-row min-h-screen bg-white font-['Pretendard']">
        {/* Mobile Top Header - Only visible on mobile */}
        <div className="md:hidden">
          <MentorTopHeader
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            handleLogout={handleLogout}
          />
        </div>

        <MentorSidebar
          user={user}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          handleLogout={handleLogout}
        />

        {/* Desktop Main Content Area with Header */}
        <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-65px)] md:h-screen">
          {/* Desktop Top Header - Only visible on desktop */}
          <div className="hidden md:block">
            <MentorTopHeader
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
              handleLogout={handleLogout}
            />
          </div>

          <main className="flex-1 bg-gray-50 relative overflow-y-auto">
            <div className="p-6 md:p-[60px] min-h-full">
                {children}
            </div>
          </main>
        </div>

        <ConfirmModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={confirmLogout}
          title="로그아웃"
          message="정말 로그아웃 하시겠습니까?"
          confirmText="로그아웃"
          cancelText="취소"
          variant="danger"
        />
      </div>
    </AutoLogoutProvider>
  );
}
