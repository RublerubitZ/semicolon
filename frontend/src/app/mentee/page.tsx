'use client';
import { getApiUrl, apiGet, apiPost, apiPatch, apiPut, apiDelete } from '@/lib/api';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { HiDotsVertical } from 'react-icons/hi';
import { MdInfoOutline, MdTimeline } from 'react-icons/md';

import { PiPushPinFill, PiFilePdf } from "react-icons/pi";
import { PiPencilLineLight } from 'react-icons/pi';
import { LuDownload } from "react-icons/lu";
import { IoIosArrowDown, IoIosArrowBack, IoMdBook } from "react-icons/io";
import { IoTime } from "react-icons/io5";
import { RiUserFill } from "react-icons/ri";
import { AiFillMessage } from "react-icons/ai";
import { TbBrandDatabricks } from "react-icons/tb";
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { DEFAULT_SUBJECTS, getSubjectStyles, getSubjectLabel } from '@/constants/subjects';
import { getTaskStatusInfo } from '@/constants/taskStatus';
import { TimeTable, type TimelineItem } from '@/components/mentee/main/TimeTable';
import { WorksheetSelectionModal } from '@/components/mentee/main/WorksheetSelectionModal';
import { type SelfCheckStatus } from '@/constants/selfCheck';
import { useOverlayStore } from '@/stores/useOverlayStore';
import { Z_INDEX } from '@/constants/zIndex';
import { TIMEOUTS } from '@/constants/timeouts';
import { formatDateForApi } from '@/lib/dateUtils';
import { AlertModal } from '@/components/AlertModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { toast } from '@/stores/useToastStore';
import type { TaskSubmission, StudyTimeLog, Feedback, DailyFeedback } from '@/types';

