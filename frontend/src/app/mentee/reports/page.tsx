'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { MdTrendingUp, MdTrendingDown, MdOutlineDataUsage } from 'react-icons/md';
import { HiOutlineChartBarSquare } from 'react-icons/hi2';
import { motion, AnimatePresence } from 'framer-motion';

import { toYYYYMMDD, addDays } from '@/lib/dateUtils';
import { DEFAULT_SUBJECTS } from '@/constants/subjects';
import { useWeeklyReportData, useMonthlyReportData, useWeeklyFeedback, useMonthlyFeedback, useDetailedWeeklyReport } from '@/lib/queries/use-reports';
import { useHeatmap, useWeeklyRanking } from '@/lib/queries/use-stats';
import Heatmap, { HeatmapData } from '@/components/heatmap/Heatmap';
import WeeklyRanking, { WeeklyRankingItem } from '@/components/ranking/WeeklyRanking';
import StudyPatternCard from '@/components/reports/StudyPatternCard';
import ReportPDFButton from '@/components/reports/ReportPDFButton';
import HtmlContent from '@/components/HtmlContent';

// Interfaces
interface StudyLog {
  duration: number;
}

interface Task {
  id: string;
  subject: string;
  isFixed: boolean;
  date: string;
  submissions: unknown[];
  studyLogs: StudyLog[];
}

interface SubjectData {
  subject: string;
  minutes: number;
  color: string;
}

interface PeriodData {
  totalTasks: number;
  completedTasks: number;
  dailyData: { day: string; minutes: number; date?: string }[];
  subjectData: SubjectData[];
  previousAverage: number;
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

const formatMinutesToTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
};

const formatMinutesToHours = (minutes: number) => {
  return `${Math.floor(minutes / 60)}시간`;
};

// 주의 시작일(월요일) 계산
function getWeekStart(date: Date): Date {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(date, mondayOffset);
}

