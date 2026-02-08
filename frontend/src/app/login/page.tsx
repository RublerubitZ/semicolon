'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from "next/image";
import Link from 'next/link';
import { getApiUrl } from '@/lib/api';
import { setRefreshToken } from '@/lib/auth';
import { IoEye, IoEyeOff } from "react-icons/io5";

// 로그아웃 이유 메시지
const LOGOUT_REASONS: Record<string, { title: string; message: string; icon: string }> = {
  idle: {
    title: '자동 로그아웃',
    message: '장시간 사용하지 않아 보안을 위해 자동으로 로그아웃되었습니다.',
    icon: '⏰',
  },
  expired: {
    title: '세션 만료',
    message: '세션이 만료되었습니다. 다시 로그인해주세요.',
    icon: '🔒',
  },
  manual: {
    title: '로그아웃',
    message: '로그아웃되었습니다.',
    icon: '👋',
  },
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logoutReason, setLogoutReason] = useState<string | null>(null);

  // URL에서 로그아웃 이유 확인 및 저장된 아이디 불러오기
  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason && LOGOUT_REASONS[reason]) {
      setLogoutReason(reason);
      // 5초 후 이유 메시지 숨기기
      const timer = setTimeout(() => setLogoutReason(null), 5000);
      return () => clearTimeout(timer);
    }

    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '로그인에 실패했습니다.');
        return;
      }

      // 아이디 기억하기 처리
      if (rememberEmail) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // Access Token과 Refresh Token 저장
      localStorage.setItem('token', data.token);
      if (data.refreshToken) {
        setRefreshToken(data.refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.role === 'MENTOR') {
        router.push('/mentor');
      } else {
        router.push('/mentee');
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md p-5 sm:p-8 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50">
        <Link href="/" className="flex items-center justify-center gap-2 mb-6">
          <Image src="/logo.png" alt="로고" width={50} height={50} />
          <h1 className="text-3xl font-bold dark:text-white font-['S-Core_Dream']">설스터디</h1>
        </Link>

        {/* 로그아웃 이유 메시지 */}
        {logoutReason && LOGOUT_REASONS[logoutReason] && (
          <div className="mb-4 p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{LOGOUT_REASONS[logoutReason].icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  {LOGOUT_REASONS[logoutReason].title}
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {LOGOUT_REASONS[logoutReason].message}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border-b border-gray-200 dark:border-gray-600 outline-none focus:border-gray-300 dark:focus:border-gray-500 bg-transparent dark:text-white"
              placeholder="아이디"
              required
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border-b border-gray-200 dark:border-gray-600 outline-none focus:border-gray-300 dark:focus:border-gray-500 bg-transparent dark:text-white pr-10"
              placeholder="비밀번호"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              {showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
            </button>
          </div>

          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="remember"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="remember" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              아이디 기억하기
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-[#B0D4FF] dark:bg-[#4A7BA7] text-[#00265A] dark:text-white rounded-md hover:bg-[#9EC5F8] dark:hover:bg-[#5A8BB7] disabled:bg-gray-400 dark:disabled:bg-gray-600"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 text-center">
          <div className="flex justify-center gap-2">
            <span className="cursor-pointer hover:underline">회원가입</span>
            <span>|</span>
            <span className="cursor-pointer hover:underline">아이디 찾기</span>
            <span>|</span>
            <span className="cursor-pointer hover:underline">비밀번호 찾기</span>
          </div>
        </div>

      </div>
    </div>
  );
}