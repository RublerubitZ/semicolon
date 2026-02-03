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
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <p className="text-gray-900 dark:text-gray-300 dark:text-gray-100">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* 헤더 */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold dark:text-white">설스터디</h1>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100"
          >
            로그인
          </button>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-5xl font-bold mb-6 dark:text-white">
          멘토와 함께하는
          <br />
          <span className="text-blue-600 dark:text-blue-400">체계적인 수능 학습 관리</span>
        </h2>
        <p className="text-xl text-gray-900 dark:text-gray-300 dark:text-gray-100 mb-10">
          국어, 영어, 수학 학습을 위한 1:1 멘토링 기반 학습 코칭 플랫폼
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/login')}
            className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-lg text-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100"
          >
            시작하기
          </button>
          <a
            href="https://forms.gle/FchKdDcm23JdGHpK9"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-lg font-semibold hover:border-gray-400 dark:hover:border-gray-500 dark:text-white"
          >
            상담 신청
          </a>
        </div>
      </section>

      {/* 핵심 가치 */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm dark:shadow-gray-900/50">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-xl font-bold mb-3 dark:text-white">체계적인 학습 방법</h3>
            <p className="text-gray-900 dark:text-gray-300 dark:text-gray-300">
              멘토가 직접 설계하는 맞춤형 학습 플랜
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm dark:shadow-gray-900/50">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-bold mb-3 dark:text-white">실행력 향상</h3>
            <p className="text-gray-900 dark:text-gray-300 dark:text-gray-300">
              일일 플래너와 공부 시간 추적
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm dark:shadow-gray-900/50">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-bold mb-3 dark:text-white">표준화된 관리 품질</h3>
            <p className="text-gray-900 dark:text-gray-300 dark:text-gray-300">
              과목별 피드백 시스템
            </p>
          </div>
        </div>
      </section>

      {/* 주요 기능 */}
      <section className="bg-white dark:bg-gray-800 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12 dark:text-white">주요 기능</h2>
          <div className="grid md:grid-cols-2 gap-12">
            {/* 멘티 기능 */}
            <div>
              <h3 className="text-2xl font-bold mb-6 dark:text-white">학생 (멘티)</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 mt-1">✓</span>
                  <div>
                    <p className="font-semibold">플래너</p>
                    <p className="text-gray-900 dark:text-gray-300 text-sm">일일/주간/월간 학습 계획 관리</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 mt-1">✓</span>
                  <div>
                    <p className="font-semibold">공부 시간 기록</p>
                    <p className="text-gray-900 dark:text-gray-300 text-sm">과목별 학습 시간 추적</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 mt-1">✓</span>
                  <div>
                    <p className="font-semibold">과제 제출</p>
                    <p className="text-gray-900 dark:text-gray-300 text-sm">학습 결과물 이미지 업로드</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 mt-1">✓</span>
                  <div>
                    <p className="font-semibold">피드백 확인</p>
                    <p className="text-gray-900 dark:text-gray-300 text-sm">멘토의 과목별 피드백 열람</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* 멘토 기능 */}
            <div>
              <h3 className="text-2xl font-bold mb-6 dark:text-white">선생님 (멘토)</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 mt-1">✓</span>
                  <div>
                    <p className="font-semibold">멘티 관리</p>
                    <p className="text-gray-900 dark:text-gray-300 text-sm">담당 학생 목록 및 현황 파악</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 mt-1">✓</span>
                  <div>
                    <p className="font-semibold">할 일 등록</p>
                    <p className="text-gray-900 dark:text-gray-300 text-sm">학생별 맞춤 과제 생성</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 mt-1">✓</span>
                  <div>
                    <p className="font-semibold">학습지 관리</p>
                    <p className="text-gray-900 dark:text-gray-300 text-sm">칼럼/PDF 형태의 학습 자료 업로드</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 mt-1">✓</span>
                  <div>
                    <p className="font-semibold">피드백 작성</p>
                    <p className="text-gray-900 dark:text-gray-300 text-sm">과목별 상세 피드백 제공</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-6 dark:text-white">지금 바로 시작하세요</h2>
        <p className="text-gray-900 dark:text-gray-300 mb-8">
          체계적인 학습 관리로 목표를 달성하세요
        </p>
        <button
          onClick={() => router.push('/login')}
          className="px-10 py-4 bg-blue-600 dark:bg-blue-500 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600"
        >
          로그인하기
        </button>
      </section>

      {/* 푸터 */}
      <footer className="bg-gray-900 dark:bg-black text-white py-8">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-gray-400 dark:text-gray-500">© 2024 설스터디. All rights reserved.</p>
          <div className="mt-4">
            <a
              href="https://malachite-fontina-5e0.notion.site/2cfa56db406080f68bd2f8624b344a63"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 dark:text-gray-500 hover:text-white mx-3"
            >
              노션 페이지
            </a>
            <a
              href="https://forms.gle/FchKdDcm23JdGHpK9"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 dark:text-gray-500 hover:text-white mx-3"
            >
              상담 신청
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
