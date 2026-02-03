'use client';

import { useEffect } from 'react';
import { initializeApiUrl } from '@/lib/api';

/**
 * 앱 시작 시 백엔드 자동 감지
 * - 로컬 백엔드(localhost:4000)가 실행 중이면 로컬 사용
 * - 없으면 Railway 백엔드 사용
 */
export default function ApiInitializer() {
  useEffect(() => {
    initializeApiUrl();
  }, []);

  return null;
}
