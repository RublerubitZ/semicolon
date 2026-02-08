'use client';

import { getApiUrl } from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FaBell } from "react-icons/fa";
import { IoIosArrowDown } from "react-icons/io";
import { motion, AnimatePresence } from 'framer-motion';
import { SUBJECT_LABELS, DEFAULT_SUBJECT_VALUES } from '@/constants/subjects';
import { getTaskStatusInfo } from '@/constants/taskStatus';
import { Z_INDEX } from '@/constants/zIndex';

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

const SUBJECT_CONFIG: Record<string, { bg: string; dot: string; label: string }> = {
  KOREAN: { bg: "#FFE1EC", dot: "#FFA6CE", label: '국어' },
  ENGLISH: { bg: "#FFECC1", dot: "#F9CA42", label: '영어' },
  MATH: { bg: "#DCEEFF", dot: "#B4D6FF", label: '수학' },
  OTHER: { bg: "#E6DDFF", dot: "#A28FFF", label: '기타' },
  FEEDBACK: { bg: "#DDFBEA", dot: "#9AF2BF", label: '피드백' },
};

interface Task {
  id: string;
  title: string;
  subject: string;
  isCompleted: boolean;
  isFixed: boolean;
  submissions: any[];
  date: string;
  feedbacks?: any[];
}

interface MonthlyData {
  tasksByDate: Record<string, Task[]>;
  feedbacksByDate: Record<string, any>;
  year: number;
  month: number;
}

type MonthCell = {
  key: string; // YYYY-MM-DD
  year: number;
  month: number;
  day: number;
  inMonth: boolean;
};

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function buildMonthGrid(year: number, month1to12: number): MonthCell[] {
  const first = new Date(year, month1to12 - 1, 1);
  const last = new Date(year, month1to12, 0);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const prevLast = new Date(year, month1to12 - 1, 0).getDate();

  const cells: MonthCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - offset + 1;
    let y = year, m = month1to12, d = dayNum, inMonth = true;

    if (dayNum < 1) {
      inMonth = false;
      m = month1to12 - 1;
      if (m === 0) { m = 12; y = year - 1; }
      d = prevLast + dayNum;
    } else if (dayNum > daysInMonth) {
      inMonth = false;
      m = month1to12 + 1;
      if (m === 13) { m = 1; y = year + 1; }
      d = dayNum - daysInMonth;
    }
    cells.push({ key: toDateStr(y, m, d), year: y, month: m, day: d, inMonth });
  }
  return cells;
}

