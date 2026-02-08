'use client';

import Image from 'next/image';
import { useMemo, useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiUrl } from '@/lib/api';

import { RiUserFill } from 'react-icons/ri';
import { FaBook } from 'react-icons/fa';
import { GiGraduateCap } from 'react-icons/gi';
import { PiPushPinDuotone } from 'react-icons/pi';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { SUBJECT_LABELS, getSubjectLabel, getSubjectBadgeColor } from '@/constants/subjects';
import { getTaskStatusInfo } from '@/constants/taskStatus';
import { motion, AnimatePresence } from 'framer-motion';
import { Z_INDEX } from '@/constants/zIndex';

interface Mentee {
  id: string;
  name: string;
  email: string;
  grade?: string;
  profileImage?: string;
  totalTasks: number;
  completedTasks: number;
  gender?: string;
  track?: string;
  school?: string;
}

type SubjectFilter = 'KOREAN' | 'ENGLISH' | 'MATH' | 'OTHER' | 'FEEDBACK';
const SUBJECT_FILTERS: SubjectFilter[] = ['KOREAN', 'ENGLISH', 'MATH', 'OTHER', 'FEEDBACK'];
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

// 파스텔톤 색상 정의
const COLORS = {
  KOREAN: '#FFA6CE',
  ENGLISH: '#F9CA42',
  MATH: '#B4D6FF',
  OTHER: '#A28FFF',
  FEEDBACK: '#9AF2BF',
};

type BarData = { id: string; type: string; title: string; isFeedback?: boolean };
type DayCell = { key: string; day: number; inMonth: boolean; bars: BarData[] };

