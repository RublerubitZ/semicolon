'use client';
import { useEffect, useState } from 'react';

interface StreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
  variant?: 'compact' | 'full';
}

export default function StreakBadge({
  currentStreak,
  longestStreak,
  variant = 'compact',
}: StreakBadgeProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [prevStreak, setPrevStreak] = useState(currentStreak);

  // 스트릭 증가 시 애니메이션 트리거
  useEffect(() => {
    if (currentStreak > prevStreak && currentStreak > 0) {
      setShouldAnimate(true);
      const timer = setTimeout(() => setShouldAnimate(false), 1000);
      return () => clearTimeout(timer);
    }
    setPrevStreak(currentStreak);
  }, [currentStreak, prevStreak]);

  if (variant === 'compact') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-md">
        <span
          className={`text-lg ${shouldAnimate ? 'animate-pulse' : ''}`}
          role="img"
          aria-label="불꽃"
        >
          🔥
        </span>
        <span className="text-white font-bold text-sm">
          {currentStreak}일
        </span>
      </div>
    );
  }

  // variant === 'full'
  return (
    <div className="w-full bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-200">
      {/* 현재 스트릭 */}
      <div className="flex items-center justify-center mb-4">
        <div className="flex items-center gap-3">
          <span
            className={`text-5xl ${shouldAnimate ? 'animate-bounce' : ''}`}
            role="img"
            aria-label="불꽃"
          >
            🔥
          </span>
          <div>
            <div className="text-4xl font-bold text-orange-600">
              {currentStreak}
            </div>
            <div className="text-sm text-gray-600 font-medium">
              일 연속 학습
            </div>
          </div>
        </div>
      </div>

      {/* 구분선 */}
      <div className="border-t border-orange-200 my-4"></div>

      {/* 최장 스트릭 */}
      <div className="flex items-center justify-between px-4">
        <div className="text-sm text-gray-600 font-medium">
          최장 기록
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label="트로피">
            🏆
          </span>
          <span className="text-lg font-bold text-gray-800">
            {longestStreak}일
          </span>
        </div>
      </div>

      {/* 격려 메시지 */}
      {currentStreak === 0 && (
        <div className="mt-4 text-center text-sm text-gray-500 px-4">
          오늘부터 새로운 연속 학습을 시작해보세요! 💪
        </div>
      )}
      {currentStreak > 0 && currentStreak < 7 && (
        <div className="mt-4 text-center text-sm text-orange-600 font-medium px-4">
          좋아요! 7일 연속 학습까지 {7 - currentStreak}일 남았어요! 🎯
        </div>
      )}
      {currentStreak >= 7 && currentStreak < 30 && (
        <div className="mt-4 text-center text-sm text-orange-600 font-medium px-4">
          훌륭해요! 30일 연속 학습까지 {30 - currentStreak}일 남았어요! 🚀
        </div>
      )}
      {currentStreak >= 30 && (
        <div className="mt-4 text-center text-sm text-orange-600 font-medium px-4">
          대단해요! {currentStreak}일 연속 학습 중입니다! 🌟
        </div>
      )}

      {/* 새로운 최장 기록 달성 */}
      {currentStreak > 0 && currentStreak === longestStreak && currentStreak > 1 && (
        <div className="mt-2 text-center text-xs text-green-600 font-bold px-4">
          🎉 새로운 최장 기록 달성!
        </div>
      )}
    </div>
  );
}
