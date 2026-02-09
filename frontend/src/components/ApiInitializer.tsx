'use client';

import { useEffect } from 'react';
import { initializeApiUrl } from '@/lib/api';
import { initErrorTracking } from '@/lib/error-tracker';

/**
 * 앱 시작 시 초기화
 * - 로컬 백엔드(localhost:4000)가 실행 중이면 로컬 사용, 없으면 Railway 백엔드 사용
 * - 글로벌 에러 추적 리스너 등록
 */
export default function ApiInitializer() {
  useEffect(() => {
    initializeApiUrl();
    initErrorTracking();
  }, []);

  return null;
}
