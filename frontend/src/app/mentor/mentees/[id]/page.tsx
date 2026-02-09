'use client';
import { getApiUrl } from '@/lib/api';
import { EditIcon, DeleteIcon } from '@/components/icons';
import { getSubjectLabel, getSubjectBadgeColor } from '@/constants/subjects';
import { getSelfCheckInfo, type SelfCheckStatus } from '@/constants/selfCheck';
import { getTaskStatusInfo } from '@/constants/taskStatus';
import StreakBadge from '@/components/streak/StreakBadge';
import Heatmap from '@/components/heatmap/Heatmap';
import { toast } from '@/stores/useToastStore';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, startOfWeek, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { motion } from 'framer-motion';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH';
type ViewMode = 'daily' | 'weekly' | 'monthly';
type ActiveTab = 'tasks' | 'menteeDetails';

interface Task {
  id: string;
  title: string;
  description: string | null;
  subject: Subject;
  date: string;
  isCompleted: boolean;
  isFixed: boolean;
  // 자가점검 (멘티용)
  selfCheck: SelfCheckStatus;
  selfCheckedAt?: string;
  // 멘토 승인 (달성률 반영)
  isApproved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  worksheet?: {
    id: string;
    title: string;
  } | null;
  submissions: any[];
  feedbacks: any[];
  studyLogs: { duration: number }[];
}

interface Mentee {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  grade?: string;
  school?: string;
  track?: string;
  gender?: string;
  totalTasks: number;
  completedTasks: number;
}

