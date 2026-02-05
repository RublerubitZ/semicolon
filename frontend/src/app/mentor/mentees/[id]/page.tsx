'use client';
import { getApiUrl } from '@/lib/api';
import { EditIcon, DeleteIcon } from '@/components/icons';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, startOfWeek, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH';
type ViewMode = 'daily' | 'weekly' | 'monthly';
type SelfCheckStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'NOT_DONE';

// 자가점검 상태 표시 설정
const SELF_CHECK_DISPLAY: Record<SelfCheckStatus, { label: string; icon: string; color: string }> = {
  PENDING: { label: '미시작', icon: '○', color: 'text-gray-400' },
  IN_PROGRESS: { label: '진행중', icon: '△', color: 'text-yellow-500' },
  DONE: { label: '완료', icon: '✓', color: 'text-green-500' },
  NOT_DONE: { label: '미진행', icon: '✕', color: 'text-red-500' },
};

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
  nickname?: string;
  email: string;
  profileImage?: string;
}

export default function MenteePlannerPage() {
  const params = useParams();
  const router = useRouter();
  const menteeId = params.id as string;

  const [mentee, setMentee] = useState<Mentee | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<any>(null);
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

  // 일일 전체 피드백 관련 상태
  const [showDailyFeedbackModal, setShowDailyFeedbackModal] = useState(false);
  const [dailyFeedback, setDailyFeedback] = useState<any>(null);
  const [dailyFeedbackForm, setDailyFeedbackForm] = useState({
    content: '',
    summary: '',
  });

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
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
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

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('API Error:', res.status, errorData);
        throw new Error(errorData.error || '플래너를 불러오는데 실패했습니다.');
      }

      const data = await res.json();
      setTasks(data.tasks || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Fetch planner error:', err);
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

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

  // 수정 모달 닫기
  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingTask(null);
    setEditFormData({
      title: '',
      description: '',
      subject: 'KOREAN',
      date: '',
    });
  };

  // 일일 전체 피드백 조회
  const fetchDailyFeedback = async () => {
    if (viewMode !== 'daily') return;

    try {
      const token = localStorage.getItem('token');
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const res = await fetch(
        `${getApiUrl()}/api/mentor/mentees/${menteeId}/daily-feedbacks?date=${dateStr}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('일일 피드백을 불러오는데 실패했습니다.');

      const data = await res.json();
      setDailyFeedback(data);
    } catch (err) {
      console.error('Fetch daily feedback error:', err);
      // 피드백이 없는 경우는 정상이므로 alert 하지 않음
      setDailyFeedback(null);
    }
  };

  // 일일 피드백 모달 열기
  const openDailyFeedbackModal = () => {
    if (dailyFeedback) {
      // 기존 피드백 수정
      setDailyFeedbackForm({
        content: dailyFeedback.content,
        summary: dailyFeedback.summary || '',
      });
    } else {
      // 새 피드백 작성
      setDailyFeedbackForm({
        content: '',
        summary: '',
      });
    }
    setShowDailyFeedbackModal(true);
  };

  // 일일 피드백 모달 닫기
  const closeDailyFeedbackModal = () => {
    setShowDailyFeedbackModal(false);
    setDailyFeedbackForm({
      content: '',
      summary: '',
    });
  };

  // 일일 피드백 제출
  const handleSubmitDailyFeedback = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dailyFeedbackForm.content || !dailyFeedbackForm.summary) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const method = dailyFeedback ? 'PUT' : 'POST';
      const url = dailyFeedback
        ? `${getApiUrl()}/api/mentor/daily-feedbacks/${dailyFeedback.id}`
        : `${getApiUrl()}/api/mentor/daily-feedbacks`;

      const body = dailyFeedback
        ? dailyFeedbackForm
        : {
            ...dailyFeedbackForm,
            menteeId,
            date: dateStr,
          };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('일일 피드백 저장에 실패했습니다.');

      alert(dailyFeedback ? '일일 피드백이 수정되었습니다.' : '일일 피드백이 작성되었습니다.');
      closeDailyFeedbackModal();
      await fetchDailyFeedback(); // 새로고침
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  // 과제 수정
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

      alert('과제가 수정되었습니다.');
      closeEditModal();
      fetchPlanner();
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  // 과제 삭제
  const handleDeleteTask = async (task: Task) => {
    // 제출 내역 확인 및 경고
    const submissionCount = task.submissions.length;
    const feedbackCount = task.feedbacks.length;

    let confirmMessage = '정말 삭제하시겠습니까?';

    if (submissionCount > 0 || feedbackCount > 0) {
      confirmMessage = `이 과제에는 ${submissionCount}개의 제출 내역과 ${feedbackCount}개의 피드백이 있습니다.\n\n삭제 시 모든 관련 데이터가 함께 삭제됩니다.\n\n정말 삭제하시겠습니까?`;
    }

    if (!confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/mentor/tasks/${task.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('과제 삭제에 실패했습니다.');

      alert('과제가 삭제되었습니다.');
      fetchPlanner();
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    fetchMentee();
  }, [menteeId]);

  useEffect(() => {
    fetchPlanner();
    fetchDailyFeedback();
  }, [viewMode, selectedDate, menteeId]);

  const getSubjectLabel = (subject: Subject) => {
    const labels = { KOREAN: '국어', ENGLISH: '영어', MATH: '수학' };
    return labels[subject];
  };

  const getSubjectColor = (subject: Subject) => {
    const colors = {
      KOREAN: 'bg-blue-100 text-blue-700',
      ENGLISH: 'bg-green-100 text-green-700',
      MATH: 'bg-orange-100 text-orange-700',
    };
    return colors[subject];
  };

  // 피드백 마감 시간 계산 (과제 날짜 다음날 11시)
  const getFeedbackDeadline = (taskDate: string) => {
    const deadline = new Date(taskDate);
    deadline.setDate(deadline.getDate() + 1);
    deadline.setHours(11, 0, 0, 0);
    return deadline;
  };

  // 피드백 마감 시간 표시 텍스트
  const getFeedbackDeadlineDisplay = (taskDate: string) => {
    const deadline = getFeedbackDeadline(taskDate);
    const now = new Date();
    const isOverdue = now > deadline;

    if (isOverdue) {
      return {
        text: '⚠️ 마감 지남',
        className: 'text-red-600 font-medium',
      };
    }

    const tomorrow = format(deadline, 'M월 d일 11:00', { locale: ko });
    return {
      text: `마감: ${tomorrow}`,
      className: 'text-gray-600',
    };
  };

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

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-900 hover:text-gray-900 mb-2"
        >
          ← 뒤로가기
        </button>

        {mentee && (
          <div className="flex items-center gap-3">
            {mentee.profileImage ? (
              <img
                src={mentee.profileImage}
                alt={mentee.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold">
                  {mentee.nickname?.[0] || mentee.name[0]}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">
                {mentee.nickname || mentee.name}
                {mentee.nickname && (
                  <span className="text-lg font-normal text-gray-900 ml-2">
                    ({mentee.name})
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-900">{mentee.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* 보기 모드 선택 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('daily')}
          className={`px-4 py-2 rounded-lg text-sm ${
            viewMode === 'daily'
              ? 'bg-black text-white'
              : 'bg-white border hover:bg-gray-50'
          }`}
        >
          일일
        </button>
        <button
          onClick={() => setViewMode('weekly')}
          className={`px-4 py-2 rounded-lg text-sm ${
            viewMode === 'weekly'
              ? 'bg-black text-white'
              : 'bg-white border hover:bg-gray-50'
          }`}
        >
          주간
        </button>
        <button
          onClick={() => setViewMode('monthly')}
          className={`px-4 py-2 rounded-lg text-sm ${
            viewMode === 'monthly'
              ? 'bg-black text-white'
              : 'bg-white border hover:bg-gray-50'
          }`}
        >
          월간
        </button>
      </div>

      {/* 날짜 네비게이션 */}
      <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-lg border">
        <button
          onClick={() => changeDate('prev')}
          className="p-2 hover:bg-gray-100 rounded"
        >
          ←
        </button>
        <h3 className="text-lg font-semibold">{formatDateDisplay()}</h3>
        <button
          onClick={() => changeDate('next')}
          className="p-2 hover:bg-gray-100 rounded"
        >
          →
        </button>
      </div>

      {/* 통계 */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-600 mb-1">전체 할 일</p>
            <p className="text-2xl font-bold">{stats.totalTasks}개</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-600 mb-1">제출됨</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.completedTasks}개
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-600 mb-1">공부 시간</p>
            <p className="text-2xl font-bold">
              {Math.floor(stats.totalStudyTime / 60)}시간
            </p>
          </div>
        </div>
      )}

      {/* 할 일 목록 */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">할 일 목록</h3>
          <button
            onClick={() => router.push(`/mentor/tasks/new?menteeId=${menteeId}`)}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
          >
            + 할 일 추가
          </button>
        </div>

        {isLoading ? (
          <p className="text-center text-gray-900">로딩 중...</p>
        ) : tasks.length === 0 ? (
          <p className="text-center text-gray-900">할 일이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const studyTime = task.studyLogs.reduce((sum, log) => sum + log.duration, 0);
              const selfCheckInfo = SELF_CHECK_DISPLAY[task.selfCheck || 'PENDING'];

              return (
                <div
                  key={task.id}
                  className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className={`text-xs px-2 py-1 rounded ${getSubjectColor(
                            task.subject
                          )}`}
                        >
                          {getSubjectLabel(task.subject)}
                        </span>
                        {task.isFixed && (
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                            고정 과제
                          </span>
                        )}
                        {/* 멘티 자가점검 상태 */}
                        <span className={`text-xs px-2 py-1 rounded bg-gray-50 ${selfCheckInfo.color}`}>
                          {selfCheckInfo.icon} 자가점검: {selfCheckInfo.label}
                        </span>
                        {/* 과제 상태 (제출 기준) */}
                        {task.submissions.length === 0 ? (
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">
                            미제출
                          </span>
                        ) : task.isApproved || task.feedbacks.length > 0 ? (
                          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-medium">
                            ✓ 피드백 완료
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                            제출됨
                          </span>
                        )}
                      </div>
                      <h4 className={`font-semibold mb-1 ${task.submissions.length > 0 ? 'line-through text-gray-400' : ''}`}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span>제출: {task.submissions.length}개</span>
                        <span>피드백: {task.feedbacks.length}개</span>
                        <span>공부 시간: {Math.floor(studyTime / 60)}분</span>
                      </div>
                      {/* 피드백 마감 시간 표시 - 제출됨 + 피드백 없음 */}
                      {task.submissions.length > 0 && task.feedbacks.length === 0 && (
                        <div className="mt-2">
                          <span className={`text-xs ${getFeedbackDeadlineDisplay(task.date).className}`}>
                            {getFeedbackDeadlineDisplay(task.date).text}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {/* 피드백 작성 버튼 - 제출된 과제에만 표시 */}
                      {task.submissions.length > 0 && task.feedbacks.length === 0 && (
                        <button
                          onClick={() =>
                            router.push(`/mentor/tasks/${task.id}`)
                          }
                          className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
                        >
                          피드백 작성
                        </button>
                      )}
                      {task.feedbacks.length > 0 && (
                        <button
                          onClick={() =>
                            router.push(`/mentor/tasks/${task.id}`)
                          }
                          className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                        >
                          피드백 보기
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(task)}
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        title="수정"
                      >
                        <EditIcon size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        title="삭제"
                      >
                        <DeleteIcon size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 일일 전체 피드백 (일일 보기에만 표시) */}
      {viewMode === 'daily' && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">일일 전체 피드백</h3>
            <button
              onClick={openDailyFeedbackModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              {dailyFeedback ? '피드백 수정' : '피드백 작성'}
            </button>
          </div>

          {dailyFeedback ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  작성일: {new Date(dailyFeedback.createdAt).toLocaleString('ko-KR')}
                </p>
                {dailyFeedback.summary && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">요약</p>
                    <p className="text-base font-semibold">{dailyFeedback.summary}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">상세 피드백</p>
                <p className="text-sm whitespace-pre-wrap">{dailyFeedback.content}</p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border rounded-lg p-6 text-center">
              <p className="text-gray-600 mb-2">아직 일일 피드백이 작성되지 않았습니다.</p>
              <p className="text-sm text-gray-500">
                오늘 학습에 대한 전체적인 피드백을 작성해주세요.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 수정 모달 */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">과제 수정</h3>

            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  제목 <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">설명</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  과목 <span className="text-red-600">*</span>
                </label>
                <select
                  value={editFormData.subject}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      subject: e.target.value as Subject,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="KOREAN">국어</option>
                  <option value="ENGLISH">영어</option>
                  <option value="MATH">수학</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  날짜 <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={editFormData.date}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, date: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                >
                  수정하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 일일 피드백 모달 */}
      {showDailyFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {dailyFeedback ? '일일 피드백 수정' : '일일 피드백 작성'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {format(selectedDate, 'yyyy년 M월 d일 (eee)', { locale: ko })} 전체 학습에 대한 피드백
            </p>

            <form onSubmit={handleSubmitDailyFeedback} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  피드백 요약 <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={dailyFeedbackForm.summary}
                  onChange={(e) =>
                    setDailyFeedbackForm({ ...dailyFeedbackForm, summary: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="예: 오늘 학습 내용을 잘 이해했습니다"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  멘티가 한눈에 볼 수 있는 짧은 요약
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  상세 피드백 <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={dailyFeedbackForm.content}
                  onChange={(e) =>
                    setDailyFeedbackForm({ ...dailyFeedbackForm, content: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md resize-none"
                  rows={10}
                  placeholder="오늘 하루 전체 학습에 대한 피드백을 작성하세요.&#10;&#10;잘한 점:&#10;- &#10;&#10;개선할 점:&#10;- &#10;&#10;내일 학습 방향:&#10;- "
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  과제별 피드백과 별개로, 하루 전체에 대한 종합 피드백을 작성하세요
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeDailyFeedbackModal}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {dailyFeedback ? '수정하기' : '작성하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
