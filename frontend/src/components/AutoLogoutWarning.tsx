/**
 * 자동 로그아웃 경고 모달
 * 비활성 시간이 임계값에 도달하면 표시됨
 */

'use client';

import { useEffect, useState } from 'react';
import { Z_INDEX } from '@/constants/zIndex';

interface AutoLogoutWarningProps {
  show: boolean;
  onExtend: () => void;
  onLogout: () => void;
  remainingSeconds?: number;
}

export function AutoLogoutWarning({
  show,
  onExtend,
  onLogout,
  remainingSeconds = 300, // 5분 = 300초
}: AutoLogoutWarningProps) {
  const [timeLeft, setTimeLeft] = useState(remainingSeconds);

  useEffect(() => {
    if (!show) return;

    // 카운트다운
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [show, onLogout]);

  if (!show) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: Z_INDEX.MODAL }}
    >
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        {/* 아이콘 */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* 제목 */}
        <h2 className="text-xl font-bold text-center mb-2 text-gray-900">
          자동 로그아웃 예정
        </h2>

        {/* 메시지 */}
        <p className="text-center text-gray-600 mb-6">
          장시간 사용하지 않아 보안을 위해
          <br />
          <span className="font-bold text-amber-600">
            {minutes}분 {seconds.toString().padStart(2, '0')}초
          </span>{' '}
          후 자동으로 로그아웃됩니다.
        </p>

        {/* 버튼들 */}
        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            로그아웃
          </button>
          <button
            onClick={onExtend}
            className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-lg"
          >
            계속 사용하기
          </button>
        </div>

        {/* 안내 문구 */}
        <p className="text-xs text-center text-gray-500 mt-4">
          계속 사용하기를 누르면 세션이 연장됩니다
        </p>
      </div>
    </div>
  );
}