export default function ReportsPage() {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedHeatmapYear, setSelectedHeatmapYear] = useState(new Date().getFullYear());
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [hoveredBar, setHoveredBar] = useState<{ day: string; minutes: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));
  }, []);

  // --- 날짜 계산 ---
  const startOfWeek = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const prevStartOfWeek = useMemo(() => addDays(startOfWeek, -7), [startOfWeek]);
  const weekYear = startOfWeek.getFullYear();
  const weekMonth = startOfWeek.getMonth() + 1;
  const weekNumber = Math.ceil((startOfWeek.getDate() + new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), 1).getDay()) / 7);
  const monthYear = currentDate.getFullYear();
  const monthNum = currentDate.getMonth() + 1;

  // --- React Query 훅 ---
  const weeklyReport = useWeeklyReportData(toYYYYMMDD(startOfWeek), toYYYYMMDD(prevStartOfWeek));
  const monthlyReport = useMonthlyReportData(monthYear, monthNum);
  const weeklyFeedbackQuery = useWeeklyFeedback(weekYear, weekMonth, weekNumber);
  const monthlyFeedbackQuery = useMonthlyFeedback(monthYear, monthNum);
  const heatmapQuery = useHeatmap(selectedHeatmapYear);
  const rankingQuery = useWeeklyRanking();
  const detailedWeeklyReport = useDetailedWeeklyReport(tab === 'weekly' ? toYYYYMMDD(startOfWeek) : '');

  const isLoading = tab === 'weekly' ? weeklyReport.isLoading : monthlyReport.isLoading;

  // --- 주간 데이터 가공 ---
  const weeklyData: PeriodData | null = useMemo(() => {
    if (!weeklyReport.currentData || !weeklyReport.prevData) return null;

    const prevTasks: Task[] = weeklyReport.prevData.tasks;
    const prevTotalMinutes = prevTasks.reduce((sum, task) =>
      sum + task.studyLogs.reduce((s, log) => s + log.duration, 0), 0
    );
    const prevAverage = Math.round(prevTotalMinutes / 7);

    const tasks: Task[] = weeklyReport.currentData.tasks;
    const dailyStats: Record<string, number> = {};
    const subjectStats: Record<string, number> = {};
    let totalTasks = 0;
    let completedTasks = 0;

    for (let i = 0; i < 7; i++) {
      dailyStats[toYYYYMMDD(addDays(startOfWeek, i))] = 0;
    }

    tasks.forEach(task => {
      const dateKey = toYYYYMMDD(task.date);
      const duration = task.studyLogs.reduce((sum, log) => sum + log.duration, 0);
      if (dailyStats[dateKey] !== undefined) dailyStats[dateKey] += duration;
      if (task.isFixed) {
        totalTasks++;
        if (task.submissions.length > 0) completedTasks++;
      }
      subjectStats[task.subject] = (subjectStats[task.subject] || 0) + duration;
    });

    return {
      totalTasks,
      completedTasks,
      dailyData: Object.entries(dailyStats).map(([date, minutes]) => ({
        date,
        day: DAYS[(new Date(date).getDay() + 6) % 7],
        minutes
      })).sort((a, b) => a.date!.localeCompare(b.date!)),
      subjectData: DEFAULT_SUBJECTS.map(s => ({
        subject: s.label,
        minutes: subjectStats[s.value] || 0,
        color: s.value === 'KOREAN' ? 'bg-pink-400' : s.value === 'ENGLISH' ? 'bg-yellow-400' : 'bg-blue-300'
      })),
      previousAverage: prevAverage,
    };
  }, [weeklyReport.currentData, weeklyReport.prevData, startOfWeek]);

  // --- 월간 데이터 가공 ---
  const monthlyData: PeriodData | null = useMemo(() => {
    if (!monthlyReport.currentData || !monthlyReport.prevData) return null;

    const prevStats = monthlyReport.prevData.stats;
    const prevAverage = Math.round(prevStats.totalStudyTime / 4);

    const { stats, tasksByDate } = monthlyReport.currentData;
    const weeklyMinutes: number[] = [0, 0, 0, 0, 0, 0];
    Object.entries(tasksByDate).forEach(([dateStr, tasks]: [string, unknown]) => {
      const date = new Date(dateStr);
      const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const weekIndex = Math.floor((date.getDate() + firstDayOfMonth.getDay() - 1) / 7);
      let dailyMinutes = 0;
      (tasks as Task[]).forEach((task) => {
        dailyMinutes += task.studyLogs.reduce((sum: number, log: StudyLog) => sum + log.duration, 0);
      });
      if (weekIndex < weeklyMinutes.length) weeklyMinutes[weekIndex] += dailyMinutes;
    });

    return {
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
      dailyData: weeklyMinutes
        .filter((min, idx) => idx < 5 || min > 0)
        .map((minutes, idx) => ({
          day: `${idx + 1}주차`,
          minutes
        })),
      subjectData: DEFAULT_SUBJECTS.map(s => ({
        subject: s.label,
        minutes: (stats.subjectStats[s.value]?.studyTime) || 0,
        color: s.value === 'KOREAN' ? 'bg-pink-400' : s.value === 'ENGLISH' ? 'bg-yellow-400' : 'bg-blue-300'
      })),
      previousAverage: prevAverage,
    };
  }, [monthlyReport.currentData, monthlyReport.prevData]);

  // --- 파생 데이터 ---
  const currentPeriodData = tab === 'weekly' ? weeklyData : monthlyData;
  const currentFeedback = tab === 'weekly' ? weeklyFeedbackQuery.data : monthlyFeedbackQuery.data;
  const isWeekly = tab === 'weekly';
  const heatmapData: HeatmapData[] = heatmapQuery.data?.data || [];
  const rankingData: WeeklyRankingItem[] = rankingQuery.data?.rankings || [];

  const totalMinutes = currentPeriodData?.subjectData.reduce((sum, s) => sum + s.minutes, 0) || 0;
  const completionRate = currentPeriodData?.totalTasks
    ? Math.round((currentPeriodData.completedTasks / currentPeriodData.totalTasks) * 100)
    : 0;

  const currentAverage = currentPeriodData?.dailyData.length
    ? Math.round(totalMinutes / currentPeriodData.dailyData.length)
    : 0;

  const previousAverage = currentPeriodData?.previousAverage || 0;
  const changeRate = previousAverage > 0
    ? Math.round(((currentAverage - previousAverage) / previousAverage) * 100)
    : 0;

  const maxValue = Math.max(...(currentPeriodData?.dailyData.map(d => d.minutes) || [60]), 60);
  const hasData = currentPeriodData && (totalMinutes > 0 || currentPeriodData.totalTasks > 0);

  // --- 핸들러 ---
  const handlePrev = () => {
    if (tab === 'weekly') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      const prevMonth = new Date(currentDate);
      prevMonth.setMonth(currentDate.getMonth() - 1);
      setCurrentDate(prevMonth);
    }
  };

  const handleNext = () => {
    if (tab === 'weekly') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(currentDate.getMonth() + 1);
      setCurrentDate(nextMonth);
    }
  };

  const getPeriodLabel = () => {
    if (isWeekly) {
      const monday = startOfWeek;
      const month = monday.getMonth() + 1;
      const weekOfMonth = Math.ceil((monday.getDate() + new Date(monday.getFullYear(), monday.getMonth(), 1).getDay()) / 7);
      return `${monday.getFullYear()}년 ${month}월 ${weekOfMonth}주차 리포트`;
    } else {
      return `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 종합 리포트`;
    }
  };

  const handleBarMouseEnter = (data: { day: string; minutes: number }, e: React.MouseEvent) => {
    setHoveredBar(data);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  return (
    <div ref={reportRef} className="min-h-screen bg-gray-50 p-4 pb-32 font-['Pretendard']">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">리포트</h1>
        <div className="flex gap-2">
          <ReportPDFButton
            targetRef={reportRef}
            fileName={tab === 'weekly'
              ? `설스터디_주간리포트_${toYYYYMMDD(startOfWeek)}`
              : `설스터디_월간리포트_${monthYear}년${monthNum}월`
            }
          />
          <button
            onClick={() => router.push('/mentee/reports/trends')}
            className="flex items-center gap-1 px-3 py-1.5 bg-white text-gray-600 text-xs font-bold rounded-xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-all active:scale-95"
          >
            <HiOutlineChartBarSquare className="w-3.5 h-3.5" />
            트렌드
          </button>
        </div>
      </div>

      {/* 주간/월간 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('weekly')}
          className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${
            tab === 'weekly'
              ? 'bg-[#B0D4FF] text-[#00265A] shadow-md'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          주간
        </button>
        <button
          onClick={() => setTab('monthly')}
          className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${
            tab === 'monthly'
              ? 'bg-[#B0D4FF] text-[#00265A] shadow-md'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          월간
        </button>
      </div>

      {/* 날짜 네비게이션 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrev}
          className="p-2 bg-white hover:bg-gray-50 rounded-xl shadow-sm border border-gray-100 transition-all active:scale-95"
        >
          <IoIosArrowBack className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-base font-bold text-gray-800 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-50">
          {getPeriodLabel()}
        </h2>
        <button
          onClick={handleNext}
          className="p-2 bg-white hover:bg-gray-50 rounded-xl shadow-sm border border-gray-100 transition-all active:scale-95"
        >
          <IoIosArrowForward className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-400 rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm animate-pulse">데이터를 분석하고 있어요...</p>
        </div>
      ) : !hasData ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 px-10 text-center"
        >
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-6">
            <MdOutlineDataUsage className="text-4xl text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">리포트 데이터가 없어요</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            해당 기간에는 기록된 학습 활동이 없습니다.<br/>
            다른 날짜를 선택하거나 공부를 시작해 보세요!
          </p>

          <div className="mt-10 w-full max-w-xs space-y-4">
            <div className="w-full h-1 bg-gray-100 rounded-full"></div>
            <div className="w-2/3 h-1 bg-gray-100 rounded-full mx-auto"></div>
          </div>

          <div className="mt-20 w-full">
             <div className="w-full h-px bg-gray-100 mb-10"></div>
             {tab === 'monthly' && (
               <div className="text-left">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <span className="text-base">🔥</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">학습 히트맵</h3>
                  </div>
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50">
                    <Heatmap data={heatmapData} year={selectedHeatmapYear} onYearChange={setSelectedHeatmapYear} />
                  </div>
               </div>
             )}

             {tab === 'weekly' && (
               <div className="text-left">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 bg-yellow-50 rounded-xl flex items-center justify-center">
                      <span className="text-base">🏆</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">이번 주 랭킹</h3>
                  </div>
                  <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-50">
                    <WeeklyRanking
                      rankings={rankingData}
                      myMenteeId={user?.id}
                      variant="plain"
                    />
                  </div>
               </div>
             )}
          </div>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab + currentDate.getTime()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {/* 통계 카드 */}
            <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-gray-50 flex items-center justify-around">
              <div className="text-center">
                <p className="text-xs text-gray-400 font-medium mb-1">총 학습 시간</p>
                <p className="text-2xl font-black text-gray-800">
                  {totalMinutes.toLocaleString()}
                  <span className="text-xs font-bold text-gray-400 ml-1">분</span>
                </p>
              </div>
              <div className="w-px h-10 bg-gray-100"></div>
              <div className="text-center">
                <p className="text-xs text-gray-400 font-medium mb-1">학습 완료율</p>
                <p className="text-2xl font-black text-gray-800">
                  {completionRate}
                  <span className="text-xs font-bold text-gray-400 ml-1">%</span>
                </p>
              </div>
            </div>

            {/* 평균 시간 카드 & 그래프 */}
            <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-gray-50">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">
                    {isWeekly ? '하루 평균 학습' : '주간 평균 학습'}
                  </p>
                  <h3 className="text-3xl font-black text-gray-800 tracking-tight">
                    {isWeekly
                      ? formatMinutesToTime(currentAverage)
                      : formatMinutesToHours(currentAverage)}
                  </h3>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl">
                  <div className={`w-8 h-8 ${changeRate >= 0 ? 'bg-red-500' : 'bg-blue-500'} text-white rounded-full flex items-center justify-center shadow-sm transition-colors`}>
                    {changeRate >= 0 ? <MdTrendingUp className="w-5 h-5" /> : <MdTrendingDown className="w-5 h-5" />}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-bold leading-none mb-1">
                      {isWeekly
                        ? (changeRate >= 0 ? '지난주 대비 상승' : '지난주 대비 하락')
                        : (changeRate >= 0 ? '지난달 대비 상승' : '지난달 대비 하락')
                      }
                    </p>
                    <p className={`text-sm font-black ${changeRate >= 0 ? 'text-red-500' : 'text-blue-500'} leading-none`}>
                      {changeRate >= 0 ? '+' : ''}{changeRate}%
                    </p>
                  </div>
                </div>
              </div>

              {/* 그래프 섹션 */}
              <div className="mt-8 flex gap-2">
                <div className="flex-1 relative h-48 border border-gray-100 rounded-2xl bg-gray-50/30 overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-full flex flex-col justify-between pointer-events-none px-2">
                    <div className="w-full border-t border-gray-100/50"></div>
                    <div className="w-full border-t border-gray-100/50"></div>
                    <div className="w-full border-t border-gray-100/50"></div>
                  </div>

                  <div className="h-full flex items-end justify-between gap-2 relative z-10 px-4">
                    {currentPeriodData?.dailyData.map((data, index) => {
                      const heightPercent = Math.max((data.minutes / maxValue) * 100, 5);
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPercent}%` }}
                            onMouseEnter={(e) => handleBarMouseEnter(data, e)}
                            onMouseLeave={() => setHoveredBar(null)}
                            className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 cursor-pointer ${
                              data.minutes === maxValue
                                ? 'bg-[#B0D4FF] shadow-md shadow-blue-200/50'
                                : 'bg-blue-100 group-hover:bg-blue-300'
                            }`}
                          ></motion.div>
                          <span className={`text-[9px] font-bold mt-1.5 ${
                            data.minutes === maxValue ? 'text-blue-600' : 'text-gray-400'
                          }`}>
                            {data.day}
                          </span>
                        </div>
                      );
                    })}

                    <div
                      className="absolute left-0 right-0 border-t-2 border-dashed border-blue-400/20 pointer-events-none transition-all duration-500"
                      style={{ bottom: `${(currentAverage / maxValue) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="w-8 relative h-48 flex flex-col justify-between py-1">
                  <div className="text-left">
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter block leading-none">
                      MAX
                    </span>
                    <span className="text-[9px] font-black text-gray-400 block">
                      {Math.ceil(maxValue / 60)}H
                    </span>
                  </div>

                  <div
                    className="absolute right-0 transition-all duration-500"
                    style={{ bottom: `calc(${(currentAverage / maxValue) * 100}% - 10px)` }}
                  >
                    <div className="bg-blue-50 text-blue-600 text-[8px] px-1.5 py-0.5 rounded-md font-black border border-blue-100 shadow-sm whitespace-nowrap">
                      AVG
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 과목별 공부 시간 */}
            <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-gray-50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-pink-50 rounded-xl flex items-center justify-center">
                    <span className="text-base">📝</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">과목별 학습 비중</h3>
                </div>
                <div className="bg-gray-50 px-3 py-1 rounded-full">
                  <p className="text-[11px] font-bold text-gray-500">
                    총 {Math.floor(totalMinutes / 60)}시간 {totalMinutes % 60}분
                  </p>
                </div>
              </div>

              <div className="flex h-10 rounded-2xl overflow-hidden mb-8 bg-gray-50 p-1">
                {currentPeriodData?.subjectData.some(s => s.minutes > 0) ? (
                  currentPeriodData.subjectData.map((subject, index) => {
                    const widthPercent = (subject.minutes / totalMinutes) * 100;
                    if (widthPercent === 0) return null;
                    return (
                      <motion.div
                        key={index}
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPercent}%` }}
                        className={`${subject.color} rounded-xl h-full transition-all border-2 border-white`}
                      ></motion.div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-300 font-bold">
                    기록된 데이터가 없습니다
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {currentPeriodData?.subjectData.map((subject, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-50 bg-gray-50/30">
                    <div className={`w-3 h-3 rounded-full ${subject.color}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">{subject.subject}</p>
                      <p className="text-[10px] font-medium text-gray-400">
                        {Math.floor(subject.minutes / 60)}시간 {subject.minutes % 60}분
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 학습 패턴 - 주간 탭에서만 표시 */}
            {tab === 'weekly' && detailedWeeklyReport.data?.studyPattern && (
              <div className="mb-10">
                <StudyPatternCard pattern={detailedWeeklyReport.data.studyPattern} />
              </div>
            )}

            {/* 멘토 리포트 섹션 */}
            {currentFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-gray-50"
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                    <span className="text-base">💬</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">멘토의 리포트</h3>
                </div>

                <div className="space-y-6">
                  <div className="bg-blue-50/30 rounded-2xl p-4 border border-blue-100/30">
                    <p className="text-[10px] font-black text-blue-500 mb-2 uppercase tracking-wider">Overall Comment</p>
                    <HtmlContent html={currentFeedback.overallComment} className="text-sm text-gray-700 leading-relaxed font-semibold" />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-green-50/30 rounded-2xl p-4 border border-green-100/30">
                      <p className="text-[10px] font-black text-green-600 mb-2 uppercase tracking-wider">Strengths</p>
                      <HtmlContent html={currentFeedback.strengths} className="text-sm text-gray-700 leading-relaxed font-semibold" />
                    </div>
                    <div className="bg-orange-50/30 rounded-2xl p-4 border border-orange-100/30">
                      <p className="text-[10px] font-black text-orange-600 mb-2 uppercase tracking-wider">Improvements</p>
                      <HtmlContent html={currentFeedback.improvements} className="text-sm text-gray-700 leading-relaxed font-semibold" />
                    </div>
                  </div>

                  <div className="bg-purple-50/30 rounded-2xl p-4 border border-purple-100/30">
                    <p className="text-[10px] font-black text-purple-600 mb-2 uppercase tracking-wider">
                      {isWeekly ? 'Next Week Goals' : 'Next Month Goals'}
                    </p>
                    <HtmlContent html={currentFeedback[isWeekly ? 'nextWeekGoals' : 'nextMonthGoals']} className="text-sm text-gray-700 leading-relaxed font-semibold" />
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-[12px] shadow-inner">
                        { currentFeedback.mentor?.profileImage ? (
                          <img
                            src={currentFeedback.mentor.profileImage}
                            alt="Mentor"
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : "👤" }
                      </div>
                      <span className="text-[11px] font-black text-gray-400">{currentFeedback.mentor?.name || '담당'} 멘토님</span>
                   </div>
                   <span className="text-[10px] font-bold text-gray-300 bg-gray-50 px-2 py-1 rounded-lg">
                     {new Date(currentFeedback.updatedAt).toLocaleDateString('ko-KR')}
                   </span>
                </div>
              </motion.div>
            )}

            <div className="w-full h-px bg-gray-100 mb-10"></div>

            {/* 히트맵 섹션 - 월간 리포트에서만 표시 */}
            {tab === 'monthly' && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <span className="text-base">🔥</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">학습 히트맵</h3>
                </div>
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50">
                  <Heatmap
                    data={heatmapData}
                    year={selectedHeatmapYear}
                    onYearChange={setSelectedHeatmapYear}
                  />
                </div>
              </div>
            )}

            {/* 랭킹 섹션 - 주간 리포트에서만 표시 */}
            {tab === 'weekly' && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-yellow-50 rounded-xl flex items-center justify-center">
                    <span className="text-base">🏆</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">이번 주 랭킹</h3>
                </div>
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-50">
                  <WeeklyRanking
                    rankings={rankingData}
                    myMenteeId={user?.id}
                    variant="plain"
                  />
                </div>
              </div>
            )}

            {/* 막대 그래프 툴팁 */}
            <AnimatePresence>
              {hoveredBar && (
                <motion.div
                  initial={{ opacity: 0, y: 10, x: -50 }}
                  animate={{ opacity: 1, y: 0, x: -50 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="fixed z-50 bg-slate-800 text-white px-3 py-2 rounded-xl shadow-xl text-xs font-bold pointer-events-none"
                  style={{
                    left: `${tooltipPos.x}px`,
                    top: `${tooltipPos.y}px`,
                    transform: 'translate(-50%, -100%)',
                  }}
                >
                  <div className="text-blue-300 text-[10px] mb-1">{hoveredBar.day}</div>
                  <div>{formatMinutesToTime(hoveredBar.minutes)}</div>
                  <div className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800"></div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