interface TaskMaterial {
  id: string;
  type: 'PDF' | 'COLUMN';
  order: number;
  pdfUrl?: string;
  pdfFileName?: string; // PDF 원본 파일명
  columnTitle?: string;
  columnContent?: string;
}

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
  pdfUrl?: string;
  worksheet?: {
    id: string;
    title: string;
    pdfUrl: string;
    type: 'PDF' | 'COLUMN';
    content?: string;
  };
  materials?: TaskMaterial[]; // 새로운 필드
  submissions: TaskSubmission[];
  studyLogs: StudyTimeLog[];
  feedbacks: Feedback[];
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
  const [dailyFeedback, setDailyFeedback] = useState<DailyFeedback | null>(null);

  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [showStudyTimeModal, setShowStudyTimeModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showWorksheetModal, setShowWorksheetModal] = useState(false);
  const [selectedWorksheet, setSelectedWorksheet] = useState<any>(null);
  const [showFeedbackSummary, setShowFeedbackSummary] = useState(false);
  const [showTimeTablePopup, setShowTimeTablePopup] = useState(false);
  const [showConfirmTimeModal, setShowConfirmTimeModal] = useState(false);
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskIdToDelete, setTaskIdToDelete] = useState<string | null>(null);
  const [showAlreadySubmittedModal, setShowAlreadySubmittedModal] = useState(false);
  const [taskToNavigate, setTaskToNavigate] = useState<Task | null>(null);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title?: string; message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    toast[type](message);
  };

  const showAlert = (message: string, title: string = '알림') => {
    setAlertState({ isOpen: true, title, message });
  };
  const { setOverlay } = useOverlayStore();

  // Data Cache to prevent lag during swiping
  const dataCache = useRef<Record<string, { planner: PlannerData | null, dashboard: DashboardData | null, feedback: DailyFeedback | null }>>({});
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Date Picker States
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    setOverlay('dashboard_modals', 
      showTimeTablePopup || 
      showFeedbackSummary || 
      showAddTaskModal || 
      showEditTaskModal || 
      showStudyTimeModal || 
      showSubmitModal || 
      showConfirmTimeModal ||
      showAlreadySubmittedModal ||
      alertState.isOpen
    );
  }, [
    showTimeTablePopup, 
    showFeedbackSummary, 
    showAddTaskModal, 
    showEditTaskModal, 
    showStudyTimeModal, 
    showSubmitModal, 
    showConfirmTimeModal,
    showAlreadySubmittedModal,
    alertState.isOpen,
    setOverlay
  ]);
    const [timeOverlapError, setTimeOverlapError] = useState<string | null>(null);
  const [draftYear, setDraftYear] = useState(currentDate.getFullYear());
  const [draftMonth, setDraftMonth] = useState(currentDate.getMonth() + 1);
  const [draftDay, setDraftDay] = useState(currentDate.getDate());

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [timeRecord, setTimeRecord] = useState({ taskId: '', startTime: '', endTime: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', subject: 'KOREAN', customSubject: '' });
  const [editTask, setEditTask] = useState({ id: '', title: '', description: '', subject: '', customSubject: '', date: '' });
  const [submitComment, setSubmitComment] = useState('');
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // 오늘 날짜 계산 (한국 시간대 기준)
  const todayStr = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // "2026-02-08" 형식
  }, []);

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
      const res = await apiGet(`/api/mentee/planner?date=${formatDateForApi(date)}`);
      if (res.ok) {
        setPlannerData(await res.json());
      } else if (res.status === 401) {
        // fetchWithAuth에서 이미 리다이렉트했을 것이지만 안전을 위해 추가
        router.push('/login?reason=expired');
      }
    } catch (err) {
      console.error(err);
      showToast('데이터를 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelfCheck = async (taskId: string, newStatus: SelfCheckStatus, task: Task) => {
    // ... (기존 유효성 검사 로직 동일)
    if (task.submissions.length > 0) {
      showToast('이미 제출된 과제는 자가점검 상태를 변경할 수 없습니다.', 'info');
      return;
    }
    const taskDateOnly = task.date.split('T')[0];
    if (taskDateOnly > todayStr) {
      showToast('미래의 과제는 해당 날짜가 되어야 체크할 수 있습니다.', 'info');
      return;
    }
    if (newStatus === 'DONE' && task.studyLogs.length === 0) {
      setSelectedTask(task);
      setTimeRecord({ taskId, startTime: '', endTime: '' });
      setShowStudyTimeModal(true);
      return;
    }

    // Optimistic Update
    if (plannerData) {
      const updatedTasks = plannerData.tasks.map(t => 
        t.id === taskId ? { 
          ...t, 
          selfCheck: newStatus,
          studyLogs: newStatus === 'PENDING' ? [] : t.studyLogs 
        } : t
      );
      const updatedData = { ...plannerData, tasks: updatedTasks };
      setPlannerData(updatedData);
      const dateStr = formatDateForApi(currentDate);
      if (dataCache.current[dateStr]) {
        dataCache.current[dateStr].planner = updatedData;
      }
    }

    try {
      const res = await apiPatch(`/api/mentee/tasks/${taskId}/self-check`, { selfCheck: newStatus });
      
      if (res.ok) {
        const plannerRes = await apiGet(`/api/mentee/planner?date=${formatDateForApi(currentDate)}`);
        if (plannerRes.ok) {
          const latestPlanner = await plannerRes.json();
          setPlannerData(latestPlanner);
          const dateStr = formatDateForApi(currentDate);
          if (dataCache.current[dateStr]) {
            dataCache.current[dateStr].planner = latestPlanner;
          }
        }
      } else {
        fetchPlannerData(currentDate);
      }
    } catch (err) { 
      console.error(err);
      fetchPlannerData(currentDate);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    const selectedDateStr = formatDateForApi(currentDate);
    if (selectedDateStr < todayStr) {
      showToast('과거 날짜에는 학습을 추가할 수 없습니다.', 'error');
      return;
    }
    const finalSubject = newTask.subject === 'CUSTOM' ? newTask.customSubject : newTask.subject;
    try {
      const res = await apiPost('/api/mentee/tasks', { title: newTask.title, description: newTask.description, subject: finalSubject, date: selectedDateStr });
      if (res.ok) {
        setShowAddTaskModal(false);
        setNewTask({ title: '', description: '', subject: 'KOREAN', customSubject: '' });
        fetchPlannerData(currentDate);
        showToast('학습이 추가되었습니다.');
      }
    } catch (err) { console.error(err); showToast('학습 추가에 실패했습니다.', 'error'); }
  };

  const handleEditTask = async () => {
    const finalSubject = editTask.subject === 'CUSTOM' ? editTask.customSubject : editTask.subject;
    if (editTask.date < todayStr) {
      showToast('과거 날짜로는 학습을 이동할 수 없습니다.', 'error');
      return;
    }
    try {
      const res = await apiPut(`/api/mentee/tasks/${editTask.id}`, { 
        title: editTask.title, 
        description: editTask.description, 
        subject: finalSubject,
        date: editTask.date 
      });
      if (res.ok) { 
        setShowEditTaskModal(false); 
        fetchPlannerData(currentDate); 
        showToast('학습이 수정되었습니다.');
      }
    } catch (err) { console.error(err); showToast('학습 수정에 실패했습니다.', 'error'); }
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskIdToDelete(taskId);
    setIsDeleteModalOpen(true);
  };

  const performDeleteTask = async () => {
    if (!taskIdToDelete) return;
    try {
      const res = await apiDelete(`/api/mentee/tasks/${taskIdToDelete}`);
      if (res.ok) { 
        fetchPlannerData(currentDate); 
        setActiveMenuId(null); 
        showToast('학습이 삭제되었습니다.');
      } else {
        const errorData = await res.json().catch(() => ({}));
        showToast(errorData.error || '삭제에 실패했습니다.', 'error');
      }
    } catch (err) { console.error(err); }
    finally {
      setIsDeleteModalOpen(false);
      setTaskIdToDelete(null);
    }
  };

  const openEditModal = (task: Task) => {
    const isDefault = DEFAULT_SUBJECTS.some(s => s.value === task.subject);
    setEditTask({ 
      id: task.id, 
      title: task.title, 
      description: task.description || '', 
      subject: isDefault ? task.subject : 'CUSTOM', 
      customSubject: isDefault ? '' : task.subject,
      date: task.date.split('T')[0] // 기존 날짜 초기값 설정
    });
    setShowEditTaskModal(true); 
    setActiveMenuId(null);
  };

  // 시간 중복 체크 함수
  const checkTimeOverlap = (startTime: string, endTime: string, excludeTaskId?: string): { overlaps: boolean; message?: string } => {
    if (!plannerData || !startTime || !endTime) return { overlaps: false };

    const startMin = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMin = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);

    for (const task of plannerData.tasks) {
      if (task.id === excludeTaskId) continue;

      for (const log of task.studyLogs) {
        if (!log.startTime || !log.endTime) continue;

        const logStartMin = parseInt(log.startTime.split(':')[0]) * 60 + parseInt(log.startTime.split(':')[1]);
        const logEndMin = parseInt(log.endTime.split(':')[0]) * 60 + parseInt(log.endTime.split(':')[1]);

        // 시간 겹침 체크
        if (
          (startMin >= logStartMin && startMin < logEndMin) ||
          (endMin > logStartMin && endMin <= logEndMin) ||
          (startMin <= logStartMin && endMin >= logEndMin)
        ) {
          const subjectLabel = getSubjectLabel(task.subject);
          return { 
            overlaps: true, 
            message: `${task.title}(${subjectLabel}) : ${log.startTime} ~ ${log.endTime} 이 설정한 공부시간과 겹칩니다.` 
          };
        }
      }
    }
    return { overlaps: false };
  };

  const handleTimeChange = (type: 'startTime' | 'endTime', value: string) => {
    const newRecord = { ...timeRecord, [type]: value };
    setTimeRecord(newRecord);

    if (newRecord.startTime && newRecord.endTime) {
      const overlap = checkTimeOverlap(newRecord.startTime, newRecord.endTime, newRecord.taskId);
      if (overlap.overlaps) {
        setTimeOverlapError(overlap.message || '시간이 겹칩니다.');
      } else {
        const [startH, startM] = newRecord.startTime.split(':').map(Number);
        const [endH, endM] = newRecord.endTime.split(':').map(Number);
        if ((endH * 60 + endM) - (startH * 60 + startM) <= 0) {
          setTimeOverlapError('종료 시간은 시작 시간보다 늦어야 합니다.');
        } else {
          setTimeOverlapError(null);
        }
      }
    }
  };

  const adjustTime = (type: 'startTime' | 'endTime', minutes: number) => {
    let current = timeRecord[type];
    if (!current) {
      const now = new Date();
      current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    const [h, m] = current.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + minutes);
    const newTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    handleTimeChange(type, newTime);
  };

  const handleSubmitStudyTime = async () => {
    if (!timeRecord.startTime || !timeRecord.endTime || timeOverlapError) return;

    const [startH, startM] = timeRecord.startTime.split(':').map(Number);
    const [endH, endM] = timeRecord.endTime.split(':').map(Number);
    const duration = (endH * 60 + endM) - (startH * 60 + startM);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentee/tasks/${timeRecord.taskId}/time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ duration, startTime: timeRecord.startTime, endTime: timeRecord.endTime, date: formatDateForApi(currentDate) }),
      });
      if (res.ok) {
        setShowStudyTimeModal(false);
        
        // Toast 메시지
        const isUpdate = (selectedTask?.studyLogs?.length || 0) > 0;
        showToast(isUpdate ? '공부 시간이 수정되었습니다.' : '공부 시간이 기록되었습니다.');

        setTimeRecord({ taskId: '', startTime: '', endTime: '' });
        setTimeOverlapError(null);

        // 자가점검도 완료로 업데이트 (API 호출 후 리스트 갱신)
        if (selectedTask && selectedTask.selfCheck !== 'DONE') {
          await fetch(`${getApiUrl()}/api/mentee/tasks/${timeRecord.taskId}/self-check`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ selfCheck: 'DONE' }),
          });
        }
        
        fetchPlannerData(currentDate);
      }
    } catch (err) { console.error(err); showToast('학습 시간 저장에 실패했습니다.', 'error'); }
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
        if (res.ok) { 
          const data = await res.json(); 
          urls.push(data.url); 
        } else {
          const errorData = await res.json().catch(() => ({}));
          showToast(errorData.error || '이미지 업로드에 실패했습니다.', 'error');
        }
      }
      setUploadedImageUrls(prev => [...prev, ...urls]);
    } catch (err) { 
      console.error(err); 
      showToast('이미지 업로드 중 오류가 발생했습니다.', 'error');
    }
    finally { setIsUploading(false); }
  };

  const handleSubmitTask = async () => {
    if (!selectedTask) return;

    // 유효성 검사
    const hasImages = uploadedImageUrls.length > 0;
    const hasComment = submitComment.trim();

    if (selectedTask.isFixed) {
      if (!hasImages) {
        showToast('멘토 지정 과제는 이미지를 최소 1개 이상 업로드해주세요.', 'error');
        return;
      }
    } else {
      if (!hasImages && !hasComment) {
        showToast('이미지 또는 코멘트를 최소 하나 이상 입력해주세요.', 'error');
        return;
      }
    }

    // 공부시간 체크 유효성 검사
    if (!timeRecord.startTime || !timeRecord.endTime) {
      showToast('공부시간을 설정해주세요.', 'error');
      return;
    }

    if (timeOverlapError) {
      showToast('시간 설정을 확인해주세요.', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // 시간 기록이 없는 경우에만 시간 기록 API 호출
      if (selectedTask.studyLogs.length === 0) {
        const [startH, startM] = timeRecord.startTime.split(':').map(Number);
        const [endH, endM] = timeRecord.endTime.split(':').map(Number);
        const duration = (endH * 60 + endM) - (startH * 60 + startM);

        await fetch(`${getApiUrl()}/api/mentee/tasks/${selectedTask.id}/time`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            duration,
            startTime: timeRecord.startTime,
            endTime: timeRecord.endTime,
            date: formatDateForApi(currentDate)
          }),
        });

        // 자가점검도 완료로 업데이트
        if (selectedTask.selfCheck !== 'DONE') {
          await fetch(`${getApiUrl()}/api/mentee/tasks/${selectedTask.id}/self-check`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ selfCheck: 'DONE' }),
          });
        }
      }

      const res = await fetch(`${getApiUrl()}/api/mentee/tasks/${selectedTask.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageUrls: uploadedImageUrls, comment: submitComment }),
      });

      if (res.ok) {
        setShowSubmitModal(false);
        setUploadedImageUrls([]);
        setSubmitComment('');
        setTimeRecord({ taskId: '', startTime: '', endTime: '' });
        setTimeOverlapError(null);
        fetchPlannerData(currentDate);
        showToast('제출 완료!', 'success');
      } else {
        const errorData = await res.json().catch(() => ({}));
        showToast(errorData.error || '제출에 실패했습니다.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('오류가 발생했습니다.', 'error');
    }
  };

  const calculateTotalStudyTime = () => {
    if (!plannerData || !plannerData.tasks) return '0시간';
    
    // 모든 과제의 공부 시간 간격을 모음 [시작분, 종료분]
    const intervals: [number, number][] = [];
    
    plannerData.tasks.forEach(task => {
      task.studyLogs.forEach(log => {
        if (log.startTime && log.endTime) {
          const [startH, startM] = log.startTime.split(':').map(Number);
          const [endH, endM] = log.endTime.split(':').map(Number);
          let startMin = startH * 60 + startM;
          let endMin = endH * 60 + endM;
          
          // 종료 시간이 시작 시간보다 빠른 경우 (자정 넘김 처리)
          if (endMin < startMin) {
            endMin += 24 * 60;
          }
          
          intervals.push([startMin, endMin]);
        }
      });
    });

    if (intervals.length === 0) return '0시간';

    // 간격 정렬 및 병합 (Union of intervals)
    intervals.sort((a, b) => a[0] - b[0]);
    
    const merged: [number, number][] = [];
    let current = intervals[0];
    
    for (let i = 1; i < intervals.length; i++) {
      const next = intervals[i];
      if (next[0] <= current[1]) {
        // 겹치거나 이어짐 -> 병합
        current[1] = Math.max(current[1], next[1]);
      } else {
        // 겹치지 않음 -> 현재 간격 저장 후 다음으로
        merged.push(current);
        current = next;
      }
    }
    merged.push(current);

    // 병합된 간격들의 총합 계산
    const totalMinutes = merged.reduce((sum, [start, end]) => sum + (end - start), 0);
    
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    
    if (h === 0) return `${m}분`;
    return `${h}시간${m > 0 ? ` ${m}분` : ''}`;
  };

  const handleViewMaterials = (task: Task) => {
    if (!task) return;

    const materials = task.materials || [];

    // materials가 없으면 기존 로직 사용 (하위 호환성)
    if (materials.length === 0) {
      if (task.worksheet) {
        handleViewPdf(task.worksheet);
      } else if (task.pdfUrl) {
        // pdfUrl이 여러 개인 경우 (쉼표로 구분)
        if (task.pdfUrl.includes(',')) {
          setSelectedWorksheet({
            id: 'legacy-pdfs',
            title: task.title,
            type: 'PDF',
            pdfUrl: task.pdfUrl,
          });
          setShowWorksheetModal(true);
        } else {
          // 단일 PDF
          handleViewPdf(task.pdfUrl);
        }
      }
      return;
    }

    // 1개일 때: 바로 보기
    if (materials.length === 1) {
      const material = materials[0];
      if (material.type === 'PDF' && material.pdfUrl) {
        handleViewPdf(material.pdfUrl);
      } else if (material.type === 'COLUMN') {
        // 칼럼 모달 열기
        setSelectedWorksheet({
          id: material.id,
          title: material.columnTitle || '칼럼',
          type: 'COLUMN',
          content: material.columnContent,
        });
        setShowWorksheetModal(true);
      }
      return;
    }

    // 2개 이상: 선택 모달 열기
    setSelectedWorksheet({
      id: 'materials',
      title: task.title,
      type: 'PDF',
      materials: materials,
    });
    setShowWorksheetModal(true);
  };

  const handleViewPdf = (worksheetOrUrl: string | { pdfUrl?: string; fileUrl?: string; title?: string }) => {
    if (!worksheetOrUrl) return;

    let pdfUrl = "";
    let title = "학습파일";

    if (typeof worksheetOrUrl === 'string') {
      pdfUrl = worksheetOrUrl;
    } else {
      pdfUrl = worksheetOrUrl.pdfUrl || worksheetOrUrl.fileUrl || '';
      title = worksheetOrUrl.title || "학습파일";
    }

    if (!pdfUrl) return;

    // 만약 PDF가 여러개면 모달 띄우기
    if (pdfUrl.includes(',')) {
      setSelectedWorksheet(typeof worksheetOrUrl === 'string' ? { title, pdfUrl } : worksheetOrUrl);
      setShowWorksheetModal(true);
      return;
    }

    // PDF가 한개일 때 즉시 열기
    let fullUrl = pdfUrl;
    if (!pdfUrl.startsWith('http')) {
      const baseUrl = getApiUrl().replace(/\/$/, '');
      const cleanPath = pdfUrl.startsWith('/') ? pdfUrl : `/${pdfUrl}`;
      fullUrl = `${baseUrl}${cleanPath}`;
    }

    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 날짜 자동 업데이트 (자정 지나면 오늘로 이동, 한국 시간대 기준)
  useEffect(() => {
    const checkDate = () => {
      const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const now = new Date();
      const currentDateStr = formatter.format(now);
      const displayedDateStr = formatter.format(currentDate);

      // 표시 중인 날짜가 오늘이 아니고, 이전 날짜였다면 오늘로 업데이트
      if (currentDateStr !== displayedDateStr && displayedDateStr < currentDateStr) {
        setCurrentDate(now);
      }
    };

    // 윈도우 포커스 시 날짜 체크
    const handleFocus = () => checkDate();
    window.addEventListener('focus', handleFocus);

    // 1분마다 날짜 체크
    const interval = setInterval(checkDate, TIMEOUTS.POLLING_INTERVAL);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [currentDate]);

  useEffect(() => {
    const dateStr = formatDateForApi(currentDate);
    
    // 1. 캐시가 있으면 즉시 반영 (로딩 표시 없이)
    if (dataCache.current[dateStr]) {
      const cached = dataCache.current[dateStr];
      setPlannerData(cached.planner);
      setDashboard(cached.dashboard);
      setDailyFeedback(cached.feedback);
      // 캐시가 있어도 백그라운드에서 최신화하고 싶다면 isLoading을 true로 하지 않음
    } else {
      // 캐시가 아예 없는 날짜만 로딩 표시
      setIsLoading(true);
    }

    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    
    fetchTimeoutRef.current = setTimeout(async () => {
      const fetchData = async (targetDate: Date) => {
        const dStr = formatDateForApi(targetDate);
        const prevD = new Date(targetDate); prevD.setDate(prevD.getDate()-1);
        const prevDStr = formatDateForApi(prevD);

        try {
          const [plannerRes, feedbackRes, dashboardRes] = await Promise.all([
            apiGet(`/api/mentee/planner?date=${dStr}`),
            apiGet(`/api/mentee/daily-feedbacks?date=${prevDStr}`),
            apiGet(`/api/mentee/dashboard?date=${dStr}`)
          ]);

          const [planner, feedback, dashboardData] = await Promise.all([
            plannerRes.ok ? plannerRes.json() : null,
            feedbackRes.ok ? feedbackRes.json() : null,
            dashboardRes.ok ? dashboardRes.json() : null
          ]);

          const result = { planner, feedback, dashboard: dashboardData };
          dataCache.current[dStr] = result;
          return result;
        } catch (err) {
          console.error('Fetch error:', err);
          return null;
        }
      };

      // 현재 날짜 데이터 가져오기
      const currentData = await fetchData(currentDate);
      if (currentData) {
        setPlannerData(currentData.planner);
        setDailyFeedback(currentData.feedback);
        setDashboard(currentData.dashboard);
      }
      setIsLoading(false);

      // --- 프리페칭 (Prefetching) ---
      // 사용자가 다음/이전으로 넘길 것을 대비해 앞뒤 날짜 데이터를 백그라운드에서 미리 가져옴
      const tomorrow = new Date(currentDate); tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date(currentDate); yesterday.setDate(yesterday.getDate() - 1);
      
      const tomStr = formatDateForApi(tomorrow);
      const yesStr = formatDateForApi(yesterday);

      if (!dataCache.current[tomStr]) fetchData(tomorrow);
      if (!dataCache.current[yesStr]) fetchData(yesterday);

    }, TIMEOUTS.DEBOUNCE_PLANNER); // 즉각적인 반응을 위한 짧은 디바운스

    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [currentDate]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
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

  const formatTimeRange = (task: Task) => {
    if (task.studyLogs && task.studyLogs.length > 0) {
      const log = task.studyLogs[task.studyLogs.length - 1];
      if (log.startTime && log.endTime) {
        const formatTime = (time: string) => {
          const [hour, minute] = time.split(':');
          const h = parseInt(hour);
          const period = h < 12 ? '오전' : '오후';
          const hour12 = h % 12 || 12;
          return `${period} ${hour12}시${minute !== '00' ? ` ${parseInt(minute)}분` : ''}`;
        };
        return `${formatTime(log.startTime)} ~ ${formatTime(log.endTime)}`;
      }
    }
    return '공부 시간 미설정';
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
            <button 
              onClick={() => setShowFeedbackSummary(true)} 
              className="p-1 hover:bg-gray-100 rounded-full transition-colors active:scale-90"
            >
              <MdInfoOutline className="text-xl text-gray-600" />
            </button>
          </div>
          <div className="w-full min-h-[80px] px-5 py-4 bg-sky-950 rounded-[16px] flex justify-start items-start shadow-lg shadow-sky-900/10">
            <p className="text-white text-[14px] font-['NanumSquare'] leading-relaxed whitespace-pre-wrap tracking-tight">
              {dailyFeedback?.content || '전날의 피드백이 없습니다.'}
            </p>
          </div>
        </div>

        {/* 총 학습 시간 */}
        <div className="px-6 mt-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sky-950 text-xl font-medium">총 학습 시간</span>
            <button 
              onClick={() => setShowTimeTablePopup(true)}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors active:scale-90"
            >
              <MdTimeline className="text-2xl text-blue-500" />
            </button>
          </div>
          <span className="text-sky-950 text-xl font-semibold">{calculateTotalStudyTime()}</span>
        </div>

        {/* 학습 과제 리스트 */}
        <div className="px-6 mt-8 pb-20">
          <div className="flex justify-between items-center mb-5">
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
              const isMenuOpen = activeMenuId === task.id;

              return (
                <div key={task.id} className="relative overflow-hidden group border-b border-gray-50 last:border-0">
                                      {/* Actions Background */}
                                      {!task.isFixed && (
                                        <div className="absolute right-0 top-0 bottom-4 flex z-0 gap-2 pr-2 py-0.5">
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                                            className="w-14 h-full bg-gray-100 flex flex-col items-center justify-center text-gray-600 gap-1 rounded-xl transition-transform active:scale-95"
                                          >
                                            <PiPencilLineLight className="text-lg" />
                                            <span className="text-[10px] font-medium">수정</span>
                                          </button>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                            className="w-14 h-full bg-red-500 flex flex-col items-center justify-center text-white gap-1 rounded-xl transition-transform active:scale-95"
                                          >
                                            <span className="text-lg">×</span>
                                            <span className="text-[10px] font-medium">삭제</span>
                                          </button>
                                        </div>
                                      )}
                  
                                      <motion.div 
                                        animate={{ x: isMenuOpen ? -140 : 0 }}
                                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                        className="w-full flex flex-col gap-2.5 relative bg-white pb-4 z-10"
                                      >
                                        <div className="flex justify-between items-center">
                                          <div className="flex items-start gap-3.5 flex-1 overflow-hidden">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelfCheck(task.id, task.selfCheck === 'DONE' ? 'PENDING' : 'DONE', task);
                                              }}
                                              className={`w-7 h-7 mt-0.5 ml-0.5 flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-all duration-200 ${
                                                task.selfCheck === 'DONE' 
                                                  ? 'bg-sky-950 border-sky-950 text-white shadow-sm' 
                                                  : 'bg-white border-gray-200 text-transparent hover:border-sky-900/30'
                                              }`}
                                            >
                                              <svg className={`w-4 h-4 transition-transform duration-200 ${task.selfCheck === 'DONE' ? 'scale-100' : 'scale-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                              </svg>
                                            </button>                        
                                          {/* Navigation Area: Title, Status, Subject, Goals */}
                                          <motion.div
                                            className="flex flex-col gap-1.5 overflow-hidden flex-1 cursor-pointer hover:bg-gray-50 rounded-lg p-1 -ml-1 transition-colors"
                                              onTap={() => {
                                              // 미래 과제 접근 제한
                                              const taskDateOnly = task.date.split('T')[0];
                                              if (taskDateOnly > todayStr) {
                                                showToast('미래의 과제는 해당 날짜가 되어야 접근할 수 있습니다.', 'info');
                                                return;
                                              }
                                              router.push(`/mentee/tasks/${task.id}`);
                                            }}
                                          >
                                            <div className="flex items-center gap-2 overflow-hidden flex-wrap">
                                              {task.isFixed ? <PiPushPinFill className="text-[#00265A] text-sm flex-shrink-0 -scale-x-100" /> : <PiPencilLineLight className="text-gray-400 text-sm flex-shrink-0" />}
                                              <span 
                                                className={`text-black text-base font-semibold truncate transition-colors ${
                                                  (task.feedbacks?.length || 0) > 0 ? 'line-through text-gray-400 opacity-60' : 
                                                  task.submissions.length > 0 ? 'opacity-60' : ''
                                                }`}
                                              >
                                                {task.title}
                                              </span>
                                              <span className={`text-[9px] px-1.5 py-[1px] rounded-full font-bold flex-shrink-0 ${status.style}`}>{status.label}</span>
                                              <div className={`px-1.5 py-[1px] rounded-[5px] outline outline-1 outline-offset-[-1px] flex-shrink-0 ${getSubjectStyles(task.subject)}`}>
                                                <span className="text-[10px] font-medium">{getSubjectLabel(task.subject)}</span>
                                              </div>
                                            </div>
                                            {task.learningGoal && task.learningGoal.items.length > 0 && (
                                              <div className="flex flex-col gap-0.5 ml-5">
                                                {task.learningGoal.items.slice(0, 2).map((item) => (
                                                  <div key={item.id} className="flex items-center gap-1.5">
                                                    <div className={`w-1 h-1 rounded-full ${item.isCompleted ? 'bg-sky-950' : 'bg-gray-300'}`}></div>
                                                    <span className={`text-[10px] truncate ${item.isCompleted ? 'text-sky-950 font-medium' : 'text-gray-400'}`}>{item.title}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </motion.div>
                                        </div>
                                        
                                        {!task.isFixed && (
                                          <motion.button 
                                            onTap={(e) => {
                                              setActiveMenuId(isMenuOpen ? null : task.id);
                                            }}
                                            className={`p-1 rounded-full transition-all ${isMenuOpen ? 'bg-gray-100 rotate-90 scale-110' : 'hover:bg-gray-50'}`}
                                          >
                                            <HiDotsVertical className={`${isMenuOpen ? 'text-sky-950' : 'text-gray-400'} text-lg`} />
                                          </motion.button>
                                        )}
                                      </div>
                  
                                                          <div className="pl-11 flex justify-between items-center">
                                                            <motion.button 
                                                              onTap={(e) => {
                                                                // 제출된 과제 시간 설정 제한
                                                                if (task.submissions.length > 0) {
                                                                  showToast('이미 제출된 과제는 시간을 수정할 수 없습니다.', 'info');
                                                                  return;
                                                                }

                                                                // 미래 과제 시간 설정 제한
                                                                const taskDateOnly = task.date.split('T')[0];
                                                                if (taskDateOnly > todayStr) {
                                                                  showToast('미래의 과제는 해당 날짜가 되어야 시간을 설정할 수 있습니다.', 'info');
                                                                  return;
                                                                }

                                                                if (task.studyLogs.length === 0) {
                                                                  setConfirmTask(task);
                                                                  setShowConfirmTimeModal(true);
                                                                  return;
                                                                }
                                                                const lastLog = task.studyLogs[task.studyLogs.length - 1];
                                                                setTimeRecord({ 
                                                                  taskId: task.id, 
                                                                  startTime: lastLog.startTime || '', 
                                                                  endTime: lastLog.endTime || '' 
                                                                }); 
                                                                setShowStudyTimeModal(true); 
                                                              }} 
                                                              className="flex items-center gap-1.5 hover:opacity-70 group active:scale-95 transition-transform"
                                                            >
                                                              <IoTime className={`text-lg ${task.studyLogs.length > 0 ? 'text-[#4B5563]' : 'text-gray-300'}`} />
                                                              <span className={`text-[11px] font-medium ${task.studyLogs.length > 0 ? 'text-[#4B5563]' : 'text-gray-400'}`}>
                                                                {formatTimeRange(task)}
                                                              </span>
                                                            </motion.button>                                        <div className="flex flex-col items-end gap-1.5">
                                          {(() => {
                                            // 미래 과제는 표시 안 함
                                            const taskDateOnly = task.date.split('T')[0];
                                            if (taskDateOnly > todayStr) return null;

                                            // materials가 있는지 확인
                                            const hasMaterials = task.materials && task.materials.length > 0;
                                            const hasLegacyData = task.worksheet || task.pdfUrl;

                                            if (!hasMaterials && !hasLegacyData) return null;

                                            // 버튼 텍스트와 아이콘 결정
                                            let buttonText = "학습자료";
                                            let buttonIcon = <TbBrandDatabricks className="text-blue-500 text-sm" />;

                                            if (hasMaterials && task.materials!.length === 1) {
                                              const material = task.materials![0];
                                              if (material.type === 'PDF') {
                                                buttonText = "학습파일";
                                                buttonIcon = <PiFilePdf className="text-rose-500 text-sm" />;
                                              } else if (material.type === 'COLUMN') {
                                                buttonText = "칼럼";
                                                buttonIcon = <IoMdBook className="text-teal-600 text-sm" />;
                                              }
                                            } else if (hasMaterials && task.materials!.length > 1) {
                                              // 혼합된 경우
                                              const hasPdf = task.materials!.some(m => m.type === 'PDF');
                                              const hasColumn = task.materials!.some(m => m.type === 'COLUMN');
                                              if (hasPdf && !hasColumn) {
                                                buttonText = "학습파일";
                                                buttonIcon = <PiFilePdf className="text-rose-500 text-sm" />;
                                              } else if (!hasPdf && hasColumn) {
                                                buttonText = "칼럼";
                                                buttonIcon = <IoMdBook className="text-teal-600 text-sm" />;
                                              }
                                            }

                                            return (
                                              <motion.button
                                                onTap={(e) => {
                                                  handleViewMaterials(task);
                                                }}
                                                className="flex items-center gap-1 group hover:opacity-70 transition-opacity active:scale-95"
                                              >
                                                <span className="flex items-center gap-1 text-slate-600 text-[10px] font-semibold font-['Pretendard']">
                                                  {buttonIcon}
                                                  {buttonText}
                                                </span>
                                                <LuDownload className="text-[10px] text-slate-400" />
                                              </motion.button>
                                            );
                                          })()}
                                          <div className="flex items-center gap-3">
                                            <motion.button
                                              onTap={(e) => {
                                                // 미래 과제 제출 제한
                                                const taskDateOnly = task.date.split('T')[0];
                                                if (taskDateOnly > todayStr) {
                                                  showToast('미래의 과제는 해당 날짜가 되어야 접근할 수 있습니다.', 'info');
                                                  return;
                                                }

                                                // 이미 제출한 과제인지 체크
                                                if (task.submissions.length > 0) {
                                                  setTaskToNavigate(task);
                                                  setShowAlreadySubmittedModal(true);
                                                  return;
                                                }

                                                setSelectedTask(task);
                                                setUploadedImageUrls([]);
                                                setSubmitComment('');

                                                // 시간 설정이 없으면 기본값 설정
                                                if (task.studyLogs.length === 0) {
                                                  setTimeRecord({
                                                    taskId: task.id,
                                                    startTime: '',
                                                    endTime: ''
                                                  });
                                                } else {
                                                  const lastLog = task.studyLogs[task.studyLogs.length - 1];
                                                  setTimeRecord({
                                                    taskId: task.id,
                                                    startTime: lastLog.startTime || '',
                                                    endTime: lastLog.endTime || ''
                                                  });
                                                }

                                                setShowSubmitModal(true);
                                              }}
                                              className="text-[10px] text-sky-950 underline font-semibold decoration-sky-900 underline-offset-2 active:opacity-50"
                                            >
                                              빠른 제출
                                            </motion.button>
                                          </div>
                                        </div>
                                      </div>                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* 모달 생략 - 동일 로직 */}
      {showFeedbackSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.OVERLAY_BACKDROP }}>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 font-['Pretendard']" style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 font-['Pretendard']" style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">과제 수정</h3>
            <div className="space-y-4">
              <input type="text" value={editTask.title} onChange={(e) => setEditTask({...editTask, title: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm" placeholder="과제 제목" />
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block ml-1">학습 일자</label>
                <input 
                  type="date" 
                  value={editTask.date} 
                  onChange={(e) => setEditTask({...editTask, date: e.target.value})} 
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm"
                  min={todayStr} // 과거 날짜 선택 방지 (브라우저 수준)
                />
              </div>

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

      {showStudyTimeModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 font-['Pretendard']" style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl overflow-hidden"
          >
            <h3 className="text-xl font-bold text-slate-800 mb-6">공부 시간 기록</h3>
            
            {/* Task Info Card */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl mb-8 border border-gray-100">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                <IoTime className="text-xl text-sky-950" />
              </div>
              <div className="flex items-center gap-2 overflow-hidden flex-1">
                <span className="text-sm font-bold text-slate-800 truncate">{selectedTask.title}</span>
                <div className={`px-1.5 py-0.5 rounded-[5px] outline outline-1 outline-offset-[-1px] flex-shrink-0 flex justify-center items-center ${getSubjectStyles(selectedTask.subject)}`}>
                  <span className="text-[9px] font-bold leading-none">{getSubjectLabel(selectedTask.subject)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* 시작 시간 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 ml-1">시작 시간</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="time" 
                    value={timeRecord.startTime} 
                    onChange={(e) => handleTimeChange('startTime', e.target.value)} 
                    className="flex-1 h-12 px-4 bg-gray-50 border-none rounded-2xl text-base font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 transition-all outline-none" 
                  />
                  <div className="flex gap-1">
                    <button onClick={() => adjustTime('startTime', -10)} className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-xl text-slate-600 text-[10px] font-bold active:scale-90 transition-all border border-gray-100 shadow-sm">-10m</button>
                    <button onClick={() => adjustTime('startTime', 10)} className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-xl text-slate-600 text-[10px] font-bold active:scale-90 transition-all border border-gray-100 shadow-sm">+10m</button>
                  </div>
                </div>
              </div>

              {/* 종료 시간 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 ml-1">종료 시간</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="time" 
                    value={timeRecord.endTime} 
                    onChange={(e) => handleTimeChange('endTime', e.target.value)} 
                    className="flex-1 h-12 px-4 bg-gray-50 border-none rounded-2xl text-base font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 transition-all outline-none" 
                  />
                  <div className="flex gap-1">
                    <button onClick={() => adjustTime('endTime', -10)} className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-xl text-slate-600 text-[10px] font-bold active:scale-90 transition-all border border-gray-100 shadow-sm">-10m</button>
                    <button onClick={() => adjustTime('endTime', 10)} className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-xl text-slate-600 text-[10px] font-bold active:scale-90 transition-all border border-gray-100 shadow-sm">+10m</button>
                  </div>
                </div>
              </div>
              
              {timeOverlapError && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-[11px] text-red-600 font-medium leading-relaxed">{timeOverlapError}</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => { 
                  setShowStudyTimeModal(false); 
                  setTimeRecord({ taskId: '', startTime: '', endTime: '' }); 
                  setTimeOverlapError(null);
                }}
                className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold active:scale-95 transition-transform"
              >
                취소
              </button>
              <button 
                onClick={handleSubmitStudyTime}
                disabled={!!timeOverlapError || !timeRecord.startTime || !timeRecord.endTime}
                className="flex-[2] py-4 bg-[#B0D4FF] text-sky-950 rounded-2xl font-bold shadow-lg shadow-blue-200/50 active:scale-95 transition-all disabled:bg-gray-200 disabled:shadow-none disabled:text-gray-400"
              >
                기록 완료
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showSubmitModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 font-['Pretendard']" style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-1">과제 제출</h3>
            <p className="text-xs text-gray-500 mb-6">{selectedTask.title}</p>
            <div className="space-y-5">
              {/* 공부시간 설정 섹션 */}
              {selectedTask.studyLogs.length === 0 && (
                <div className="flex flex-col gap-2 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <IoTime className="text-blue-600 text-lg" />
                    <label className="text-sm font-semibold text-blue-900">공부시간 설정 (필수)</label>
                  </div>
                  <p className="text-xs text-blue-700 mb-3">과제 제출을 위해 공부시간을 먼저 설정해주세요.</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={timeRecord.startTime}
                      onChange={(e) => handleTimeChange('startTime', e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:border-blue-400 transition-colors"
                    />
                    <span className="text-blue-600 font-medium">~</span>
                    <input
                      type="time"
                      value={timeRecord.endTime}
                      onChange={(e) => handleTimeChange('endTime', e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:border-blue-400 transition-colors"
                    />
                  </div>
                  {timeOverlapError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-2.5 bg-red-50 rounded-lg border border-red-100 mt-2"
                    >
                      <p className="text-xs text-red-600 font-medium leading-relaxed">
                        {timeOverlapError}
                      </p>
                    </motion.div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-800">사진 첨부</label>
                <div className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-4 relative overflow-hidden bg-gray-50/50">
                  {isUploading && (
                    <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-4 border-sky-950/20 border-t-sky-950 rounded-full animate-spin" />
                      <p className="text-[10px] font-bold text-sky-950 tracking-tight">이미지 업로드 중...</p>
                    </div>
                  )}
                  
                  {uploadedImageUrls.length === 0 ? (
                    <label className="w-full h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100/50 transition-colors rounded-xl">
                      <input type="file" multiple onChange={(e) => e.target.files && handleImageUpload(Array.from(e.target.files))} className="hidden" />
                      <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-2">
                        <span className="text-2xl text-slate-400 font-light">+</span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">과제 사진을 선택해주세요</span>
                      {selectedTask.isFixed && <p className="text-[10px] text-red-400 mt-1 font-bold">이미지 업로드 필수</p>}
                    </label>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {uploadedImageUrls.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden shadow-sm border border-white">
                          <img src={url} className="w-full h-full object-cover" alt={`upload-${i}`} />
                          <button 
                            onClick={() => setUploadedImageUrls(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-xs hover:bg-red-500 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {uploadedImageUrls.length < 6 && (
                        <label className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white transition-colors bg-white/50">
                          <input type="file" multiple onChange={(e) => e.target.files && handleImageUpload(Array.from(e.target.files))} className="hidden" />
                          <span className="text-xl text-slate-300">+</span>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <textarea value={submitComment} onChange={(e) => setSubmitComment(e.target.value)} className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl text-sm min-h-[120px] focus:ring-2 focus:ring-sky-900/10 transition-all placeholder:text-slate-400" placeholder="멘토에게 남길 한마디나 질문을 입력해주세요." />
            </div>
            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => setShowSubmitModal(false)} 
                className="flex-1 py-3 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleSubmitTask} 
                disabled={isUploading} 
                className={`flex-1 py-3 text-white rounded-xl font-medium transition-colors ${
                  isUploading 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-sky-950 active:scale-95'
                }`}
              >
                {isUploading ? '업로드 중' : '제출하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 공부 시간 기록 확인 모달 */}
      <AnimatePresence>
        {showConfirmTimeModal && confirmTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 font-['Pretendard']" style={{ zIndex: Z_INDEX.NOTIFICATION_DROPDOWN }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                <IoTime className="text-3xl text-blue-500" />
              </div>
              
              <h3 className="text-xl font-bold text-center text-slate-800 mb-4">공부 시간 기록</h3>
              
              <p className="text-sm text-gray-500 text-center leading-relaxed mb-8">
                공부시간 설정은 자가점검으로 공부를 완료했을 때만 설정하는 것이 좋습니다. <br/>
                공부를 완료하셨다면 체크박스로 시간 설정이 가능합니다. <br/>
                <span className="text-blue-600 font-bold mt-2 block">지금 완료 체크하고 기록하시겠습니까?</span>
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowConfirmTimeModal(false);
                    setConfirmTask(null);
                  }}
                  className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold active:scale-95 transition-transform"
                >
                  아니요
                </button>
                <button 
                  onClick={() => {
                    setShowConfirmTimeModal(false);
                    if (confirmTask) {
                      handleSelfCheck(confirmTask.id, 'DONE', confirmTask);
                    }
                    setConfirmTask(null);
                  }}
                  className="flex-[2] py-4 bg-sky-950 text-white rounded-2xl font-bold shadow-lg shadow-blue-900/20 active:scale-95 transition-transform"
                >
                  예
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TimeTable Overlay */}
      <AnimatePresence>
        {showTimeTablePopup && (
          <div className="fixed inset-0 flex justify-center md:justify-end items-center md:items-start md:pt-20 md:pr-10 pointer-events-none" style={{ zIndex: Z_INDEX.OVERLAY_BACKDROP }}>
            {/* 배경 오버레이 (PC) */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTimeTablePopup(false)}
              className="hidden md:block fixed inset-0 bg-black/20 pointer-events-auto" 
            />

            {/* 카드 */}
            <motion.div 
              initial={{ opacity: 0, x: 100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full h-full md:w-[384px] md:h-[852px] md:max-h-[90vh] bg-white relative flex flex-col shadow-2xl md:rounded-[32px] overflow-hidden pointer-events-auto"
            >
              {/* 헤더 */}
              <div className="w-full h-20 px-6 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTimeTablePopup(false)}
                    className="w-10 h-10 flex items-center justify-start text-zinc-800 hover:bg-gray-50 rounded-full transition-colors"
                  >
                    <IoIosArrowBack size={24} />
                  </button>
                  <h1 className="text-slate-800 text-xl font-semibold font-['Pretendard']">
                    타임테이블 
                    <span className="ml-2 text-sm font-medium text-gray-400">
                      {currentDate.getMonth() + 1}월 {currentDate.getDate()}일
                    </span>
                  </h1>
                </div>
              </div>

              {/* 스크롤 영역 */}
              <div className="flex-1 overflow-y-auto bg-gray-50/30 p-6">
                <div className="mb-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-gray-400 text-xs font-medium mb-1">학습 일자</span>
                      <span className="text-slate-800 text-base font-bold">
                        {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월 {currentDate.getDate()}일
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-gray-400 text-xs font-medium mb-1">총 학습 시간</span>
                      <span className="text-blue-600 text-base font-bold">{calculateTotalStudyTime()}</span>
                    </div>
                  </div>
                </div>

                <TimeTable
                  items={
                    plannerData?.tasks.flatMap((task) =>
                      task.studyLogs
                        .filter((log) => log.startTime && log.endTime)
                        .map((log): TimelineItem => ({
                          id: log.id || `${task.id}-${log.startTime}`,
                          type: 'assignment',
                          title: task.title,
                          subject: task.subject,
                          start: log.startTime!,
                          end: log.endTime!,
                        }))
                    ) || []
                  }
                  startHour={5}
                  endHour={23}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Date Picker Modal */}
      <AnimatePresence>
        {isDatePickerOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-6" style={{ zIndex: Z_INDEX.OVERLAY }}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDatePickerOpen(false)}
              className="fixed inset-0 bg-black/40"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-[340px] rounded-[32px] overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              {/* Header */}
              <div className="p-6 pb-2">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-slate-800">날짜 선택</h2>
                  <button onClick={() => setIsDatePickerOpen(false)} className="text-gray-400 p-1">&times;</button>
                </div>
                
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded-2xl mb-4">
                  <button 
                    onClick={() => {
                      if (draftMonth === 1) {
                        setDraftYear(draftYear - 1);
                        setDraftMonth(12);
                      } else {
                        setDraftMonth(draftMonth - 1);
                      }
                    }}
                    className="p-2 hover:bg-white rounded-xl transition-colors"
                  >
                    <IoIosArrowBack />
                  </button>
                  <span className="font-bold text-slate-800">{draftYear}년 {draftMonth}월</span>
                  <button 
                    onClick={() => {
                      if (draftMonth === 12) {
                        setDraftYear(draftYear + 1);
                        setDraftMonth(1);
                      } else {
                        setDraftMonth(draftMonth + 1);
                      }
                    }}
                    className="p-2 hover:bg-white rounded-xl transition-colors"
                  >
                    <IoIosArrowDown className="-rotate-90" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="px-6 pb-4">
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['월','화','수','목','금','토','일'].map(d => (
                    <span key={d} className="text-[10px] font-bold text-gray-400">{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarGrid.map((cell, idx) => {
                    const isSelected = cell.year === draftYear && cell.month === draftMonth && cell.day === draftDay;
                    const isToday = cell.year === new Date().getFullYear() && cell.month === (new Date().getMonth() + 1) && cell.day === new Date().getDate();
                    
                    return (
                      <button
                        key={idx}
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
                          h-9 rounded-xl flex items-center justify-center text-xs font-medium transition-all
                          ${!cell.inMonth ? 'text-gray-300' : 'text-slate-700'}
                          ${isSelected ? 'bg-sky-950 text-white shadow-lg shadow-sky-900/20' : cell.inMonth ? 'hover:bg-gray-50' : ''}
                          ${isToday && !isSelected ? 'text-blue-600 font-bold' : ''}
                        `}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 pt-2 bg-gray-50/50 flex gap-2">
                <button 
                  onClick={handleGoToToday}
                  className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  오늘
                </button>
                <button 
                  onClick={handleApplyDatePicker}
                  className="flex-[2] py-3 bg-sky-950 text-white text-xs font-bold rounded-2xl shadow-lg shadow-sky-900/20 active:scale-95 transition-transform"
                >
                  이 날짜로 이동
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <WorksheetSelectionModal
        isOpen={showWorksheetModal}
        onClose={() => setShowWorksheetModal(false)}
        worksheet={selectedWorksheet}
      />

      <AlertModal 
        isOpen={alertState.isOpen} 
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))} 
        title={alertState.title} 
        message={alertState.message} 
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTaskIdToDelete(null);
        }}
        onConfirm={performDeleteTask}
        title="학습 삭제"
        message="정말 이 학습을 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다."
        confirmText="삭제하기"
        cancelText="취소"
        variant="danger"
      />

      <ConfirmModal
        isOpen={showAlreadySubmittedModal}
        onClose={() => {
          setShowAlreadySubmittedModal(false);
          setTaskToNavigate(null);
        }}
        onConfirm={() => {
          if (taskToNavigate) {
            router.push(`/mentee/tasks/${taskToNavigate.id}`);
          }
        }}
        title="이미 제출된 과제"
        message="이미 제출한 과제입니다. 제출 내용을 확인하거나 피드백 대화 페이지로 이동하시겠습니까?"
        confirmText="이동하기"
        cancelText="취소"
      />

    </div>
  );
}