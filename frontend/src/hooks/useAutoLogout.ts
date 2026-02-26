/**
 * 자동 로그아웃 Hook
 * 1. Idle Timeout: 사용자 비활성 시 자동 로그아웃
 * 2. Token Refresh: 주기적으로 Access Token 갱신
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout, getToken } from '@/lib/auth';
import { refreshAccessToken } from '@/lib/api';
import { TIMEOUTS } from '@/constants/timeouts';

interface AutoLogoutOptions {
  enableIdleTimeout?: boolean;
  enableTokenRefresh?: boolean;
  onWarning?: () => void;
}

export function useAutoLogout(options: AutoLogoutOptions = {}) {
  const {
    enableIdleTimeout = true,
    enableTokenRefresh = true,
    onWarning,
  } = options;

  const router = useRouter();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scheduleTokenRefreshRef = useRef<(() => void) | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const handleLogout = useCallback((reason: string) => {
    logout();
    router.push(`/login?reason=${reason}`);
  }, [router]);

  const resetIdleTimer = useCallback(() => {
    if (!enableIdleTimeout) return;

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    setShowWarning(false);

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      if (onWarning) onWarning();
    }, TIMEOUTS.AUTO_LOGOUT_IDLE - TIMEOUTS.AUTO_LOGOUT_WARNING);

    idleTimerRef.current = setTimeout(() => {
      handleLogout('idle');
    }, TIMEOUTS.AUTO_LOGOUT_IDLE);
  }, [enableIdleTimeout, onWarning, handleLogout]);

  const scheduleTokenRefresh = useCallback(() => {
    if (!enableTokenRefresh) return;
    if (!getToken()) return;

    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          console.log('[AutoLogout] Token refreshed, scheduling next refresh');
          scheduleTokenRefreshRef.current?.();
        } else {
          console.error('[AutoLogout] Token refresh failed, redirecting to login');
          handleLogout('expired');
        }
      } catch (error) {
        console.error('[AutoLogout] Token refresh error:', error);
        handleLogout('expired');
      }
    }, TIMEOUTS.TOKEN_REFRESH_INTERVAL);
  }, [enableTokenRefresh, handleLogout]);

  useEffect(() => {
    scheduleTokenRefreshRef.current = scheduleTokenRefresh;
  }, [scheduleTokenRefresh]);

  const extendSession = useCallback(() => {
    resetIdleTimer();
    setShowWarning(false);
  }, [resetIdleTimer]);

  useEffect(() => {
    if (!getToken()) return;

    if (enableIdleTimeout) {
      const events = [
        'mousedown',
        'mousemove',
        'keypress',
        'scroll',
        'touchstart',
        'click',
      ];

      events.forEach(event => {
        document.addEventListener(event, resetIdleTimer);
      });

      setTimeout(resetIdleTimer, 0);
    }

    if (enableTokenRefresh) {
      scheduleTokenRefresh();
    }

    return () => {
      if (enableIdleTimeout) {
        const events = [
          'mousedown',
          'mousemove',
          'keypress',
          'scroll',
          'touchstart',
          'click',
        ];

        events.forEach(event => {
          document.removeEventListener(event, resetIdleTimer);
        });
      }

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [enableIdleTimeout, enableTokenRefresh, resetIdleTimer, scheduleTokenRefresh]);

  return {
    showWarning,
    extendSession,
  };
}
