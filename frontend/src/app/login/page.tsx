'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from "next/image";
import Link from 'next/link';
import { getApiUrl } from '@/lib/api';


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

      localStorage.setItem('token', data.token);
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

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border-b border-gray-200 dark:border-gray-600 outline-none focus:border-gray-300 dark:focus:border-gray-500 bg-transparent dark:text-white"
              placeholder="비밀번호"
              required
            />
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