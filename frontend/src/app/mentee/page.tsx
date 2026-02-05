'use client';
import { getApiUrl } from '@/lib/api';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { HiDotsVertical } from 'react-icons/hi';
import { MdOutlineFileDownload, MdInfoOutline } from 'react-icons/md';

import { PiPushPinFill } from "react-icons/pi";
import { PiPencilLineLight } from 'react-icons/pi';
import { LuDownload } from "react-icons/lu";
import { IoIosNotifications, IoIosArrowDown } from "react-icons/io";
import { RiUserFill } from "react-icons/ri";
import { motion, AnimatePresence } from 'framer-motion';

type SelfCheckStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'NOT_DONE';

interface Task {
  id: string;
  title: string;
  description?: string;
  subject: string;
  isCompleted: boolean;
  isFixed: boolean;
  date: string;
  selfCheck: SelfCheckStatus;
  selfCheckedAt?: string;
  isApproved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  worksheet?: {
    id: string;
    title: string;
    pdfUrl: string;
    type: 'PDF' | 'COLUMN';
  };
  submissions: any[];
  studyLogs: any[];
  feedbacks: any[];
  learningGoal?: {
    id: string;
    items: { id: string; title: string; isCompleted: boolean }[];
  };
}

interface PlannerData {
  tasks: Task[];
  date: string;
}

interface DashboardData {
  todayStats: {
    total: number;
    completed: number;
    progressRate: number;
  };
  yesterdayFeedbacks: {
    taskId: string;
    taskTitle: string;
    subject: string;
    feedback: {
      content: string;
      summary?: string;
      mentor: { name: string };
    };
  }[];
}

const DEFAULT_SUBJECTS = [
  { value: 'KOREAN', label: '국어', color: 'bg-pink-100 outline-pink-300/50', textColor: 'text-gray-900' },
  { value: 'ENGLISH', label: '영어', color: 'bg-amber-100 outline-amber-300/30', textColor: 'text-gray-900' },
  { value: 'MATH', label: '수학', color: 'bg-blue-200/60 outline-blue-200', textColor: 'text-black' },
];

const getSubjectStyles = (subject: string) => {
  const found = DEFAULT_SUBJECTS.find((s) => s.value === subject);
  if (found) return `${found.color} ${found.textColor}`;
  return 'bg-gray-100 outline-gray-200 text-gray-700';
};

const getSubjectLabel = (subject: string) => {
  const found = DEFAULT_SUBJECTS.find((s) => s.value === subject);
  return found ? found.label : subject;
};

/** Calendar Grid Builder Helper */
function buildCalendarGrid(year: number, month1to12: number) {
  const first = new Date(year, month1to12 - 1, 1);
  const last = new Date(year, month1to12, 0);
  // Mon=0, ..., Sun=6
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const prevLast = new Date(year, month1to12 - 1, 0).getDate();

  const cells = [];
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
    cells.push({ year: y, month: m, day: d, inMonth });
  }
  return cells;
}

