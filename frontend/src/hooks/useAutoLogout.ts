/**
 * 자동 로그아웃 Hook
 * 1. Idle Timeout: 사용자 비활성 시 자동 로그아웃
 * 2. Token Refresh: 주기적으로 Access Token 갱신
 */

import { useEffect, useRef, useState } from 'react';
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
  const idleTimerRef = useRef<NodeJS.Timeout>(null);
  const warningTimerRef = useRef<NodeJS.Timeout>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout>(null);
  const [showWarning, setShowWarning] = useState(false);

  // 로그아웃 처리
  const handleLogout = (reason: string) => {
    logout();
    router.push(`/login?reason=${reason}`);
  };

  // Idle 타이머 리셋
  const resetIdleTimer = () => {
    if (!enableIdleTimeout) return;

    // 기존 타이머 클리어
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    // 경고 숨기기
    setShowWarning(false);

    // 경고 타이머 (로그아웃 5분 전)
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      if (onWarning) onWarning();
    }, TIMEOUTS.AUTO_LOGOUT_IDLE - TIMEOUTS.AUTO_LOGOUT_WARNING);

    // 로그아웃 타이머
    idleTimerRef.current = setTimeout(() => {
      handleLogout('idle');
    }, TIMEOUTS.AUTO_LOGOUT_IDLE);
  };

  // 토큰 갱신
  const scheduleTokenRefresh = () => {
    if (!enableTokenRefresh) return;
    if (!getToken()) return; // 토큰이 없으면 갱신하지 않음

    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          // 성공 시 다음 갱신 예약
          scheduleTokenRefresh();
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        handleLogout('expired');
      }
    }, TIMEOUTS.TOKEN_REFRESH_INTERVAL);
  };

  // 경고 연장 (계속 사용)
  const extendSession = () => {
    resetIdleTimer();
    setShowWarning(false);
  };

  useEffect(() => {
    if (!getToken()) return; // 로그인 상태가 아니면 작동하지 않음

    // 1. Idle Timeout 설정
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

      resetIdleTimer(); // 초기 타이머 시작
    }

    // 2. Token Refresh 설정
    if (enableTokenRefresh) {
      scheduleTokenRefresh();
    }

    // Cleanup
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
  }, [enableIdleTimeout, enableTokenRefresh]);

  return {
    showWarning,
    extendSession,
  };
}