function buildMonthCells(year: number, month1to12: number, tasksByDate: Record<string, any[]>, feedbacksByDate: Record<string, any>) {
  const first = new Date(year, month1to12 - 1, 1);
  const last = new Date(year, month1to12, 0);
  const daysInMonth = last.getDate();

  // 월요일 시작으로 변경: (0:일, 1:월 ...) -> (0:월, 1:화 ... 6:일)
  const firstDow = (first.getDay() + 6) % 7;
  const total = 42;

  const cells: DayCell[] = [];
  for (let i = 0; i < total; i++) {
    const dayNum = i - firstDow + 1;
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
    
    let key = '';
    if (inMonth) {
      key = `${year}-${String(month1to12).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    }

    const dayTasks = inMonth ? (tasksByDate[key] || []) : [];
    const bars: BarData[] = [];

    const daySubjectTypes = new Set<string>();
    
    // 일일 피드백 확인 (백엔드에서 내려준 날짜 키값과 맞춰야함)
    const hasDailyFeedback = inMonth && feedbacksByDate && feedbacksByDate[key];

    dayTasks.forEach(task => {
      const isMainSubject = task.subject === 'KOREAN' || task.subject === 'ENGLISH' || task.subject === 'MATH';
      const subjectType = isMainSubject ? task.subject : 'OTHER';
      daySubjectTypes.add(subjectType);
    });

    // 정해진 순서대로 바 추가
    if (daySubjectTypes.has('KOREAN')) bars.push({ id: `${key}-ko`, type: 'KOREAN', title: '국어' });
    if (daySubjectTypes.has('ENGLISH')) bars.push({ id: `${key}-en`, type: 'ENGLISH', title: '영어' });
    if (daySubjectTypes.has('MATH')) bars.push({ id: `${key}-ma`, type: 'MATH', title: '수학' });
    if (daySubjectTypes.has('OTHER')) bars.push({ id: `${key}-ot`, type: 'OTHER', title: '기타' });
    if (hasDailyFeedback) bars.push({ id: `${key}-fb`, type: 'FEEDBACK', title: '일일 피드백', isFeedback: true });

    cells.push({
      key,
      day: inMonth ? dayNum : dayNum < 1 ? new Date(year, month1to12 - 1, 0).getDate() + dayNum : dayNum - daysInMonth,
      inMonth,
      bars,
    });
  }
  return cells;
}

export default function MentorCalendarPage() {
  return (
    <Suspense>
      <MentorCalendarContent />
    </Suspense>
  );
}

function MentorCalendarContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const menteeId = sp.get('menteeId');

  const [mentee, setMentee] = useState<Mentee | null>(null);
  const [tasksByDate, setTasksByDate] = useState<Record<string, any[]>>({});
  const [feedbacksByDate, setFeedbacksByDate] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isTasksLoading, setIsTasksLoading] = useState(false);

  // 상세 보기 상태
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDateKey, setSheetDateKey] = useState<string | null>(null);

  const [{ year, month }, setYm] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const [activeFilters, setActiveFilters] = useState<Record<SubjectFilter, boolean>>({
    KOREAN: true,
    ENGLISH: true,
    MATH: true,
    OTHER: true,
    FEEDBACK: true,
  });

  function toggleFilter(f: SubjectFilter) {
    setActiveFilters((prev) => ({ ...prev, [f]: !prev[f] }));
  }

  function moveMonth(delta: number) {
    setYm((prev) => {
      let y = prev.year;
      let m = prev.month + delta;

      if (m < 1) {
        y -= 1;
        m = 12;
      } else if (m > 12) {
        y += 1;
        m = 1;
      }

      return { year: y, month: m };
    });
  }

  const FILTER_STYLE: Record<SubjectFilter, { bg: string; dot: string; label: string }> = {
    KOREAN: { bg: "#FFE1EC", dot: "#FFA6CE", label: '국어' },
    ENGLISH: { bg: "#FFECC1", dot: "#F9CA42", label: '영어' },
    MATH: { bg: "#DCEEFF", dot: "#B4D6FF", label: '수학' },
    OTHER: { bg: "#E6DDFF", dot: "#A28FFF", label: '기타' },
    FEEDBACK: { bg: "#DDFBEA", dot: "#9AF2BF", label: '피드백' },
  };

  const cells = useMemo(() => buildMonthCells(year, month, tasksByDate, feedbacksByDate), [year, month, tasksByDate, feedbacksByDate]);

  const fetchMonthlyData = async (y: number, m: number) => {
    if (!menteeId) return;
    
    setIsTasksLoading(true);
    try {
      const token = localStorage.getItem('token');
      // 백엔드 routes/mentor.ts의 /api/mentor/mentees/:id/planner/monthly 엔포인트는 tasksByDate를 반환함
      // 일일 피드백 데이터는 별도로 가져와야 하거나 백엔드 수정이 필요할 수 있음
      // 우선 tasksByDate와 함께 일일 피드백이 있는지 확인하기 위해 개별 날짜별로 체크하는 대신
      // 백엔드에서 멘티의 일일 피드백 목록을 가져오는 API가 있다면 그것을 활용
      const plannerRes = await fetch(`${getApiUrl()}/api/mentor/mentees/${menteeId}/planner/monthly?year=${y}&month=${m}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (plannerRes.ok) {
        const data = await plannerRes.json();
        setTasksByDate(data.tasksByDate || {});
        setFeedbacksByDate(data.feedbacksByDate || {});
      }

      // 일일 피드백 매핑 데이터를 만들기 위해 (상세보기 시점에 가져오기로 변경하거나, 미리 가져오기)
      // 여기서는 일단 tasks 내부에 feedbacks가 포함되어 있으므로 그것으로 과제별 피드백은 알 수 있음.
      // 사용자가 말하는 '일일 피드백'은 DailyFeedback 모델을 의미함.
    } catch (err) {
      console.error('Fetch monthly data error:', err);
    } finally {
      setIsTasksLoading(false);
    }
  };

  useEffect(() => {
    const fetchMentee = async () => {
      if (!menteeId) {
        setIsLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${getApiUrl()}/api/mentor/mentees/${menteeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          console.warn('멘티 정보를 불러오는데 실패했습니다:', res.status);
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        setMentee(data);
      } catch (err) {
        console.error('Fetch mentee error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMentee();
  }, [menteeId]);

  useEffect(() => {
    fetchMonthlyData(year, month);
  }, [year, month, menteeId]);

  // 특정 날짜의 일일 피드백 조회 함수
  const [currentDailyFeedback, setCurrentDailyFeedback] = useState<any>(null);
  const fetchDailyFeedback = async (date: string) => {
    if (!menteeId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentor/mentees/${menteeId}/daily-feedbacks?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentDailyFeedback(data);
        
        // 캘린더 점 표시를 위해 feedbacksByDate 업데이트
        if (data) {
          setFeedbacksByDate(prev => ({ ...prev, [date]: data }));
        }
      } else {
        setCurrentDailyFeedback(null);
      }
    } catch (err) {
      console.error('Fetch daily feedback error:', err);
      setCurrentDailyFeedback(null);
    }
  };

  if (isLoading) {
    return <div className="text-gray-500 p-10 text-center">로딩 중...</div>;
  }

  if (!mentee) {
    return <div className="text-gray-500 p-10 text-center">멘티 정보를 불러올 수 없습니다.</div>;
  }

  const progress = mentee.totalTasks > 0 ? Math.round((mentee.completedTasks / mentee.totalTasks) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1280px] font-['Pretendard']">
      <div className="grid grid-cols-[360px_1fr] gap-14">
        {/* Left: mentee profile */}
        <div className="pr-6 border-r border-gray-100">
          <button
            type="button"
            onClick={() => router.push('/mentor')}
            className="text-[12px] font-semibold text-gray-400 hover:underline"
          >
            ← 목록으로
          </button>

          <div className="mt-6 flex items-start gap-4">
            <div className="h-[76px] w-[76px] overflow-hidden rounded-full bg-gray-200">
              {mentee.profileImage ? (
                <img
                  src={mentee.profileImage}
                  alt="멘티 프로필"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gray-300" />
              )}
            </div>

            <div>
              <div className="flex items-end gap-2">
                <div className="text-[16px] font-bold text-gray-900">
                  {mentee.name}
                </div>
                <div className="text-[12px] text-gray-400">{mentee.gender || '성별 미설정'}</div>
              </div>

              <div className="mt-2 space-y-1 text-[12px] text-gray-500">
                <div className="flex items-center gap-2">
                  <RiUserFill className="text-[16px] text-gray-600" />
                  {mentee.grade || '학년 미설정'}
                </div>
                <div className="flex items-center gap-2">
                  <FaBook className="text-[15px] text-gray-600" />
                  {mentee.track || '트랙 미설정'}
                </div>
                <div className="flex items-center gap-2">
                  <GiGraduateCap className="text-[16px] text-gray-600" />
                  {mentee.school || '학교 미설정'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-gray-500">
              <PiPushPinDuotone className="text-[14px] text-gray-400 -scale-x-100" />
              학습 요약
            </div>

            <div className="mt-4 space-y-3 text-[12px] text-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-400">누적 완료</span>
                <span className="font-semibold text-gray-800">{mentee.completedTasks}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">평균 수행도</span>
                <span className="font-semibold text-[#0B2B5B]">{progress}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">최근 피드백</span>
                <span className="font-semibold text-gray-800">-</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: calendar */}
        <div className="pl-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1.5 rounded-full bg-blue-300" />
              <div className="text-[14px] font-bold text-gray-900">과제 관리</div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="h-8 rounded-lg bg-blue-100 px-3 text-[12px] font-semibold text-blue-700"
              >
                캘린더
              </button>
              <button
                type="button"
                onClick={() => router.push(`/mentor/tasks/new?menteeId=${menteeId}`)}
                className="h-8 rounded-lg border border-gray-200 px-3 text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
              >
                과제 등록
              </button>
              <button
                type="button"
                onClick={() => router.push(`/mentor/mentees/${menteeId}?openFeedback=true`)}
                className="h-8 rounded-lg border border-amber-200 bg-amber-50 px-3 text-[12px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
              >
                ✨ 데일리 피드백
              </button>
              <button
                type="button"
                onClick={() => router.push(`/mentor/mentees/${menteeId}`)}
                className="h-8 rounded-lg bg-gray-900 px-3 text-[12px] font-semibold text-white hover:bg-black transition-colors"
              >
                멘티 상세 관리
              </button>
            </div>
          </div>

          {/* 월 이동 + 과목 필터 */}
          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                aria-label="이전 달"
              >
                <IoChevronBack />
              </button>

              <div className="text-[24px] font-extrabold text-gray-900">
                {String(year)}.{String(month).padStart(2, '0')}
              </div>

              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                aria-label="다음 달"
              >
                <IoChevronForward />
              </button>
              
              {isTasksLoading && (
                <div className="ml-2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            <div className="flex items-center gap-2">
              {SUBJECT_FILTERS.map((f) => {
                const on = activeFilters[f];
                const style = FILTER_STYLE[f];

                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFilter(f)}
                    className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition"
                    style={{
                      backgroundColor: style.bg,
                      color: '#111827',
                      opacity: on ? 1 : 0.35,
                    }}
                  >
                    <span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: style.dot }} />
                    {style.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 요일 헤더 */}
          <div className="mt-4 grid grid-cols-7 gap-2">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="h-10 rounded-lg bg-[#0B2B5B] text-white grid place-items-center text-[12px] font-semibold"
              >
                {w}
              </div>
            ))}
          </div>

          {/* 캘린더 그리드 */}
          <div className="mt-2 grid grid-cols-7 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {cells.map((c, idx) => {
              const muted = c.inMonth ? 'text-gray-700' : 'text-gray-300';
              
              // 해당 날짜의 바 (필터 적용)
              const visibleBars = c.bars.filter(b => activeFilters[b.type as SubjectFilter]);

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (c.inMonth) {
                      setSheetDateKey(c.key);
                      fetchDailyFeedback(c.key);
                      setSheetOpen(true);
                    }
                  }}
                  disabled={!c.inMonth}
                  className={`h-[104px] border-r border-b border-gray-100 p-2 relative flex flex-col items-stretch transition-colors ${c.inMonth ? 'hover:bg-gray-50' : 'bg-gray-50/20'}`}
                  style={{
                    borderRightWidth: (idx + 1) % 7 === 0 ? 0 : 1,
                    borderBottomWidth: idx >= 35 ? 0 : 1,
                  }}
                >
                  <div className={`text-[12px] font-bold self-start mb-1.5 ${muted}`}>{c.day}</div>

                  {/* bars: 파스텔톤 막대 형태로 표시 */}
                  <div className="flex flex-col gap-1 px-0.5 overflow-hidden">
                    {visibleBars.slice(0, 5).map((bar) => (
                      <div
                        key={bar.id}
                        className="h-[6px] w-full rounded-sm opacity-90 shadow-sm"
                        style={{ backgroundColor: COLORS[bar.type as keyof typeof COLORS] }}
                      />
                    ))}
                    {visibleBars.length > 5 && (
                      <div className="text-[8px] text-gray-400 font-bold leading-none text-center mt-0.5">
                        +{visibleBars.length - 5}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="h-10" />
        </div>
      </div>

      {/* Day Detail Sheet */}
      <AnimatePresence>
        {sheetOpen && sheetDateKey && (
          <div className="fixed inset-0 flex items-end justify-center bg-black/40 p-0" style={{ zIndex: Z_INDEX.OVERLAY }}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
              className="absolute inset-0"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[500px] bg-white rounded-t-[40px] p-8 shadow-2xl relative z-10"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8 cursor-pointer hover:bg-gray-300 transition-colors" onClick={() => setSheetOpen(false)} />
              
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {Number(sheetDateKey.split('-')[1])}월 {Number(sheetDateKey.split('-')[2])}일 상세
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">{mentee.name} 학생의 학습 데이터</p>
                </div>
                <button onClick={() => setSheetOpen(false)} className="text-gray-400 text-3xl hover:text-gray-600 transition-colors">&times;</button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar pb-4">
                {/* 일일 전체 피드백 (DailyFeedback) */}
                {currentDailyFeedback ? (
                  <div className="bg-[#DDFBEA] rounded-[24px] p-6 border border-[#9AF2BF]/30 relative group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-sm bg-[#9AF2BF]" />
                        <span className="text-[13px] font-bold text-[#2D6A4F] uppercase tracking-wider">Daily Feedback</span>
                      </div>
                      <button 
                        onClick={() => router.push(`/mentor/mentees/${menteeId}?date=${sheetDateKey}&openFeedback=true`)}
                        className="text-xs font-bold text-[#2D6A4F] hover:underline"
                      >
                        수정하기
                      </button>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">{currentDailyFeedback.summary}</h4>
                    <p className="text-[14px] text-[#2D6A4F] leading-relaxed whitespace-pre-wrap">
                      {currentDailyFeedback.content}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-[24px] p-6 border border-dashed border-gray-200 text-center">
                    <p className="text-sm text-gray-400 font-medium">이 날짜의 일일 피드백이 없습니다.</p>
                    <button 
                      onClick={() => {
                        setSheetOpen(false);
                        router.push(`/mentor/mentees/${menteeId}?date=${sheetDateKey}&openFeedback=true`);
                      }}
                      className="mt-3 text-xs text-blue-500 font-bold hover:underline"
                    >
                      데일리 피드백 작성하기
                    </button>
                  </div>
                )}

                <div className="w-full h-px bg-gray-100 my-2" />

                {/* 과제 리스트 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-400 px-1">학습 과제 리스트</h3>
                  {(tasksByDate[sheetDateKey] || []).length === 0 ? (
                    <p className="text-center py-8 text-gray-400 text-sm">등록된 과제가 없습니다.</p>
                  ) : (
                    (tasksByDate[sheetDateKey] || []).map((task, idx) => {
                      const statusInfo = getTaskStatusInfo(task);
                      const isMainSubject = task.subject === 'KOREAN' || task.subject === 'ENGLISH' || task.subject === 'MATH';
                      const subjectType = isMainSubject ? task.subject : 'OTHER';

                      return (
                        <motion.div 
                          key={task.id} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => {
                            setSheetOpen(false);
                            router.push(`/mentor/tasks/${task.id}`);
                          }}
                          className="group flex items-center justify-between p-5 bg-gray-50 hover:bg-white hover:shadow-xl border border-transparent hover:border-blue-100 rounded-[24px] transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div 
                              className="w-3 h-3 rounded-sm shadow-sm group-hover:scale-125 transition-transform" 
                              style={{ backgroundColor: COLORS[subjectType as keyof typeof COLORS] }}
                            />
                            <div>
                              <div className="text-[15px] font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{task.title}</div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                  {getSubjectLabel(task.subject)}
                                </span>
                                <span className="text-[10px] text-gray-200">|</span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusInfo.style}`}>
                                  {statusInfo.label}
                                </span>
                                {!task.isFixed && <span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-md">자체과제</span>}
                              </div>
                            </div>
                          </div>
                          <IoChevronForward className="text-gray-300 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-8 flex gap-3 pb-4">
                <button 
                  onClick={() => setSheetOpen(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-colors"
                >
                  닫기
                </button>
                <button 
                  onClick={() => {
                    setSheetOpen(false);
                    router.push(`/mentor/tasks/new?menteeId=${menteeId}&date=${sheetDateKey}`);
                  }}
                  className="flex-[1.5] py-4 bg-[#0B2B5B] text-white rounded-2xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all active:scale-95"
                >
                  이 날짜에 과제 추가
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E0;
        }
      `}</style>
    </div>
  );
}