export default function MenteePlannerPage() {
  const params = useParams();
  const router = useRouter();
  const menteeId = params.id as string;

  const [activeTab, setActiveTab] = useState<ActiveTab>('tasks');
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);

  // 쿼리 파라미터 처리
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const dateParam = urlParams.get('date');
      const tabParam = urlParams.get('tab') as ActiveTab;

      if (tabParam && (tabParam === 'tasks' || tabParam === 'menteeDetails')) {
        setActiveTab(tabParam);
      }

      if (dateParam) {
        const parsedDate = new Date(dateParam);
        if (!isNaN(parsedDate.getTime())) {
          setSelectedDate(parsedDate);
          setViewMode('daily');
        }
      }
    }
  }, [menteeId]);

  const [mentee, setMentee] = useState<Mentee | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    subject: 'KOREAN' as Subject,
    date: '',
  });

  // 스트릭 & 히트맵 상태
  const [streakData, setStreakData] = useState<{ currentStreak: number; longestStreak: number } | null>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // 멘티 정보 가져오기
  const fetchMentee = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentor/mentees/${menteeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('멘티 정보를 불러오는데 실패했습니다.');

      const data = await res.json();
      setMentee(data);
    } catch (err) {
      console.error('Fetch mentee error:', err);
    }
  };

  // 스트릭 데이터 조회
  const fetchStreak = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentor/mentees/${menteeId}/streak`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('스트릭 데이터를 불러오는데 실패했습니다.');
      const data = await res.json();
      setStreakData(data || null);
    } catch (err) {
      console.error('Streak error:', err);
    }
  };

  // 히트맵 데이터 조회
  const fetchHeatmap = async (year: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentor/mentees/${menteeId}/heatmap?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('히트맵 데이터를 불러오는데 실패했습니다.');
      const data = await res.json();
      setHeatmapData(data.data || []);
    } catch (err) {
      console.error('Heatmap error:', err);
    }
  };

  // 플래너 데이터 가져오기
  const fetchPlanner = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = '';

      if (viewMode === 'daily') {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        url = `${getApiUrl()}/api/mentor/mentees/${menteeId}/planner/daily?date=${dateStr}`;
      } else if (viewMode === 'weekly') {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
        const dateStr = format(weekStart, 'yyyy-MM-dd');
        url = `${getApiUrl()}/api/mentor/mentees/${menteeId}/planner/weekly?startDate=${dateStr}`;
      } else if (viewMode === 'monthly') {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth() + 1;
        url = `${getApiUrl()}/api/mentor/mentees/${menteeId}/planner/monthly?year=${year}&month=${month}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('플래너를 불러오는데 실패했습니다.');

      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Fetch planner error:', err);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchMentee();
    fetchStreak();
  }, [menteeId]);

  useEffect(() => {
    fetchHeatmap(selectedYear);
  }, [menteeId, selectedYear]);

  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchPlanner();
    }
  }, [activeTab, viewMode, selectedDate, menteeId]);

  // 수정 모달 열기
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditFormData({
      title: task.title,
      description: task.description || '',
      subject: task.subject,
      date: format(new Date(task.date), 'yyyy-MM-dd'),
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingTask(null);
  };


  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentor/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });
      if (!res.ok) throw new Error('과제 수정에 실패했습니다.');
      toast.success('과제가 수정되었습니다.');
      closeEditModal();
      fetchPlanner();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentor/tasks/${task.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('과제 삭제에 실패했습니다.');
      toast.success('과제가 삭제되었습니다.');
      fetchPlanner();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  // 과제 날짜별 그룹화
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      const dateKey = format(new Date(task.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(task);
    });
    return groups;
  }, [tasks]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedTasks).sort((a, b) => a.localeCompare(b));
  }, [groupedTasks]);

  const changeDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'daily') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'monthly') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const formatDateDisplay = () => {
    if (viewMode === 'daily') {
      return format(selectedDate, 'yyyy년 M월 d일 (E)', { locale: ko });
    } else if (viewMode === 'weekly') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const weekEnd = addDays(weekStart, 6);
      return `${format(weekStart, 'M월 d일', { locale: ko })} - ${format(weekEnd, 'M월 d일', { locale: ko })}`;
    } else {
      return format(selectedDate, 'yyyy년 M월', { locale: ko });
    }
  };

  // 탭 네비게이션 렌더링
  const renderTabs = () => (
    <div className="flex flex-wrap gap-2 mb-8 p-1.5 bg-gray-50 rounded-[24px] w-fit">
      {[
        { id: 'tasks', label: '과제 관리', icon: '📋' },
        { id: 'menteeDetails', label: '멘티 상세 관리', icon: '👤' },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as ActiveTab)}
          className={`px-6 py-3 rounded-2xl text-[13px] font-bold transition-all flex items-center gap-2 ${
            activeTab === tab.id
              ? 'bg-white text-slate-800 shadow-md transform scale-[1.02]'
              : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
          }`}
        >
          <span>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );

  const renderTaskCard = (task: Task) => {
    const studyTime = task.studyLogs.reduce((sum, log) => sum + log.duration, 0);
    const selfCheckInfo = getSelfCheckInfo(task.selfCheck || 'PENDING');
    const statusInfo = getTaskStatusInfo(task);

    return (
      <div key={task.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className={`px-2 py-0.5 rounded-lg ${getSubjectBadgeColor(task.subject)}`}>
                <span className="text-[10px] font-bold">{getSubjectLabel(task.subject)}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${statusInfo.style}`}>{statusInfo.label}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-lg bg-gray-50 font-bold ${selfCheckInfo.color}`}>
                {selfCheckInfo.icon} 자가점검: {selfCheckInfo.label}
              </span>
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-2 truncate">{task.title}</h4>
            {task.description && <p className="text-sm text-gray-500 mb-4 line-clamp-2">{task.description}</p>}
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5"><span className="text-gray-400 text-xs font-medium">제출</span><span className="text-slate-800 text-xs font-bold">{task.submissions.length}</span></div>
              <div className="flex items-center gap-1.5"><span className="text-gray-400 text-xs font-medium">피드백</span><span className="text-slate-800 text-xs font-bold">{task.feedbacks.length}</span></div>
              <div className="flex items-center gap-1.5"><span className="text-gray-400 text-xs font-medium">학습시간</span><span className="text-blue-500 text-xs font-bold">{Math.floor(studyTime / 60)}분</span></div>
            </div>
            {(() => {
              const hasSubmissions = task.submissions && task.submissions.length > 0;
              const hasFeedbacks = task.feedbacks && task.feedbacks.length > 0;

              if (hasFeedbacks) {
                return (
                  <button 
                    onClick={() => router.push(`/mentor/tasks/${task.id}`)} 
                    className="mt-3 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-0.5 transition-colors"
                  >
                    <span>💬 피드백 대화 연결하기</span>
                    <span>›</span>
                  </button>
                );
              }

              if (hasSubmissions) {
                return (
                  <button 
                    onClick={() => router.push(`/mentor/tasks/${task.id}`)} 
                    className="mt-3 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5 transition-colors"
                  >
                    <span>✍️ 피드백 작성하러 가기</span>
                    <span>›</span>
                  </button>
                );
              }

              return null;
            })()}
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <div className="flex gap-2 justify-end">
              <button onClick={() => openEditModal(task)} className="p-2.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><EditIcon size={18} /></button>
              <button onClick={() => handleDeleteTask(task)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><DeleteIcon size={18} /></button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTaskView = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 p-1.5 bg-gray-50 rounded-2xl w-fit">
          {(['daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                viewMode === mode ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-400'
              }`}
            >
              {mode === 'daily' ? '일일' : mode === 'weekly' ? '주간' : '월간'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowNewTaskForm(!showNewTaskForm)}
          className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
            showNewTaskForm
              ? 'bg-slate-800 text-white shadow-lg'
              : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md'
          }`}
        >
          <span>{showNewTaskForm ? '목록으로' : '➕ 과제 등록'}</span>
        </button>
      </div>

      {showNewTaskForm ? (
        <NewTaskInTab
          menteeId={menteeId}
          menteeName={mentee?.name || ''}
          onSuccess={() => {
            setShowNewTaskForm(false);
            fetchPlanner();
          }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <button onClick={() => changeDate('prev')} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><IoIosArrowBack size={20} className="text-gray-400" /></button>
            <h3 className="text-lg font-bold text-slate-800">{formatDateDisplay()}</h3>
            <button onClick={() => changeDate('next')} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><IoIosArrowForward size={20} className="text-gray-400" /></button>
          </div>

          {isLoading ? (
            <div className="py-20 flex items-center justify-center text-gray-400">데이터를 불러오는 중...</div>
          ) : tasks.length === 0 ? (
            <div className="py-20 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-400 font-medium">배정된 과제가 없습니다.</p>
            </div>
          ) : viewMode === 'daily' ? (
            <div className="grid grid-cols-1 gap-4">{tasks.map((task) => renderTaskCard(task))}</div>
          ) : (
            <div className="space-y-12">
              {sortedDates.map((date) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-6 px-1">
                    <div className="h-4 w-1 rounded-full bg-blue-500" />
                    <h4 className="text-base font-bold text-slate-800">{format(new Date(date), 'yyyy년 M월 d일 (E)', { locale: ko })}</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4">{groupedTasks[date].map((task) => renderTaskCard(task))}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderMenteeDetailsView = () => (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-50">
              {mentee?.profileImage ? <img src={mentee.profileImage} alt={mentee.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-300 flex items-center justify-center text-white text-3xl font-bold">{mentee?.name[0]}</div>}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">{mentee?.name}</h2>
              <p className="text-gray-400 font-medium">{mentee?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-2xl"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Grade</p><p className="font-bold text-slate-700">{mentee?.grade || '-'}</p></div>
            <div className="p-4 bg-gray-50 rounded-2xl"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Track</p><p className="font-bold text-slate-700">{mentee?.track || '-'}</p></div>
            <div className="p-4 bg-gray-50 rounded-2xl"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">School</p><p className="font-bold text-slate-700">{mentee?.school || '-'}</p></div>
            <div className="p-4 bg-gray-50 rounded-2xl"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Gender</p><p className="font-bold text-slate-700">{mentee?.gender || '-'}</p></div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-[32px] p-8 text-white shadow-xl shadow-slate-200">
          <h4 className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-wider">학습 현황 요약</h4>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2"><span className="text-slate-400 text-sm font-bold">과제 달성률</span><span className="text-2xl font-black">{mentee?.totalTasks ? Math.round((mentee.completedTasks / mentee.totalTasks) * 100) : 0}%</span></div>
              <div className="h-3 w-full bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-blue-400" style={{ width: `${mentee?.totalTasks ? (mentee.completedTasks / mentee.totalTasks) * 100 : 0}%` }} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-slate-700/50 p-4 rounded-2xl"><p className="text-xs text-slate-400 mb-1">총 과제</p><p className="text-xl font-bold">{mentee?.totalTasks || 0}개</p></div>
              <div className="bg-slate-700/50 p-4 rounded-2xl"><p className="text-xs text-slate-400 mb-1">완료 과제</p><p className="text-xl font-bold">{mentee?.completedTasks || 0}개</p></div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
          <h4 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-wider">학습 스트릭</h4>
          <StreakBadge currentStreak={streakData?.currentStreak || 0} longestStreak={streakData?.longestStreak || 0} variant="full" />
        </div>
        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
          <h4 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-wider">연간 학습 기록</h4>
          <Heatmap data={heatmapData} year={selectedYear} onYearChange={setSelectedYear} />
        </div>
      </div>
    </div>
  );


  return (
    <div className="w-full min-h-screen bg-white font-['Pretendard'] pb-32">
      <div className="w-full h-20 px-10 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-[20] border-b border-gray-50">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/mentor')} className="w-10 h-10 flex items-center justify-start text-zinc-800 hover:bg-gray-50 rounded-full transition-colors"><IoIosArrowBack size={24} /></button>
          <h1 className="text-slate-800 text-xl font-bold">멘티 관리 시스템</h1>
        </div>
        {mentee && (
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm border border-white">
              {mentee.profileImage ? <img src={mentee.profileImage} alt={mentee.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-400 flex items-center justify-center text-white text-xs font-bold">{mentee.name[0]}</div>}
            </div>
            <span className="text-sm font-bold text-slate-700">{mentee.name} 학생</span>
          </div>
        )}
      </div>

      <div className="px-10 mt-10 max-w-[1200px] mx-auto">
        {renderTabs()}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {activeTab === 'tasks' && renderTaskView()}
          {activeTab === 'menteeDetails' && renderMenteeDetailsView()}
        </motion.div>
      </div>

      {showEditModal && <EditTaskModal task={editingTask!} onClose={closeEditModal} onUpdate={handleUpdateTask} formData={editFormData} setFormData={setEditFormData} />}
    </div>
  );
}

// ----------------- Sub-components for Tabs -----------------

function NewTaskInTab({ menteeId, onSuccess }: any) {
  // Integrated simplified logic from NewTaskPage
  const [taskName, setTaskName] = useState('');
  const [goal, setGoal] = useState('');
  const [subject, setSubject] = useState<Subject>('KOREAN');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: any) => {
    e.preventDefault();
    if (!taskName) { toast.warning('과제명을 입력해주세요.'); return; }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentor/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ menteeId, title: taskName, description: goal, subject, date, materials: [] })
      });
      if (!res.ok) throw new Error('과제 등록 실패');
      toast.success('등록되었습니다.');
      onSuccess();
    } catch (err) { toast.error('실패했습니다.'); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 bg-white rounded-[40px] border border-gray-100 p-12 shadow-sm">
      <h2 className="text-2xl font-black text-slate-800 mb-10 flex items-center gap-3"><span>➕</span> 새로운 과제 등록</h2>
      <form onSubmit={onSubmit} className="space-y-8">
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">과목 선택</label><select value={subject} onChange={e => setSubject(e.target.value as Subject)} className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-400 focus:bg-white text-base font-semibold text-slate-700 outline-none transition-all"><option value="KOREAN">국어</option><option value="ENGLISH">영어</option><option value="MATH">수학</option></select></div>
          <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">날짜</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-400 focus:bg-white text-base font-semibold text-slate-700 outline-none transition-all" /></div>
        </div>
        <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">과제명</label><input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-400 focus:bg-white text-base font-semibold text-slate-700 outline-none transition-all" placeholder="과제 이름을 입력하세요" /></div>
        <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">상세 설명</label><textarea value={goal} onChange={e => setGoal(e.target.value)} className="w-full px-6 py-5 rounded-3xl bg-gray-50 border-2 border-transparent focus:border-blue-400 focus:bg-white text-base font-medium text-slate-600 leading-relaxed transition-all h-40 resize-none outline-none" placeholder="과제에 대한 설명을 입력하세요" /></div>
        <button type="submit" disabled={isSubmitting} className="w-full py-5 rounded-2xl bg-slate-800 text-white font-black text-lg hover:bg-slate-900 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]">{isSubmitting ? '등록 중...' : '과제 등록하기'}</button>
      </form>
    </div>
  );
}

function EditTaskModal({ task, onClose, onUpdate, formData, setFormData }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-[32px] bg-white shadow-2xl overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-1.5 h-6 rounded-full bg-blue-500" /><h2 className="text-lg font-bold text-slate-800">과제 수정</h2></div><button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>
        <form onSubmit={onUpdate} className="p-8 space-y-5">
          <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">과목</label><select value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all"><option value="KOREAN">국어</option><option value="ENGLISH">영어</option><option value="MATH">수학</option></select></div>
          <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">과제명</label><input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all" required /></div>
          <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">날짜</label><input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all" required /></div>
          <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">상세 설명</label><textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-4 rounded-2xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all h-32 resize-none" /></div>
          <div className="pt-4 flex gap-3"><button type="button" onClick={onClose} className="flex-1 px-6 py-3 rounded-2xl bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 transition-colors">취소</button><button type="submit" className="flex-1 px-6 py-3 rounded-2xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20">수정 완료</button></div>
        </form>
      </div>
    </div>
  );
}
