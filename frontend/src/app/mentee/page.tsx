'use client';
import { getApiUrl } from '@/lib/api';
import { EditIcon, DeleteIcon } from '@/components/icons';
import TimelineChart from '@/components/TimelineChart';
import NotificationBell from '@/components/NotificationBell';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type SelfCheckStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'NOT_DONE';

interface Task {
  id: string;
  title: string;
  description?: string;
  subject: string;
  isCompleted: boolean;
  isFixed: boolean;
  date: string;
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
  };
  submissions: any[];
  studyLogs: any[];
}

// 자가점검 상태 표시 설정
const SELF_CHECK_OPTIONS: { value: SelfCheckStatus; label: string; icon: string; color: string }[] = [
  { value: 'PENDING', label: '미시작', icon: '○', color: 'text-gray-400' },
  { value: 'IN_PROGRESS', label: '진행중', icon: '△', color: 'text-yellow-500' },
  { value: 'DONE', label: '완료', icon: '✓', color: 'text-green-500' },
  { value: 'NOT_DONE', label: '미진행', icon: '✕', color: 'text-red-500' },
];

interface PlannerComment {
  id: string;
  content: string;
  date: string;
}

interface PlannerData {
  tasks: Task[];
  comment?: PlannerComment;
  date: string;
}

const DEFAULT_SUBJECTS = [
  { value: 'KOREAN', label: '국어', color: 'bg-blue-100 text-blue-800' },
  { value: 'ENGLISH', label: '영어', color: 'bg-green-100 text-green-800' },
  { value: 'MATH', label: '수학', color: 'bg-purple-100 text-purple-800' },
];

const getSubjectLabel = (subject: string) => {
  const found = DEFAULT_SUBJECTS.find((s) => s.value === subject);
  return found ? found.label : subject;
};

const getSubjectColor = (subject: string) => {
  const found = DEFAULT_SUBJECTS.find((s) => s.value === subject);
  return found ? found.color : 'bg-gray-100 dark:bg-gray-700 text-gray-800';
};

interface DashboardData {
  todayStats: {
    total: number;
    completed: number;
    progressRate: number;
  };
  yesterdayFeedbacks: Array<{
    id: string;
    content: string;
    summary?: string;
    task: {
      title: string;
      subject: string;
    };
    mentor: {
      name: string;
    };
  }>;
}

