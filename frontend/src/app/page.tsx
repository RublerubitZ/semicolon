'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, useScroll, useSpring } from 'framer-motion';
import { AiFillMessage } from "react-icons/ai";
import { BsArrowUpRight, BsArrowUpLeft } from "react-icons/bs";
import { Z_INDEX } from '@/constants/zIndex';

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

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
          transition={{ duration: 1, repeat: Infinity, ease: "linear" as const }}
          className="w-8 h-8 border-4 border-[#002559] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 40, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] as const }
    }
  };

  const revealText = {
    hidden: { opacity: 0, scale: 0.9, x: -30 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      x: 0, 
      transition: { duration: 1, ease: [0.16, 1, 0.3, 1] as const } 
    }
  };

  const slideInRight = {
    hidden: { x: 100, opacity: 0 },
    visible: (i: number) => ({
      x: 0,
      opacity: 1,
      transition: { delay: i * 0.2, duration: 0.8, ease: "easeOut" as const }
    })
  };

  const slideInLeft = {
    hidden: { x: -60, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: "easeOut" as const }
    }
  };

  return (
    <div className="w-full relative bg-neutral-50 overflow-hidden font-pretendard selection:bg-[#002559] selection:text-white">
      {/* Scroll Progress Bar */}
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-[#002559] origin-left" style={{ scaleX, zIndex: Z_INDEX.OVERLAY_BACKDROP }} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 h-20 sm:h-24 bg-white/80 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-[1280px] mx-auto px-6 h-full flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => router.push('/')}
          >
            <Image 
              src="/logo.svg" 
              alt="설스터디" 
              width={36} 
              height={30} 
              style={{ width: '36px', height: 'auto' }}
              className="w-9" 
            />
            <span className="text-zinc-800 text-2xl sm:text-3xl font-bold font-scoredream tracking-tight">설스터디</span>
          </motion.div>
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05, backgroundColor: "#ADE0FF" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/login')}
            className="px-8 py-3 bg-[#C5EAFF] rounded-xl text-[#002559] text-lg font-bold font-inter shadow-lg shadow-blue-200/20 transition-all"
          >
            가입하기
          </motion.button>
        </div>
      </nav>

      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative w-full max-w-[1280px] mx-auto h-[600px] sm:h-[750px] rounded-[40px] overflow-hidden bg-white shadow-2xl mb-20 group">
          <motion.div 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.5 }}
            transition={{ duration: 2 }}
            className="absolute inset-0"
          >
            <Image 
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1400&h=756&auto=format&fit=crop" 
              alt="Hero Background" 
              fill
              className="object-cover"
            />
          </motion.div>
          <div className="absolute inset-0 bg-radial-[at_50%_30%] from-neutral-50/80 via-neutral-50/40 to-transparent z-10" />
          
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative z-20 h-full flex flex-col items-center justify-center text-center px-4"
          >
            <motion.div variants={itemVariants} className="flex items-center gap-2 mb-8 bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/50">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Image 
                  src="/snu.png" 
                  alt="Icon" 
                  width={20} 
                  height={20}
                  style={{ width: '20px', height: 'auto' }}
                />
              </motion.div>
              <span className="text-[#002559] text-base font-semibold font-inter tracking-tight">
                서울대생 멘토의 1:1 밀착 코칭
              </span>
            </motion.div>

            <motion.h2 
              variants={itemVariants}
              className="text-5xl sm:text-7xl lg:text-8xl font-bold leading-[1.1] mb-8 tracking-tight"
            >
              <span className="text-zinc-900 font-pretendard">당신의 멘토가</span><br/>
              <span className="text-zinc-900/30 font-pretendard">실행까지 함께 만듭니다.</span>
            </motion.h2>

            <motion.p 
              variants={itemVariants}
              className="max-w-2xl text-neutral-600 text-xl sm:text-2xl font-normal leading-relaxed mb-12 font-pretendard px-6"
            >
              학생들이 효과적인 공부 습관을 형성하고 지속적으로 유지할 수 있도록 도와주는 전문 학습코칭 플랫폼
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-6">
              <motion.button 
                whileHover={{ y: -5, backgroundColor: "#ADE0FF", boxShadow: "0 20px 40px -10px rgba(0,37,89,0.1)" }}
                className="px-12 py-5 bg-[#C5EAFF] text-[#002559] rounded-2xl text-xl font-bold font-inter shadow-xl transition-all"
              >
                서비스 둘러보기
              </motion.button>
              <motion.button 
                whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,1)" }}
                className="px-12 py-5 bg-white/80 backdrop-blur-md border border-gray-200 text-[#002559] rounded-2xl text-xl font-bold font-inter shadow-lg transition-all"
              >
                상담 신청하기
              </motion.button>
            </motion.div>
          </motion.div>
        </section>

        {/* Info Section */}
        <section className="max-w-[1280px] mx-auto px-6 py-32 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* 설스터디 소개 (Zoom + Fade 애니메이션) */}
          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true, margin: "-100px" }} 
            variants={revealText}
          >
            <h3 className="text-5xl sm:text-7xl font-bold leading-tight mb-8">
              <span className="text-[#002559] font-scoredream">설스터디</span>
              <span className="text-gray-400 font-pretendard">는<br/>어떤 서비스인가요?</span>
            </h3>
            <p className="text-gray-500 text-2xl font-medium leading-relaxed max-w-md font-pretendard">
              설스터디는 자체 학습지와 플래너를 기반으로,<br/>
              멘토가 학생의 공부 과정을 매일 관리하는 학습 코칭 플랫폼입니다.
            </p>
          </motion.div>

          <div className="flex flex-col gap-12 items-end">
            {/* 실행력 향상 (Slide in from Right 애니메이션) */}
            <motion.div 
              custom={0}
              initial="hidden" 
              whileInView="visible" 
              viewport={{ once: true }} 
              variants={slideInRight}
              whileHover={{ scale: 1.02, x: -10 }}
              className="w-full max-w-96 min-h-[140px] bg-blue-300 rounded-tr-[50px] rounded-bl-[50px] rounded-br-[50px] rotate-180 flex items-center justify-center p-8 relative shadow-xl shadow-blue-200/50 cursor-default"
            >
              <div className="rotate-180 flex flex-col items-end text-right w-full">
                <div className="px-6 py-2 bg-white/80 rounded-full border border-blue-400 text-[#002559] text-base font-bold font-pretendard mb-4 shadow-sm">
                  실행력 향상
                </div>
                <h4 className="text-[#002559] text-2xl font-bold leading-snug font-pretendard">
                  하루 단위 체크리스트<br/>꾸준한 학습 점검
                </h4>
              </div>
            </motion.div>

            {/* 학습 품질 보증 (Slide in from Right 애니메이션 with Delay) */}
            <motion.div 
              custom={1}
              initial="hidden" 
              whileInView="visible" 
              viewport={{ once: true }} 
              variants={slideInRight}
              whileHover={{ scale: 1.02, x: -10 }}
              className="w-full max-w-[620px] min-h-[120px] bg-sky-200 rounded-tr-[50px] rounded-bl-[50px] rounded-br-[50px] flex flex-col items-start justify-center p-10 relative shadow-xl shadow-sky-100/50 text-left cursor-default"
            >
              <div className="px-8 py-2 bg-white/80 rounded-full border border-blue-400 text-[#002559] text-base font-bold font-pretendard mb-4 shadow-sm">
                학습 품질 보증
              </div>
              <h4 className="text-[#002559] text-3xl font-bold leading-snug font-pretendard">
                정형화 된 템플릿 정보 불균형 해소
              </h4>
            </motion.div>
          </div>
        </section>

        {/* Process Section Header */}
        <section className="relative w-full h-[450px] flex items-center justify-center bg-[#002559] rounded-[40px] max-w-[1280px] mx-auto mb-32 overflow-hidden shadow-2xl">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute inset-0"
          >
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[100%] bg-blue-400 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[100%] bg-indigo-400 rounded-full blur-[120px]" />
          </motion.div>
          <motion.h3 
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center z-10 px-6"
          >
            <span className="text-white text-5xl sm:text-7xl font-bold leading-tight font-pretendard block mb-4">학습 코칭은</span>
            <span className="text-blue-200 text-5xl sm:text-7xl font-bold leading-tight font-pretendard block">이렇게 진행됩니다!</span>
          </motion.h3>
        </section>

        {/* Steps */}
        <section className="max-w-[1280px] mx-auto px-6 space-y-32 mb-40">
          {[
            { step: 'Step 1', title: '학습 설계', desc: '현재 학습 상태를 점검하고, 목표에 맞는 구체적인 공부 방법과 일정을 설계합니다.', side: 'left' },
            { step: 'Step 2', title: '매일 학습 실행', desc: '자체 학습지와 플래너를 중심으로 하루 단위 과제를 수행합니다. 멘토는 기록을 확인하며 실시간 피드백을 제공합니다.', side: 'right' },
            { step: 'Step 3', title: '지속적인 점검', desc: '주기적인 학습 점검을 통해 방향을 함께 조정합니다. 질의응답과 상시 소통으로 막히는 부분 없이 공부를 이어갑니다.', side: 'left' },
            { step: 'Step 4', title: '정기 리포트 공유', desc: '학습 성과를 분석한 정기 리포트를 통해 성취도를 확인하고 다음 목표를 수립합니다.', side: 'right' }
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
              variants={item.side === 'left' ? slideInLeft : slideInRight}
              className={`flex flex-col relative ${item.side === 'right' ? 'items-end text-right' : 'items-start text-left'}`}
            >
              <motion.span 
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                className="text-[#002559] text-2xl font-bold mb-4 font-pretendard"
              >
                {item.step}
              </motion.span>
              <div className="flex items-center gap-6 mb-8 group">
                {item.side === 'right' && (
                  <>
                    <motion.div 
                      whileInView={{ rotate: 360 }} 
                      className="w-10 h-10 bg-[#002559] rounded-xl shadow-lg flex items-center justify-center"
                    >
                      <BsArrowUpLeft className="text-xl text-white group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </motion.div>
                  </>
                )}
                <h4 className="text-zinc-900 text-5xl sm:text-6xl font-bold leading-tight font-pretendard group-hover:text-[#002559] transition-colors">
                  {item.title}
                </h4>
                {item.side === 'left' && (
                  <>
                    <motion.div 
                      whileInView={{ rotate: 360 }} 
                      className="w-10 h-10 bg-[#002559] rounded-xl shadow-lg flex items-center justify-center"
                    >
                      <BsArrowUpRight className="text-xl text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </motion.div>
                  </>
                )}
              </div>
              <p className="max-w-2xl text-gray-500 text-2xl font-medium leading-relaxed font-pretendard">
                {item.desc}
              </p>
              <motion.div 
                initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }}
                className="w-full h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent mt-20" 
              />
            </motion.div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#C5EAFF] pt-24 pb-12 text-[#002559] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#002559]/10 to-transparent" />
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-20">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <Image 
                  src="/logo.svg" 
                  alt="설스터디" 
                  width={32} 
                  height={32} 
                  style={{ width: '32px', height: 'auto' }}
                />
                <span className="text-3xl font-bold font-scoredream tracking-tight text-[#002559]">설스터디</span>
              </div>
              <p className="text-[#002559]/70 text-lg leading-relaxed max-w-xs font-pretendard font-medium">
                서울대생 멘토와 함께하는<br/>국내 최고의 밀착 학습 코칭 서비스
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-16 sm:gap-24">
              <div className="flex flex-col gap-6 font-pretendard">
                <span className="text-xl font-bold text-[#002559]">서비스</span>
                <div className="flex flex-col gap-4 text-[#002559]/60 text-base font-medium">
                  <span className="hover:text-[#002559] cursor-pointer transition-colors">멘토링 찾기</span>
                  <span className="hover:text-[#002559] cursor-pointer transition-colors">이용 안내</span>
                  <span className="hover:text-[#002559] cursor-pointer transition-colors">성공 사례</span>
                </div>
              </div>
              <div className="flex flex-col gap-6 font-pretendard">
                <span className="text-xl font-bold text-[#002559]">고객지원</span>
                <div className="flex flex-col gap-4 text-[#002559]/60 text-base font-medium">
                  <span className="hover:text-[#002559] cursor-pointer transition-colors">자주 묻는 질문</span>
                  <span className="hover:text-[#002559] cursor-pointer transition-colors">문의하기</span>
                  <span className="hover:text-[#002559] cursor-pointer transition-colors">공지사항</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#002559]/10 pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-wrap justify-center gap-6 text-[#002559]/50 text-base font-bold font-pretendard">
              <span className="hover:text-[#002559] cursor-pointer">회사소개</span>
              <span className="hover:text-[#002559] cursor-pointer">인재채용</span>
              <span className="hover:text-[#002559] cursor-pointer">이용약관</span>
              <span className="hover:text-[#002559] cursor-pointer underline decoration-[#002559]/20 underline-offset-4">개인정보처리방침</span>
              <span className="hover:text-[#002559] cursor-pointer">고객센터</span>
            </div>
            <div className="text-[#002559]/40 text-base font-medium font-pretendard">
              © 2026 SeolStudy Inc. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Button */}
      <motion.button 
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1, y: -5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => window.open('https://forms.gle/FchKdDcm23JdGHpK9', '_blank')} 
        className="fixed right-8 bottom-12 w-16 h-16 bg-[#002559] text-white rounded-2xl shadow-2xl flex items-center justify-center z-50 transition-all active:scale-95 group"
      >
        <AiFillMessage className="text-3xl group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-12 right-0 bg-white text-[#002559] px-4 py-2 rounded-xl text-sm font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          무료 상담 신청하기
        </div>
      </motion.button>
    </div>
  );
}