export default function MenteeDashboard() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [plannerData, setPlannerData] = useState<PlannerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dailyFeedback, setDailyFeedback] = useState<any>(null);

  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [showStudyTimeModal, setShowStudyTimeModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showFeedbackSummary, setShowFeedbackSummary] = useState(false);
  
  // Date Picker States
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [draftYear, setDraftYear] = useState(currentDate.getFullYear());
  const [draftMonth, setDraftMonth] = useState(currentDate.getMonth() + 1);
  const [draftDay, setDraftDay] = useState(currentDate.getDate());

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [timeRecord, setTimeRecord] = useState({ taskId: '', startTime: '', endTime: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', subject: 'KOREAN', customSubject: '' });
  const [editTask, setEditTask] = useState({ id: '', title: '', description: '', subject: '', customSubject: '' });
  const [submitComment, setSubmitComment] = useState('');
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

  const formatDateForApi = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getWeekDates = (baseDate: Date) => {
    const dates: Date[] = [];
    const day = baseDate.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    for (let i = 0; i < 7; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + mondayOffset + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates(currentDate);
  const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

  // 진행률 계산 (멘토 과제 기준)
  const calculateMentorProgress = () => {
    if (!plannerData || !plannerData.tasks) return { rate: 0, completed: 0, total: 0 };
    const mentorTasks = plannerData.tasks.filter(t => t.isFixed);
    if (mentorTasks.length === 0) return { rate: 0, completed: 0, total: 0 };
    const completed = mentorTasks.filter(t => t.submissions.length > 0).length;
    return { rate: Math.round((completed / mentorTasks.length) * 100), completed, total: mentorTasks.length };
  };

  const mentorProgress = calculateMentorProgress();

  const fetchPlannerData = async (date: Date) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentee/planner?date=${formatDateForApi(date)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPlannerData(await res.json());
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const handleSelfCheck = async (taskId: string, newStatus: SelfCheckStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentee/tasks/${taskId}/self-check`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ selfCheck: newStatus }),
      });
      if (res.ok) fetchPlannerData(currentDate);
    } catch (err) { console.error(err); }
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    const finalSubject = newTask.subject === 'CUSTOM' ? newTask.customSubject : newTask.subject;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentee/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTask.title, description: newTask.description, subject: finalSubject, date: formatDateForApi(currentDate) }),
      });
      if (res.ok) {
        setShowAddTaskModal(false);
        setNewTask({ title: '', description: '', subject: 'KOREAN', customSubject: '' });
        fetchPlannerData(currentDate);
      }
    } catch (err) { console.error(err); }
  };

  const handleEditTask = async () => {
    const finalSubject = editTask.subject === 'CUSTOM' ? editTask.customSubject : editTask.subject;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentee/tasks/${editTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: editTask.title, description: editTask.description, subject: finalSubject }),
      });
      if (res.ok) { setShowEditTaskModal(false); fetchPlannerData(currentDate); }
    } catch (err) { console.error(err); }
  };

  const handleDeleteTask = async (taskId: string) => {
    if(!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentee/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { fetchPlannerData(currentDate); setActiveMenuId(null); }
    } catch (err) { console.error(err); }
  };

  const openEditModal = (task: Task) => {
    const isDefault = DEFAULT_SUBJECTS.some(s => s.value === task.subject);
    setEditTask({ id: task.id, title: task.title, description: task.description || '', subject: isDefault ? task.subject : 'CUSTOM', customSubject: isDefault ? '' : task.subject });
    setShowEditTaskModal(true); setActiveMenuId(null);
  };

  const handleSubmitStudyTime = async () => {
    if (!timeRecord.startTime || !timeRecord.endTime) return;
    const [startH, startM] = timeRecord.startTime.split(':').map(Number);
    const [endH, endM] = timeRecord.endTime.split(':').map(Number);
    const duration = (endH * 60 + endM) - (startH * 60 + startM);
    if (duration <= 0) return alert('종료 시간은 시작 시간보다 늦어야 합니다.');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentee/tasks/${timeRecord.taskId}/time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ duration, startTime: timeRecord.startTime, endTime: timeRecord.endTime, date: formatDateForApi(currentDate) }),
      });
      if (res.ok) { setShowStudyTimeModal(false); fetchPlannerData(currentDate); }
    } catch (err) { console.error(err); }
  };

  const handleImageUpload = async (files: File[]) => {
    setIsUploading(true);
    const urls: string[] = [];
    try {
      const token = localStorage.getItem('token');
      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);
        const res = await fetch(`${getApiUrl()}/api/upload/image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) { const data = await res.json(); urls.push(data.url); }
      }
      setUploadedImageUrls([...uploadedImageUrls, ...urls]);
    } catch (err) { console.error(err); }
    finally { setIsUploading(false); }
  };

  const handleSubmitTask = async () => {
    if (!selectedTask) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentee/tasks/${selectedTask.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageUrls: uploadedImageUrls, comment: submitComment }),
      });
      if (res.ok) { setShowSubmitModal(false); fetchPlannerData(currentDate); alert('제출 완료!'); }
    } catch (err) { console.error(err); }
  };

  const calculateTotalStudyTime = () => {
    if (!plannerData) return '0시간';
    const totalMinutes = plannerData.tasks.reduce((total, task) => {
      return total + task.studyLogs.reduce((taskTotal, log) => taskTotal + log.duration, 0);
    }, 0);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}시간${m > 0 ? ` ${m}분` : ''}`;
  };

  const handleViewPdf = (fileUrl: string) => {
    if (!fileUrl) return;
    let fullUrl = fileUrl;
    if (!fileUrl.startsWith('http')) {
      const baseUrl = getApiUrl().replace(/\/$/, '');
      const cleanPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
      fullUrl = `${baseUrl}${cleanPath}`;
    }
    const link = document.createElement('a');
    link.href = fullUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTaskStatusInfo = (task: Task) => {
    if (task.feedbacks && task.feedbacks.length > 0) return { label: '피드백 완료', color: 'text-green-600 bg-green-50' };
    if (task.submissions && task.submissions.length > 0) return { label: '제출 완료', color: 'text-blue-600 bg-blue-50' };
    return { label: '미완료', color: 'text-gray-400 bg-gray-50' };
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchPlannerData(currentDate);
    const token = localStorage.getItem('token');
    const dateStr = formatDateForApi(currentDate);
    const d = new Date(currentDate); d.setDate(d.getDate()-1); 
    const prevDateStr = formatDateForApi(d);
    fetch(`${getApiUrl()}/api/mentee/daily-feedbacks?date=${prevDateStr}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null).then(setDailyFeedback);
    fetch(`${getApiUrl()}/api/mentee/dashboard?date=${dateStr}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null).then(setDashboard);
  }, [currentDate]);

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      // Swipe Left -> Next Day
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setCurrentDate(nextDay);
    } else if (info.offset.x > threshold) {
      // Swipe Right -> Previous Day
      const prevDay = new Date(currentDate);
      prevDay.setDate(prevDay.getDate() - 1);
      setCurrentDate(prevDay);
    }
  };

  const handleApplyDatePicker = () => {
    const newDate = new Date(draftYear, draftMonth - 1, draftDay);
    setCurrentDate(newDate);
    setIsDatePickerOpen(false);
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setIsDatePickerOpen(false);
  };

  const calendarGrid = useMemo(() => buildCalendarGrid(draftYear, draftMonth), [draftYear, draftMonth]);

  return (
    <div className="w-full relative overflow-x-hidden font-['Pretendard']">
      {/* 날짜 영역 (Clickable) */}
      <div className="flex justify-center items-center mt-4">
        <button 
          onClick={() => {
            setDraftYear(currentDate.getFullYear());
            setDraftMonth(currentDate.getMonth() + 1);
            setDraftDay(currentDate.getDate());
            setIsDatePickerOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-1.5 hover:bg-gray-50 rounded-full transition-colors active:scale-95"
        >
          <span className="text-center text-slate-800 text-base font-bold">
            {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월 {currentDate.getDate()}일
          </span>
          <IoIosArrowDown className="text-slate-400 text-sm" />
        </button>
      </div>

      <div className="w-full px-6 py-6 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,0.04)] mt-4">
        <div className="flex justify-between items-center gap-1">
          {weekDates.map((date, index) => {
            const isSelected = date.toDateString() === currentDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <button key={index} onClick={() => setCurrentDate(date)} className={`flex-1 h-14 flex flex-col items-center justify-center rounded-[10px] transition-all ${isSelected ? 'bg-blue-200' : 'bg-transparent'}`}>
                <span className={`text-xs font-medium mb-1 ${isSelected ? 'text-white' : 'text-gray-400'}`}>{WEEKDAYS[index]}</span>
                <span className={`text-lg font-medium ${isSelected ? 'text-sky-950' : isToday ? 'text-sky-950' : 'text-gray-700'}`}>{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      <motion.div
        key={currentDate.toDateString()}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="touch-pan-y"
      >
        {/* 진행률 (멘토 과제 전용) */}
        <div className="px-6 mt-8">
          <div className="flex justify-between items-end mb-2">
            <span className="text-slate-800 text-xs font-medium">{currentDate.getMonth()+1}/{currentDate.getDate()} 학습 진행률</span>
            <span className="text-gray-500 text-xs font-medium">{mentorProgress.total === 0 ? '과제 없음' : mentorProgress.completed === 0 ? '미완료' : mentorProgress.completed === mentorProgress.total ? '완료' : `${mentorProgress.completed}/${mentorProgress.total} 완료`}</span>
          </div>
          <div className="text-slate-800 text-xl font-semibold mb-2">{mentorProgress.rate}%</div>
          <div className="w-full h-4 bg-gray-300 rounded-[5px] overflow-hidden"><div className="h-full bg-gray-600 transition-all duration-500" style={{ width: `${mentorProgress.rate}%` }} /></div>
        </div>

        <div className="w-full h-2 bg-gray-50 mt-8"></div>

        {/* 데일리 피드백 */}
        <div className="px-6 mt-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-black text-base font-semibold">{(() => { const d = new Date(currentDate); d.setDate(d.getDate()-1); return `${d.getMonth()+1}/${d.getDate()}`; })()} 데일리 피드백</span>
            <button onClick={() => setShowFeedbackSummary(true)} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><MdInfoOutline className="text-xl text-gray-600" /></button>
          </div>
          <div className="w-full min-h-[80px] px-3.5 py-3 bg-gray-500 rounded-[10px] flex justify-center items-start shadow-sm">
            <p className="text-white text-sm font-medium whitespace-pre-wrap">{dailyFeedback?.content || '전날의 피드백이 없습니다.'}</p>
          </div>
        </div>

        {/* 총 학습 시간 */}
        <div className="px-6 mt-8 flex justify-between items-center">
          <span className="text-sky-950 text-xl font-medium">총 학습 시간</span>
          <span className="text-sky-950 text-xl font-semibold">{calculateTotalStudyTime()}</span>
        </div>

        {/* 학습 과제 리스트 */}
        <div className="px-6 mt-8 pb-20">
          <div className="flex justify-between items-end mb-5">
            <span className="text-black text-base font-semibold">나의 학습 과제</span>
            <button onClick={() => setShowAddTaskModal(true)} className="flex items-center gap-1 group">
              <span className="text-gray-700 text-xs font-medium group-hover:text-black">학습 추가</span>
              <div className="w-6 h-6 bg-gray-700 rounded-xl flex items-center justify-center text-white text-sm group-hover:bg-black">+</div>
            </button>
          </div>

          <div className="flex flex-col gap-5">
            {[...(plannerData?.tasks || [])]
              .sort((a, b) => {
                const aDone = (a.feedbacks?.length || 0) > 0;
                const bDone = (b.feedbacks?.length || 0) > 0;
                if (aDone && !bDone) return 1;
                if (!aDone && bDone) return -1;
                return 0;
              })
              .map((task) => {
                const status = getTaskStatusInfo(task);
              return (
                <div key={task.id} className="w-full flex flex-col gap-2.5 relative border-b border-gray-50 pb-4 last:border-0">
                  <div className="flex justify-between items-center">
                    <div className="flex items-start gap-3.5 flex-1 overflow-hidden">
                      <button onClick={() => handleSelfCheck(task.id, task.selfCheck === 'DONE' ? 'PENDING' : 'DONE')} className={`w-7 h-7 mt-0.5 flex-shrink-0 flex items-center justify-center rounded-2xl transition-colors ${task.selfCheck === 'DONE' ? 'bg-sky-950 text-white' : 'bg-gray-100 text-sky-950 text-xs'}`}>{task.selfCheck === 'DONE' ? '✓' : '○'}</button>
                      <div className="flex flex-col gap-1.5 overflow-hidden flex-1">
                        <div className="flex items-center gap-2 overflow-hidden flex-wrap">
                          {task.isFixed ? <PiPushPinFill className="text-blue-500 text-sm flex-shrink-0" /> : <PiPencilLineLight className="text-gray-400 text-sm flex-shrink-0" />}
                          <span 
                            onClick={() => router.push(`/mentee/tasks/${task.id}`)} 
                            className={`text-black text-base font-semibold truncate cursor-pointer hover:text-sky-700 transition-colors ${
                              (task.feedbacks?.length || 0) > 0 ? 'line-through text-gray-400 opacity-60' : 
                              task.submissions.length > 0 ? 'opacity-60' : ''
                            }`}
                          >
                            {task.title}
                          </span>
                          <span className={`text-[9px] px-1.5 py-[1px] rounded-full font-bold ${status.color}`}>{status.label}</span>
                          <div className={`px-1.5 py-[1px] rounded-[5px] outline outline-1 outline-offset-[-1px] flex-shrink-0 ${getSubjectStyles(task.subject)}`}><span className="text-[10px] font-medium">{getSubjectLabel(task.subject)}</span></div>
                        </div>
                        {task.learningGoal && task.learningGoal.items.length > 0 && (
                          <div className="flex flex-col gap-0.5">
                            {task.learningGoal.items.slice(0, 2).map((item) => (
                              <div key={item.id} className="flex items-center gap-1.5">
                                <div className={`w-1 h-1 rounded-full ${item.isCompleted ? 'bg-sky-950' : 'bg-gray-300'}`}></div>
                                <span className={`text-[10px] truncate ${item.isCompleted ? 'text-sky-950 font-medium' : 'text-gray-400'}`}>{item.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!task.isFixed && (
                        <div className="relative">
                          <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === task.id ? null : task.id); }} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><HiDotsVertical className="text-gray-400" /></button>
                          {activeMenuId === task.id && (
                            <div ref={menuRef} className="absolute right-0 mt-1 w-24 bg-white border border-gray-100 shadow-lg rounded-lg z-50 py-1 font-['Pretendard'] animate-in fade-in zoom-in-95 duration-100">
                              <button onClick={() => openEditModal(task)} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 text-gray-700 border-b border-gray-50">수정</button>
                              <button onClick={() => handleDeleteTask(task.id)} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 text-red-500">삭제</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pl-11 flex justify-between items-center">
                    <button onClick={() => { setTimeRecord({ ...timeRecord, taskId: task.id }); setShowStudyTimeModal(true); }} className="flex items-center gap-1.5 hover:opacity-70 group">
                      <div className="w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center text-[8px] text-white group-hover:bg-black">⏱</div>
                      <span className={`text-[11px] font-medium ${task.studyLogs.length > 0 ? 'text-gray-600' : 'text-sky-950'}`}>{task.studyLogs.length > 0 ? `${task.studyLogs[task.studyLogs.length-1].startTime} ~ ${task.studyLogs[task.studyLogs.length-1].endTime}` : '공부 시간 입력'}</span>
                    </button>
                    <div className="flex flex-col items-end gap-1.5">
                      {task.worksheet && task.date <= todayStr && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewPdf(task.worksheet!.pdfUrl || (task.worksheet as any).fileUrl);
                          }}
                          className="flex items-center gap-1 group hover:opacity-70 transition-opacity"
                        >
                          <span className="text-black text-[10px] font-medium font-['Pretendard']">학습파일</span>
                          <LuDownload className="text-xs text-black" />
                        </button>
                      )}
                      <div className="flex items-center gap-3">
                        <button onClick={() => router.push(`/mentee/tasks/${task.id}`)} className="text-[10px] text-gray-400 font-medium hover:text-sky-950 underline decoration-gray-200 underline-offset-2">상세보기</button>
                        <button onClick={() => { setSelectedTask(task); setShowSubmitModal(true); }} className="text-[10px] text-sky-950 underline font-semibold decoration-sky-900 underline-offset-2">빠른 제출</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* 모달 생략 - 동일 로직 */}
      {showFeedbackSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[70vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">어제 과제 피드백 요약</h3>
              <button onClick={() => setShowFeedbackSummary(false)} className="text-gray-400 hover:text-black text-2xl">&times;</button>
            </div>
            <div className="space-y-4">
              {(dashboard?.yesterdayFeedbacks?.length || 0) === 0 ? (
                <p className="text-center py-10 text-gray-400 text-sm">과제별 피드백이 없습니다.</p>
              ) : (
                dashboard?.yesterdayFeedbacks.map((item, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getSubjectStyles(item.subject)}`}>{getSubjectLabel(item.subject)}</span>
                      <span className="text-[10px] text-gray-400 font-medium">{item.feedback.mentor.name} 멘토</span>
                    </div>
                    <h4 className="text-sm font-semibold mb-2 text-gray-800">{item.taskTitle}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed bg-white p-2.5 rounded-lg border border-gray-50">{item.feedback.summary || item.feedback.content}</p>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setShowFeedbackSummary(false)} className="w-full mt-6 py-3 bg-gray-100 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-200 transition-colors">닫기</button>
          </div>
        </div>
      )}

      {/* 추가/수정 모달 */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 font-['Pretendard']">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4">학습 추가</h3>
            <div className="space-y-4">
              <input type="text" value={newTask.title} onChange={(e) => setNewTask({...newTask, title: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm" placeholder="과제 제목" />
              <div className="grid grid-cols-2 gap-3">
                <select value={newTask.subject} onChange={(e) => setNewTask({...newTask, subject: e.target.value})} className="px-4 py-3 bg-gray-50 border-none rounded-xl text-sm">
                  {DEFAULT_SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  <option value="CUSTOM">직접 입력</option>
                </select>
                {newTask.subject === 'CUSTOM' && <input type="text" value={newTask.customSubject} onChange={(e) => setNewTask({...newTask, customSubject: e.target.value})} className="px-4 py-3 bg-gray-50 border-none rounded-xl text-sm" placeholder="과목명" />}
              </div>
              <textarea value={newTask.description} onChange={(e) => setNewTask({...newTask, description: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm min-h-[80px]" placeholder="설명 (선택)" />
            </div>
            <div className="mt-6 flex gap-3"><button onClick={() => setShowAddTaskModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-medium">취소</button><button onClick={handleAddTask} className="flex-1 py-3 bg-sky-950 text-white rounded-xl font-medium">추가하기</button></div>
          </div>
        </div>
      )}

      {showEditTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 font-['Pretendard']">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">과제 수정</h3>
            <div className="space-y-4">
              <input type="text" value={editTask.title} onChange={(e) => setEditTask({...editTask, title: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm" placeholder="과제 제목" />
              <div className="grid grid-cols-2 gap-3">
                <select value={editTask.subject} onChange={(e) => setEditTask({...editTask, subject: e.target.value})} className="px-4 py-3 bg-gray-50 border-none rounded-xl text-sm">
                  {DEFAULT_SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  <option value="CUSTOM">직접 입력</option>
                </select>
                {editTask.subject === 'CUSTOM' && <input type="text" value={editTask.customSubject} onChange={(e) => setEditTask({...editTask, customSubject: e.target.value})} className="px-4 py-3 bg-gray-50 border-none rounded-xl text-sm" placeholder="과목명" />}
              </div>
              <textarea value={editTask.description} onChange={(e) => setEditTask({...editTask, description: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm min-h-[80px]" placeholder="설명 (선택)" />
            </div>
            <div className="mt-6 flex gap-3"><button onClick={() => setShowEditTaskModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-medium">취소</button><button onClick={handleEditTask} className="flex-1 py-3 bg-sky-950 text-white rounded-xl font-medium">수정 완료</button></div>
          </div>
        </div>
      )}

      {showStudyTimeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 font-['Pretendard']">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">공부 시간 기록</h3>
            <div className="space-y-4">
              <div><label className="text-xs text-gray-500 mb-1 block ml-1">시작 시간</label><input type="time" value={timeRecord.startTime} onChange={(e) => setTimeRecord({ ...timeRecord, startTime: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block ml-1">종료 시간</label><input type="time" value={timeRecord.endTime} onChange={(e) => setTimeRecord({ ...timeRecord, endTime: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm" /></div>
            </div>
            <div className="mt-6 flex gap-3"><button onClick={() => { setShowStudyTimeModal(false); setTimeRecord({ taskId: '', startTime: '', endTime: '' }); }} className="flex-1 py-3 bg-gray-100 rounded-xl font-medium">취소</button><button onClick={handleSubmitStudyTime} className="flex-1 py-3 bg-sky-950 text-white rounded-xl font-medium">기록완료</button></div>
          </div>
        </div>
      )}

      {showSubmitModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 font-['Pretendard']">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-1">과제 제출</h3>
            <p className="text-xs text-gray-500 mb-6">{selectedTask.title}</p>
            <div className="space-y-5">
              <div className="flex flex-col gap-2"><label className="text-sm font-semibold">사진 첨부</label><input type="file" multiple onChange={(e) => e.target.files && handleImageUpload(Array.from(e.target.files))} className="text-xs w-full" /></div>
              {uploadedImageUrls.length > 0 && <div className="grid grid-cols-3 gap-2">{uploadedImageUrls.map((url, i) => <img key={i} src={url} className="w-full h-20 object-cover rounded-lg border" />)}</div>}
              <textarea value={submitComment} onChange={(e) => setSubmitComment(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm min-h-[100px]" placeholder="멘토에게 한마디" />
            </div>
            <div className="mt-6 flex gap-3"><button onClick={() => setShowSubmitModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-medium">취소</button><button onClick={handleSubmitTask} disabled={isUploading} className="flex-1 py-3 bg-sky-950 text-white rounded-xl font-medium disabled:opacity-50">{isUploading ? '업로드 중' : '제출하기'}</button></div>
          </div>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button onClick={() => setShowAddTaskModal(true)} className="fixed right-6 bottom-28 w-16 h-16 bg-gradient-to-br from-indigo-50 to-blue-200 rounded-[31px] outline outline-[1.22px] outline-blue-200 shadow-lg flex items-center justify-center z-50 transition-transform active:scale-95 shadow-blue-100 shadow-lg"><div className="w-10 h-10 bg-sky-950 rounded-full flex items-center justify-center text-white text-2xl font-bold">+</div></button>

      {/* Date Picker Modal */}
      <AnimatePresence>
        {isDatePickerOpen && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40" onClick={() => setIsDatePickerOpen(false)}>
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[390px] bg-white rounded-t-[32px] p-6 pb-10 shadow-2xl"
            >
              {/* Handle Bar */}
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">날짜 선택</h2>
                <button 
                  onClick={handleGoToToday}
                  className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold active:scale-95 transition-transform"
                >
                  오늘로 가기
                </button>
              </div>
              
              {/* Year/Month Selectors */}
              <div className="flex gap-3 mb-6">
                <select 
                  value={draftYear} 
                  onChange={(e) => setDraftYear(Number(e.target.value))}
                  className="flex-1 p-3 bg-gray-50 border-none rounded-2xl font-bold text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select 
                  value={draftMonth} 
                  onChange={(e) => setDraftMonth(Number(e.target.value))}
                  className="flex-1 p-3 bg-gray-50 border-none rounded-2xl font-bold text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
              </div>

              {/* Calendar Grid */}
              <div className="mb-8">
                <div className="grid grid-cols-7 mb-2">
                  {['월', '화', '수', '목', '금', '토', '일'].map(d => (
                    <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarGrid.map((cell, i) => {
                    const isSelected = cell.inMonth && cell.day === draftDay && cell.month === draftMonth && cell.year === draftYear;
                    const isToday = cell.inMonth && cell.day === new Date().getDate() && cell.month === (new Date().getMonth() + 1) && cell.year === new Date().getFullYear();
                    
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          if (cell.inMonth) {
                            setDraftDay(cell.day);
                          } else {
                            setDraftYear(cell.year);
                            setDraftMonth(cell.month);
                            setDraftDay(cell.day);
                          }
                        }}
                        className={`
                          aspect-square flex items-center justify-center text-sm font-bold rounded-xl transition-all
                          ${cell.inMonth ? 'text-gray-800' : 'text-gray-200'}
                          ${isSelected ? 'bg-[#00265A] text-white shadow-md' : isToday ? 'text-blue-600 bg-blue-50' : 'hover:bg-gray-50'}
                        `}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDatePickerOpen(false)}
                  className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold active:scale-95 transition-transform"
                >
                  취소
                </button>
                <button 
                  onClick={handleApplyDatePicker} 
                  className="flex-[2] py-4 bg-[#00265A] text-white rounded-2xl font-bold shadow-lg shadow-blue-900/20 active:scale-95 transition-transform"
                >
                  이동하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}