export default function MenteeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [plannerData, setPlannerData] = useState<PlannerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dailyFeedback, setDailyFeedback] = useState<any>(null);

  // 모달 상태
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [showStudyTimeModal, setShowStudyTimeModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // 공부 시간 기록 상태
  const [timeRecord, setTimeRecord] = useState({
    taskId: '',
    startTime: '',
    endTime: '',
  });

  // 할 일 추가 폼 상태
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    subject: 'KOREAN',
    customSubject: '',
  });

  // 반복 설정 상태
  const [repeatMode, setRepeatMode] = useState<'single' | 'repeat'>('single');
  const [repeatSettings, setRepeatSettings] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    weekdays: {
      0: false, // 일요일
      1: false, // 월요일
      2: false, // 화요일
      3: false, // 수요일
      4: false, // 목요일
      5: false, // 금요일
      6: false, // 토요일
    },
  });

  // 할 일 수정 폼 상태
  const [editTask, setEditTask] = useState({
    id: '',
    title: '',
    description: '',
    subject: '',
    customSubject: '',
    date: '',
  });

  // 과제 제출 폼 상태
  const [submitComment, setSubmitComment] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // 날짜 포맷팅
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 로컬 타임존 기준 날짜 포맷팅 (YYYY-MM-DD)
  const formatDateForApi = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 플래너 데이터 가져오기
  const fetchPlannerData = async (date: Date) => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const dateStr = formatDateForApi(date);

      const res = await fetch(`${getApiUrl()}/api/mentee/planner?date=${dateStr}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('플래너를 불러오는데 실패했습니다.');
      }

      const data = await res.json();
      setPlannerData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 자가점검 상태 변경
  const handleSelfCheck = async (taskId: string, newStatus: SelfCheckStatus) => {
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/mentee/tasks/${taskId}/self-check`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ selfCheck: newStatus }),
      });

      if (!res.ok) {
        throw new Error('자가점검 저장에 실패했습니다.');
      }

      fetchPlannerData(currentDate);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  // 반복 날짜 계산
  const calculateRepeatDates = () => {
    const dates: string[] = [];
    const start = new Date(repeatSettings.startDate);
    const end = new Date(repeatSettings.endDate);

    // 선택된 요일 확인
    const selectedWeekdays = Object.entries(repeatSettings.weekdays)
      .filter(([_, selected]) => selected)
      .map(([day, _]) => parseInt(day));

    if (selectedWeekdays.length === 0) {
      return dates;
    }

    // 시작일부터 종료일까지 순회
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (selectedWeekdays.includes(d.getDay())) {
        dates.push(formatDateForApi(new Date(d)));
      }
    }

    return dates;
  };

  // 할 일 추가
  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      alert('할 일 제목을 입력해주세요.');
      return;
    }

    const finalSubject = newTask.subject === 'CUSTOM' ? newTask.customSubject : newTask.subject;
    if (!finalSubject) {
      alert('과목을 선택하거나 입력해주세요.');
      return;
    }

    // 반복 모드일 때 요일 선택 확인
    if (repeatMode === 'repeat') {
      const hasSelectedWeekday = Object.values(repeatSettings.weekdays).some((selected) => selected);
      if (!hasSelectedWeekday) {
        alert('최소 하나의 요일을 선택해주세요.');
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');

      // 날짜 목록 계산
      const dates =
        repeatMode === 'repeat'
          ? calculateRepeatDates()
          : [formatDateForApi(currentDate)];

      if (dates.length === 0) {
        alert('선택한 요일에 해당하는 날짜가 없습니다.');
        return;
      }

      // 각 날짜에 대해 할 일 생성
      for (const dateStr of dates) {
        const res = await fetch(`${getApiUrl()}/api/mentee/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: newTask.title,
            description: newTask.description,
            subject: finalSubject,
            date: dateStr,
          }),
        });

        if (!res.ok) {
          throw new Error('할 일 추가에 실패했습니다.');
        }
      }

      const successMessage =
        repeatMode === 'repeat'
          ? `${dates.length}개의 할 일이 추가되었습니다.`
          : '할 일이 추가되었습니다.';
      alert(successMessage);

      setShowAddTaskModal(false);
      setNewTask({ title: '', description: '', subject: 'KOREAN', customSubject: '' });
      setRepeatMode('single');
      setRepeatSettings({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        weekdays: {
          0: false,
          1: false,
          2: false,
          3: false,
          4: false,
          5: false,
          6: false,
        },
      });
      fetchPlannerData(currentDate);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  // 할 일 수정 모달 열기
  const openEditModal = (task: Task) => {
    const isDefaultSubject = DEFAULT_SUBJECTS.some((s) => s.value === task.subject);
    // ISO 날짜를 YYYY-MM-DD 형식으로 변환 (input[type="date"] 호환)
    const dateStr = task.date.includes('T') ? task.date.split('T')[0] : task.date;
    setEditTask({
      id: task.id,
      title: task.title,
      description: task.description || '',
      subject: isDefaultSubject ? task.subject : 'CUSTOM',
      customSubject: isDefaultSubject ? '' : task.subject,
      date: dateStr,
    });
    setShowEditTaskModal(true);
  };

  // 할 일 수정
  const handleEditTask = async () => {
    if (!editTask.title.trim()) {
      alert('할 일 제목을 입력해주세요.');
      return;
    }

    const finalSubject = editTask.subject === 'CUSTOM' ? editTask.customSubject : editTask.subject;
    if (!finalSubject) {
      alert('과목을 선택하거나 입력해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/mentee/tasks/${editTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTask.title,
          description: editTask.description,
          subject: finalSubject,
          date: editTask.date,
        }),
      });

      if (!res.ok) {
        throw new Error('할 일 수정에 실패했습니다.');
      }

      alert('할 일이 수정되었습니다.');
      setShowEditTaskModal(false);
      fetchPlannerData(currentDate);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  // 할 일 삭제
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/mentee/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('할 일 삭제에 실패했습니다.');
      }

      alert('할 일이 삭제되었습니다.');
      fetchPlannerData(currentDate);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  // 시간을 분으로 변환 ("09:00" -> 540)
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // 분을 시간 문자열로 변환 (90 -> "1시간 30분")
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}분`;
    if (mins === 0) return `${hours}시간`;
    return `${hours}시간 ${mins}분`;
  };

  // 공부 시간 기록 모달 열기
  const handleRecordStudyTime = (taskId: string) => {
    setTimeRecord({ taskId, startTime: '', endTime: '' });
    setShowStudyTimeModal(true);
  };

  // 공부 시간 기록 제출
  const handleSubmitStudyTime = async () => {
    const { taskId, startTime, endTime } = timeRecord;

    // 유효성 검사
    if (!startTime || !endTime) {
      alert('시작 시간과 종료 시간을 모두 입력해주세요.');
      return;
    }

    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);

    if (startMinutes >= endMinutes) {
      alert('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

    const duration = endMinutes - startMinutes;

    try {
      const token = localStorage.getItem('token');
      const dateStr = formatDateForApi(currentDate);

      const res = await fetch(`${getApiUrl()}/api/mentee/tasks/${taskId}/time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          duration,
          startTime,
          endTime,
          date: dateStr,
        }),
      });

      if (!res.ok) {
        throw new Error('공부 시간 기록에 실패했습니다.');
      }

      alert('공부 시간이 기록되었습니다.');
      setShowStudyTimeModal(false);
      setTimeRecord({ taskId: '', startTime: '', endTime: '' });
      fetchPlannerData(currentDate);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  // 이미지 업로드
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!res.ok) {
          throw new Error('이미지 업로드에 실패했습니다.');
        }

        const data = await res.json();
        urls.push(data.url);
      }

      setUploadedImageUrls([...uploadedImageUrls, ...urls]);
      alert(`${files.length}개의 이미지가 업로드되었습니다.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  // 과제 제출 모달 열기
  const openSubmitModal = (task: Task) => {
    setSelectedTask(task);
    setShowSubmitModal(true);
    setSubmitComment('');
    setSelectedImages([]);
    setUploadedImageUrls([]);
    setIsUploading(false); // 업로드 상태 초기화
  };

  // 과제 제출
  const handleSubmitTask = async () => {
    if (!selectedTask) {
      console.log('선택된 과제가 없습니다.');
      return;
    }

    console.log('과제 제출 시도:', {
      isFixed: selectedTask.isFixed,
      hasImages: uploadedImageUrls.length > 0,
      imageCount: uploadedImageUrls.length,
      hasComment: !!submitComment.trim(),
      commentLength: submitComment.length,
    });

    // 멘토가 생성한 과제(isFixed=true): 이미지 필수
    if (selectedTask.isFixed) {
      if (uploadedImageUrls.length === 0) {
        alert('멘토가 생성한 과제는 이미지 업로드가 필수입니다.');
        return;
      }
    } else {
      // 멘티가 자체 생성한 과제(isFixed=false): 이미지 또는 코멘트 중 하나는 필수
      if (uploadedImageUrls.length === 0 && !submitComment.trim()) {
        alert('이미지를 업로드하거나 코멘트를 작성해주세요.');
        return;
      }
    }

    console.log('검증 통과, 제출 시작');

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/mentee/tasks/${selectedTask.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageUrls: uploadedImageUrls,
          comment: submitComment,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('제출 실패:', res.status, errorData);
        throw new Error(errorData.error || '과제 제출에 실패했습니다.');
      }

      alert('과제가 제출되었습니다.');
      setShowSubmitModal(false);
      setSubmitComment('');
      setSelectedImages([]);
      setUploadedImageUrls([]);
      setIsUploading(false);
      fetchPlannerData(currentDate);
    } catch (err) {
      console.error('과제 제출 에러:', err);
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  // 대시보드 데이터 가져오기
  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentee/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    }
  };

  const fetchDailyFeedback = async (date: Date) => {
    try {
      const token = localStorage.getItem('token');
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      const res = await fetch(`${getApiUrl()}/api/mentee/daily-feedbacks?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDailyFeedback(data);
      } else {
        setDailyFeedback(null);
      }
    } catch (error) {
      console.error('Daily feedback fetch error:', error);
      setDailyFeedback(null);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
    fetchDashboard();
  }, []);

  useEffect(() => {
    fetchPlannerData(currentDate);
    fetchDailyFeedback(currentDate);
  }, [currentDate]);

  return (
    <div className="px-4 sm:px-6 md:px-8 py-4 pb-20">
      {/* 헤더 */}
      <div className="mb-4 sm:mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs sm:text-sm text-gray-900 dark:text-gray-300">안녕하세요</p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold dark:text-white">
            {user?.nickname || user?.name || '멘티'}
            {user?.nickname && user?.name && <span className="text-base sm:text-lg font-normal dark:text-gray-300">({user.name})</span>}님
          </h2>
        </div>
        <NotificationBell />
      </div>

      {/* 오늘 학습 진행율 */}
      {dashboard && (
        <div className="mb-4 sm:mb-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 sm:p-5 md:p-6 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm opacity-90">오늘 학습 진행율</span>
            <span className="text-xl sm:text-2xl md:text-3xl font-bold">{dashboard.todayStats.progressRate}%</span>
          </div>
          <div className="w-full bg-blue-400 rounded-full h-2 sm:h-2.5">
            <div
              className="bg-white h-2 sm:h-2.5 rounded-full transition-all"
              style={{ width: `${dashboard.todayStats.progressRate}%` }}
            />
          </div>
          <p className="text-xs sm:text-sm mt-2 opacity-80">
            {dashboard.todayStats.completed}/{dashboard.todayStats.total} 완료
          </p>
        </div>
      )}

      {/* 오늘의 일일 전체 피드백 */}
      {dailyFeedback && (
        <div className="mb-4 bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📝</span>
            <span className="font-semibold text-blue-800">오늘의 전체 피드백</span>
            <span className="text-xs text-blue-600">
              {dailyFeedback.mentor?.nickname || dailyFeedback.mentor?.name} 멘토
            </span>
          </div>
          {dailyFeedback.summary && (
            <div className="bg-white p-3 rounded border border-blue-100 mb-2">
              <p className="text-sm font-medium text-blue-900">{dailyFeedback.summary}</p>
            </div>
          )}
          <div className="bg-white p-3 rounded border border-blue-100">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{dailyFeedback.content}</p>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            작성일: {new Date(dailyFeedback.createdAt).toLocaleString('ko-KR')}
          </p>
        </div>
      )}

      {/* 어제 피드백 요약 */}
      {dashboard && dashboard.yesterdayFeedbacks.length > 0 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💬</span>
            <span className="font-semibold text-yellow-800">어제 받은 피드백</span>
          </div>
          <div className="space-y-2">
            {dashboard.yesterdayFeedbacks.slice(0, 2).map((feedback) => (
              <div key={feedback.id} className="bg-white p-3 rounded border border-yellow-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${getSubjectColor(feedback.task.subject)}`}>
                    {getSubjectLabel(feedback.task.subject)}
                  </span>
                  <span className="text-xs text-gray-500">{feedback.mentor.name} 멘토</span>
                </div>
                <p className="text-sm font-medium text-gray-800">{feedback.task.title}</p>
                <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                  {feedback.summary || feedback.content}
                </p>
              </div>
            ))}
            {dashboard.yesterdayFeedbacks.length > 2 && (
              <button
                onClick={() => router.push('/mentee/feedbacks')}
                className="text-sm text-yellow-700 hover:underline"
              >
                +{dashboard.yesterdayFeedbacks.length - 2}개 더 보기
              </button>
            )}
          </div>
        </div>
      )}

      {/* 날짜 */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold dark:text-white">{formatDate(currentDate)}</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs sm:text-sm bg-gray-100 dark:bg-gray-700 rounded">일</button>
            <button
              onClick={() => router.push('/mentee/planner/weekly')}
              className="px-3 py-1.5 text-xs sm:text-sm text-gray-900 dark:text-gray-300 rounded hover:bg-gray-100 dark:bg-gray-700"
            >
              주
            </button>
            <button
              onClick={() => router.push('/mentee/planner/monthly')}
              className="px-3 py-1.5 text-xs sm:text-sm text-gray-900 dark:text-gray-300 rounded hover:bg-gray-100 dark:bg-gray-700"
            >
              월
            </button>
          </div>
        </div>
      </div>

      {/* 할 일 목록 - 과목별 그룹화 */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <h3 className="text-base sm:text-lg font-semibold">오늘의 할 일</h3>
          {plannerData && plannerData.tasks.length > 0 && (
            <span className="text-xs sm:text-sm text-gray-500">
              {plannerData.tasks.filter(t => t.isApproved).length}/{plannerData.tasks.length} 승인됨
            </span>
          )}
        </div>

        {isLoading ? (
          <p className="text-gray-900 dark:text-gray-300">불러오는 중...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : plannerData && plannerData.tasks.length > 0 ? (
          // 과목별로 그룹화
          Object.entries(
            plannerData.tasks.reduce((groups, task) => {
              const subject = task.subject;
              if (!groups[subject]) {
                groups[subject] = [];
              }
              groups[subject].push(task);
              return groups;
            }, {} as Record<string, Task[]>)
          ).map(([subject, tasks]) => (
            <div key={subject} className="space-y-2">
              {/* 과목 헤더 */}
              <div className="flex items-center gap-2 sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 -mx-4 px-4">
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${getSubjectColor(subject)}`}>
                  {getSubjectLabel(subject)}
                </span>
                <span className="text-xs text-gray-500">
                  {tasks.filter(t => t.isApproved).length}/{tasks.length}
                </span>
              </div>
              {/* 해당 과목의 할 일들 */}
              {tasks.map((task) => (
            <div key={task.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
              <div className="flex items-start gap-3">
                {/* 자가점검 드롭다운 */}
                <select
                  value={task.selfCheck || 'PENDING'}
                  onChange={(e) => handleSelfCheck(task.id, e.target.value as SelfCheckStatus)}
                  className={`mt-0.5 text-lg bg-transparent border-none cursor-pointer ${
                    SELF_CHECK_OPTIONS.find(o => o.value === task.selfCheck)?.color || 'text-gray-400'
                  }`}
                  title="자가점검"
                >
                  {SELF_CHECK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded ${getSubjectColor(task.subject)}`}>
                      {getSubjectLabel(task.subject)}
                    </span>
                    {task.isFixed && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">멘토 지정</span>
                    )}
                    {/* 멘토 승인 표시 */}
                    {task.isApproved ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                        ✓ 승인됨
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                        승인 대기
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const taskDate = new Date(task.date);
                      taskDate.setHours(0, 0, 0, 0);
                      if (task.isFixed && taskDate > today) {
                        alert('아직 시작되지 않은 과제입니다.');
                        return;
                      }
                      router.push(`/mentee/tasks/${task.id}`);
                    }}
                    className={`font-medium text-left hover:text-blue-600 hover:underline ${
                      task.isApproved ? 'line-through text-gray-400' : ''
                    }`}
                  >
                    {task.title}
                  </button>
                  {task.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{task.description}</p>
                  )}
                  {task.worksheet && (
                    <button
                      onClick={() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const taskDate = new Date(task.date);
                        taskDate.setHours(0, 0, 0, 0);
                        if (task.isFixed && taskDate > today) {
                          alert('아직 시작되지 않은 과제입니다.');
                          return;
                        }
                        router.push(`/mentee/tasks/${task.id}`);
                      }}
                      className="text-xs text-blue-600 mt-1 hover:underline"
                    >
                      📄 {task.worksheet.title}
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const taskDate = new Date(task.date);
                    taskDate.setHours(0, 0, 0, 0);
                    if (task.isFixed && taskDate > today) {
                      alert('아직 시작되지 않은 과제입니다.');
                      return;
                    }
                    router.push(`/mentee/tasks/${task.id}`);
                  }}
                  className="text-xs text-blue-600 underline hover:text-blue-800 font-medium"
                >
                  상세보기
                </button>
                <button
                  onClick={() => handleRecordStudyTime(task.id)}
                  className="text-xs text-gray-600 dark:text-gray-300 underline hover:text-black"
                >
                  {(() => {
                    // 오늘 날짜의 studyLog 찾기
                    const todayDateStr = formatDateForApi(currentDate);
                    const todayLogs = task.studyLogs.filter((log: any) => {
                      const logDate = new Date(log.date).toISOString().split('T')[0];
                      return logDate === todayDateStr && log.startTime && log.endTime;
                    });

                    if (todayLogs.length > 0) {
                      // 가장 최근 로그 표시
                      const latestLog = todayLogs[todayLogs.length - 1];
                      return `⏱️ ${latestLog.startTime} - ${latestLog.endTime}`;
                    }
                    return '공부 시간 기록';
                  })()}
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const taskDate = new Date(task.date);
                    taskDate.setHours(0, 0, 0, 0);
                    if (task.isFixed && taskDate > today) {
                      alert('아직 시작되지 않은 과제는 제출할 수 없습니다.');
                      return;
                    }
                    openSubmitModal(task);
                  }}
                  className="text-xs text-gray-600 dark:text-gray-300 underline hover:text-black"
                >
                  빠른 제출
                </button>
                {!task.isFixed && (
                  <>
                    <button
                      onClick={() => openEditModal(task)}
                      className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                      title="수정"
                    >
                      <EditIcon size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      title="삭제"
                    >
                      <DeleteIcon size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
            </div>
          ))
        ) : (
          <p className="text-gray-900 dark:text-gray-300">오늘 할 일이 없습니다.</p>
        )}

        {/* 할 일 추가 버튼 */}
        <button
          onClick={() => setShowAddTaskModal(true)}
          className="w-full py-2.5 sm:py-3 md:py-4 border-2 border-dashed rounded-lg text-sm sm:text-base text-gray-900 dark:text-gray-300 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          + 할 일 추가
        </button>
      </div>

      {/* 일일 타임라인 차트 */}
      {plannerData && (() => {
        // 오늘 날짜의 studyLogs 수집 (startTime과 endTime이 있는 것만)
        const todayStudyLogs = plannerData.tasks
          .flatMap((task: Task) =>
            task.studyLogs
              .filter((log: any) => log.startTime && log.endTime)
              .map((log: any) => ({
                id: log.id,
                subject: task.subject,
                startTime: log.startTime,
                endTime: log.endTime,
                task: {
                  id: task.id,
                  title: task.title,
                },
              }))
          );

        // studyLogs가 있을 때만 차트 표시
        if (todayStudyLogs.length === 0) return null;

        return (
          <div className="mt-6">
            <TimelineChart studyLogs={todayStudyLogs} />
          </div>
        );
      })()}

      {/* 할 일 추가 모달 */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">할 일 추가</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">제목</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="할 일 제목"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">설명</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md resize-none"
                  rows={3}
                  placeholder="상세 설명 (선택)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">과목</label>
                <select
                  value={newTask.subject}
                  onChange={(e) => setNewTask({ ...newTask, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="KOREAN">국어</option>
                  <option value="ENGLISH">영어</option>
                  <option value="MATH">수학</option>
                  <option value="CUSTOM">기타 (직접 입력)</option>
                </select>
              </div>

              {newTask.subject === 'CUSTOM' && (
                <div>
                  <label className="block text-sm font-medium mb-1">과목명 입력</label>
                  <input
                    type="text"
                    value={newTask.customSubject}
                    onChange={(e) => setNewTask({ ...newTask, customSubject: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="예: 물리, 화학, 생물 등"
                  />
                </div>
              )}

              {/* 반복 설정 */}
              <div className="border-t pt-4 mt-4">
                <label className="block text-sm font-medium mb-2">날짜 설정</label>
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setRepeatMode('single')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm ${
                      repeatMode === 'single'
                        ? 'bg-black text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    단일 날짜
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepeatMode('repeat')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm ${
                      repeatMode === 'repeat'
                        ? 'bg-black text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    반복 설정
                  </button>
                </div>

                {repeatMode === 'single' ? (
                  <div className="text-sm text-gray-900 dark:text-gray-300">
                    현재 선택된 날짜: {formatDate(currentDate)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-900 dark:text-gray-300 mb-1">시작일</label>
                        <input
                          type="date"
                          value={repeatSettings.startDate}
                          onChange={(e) =>
                            setRepeatSettings({ ...repeatSettings, startDate: e.target.value })
                          }
                          className="w-full px-2 py-1.5 text-sm border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-900 dark:text-gray-300 mb-1">종료일</label>
                        <input
                          type="date"
                          value={repeatSettings.endDate}
                          onChange={(e) =>
                            setRepeatSettings({ ...repeatSettings, endDate: e.target.value })
                          }
                          className="w-full px-2 py-1.5 text-sm border rounded-md"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-900 dark:text-gray-300 mb-2">반복 요일 선택</label>
                      <div className="grid grid-cols-7 gap-1">
                        {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() =>
                              setRepeatSettings({
                                ...repeatSettings,
                                weekdays: {
                                  ...repeatSettings.weekdays,
                                  [index]: !repeatSettings.weekdays[index as keyof typeof repeatSettings.weekdays],
                                },
                              })
                            }
                            className={`py-2 text-xs rounded-md transition-colors ${
                              repeatSettings.weekdays[index as keyof typeof repeatSettings.weekdays]
                                ? 'bg-black text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowAddTaskModal(false);
                  setNewTask({ title: '', description: '', subject: 'KOREAN', customSubject: '' });
                  setRepeatMode('single');
                  setRepeatSettings({
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                    weekdays: { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false },
                  });
                }}
                className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleAddTask}
                className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 할 일 수정 모달 */}
      {showEditTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">할 일 수정</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">제목</label>
                <input
                  type="text"
                  value={editTask.title}
                  onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="할 일 제목"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">설명</label>
                <textarea
                  value={editTask.description}
                  onChange={(e) => setEditTask({ ...editTask, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md resize-none"
                  rows={3}
                  placeholder="상세 설명 (선택)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">과목</label>
                <select
                  value={editTask.subject}
                  onChange={(e) => setEditTask({ ...editTask, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="KOREAN">국어</option>
                  <option value="ENGLISH">영어</option>
                  <option value="MATH">수학</option>
                  <option value="CUSTOM">기타 (직접 입력)</option>
                </select>
              </div>

              {editTask.subject === 'CUSTOM' && (
                <div>
                  <label className="block text-sm font-medium mb-1">과목명 입력</label>
                  <input
                    type="text"
                    value={editTask.customSubject}
                    onChange={(e) => setEditTask({ ...editTask, customSubject: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="예: 물리, 화학, 생물 등"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">날짜</label>
                <input
                  type="date"
                  value={editTask.date}
                  onChange={(e) => setEditTask({ ...editTask, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowEditTaskModal(false);
                }}
                className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleEditTask}
                className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
              >
                수정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 과제 제출 모달 */}
      {showSubmitModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-2">과제 제출</h3>
            {selectedTask.isFixed ? (
              <p className="text-sm text-gray-600 mb-4">
                멘토 지정 과제 - 이미지 업로드 필수
              </p>
            ) : (
              <p className="text-sm text-gray-600 mb-4">
                내가 만든 과제 - 이미지 또는 코멘트 중 하나는 필수
              </p>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  이미지 업로드 {uploadedImageUrls.length > 0 && `(${uploadedImageUrls.length}개)`}
                  {selectedTask.isFixed && <span className="text-red-500"> *</span>}
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      setSelectedImages(files);
                      handleImageUpload(files);
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={isUploading}
                />
                {isUploading && (
                  <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">업로드 중...</p>
                )}
              </div>

              {uploadedImageUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {uploadedImageUrls.map((url, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={url}
                        alt={`업로드 ${idx + 1}`}
                        className="w-full h-32 object-cover rounded border"
                      />
                      <button
                        onClick={() => {
                          setUploadedImageUrls(uploadedImageUrls.filter((_, i) => i !== idx));
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  코멘트
                  {!selectedTask.isFixed && uploadedImageUrls.length === 0 && (
                    <span className="text-red-500"> * (이미지가 없으면 필수)</span>
                  )}
                </label>
                <textarea
                  value={submitComment}
                  onChange={(e) => setSubmitComment(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md resize-none"
                  rows={3}
                  placeholder="제출 관련 코멘트를 입력하세요..."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  setSubmitComment('');
                  setSelectedImages([]);
                  setUploadedImageUrls([]);
                  setIsUploading(false);
                }}
                className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmitTask}
                disabled={isUploading}
                className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400"
              >
                제출
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 공부 시간 기록 모달 */}
      {showStudyTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">공부 시간 기록</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  시작 시간 <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={timeRecord.startTime}
                  onChange={(e) =>
                    setTimeRecord({ ...timeRecord, startTime: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  종료 시간 <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={timeRecord.endTime}
                  onChange={(e) =>
                    setTimeRecord({ ...timeRecord, endTime: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>

              {/* 자동 계산된 시간 표시 */}
              {timeRecord.startTime && timeRecord.endTime && (
                <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-md">
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    총 공부 시간:{' '}
                    {(() => {
                      const start = parseTime(timeRecord.startTime);
                      const end = parseTime(timeRecord.endTime);
                      if (start >= end) {
                        return '종료 시간이 시작 시간보다 늦어야 합니다';
                      }
                      return formatDuration(end - start);
                    })()}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowStudyTimeModal(false);
                  setTimeRecord({ taskId: '', startTime: '', endTime: '' });
                }}
                className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmitStudyTime}
                className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
              >
                기록하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
