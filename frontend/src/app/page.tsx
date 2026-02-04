'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'MENTOR') {
          router.push('/mentor');
        } else {
          router.push('/mentee');
        }
      } catch {
        setIsChecking(false);
      }
    } else {
      setIsChecking(false);
    }
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-900">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white overflow-hidden" style={{ fontFamily: 'var(--font-pretendard)' }}>
      {/* 헤더 */}
      <header className="relative px-4 py-8 sm:px-8 md:px-12 lg:px-[60px] md:py-[73px]">
        <div className="flex items-center justify-between max-w-[1440px] mx-auto">
          {/* 로고 */}
          <div className="flex items-center gap-4 sm:gap-6 md:gap-[43px]">
            <div className="w-8 h-7 sm:w-10 sm:h-8 md:w-11 md:h-9 bg-sky-950 rounded" />
            <h1 className="text-zinc-800 text-2xl sm:text-3xl md:text-4xl font-bold" style={{ fontFamily: 'var(--font-scoredream)' }}>
              설스터디
            </h1>
          </div>

          {/* 로그인 버튼 */}
          <button
            onClick={() => router.push('/login')}
            className="text-gray-700 text-sm sm:text-base md:text-lg font-medium hover:text-gray-900 transition-colors whitespace-nowrap"
            style={{ fontFamily: 'var(--font-pretendard)' }}
          >
            로그인/회원가입
          </button>
        </div>

        {/* 구분선 */}
        <div className="absolute bottom-0 left-0 w-full h-px bg-gray-200" />
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 lg:px-[60px]">
        {/* 히어로 섹션 */}
        <section className="pt-12 pb-16 sm:pt-16 sm:pb-24 md:pt-24 md:pb-32 lg:pt-[98px] lg:pb-[146px] text-center" style={{ fontFamily: 'var(--font-pretendard)' }}>
          <h2 className="text-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight sm:leading-tight md:leading-tight lg:leading-[96px] mb-4 sm:mb-5 md:mb-6 lg:mb-[26px] px-2">
            당신의 멘토가 공부 방법부터 <br className="hidden sm:block" />
            실행까지 함께 만듭니다.
          </h2>
          <p className="text-gray-500 text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium leading-relaxed sm:leading-relaxed md:leading-relaxed lg:leading-[48px] px-2">
            학생들의 공부 습관을 길러주는 학습코칭 플랫폼
          </p>
        </section>

        {/* 핵심 가치 섹션 */}
        <section className="pb-16 sm:pb-24 md:pb-32 lg:pb-[153px]" style={{ fontFamily: 'var(--font-pretendard)' }}>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-12 sm:gap-16 md:gap-24 lg:gap-[228px]">
            {/* 실행력 향상 */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 mb-3 sm:mb-4 md:mb-[17px] flex items-center justify-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 lg:w-28 lg:h-28 bg-sky-950 rounded-lg" />
              </div>
              <h3 className="text-gray-400 text-base sm:text-lg md:text-xl font-medium leading-6 sm:leading-7 md:leading-8 mb-4 sm:mb-5 md:mb-[24px]">
                실행력 향상
              </h3>
              <p className="text-gray-600 text-lg sm:text-xl md:text-2xl font-medium leading-7 sm:leading-8 md:leading-9 text-center">
                하루 단위 체크리스트
                <br />
                꾸준한 학습 점검
              </p>
            </div>

            {/* 학습 품질 보증 */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 mb-3 sm:mb-4 md:mb-[17px] flex items-center justify-center">
                <div className="w-22 h-20 sm:w-26 sm:h-24 md:w-30 md:h-26 lg:w-32 lg:h-28 bg-sky-950 rounded-lg" />
              </div>
              <h3 className="text-gray-400 text-base sm:text-lg md:text-xl font-medium leading-6 sm:leading-7 md:leading-8 mb-4 sm:mb-5 md:mb-[24px]">
                학습 품질 보증
              </h3>
              <p className="text-gray-600 text-lg sm:text-xl md:text-2xl font-medium leading-7 sm:leading-8 md:leading-9 text-center">
                정형화 된 템플릿
                <br />
                정보 불균형 해소
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="pb-8 sm:pb-12 md:pb-16 lg:pb-[76px]" style={{ fontFamily: 'var(--font-pretendard)' }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 lg:px-[60px]">
          <div className="flex flex-col sm:flex-row items-center sm:items-center justify-center sm:justify-start gap-4 sm:gap-5">
            {/* 푸터 링크 */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <a
                href="#"
                className="text-gray-400 text-sm sm:text-base md:text-lg lg:text-2xl font-medium leading-6 sm:leading-7 md:leading-8 lg:leading-9 hover:text-gray-600 transition-colors whitespace-nowrap"
              >
                회사소개
              </a>
              <div className="w-px h-3 sm:h-4 bg-gray-300" />
              <a
                href="#"
                className="text-gray-400 text-sm sm:text-base md:text-lg lg:text-2xl font-medium leading-6 sm:leading-7 md:leading-8 lg:leading-9 hover:text-gray-600 transition-colors whitespace-nowrap"
              >
                인재채용
              </a>
              <div className="w-px h-3 sm:h-4 bg-gray-300" />
              <a
                href="#"
                className="text-gray-400 text-sm sm:text-base md:text-lg lg:text-2xl font-medium leading-6 sm:leading-7 md:leading-8 lg:leading-9 hover:text-gray-600 transition-colors whitespace-nowrap"
              >
                이용약관
              </a>
              <div className="w-px h-3 sm:h-4 bg-gray-300 hidden sm:block" />
              <a
                href="#"
                className="text-gray-400 text-sm sm:text-base md:text-lg lg:text-2xl font-medium leading-6 sm:leading-7 md:leading-8 lg:leading-9 hover:text-gray-600 transition-colors whitespace-nowrap"
              >
                개인정보처리방침
              </a>
              <div className="w-px h-3 sm:h-4 bg-gray-300" />
              <a
                href="#"
                className="text-gray-400 text-sm sm:text-base md:text-lg lg:text-2xl font-medium leading-6 sm:leading-7 md:leading-8 lg:leading-9 hover:text-gray-600 transition-colors whitespace-nowrap"
              >
                청소년보호정책
              </a>
              <div className="w-px h-3 sm:h-4 bg-gray-300" />
              <a
                href="#"
                className="text-gray-400 text-sm sm:text-base md:text-lg lg:text-2xl font-medium leading-6 sm:leading-7 md:leading-8 lg:leading-9 hover:text-gray-600 transition-colors whitespace-nowrap"
              >
                고객센터
              </a>
            </div>

            {/* 푸터 로고 */}
            <div className="flex items-center gap-1 mt-2 sm:mt-0">
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-sky-950 rounded" />
              <span className="text-zinc-800 text-base sm:text-lg font-bold" style={{ fontFamily: 'var(--font-scoredream)' }}>
                설스터디
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