export default function CalendarPage() {
  const router = useRouter();
  const today = new Date();
  const todayKey = useMemo(() => toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate()), []);

  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [cache, setCache] = useState<Record<string, MonthlyData>>({});
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selected, setSelected] = useState(todayKey);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [visibleSubjects, setVisibleSubjects] = useState<Set<string>>(new Set(['KOREAN', 'ENGLISH', 'MATH', 'OTHER', 'FEEDBACK']));

  // Picker states
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftYear, setDraftYear] = useState(year);
  const [draftMonth, setDraftMonth] = useState(month);

  // Day Sheet states
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDateKey, setSheetDateKey] = useState<string | null>(null);

  const toggleSubject = (s: string) => {
    const next = new Set(visibleSubjects);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setVisibleSubjects(next);
  };

  const fetchMonthlyData = async (y: number, m: number) => {
    const cacheKey = `${y}-${m}`;
    
    if (cache[cacheKey]) {
      setMonthlyData(cache[cacheKey]);
      setIsLoading(false);
    } else {
      setMonthlyData(null);
      setIsLoading(true);
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentee/planner/monthly?year=${y}&month=${m}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMonthlyData(data);
        setCache(prev => ({ ...prev, [cacheKey]: data }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getCompletionRate = (tasks: Task[]) => {
    const mentorTasks = tasks.filter(t => t.isFixed);
    if (mentorTasks.length === 0) return 0;
    const completed = mentorTasks.filter(t => t.submissions && t.submissions.length > 0).length;
    return Math.round((completed / mentorTasks.length) * 100);
  };

  useEffect(() => {
    fetchMonthlyData(year, month);
  }, [year, month]);

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const getTasksForDate = (dateKey: string) => {
    if (!monthlyData || monthlyData.year !== year || monthlyData.month !== month) return [];
    return monthlyData.tasksByDate?.[dateKey] || [];
  };

  const getDailyFeedbackForDate = (dateKey: string) => {
    if (!monthlyData || monthlyData.year !== year || monthlyData.month !== month) return undefined;
    return monthlyData.feedbacksByDate?.[dateKey];
  };

  const applyPicker = () => {
    setYear(draftYear);
    setMonth(draftMonth);
    setPickerOpen(false);
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      handleNextMonth();
    } else if (info.offset.x > threshold) {
      handlePrevMonth();
    }
  };

  return (
    <div className="flex justify-center p-4 pb-24 font-['Pretendard']">
      <div className="w-full max-w-[390px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[18px] font-bold text-gray-900">캘린더</h1>
        </div>

        {/* Date Selector */}
        <button
          onClick={() => { setDraftYear(year); setDraftMonth(month); setPickerOpen(true); }}
          className="inline-flex items-center gap-1 text-[15px] font-bold text-gray-800"
        >
          <span>{year}년 {month}월</span>
          <IoIosArrowDown className="text-gray-500" />
        </button>

        {/* Legend / Toggles */}
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(SUBJECT_CONFIG).map(([key, config]) => {
            const isActive = visibleSubjects.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleSubject(key)}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-all ${
                  isActive ? "" : "opacity-30 grayscale grayscale-[50%]"
                }`}
                style={{ backgroundColor: config.bg, color: "#1A1A1A" }}
              >
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: config.dot }} />
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Swipeable Calendar Area */}
        <motion.div
          key={`${year}-${month}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="touch-pan-y"
        >
          {/* Weekdays */}
          <div className="mt-8 grid grid-cols-7 text-center text-[12px] font-bold text-gray-400">
            {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {grid.map((cell) => {
              const isSelected = cell.key === selected;
              const isToday = cell.key === todayKey;
              const isFuture = cell.key > todayKey;
              
              const tasks = getTasksForDate(cell.key);
              const mentorTasks = tasks.filter(t => t.isFixed);
              const dailyFeedback = getDailyFeedbackForDate(cell.key);
              const rate = getCompletionRate(tasks);

              // Unique subjects for dots (all tasks)
              const displaySubjects = Array.from(new Set(tasks.map(t => {
                const s = t.subject;
                return (s === 'KOREAN' || s === 'ENGLISH' || s === 'MATH') ? s : 'OTHER';
              }))).filter(s => visibleSubjects.has(s));

              const showFeedbackDot = dailyFeedback && visibleSubjects.has('FEEDBACK');

              return (
                <button
                  key={cell.key}
                  disabled={isFuture}
                  onClick={() => {
                    setSelected(cell.key);
                    setSheetDateKey(cell.key);
                    setSheetOpen(true);
                  }}
                  className={`h-[84px] flex flex-col items-center justify-start pt-1 relative ${isFuture ? 'opacity-40 cursor-default' : ''}`}
                >
                  <div className="relative">
                    <div className={`
                      w-8 h-8 rounded-full grid place-items-center text-[14px] font-bold transition-all
                      ${!cell.inMonth ? "text-gray-300" : "text-gray-900"}
                      ${isSelected ? "bg-[#00265A] text-white shadow-md" : isToday ? "bg-blue-50 text-blue-600" : ""}
                    `}>
                      {cell.day}
                    </div>
                    {/* Feedback Indicator: Top Right Green Dot */}
                    {dailyFeedback && visibleSubjects.has('FEEDBACK') && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#9AF2BF] rounded-full border border-white shadow-sm"
                      />
                    )}
                  </div>

                  {/* Status Squares & Progress */}
                  {!isFuture && (
                    <div className="mt-1.5 h-2 w-full flex justify-center items-center overflow-hidden">
                      <AnimatePresence mode="wait">
                        {isLoading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex gap-0.5 justify-center"
                          >
                            {[1, 2].map((i) => (
                              <motion.span
                                key={i}
                                animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.9, 1.1, 0.9] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                className="w-1.5 h-1.5 rounded-[1px] bg-gray-200"
                              />
                            ))}
                          </motion.div>
                        ) : (
                          <motion.div
                            key="dots"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex gap-0.5 justify-center flex-wrap px-1"
                          >
                            {displaySubjects.map((subject) => (
                              <motion.span
                                key={subject}
                                layoutId={`${cell.key}-${subject}`}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-2 h-2 rounded-[1px]"
                                style={{ backgroundColor: SUBJECT_CONFIG[subject]?.dot }}
                              />
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <div className="mt-1.5 text-[9px] font-bold h-3">
                    {!isFuture && !isLoading && mentorTasks.length > 0 && (
                      <>
                        {rate === 100 ? (
                          <span className="text-blue-600">완료</span>
                        ) : isToday ? (
                          <span className="text-orange-500">진행중</span>
                        ) : (
                          <span className="text-gray-400">{rate}%</span>
                        )}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Picker and Sheet Modals (Same logic but updated colors if needed) */}
        <AnimatePresence>
          {pickerOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPickerOpen(false)}
              className="fixed inset-0 flex items-end justify-center bg-black/40"
              style={{ zIndex: Z_INDEX.OVERLAY }}
            >
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[390px] bg-white rounded-t-3xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold">날짜 이동</h2>
                  <button onClick={() => setPickerOpen(false)} className="text-gray-400 text-2xl">&times;</button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 px-1">년도</label>
                    <select 
                      value={draftYear} 
                      onChange={(e) => setDraftYear(Number(e.target.value))}
                      className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold text-sm"
                    >
                      {Array.from({ length: 10 }, (_, i) => today.getFullYear() - 5 + i).map(y => <option key={y} value={y}>{y}년</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 px-1">월</label>
                    <select 
                      value={draftMonth} 
                      onChange={(e) => setDraftMonth(Number(e.target.value))}
                      className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold text-sm"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={applyPicker} className="w-full py-4 bg-[#00265A] text-white rounded-2xl font-bold shadow-lg shadow-blue-900/20">이동하기</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {sheetOpen && sheetDateKey && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
              className="fixed inset-0 flex items-end justify-center bg-black/40"
              style={{ zIndex: Z_INDEX.OVERLAY }}
            >
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[390px] bg-white rounded-t-3xl p-6"
              >
                <div 
                  onClick={() => setSheetOpen(false)}
                  className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 cursor-pointer hover:bg-gray-300 transition-colors" 
                />
                <div className="flex items-center justify-between mb-6">
                  <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-gray-900">{Number(sheetDateKey.split('-')[1])}월 {Number(sheetDateKey.split('-')[2])}일 상세</h2>
                    {sheetDateKey === todayKey && (
                      <span className="text-sm font-bold text-blue-600">오늘 진행률 {getCompletionRate(getTasksForDate(sheetDateKey))}%</span>
                    )}
                  </div>
                  <button onClick={() => setSheetOpen(false)} className="text-gray-400 text-2xl">&times;</button>
                </div>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                  {getDailyFeedbackForDate(sheetDateKey) === undefined && getTasksForDate(sheetDateKey).length === 0 ? (
                    <div className="py-12 text-center text-gray-400">
                      <p className="text-sm font-medium">등록된 데이터가 없습니다.</p>
                    </div>
                  ) : (
                    <>
                      {getDailyFeedbackForDate(sheetDateKey) && (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 }}
                          className="p-4 rounded-xl flex items-start gap-3"
                          style={{ backgroundColor: SUBJECT_CONFIG.FEEDBACK.bg, border: `1px solid ${SUBJECT_CONFIG.FEEDBACK.dot}20` }}
                        >
                          <div className="w-3 h-3 rounded-sm mt-1 shrink-0" style={{ backgroundColor: SUBJECT_CONFIG.FEEDBACK.dot }} />
                          <div>
                            <div className="text-[14px] font-bold text-slate-800">데일리 피드백</div>
                            <div className="text-[12px] text-slate-600 mt-1">{getDailyFeedbackForDate(sheetDateKey).content}</div>
                          </div>
                        </motion.div>
                      )}
                      {getTasksForDate(sheetDateKey).map((task, idx) => {
                        const s = (task.subject === 'KOREAN' || task.subject === 'ENGLISH' || task.subject === 'MATH') ? task.subject : 'OTHER';
                        const config = SUBJECT_CONFIG[s];
                        return (
                          <motion.div 
                            key={task.id} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + idx * 0.05 }}
                            onClick={() => { setSheetOpen(false); router.push(`/mentee/tasks/${task.id}`); }}
                            className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <div className="w-3 h-3 rounded-sm mt-1 shrink-0" style={{ backgroundColor: config.dot }} />
                            <div>
                              <div className="text-[14px] font-bold text-gray-900">{task.title}</div>
                              <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span>{SUBJECT_LABELS[task.subject as keyof typeof SUBJECT_LABELS] || task.subject}</span>
                                <span className="text-[8px] text-gray-300">•</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${getTaskStatusInfo(task).style}`}>
                                  {getTaskStatusInfo(task).label}
                                </span>
                                {!task.isFixed && <span className="text-[9px] text-gray-400 font-normal">(자체과제)</span>}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}