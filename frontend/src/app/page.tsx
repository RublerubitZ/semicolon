'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';

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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="w-full min-h-screen bg-white overflow-x-hidden font-['Pretendard']">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image src="/logo.svg" alt="설스터디 로고" width={32} height={32} className="sm:w-10 sm:h-10" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#00265A] tracking-tight">설스터디</h1>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 sm:px-6 sm:py-2.5 bg-[#00265A] text-white text-sm sm:text-base font-bold rounded-full hover:bg-[#001a3d] transition-all shadow-lg shadow-blue-900/10 active:scale-95"
          >
            시작하기
          </button>
        </div>
      </nav>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-20 sm:py-32 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 opacity-30">
            <div className="absolute top-10 left-10 w-64 h-64 bg-blue-100 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-100 rounded-full blur-3xl animate-pulse delay-700" />
          </div>

          <div className="max-w-7xl mx-auto px-4 text-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
            >
              <motion.span 
                variants={itemVariants}
                className="inline-block px-4 py-1.5 mb-6 text-xs sm:text-sm font-bold text-blue-600 bg-blue-50 rounded-full border border-blue-100"
              >
                대한민국 1등 학습코칭 플랫폼
              </motion.span>
              <motion.h2 
                variants={itemVariants}
                className="text-4xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.15] mb-8"
              >
                당신의 멘토가 <br />
                <span className="text-[#00265A]">학습의 전 과정</span>을 <br />
                함께 만듭니다.
              </motion.h2>
              <motion.p 
                variants={itemVariants}
                className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-12 leading-relaxed"
              >
                공부 방법부터 습관 형성, 그리고 성적 향상까지. <br className="hidden sm:block" />
                검증된 멘토와 함께 체계적인 학습 관리를 시작하세요.
              </motion.p>
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => router.push('/login')}
                  className="w-full sm:w-auto px-10 py-4 bg-[#00265A] text-white text-lg font-bold rounded-2xl hover:bg-[#001a3d] transition-all shadow-xl shadow-blue-900/20"
                >
                  지금 바로 시작하기
                </button>
                <button className="w-full sm:w-auto px-10 py-4 bg-gray-50 text-gray-600 text-lg font-bold rounded-2xl hover:bg-gray-100 transition-all">
                  서비스 둘러보기
                </button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: '누적 멘티', value: '10,000+' },
                { label: '활성 멘토', value: '500+' },
                { label: '학습 성취도', value: '98%' },
                { label: '평균 평점', value: '4.9/5.0' },
              ].map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-[#00265A] mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-400 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 sm:py-32">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-20">
              <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">설스터디만의 특별한 관리 시스템</h3>
              <p className="text-gray-500">단순한 과외를 넘어, 스스로 공부하는 힘을 길러줍니다.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: '실행력 향상',
                  desc: '하루 단위 맞춤형 체크리스트로 막연했던 공부를 실천 가능한 행동으로 바꿉니다.',
                  icon: '📈',
                  color: 'bg-blue-50'
                },
                {
                  title: '학습 품질 보증',
                  desc: '정형화된 관리 템플릿과 검증된 데이터로 학습 정보의 불균형을 해소합니다.',
                  icon: '🎯',
                  color: 'bg-indigo-50'
                },
                {
                  title: '밀착 피드백',
                  desc: '담당 멘토가 매일 학습 현황을 점검하고, 필요한 조언을 아끼지 않습니다.',
                  icon: '💬',
                  color: 'bg-emerald-50'
                }
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-8 rounded-[32px] bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                  <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h4>
                  <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-20 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
            <div>
              <div className="flex items-center gap-2 mb-6 text-white">
                <Image src="/logo.svg" alt="설스터디 로고" width={24} height={24} className="brightness-200" />
                <span className="text-xl font-bold tracking-tight">설스터디</span>
              </div>
              <p className="max-w-xs text-sm leading-relaxed">
                학생의 잠재력을 깨우는 최고의 동반자.<br />
                우리는 더 나은 학습 경험을 위해 고민합니다.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 sm:gap-24">
              <div>
                <h5 className="text-white font-bold mb-6">서비스</h5>
                <ul className="space-y-4 text-sm">
                  <li><a href="#" className="hover:text-white transition-colors">멘토링 찾기</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">이용 안내</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">성공 사례</a></li>
                </ul>
              </div>
              <div>
                <h5 className="text-white font-bold mb-6">고객지원</h5>
                <ul className="space-y-4 text-sm">
                  <li><a href="#" className="hover:text-white transition-colors">자주 묻는 질문</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">문의하기</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">공지사항</a></li>
                </ul>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <h5 className="text-white font-bold mb-6">Contact</h5>
                <ul className="space-y-4 text-sm">
                  <li>contact@seolstudy.com</li>
                  <li>1544-0000</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <p>© 2026 SeolStudy Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">개인정보처리방침</a>
              <a href="#" className="hover:text-white transition-colors">이용약관</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}