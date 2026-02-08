/**
 * 자동 로그아웃 Provider
 * 인증이 필요한 페이지에서 사용
 */

'use client';

import { useRouter } from 'next/navigation';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { AutoLogoutWarning } from './AutoLogoutWarning';
import { logout } from '@/lib/auth';
import { TIMEOUTS } from '@/constants/timeouts';

interface AutoLogoutProviderProps {
  children: React.ReactNode;
}

export function AutoLogoutProvider({ children }: AutoLogoutProviderProps) {
  const router = useRouter();
  const { showWarning, extendSession } = useAutoLogout({
    enableIdleTimeout: true,
    enableTokenRefresh: true,
  });

  const handleLogout = () => {
    logout();
    router.push('/login?reason=idle');
  };

  return (
    <>
      {children}
      <AutoLogoutWarning
        show={showWarning}
        onExtend={extendSession}
        onLogout={handleLogout}
        remainingSeconds={TIMEOUTS.AUTO_LOGOUT_WARNING / 1000}
      />
    </>
  );
}
