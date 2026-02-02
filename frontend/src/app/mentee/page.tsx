'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Task {
  id: string;
  title: string;
  description?: string;
  subject: string;
  isCompleted: boolean;
  isFixed: boolean;
  date: string;
  worksheet?: {
    id: string;
    title: string;
  };
  submissions: any[];
  studyLogs: any[];
}

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
  return found ? found.color : 'bg-gray-100 text-gray-800';
};

export default function MenteeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [plannerData, setPlannerData] = useState<PlannerData | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // 모달 상태
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [showStudyTimeModal, setShowStudyTimeModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

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

  // 플래너 데이터 가져오기
  const fetchPlannerData = async (date: Date) => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const dateStr = date.toISOString().split('T')[0];

      const res = await fetch(`http://localhost:4000/api/mentee/planner?date=${dateStr}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('플래너를 불러오는데 실패했습니다.');
      }

      const data = await res.json();
      setPlannerData(data);
      setCommentText(data.comment?.content || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 할 일 완료 처리
  const handleToggleComplete = async (taskId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`http://localhost:4000/api/mentee/tasks/${taskId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isCompleted: !currentStatus }),
      });

      if (!res.ok) {
        throw new Error('완료 처리에 실패했습니다.');
      }

      fetchPlannerData(currentDate);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  // 코멘트 저장
  const handleSaveComment = async () => {
    try {
      const token = localStorage.getItem('token');
      const dateStr = currentDate.toISOString().split('T')[0];

      const res = await fetch('http://localhost:4000/api/mentee/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: dateStr,
          content: commentText,
        }),
      });

      if (!res.ok) {
        throw new Error('코멘트 저장에 실패했습니다.');
      }

      alert('코멘트가 저장되었습니다.');
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
        dates.push(new Date(d).toISOString().split('T')[0]);
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
          : [currentDate.toISOString().split('T')[0]];

      if (dates.length === 0) {
        alert('선택한 요일에 해당하는 날짜가 없습니다.');
        return;
      }

      // 각 날짜에 대해 할 일 생성
      for (const dateStr of dates) {
        const res = await fetch('http://localhost:4000/api/mentee/tasks', {
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
    setEditTask({
      id: task.id,
      title: task.title,
      description: task.description || '',
      subject: isDefaultSubject ? task.subject : 'CUSTOM',
      customSubject: isDefaultSubject ? '' : task.subject,
      date: task.date,
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

      const res = await fetch(`http://localhost:4000/api/mentee/tasks/${editTask.id}`, {
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

      const res = await fetch(`http://localhost:4000/api/mentee/tasks/${taskId}`, {
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

  // 공부 시간 기록 (간단 버전)
  const handleRecordStudyTime = async (taskId: string) => {
    const duration = prompt('공부 시간을 입력하세요 (분):');
    if (!duration || isNaN(Number(duration))) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const dateStr = currentDate.toISOString().split('T')[0];

      const res = await fetch(`http://localhost:4000/api/mentee/tasks/${taskId}/time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          duration: Number(duration),
          date: dateStr,
        }),
      });

      if (!res.ok) {
        throw new Error('공부 시간 기록에 실패했습니다.');
      }

      alert('공부 시간이 기록되었습니다.');
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

        const res = await fetch('http://localhost:4000/api/upload/image', {
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
  const openSubmitModal = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowSubmitModal(true);
    setSubmitComment('');
    setSelectedImages([]);
    setUploadedImageUrls([]);
  };

  // 과제 제출
  const handleSubmitTask = async () => {
    if (uploadedImageUrls.length === 0) {
      alert('최소 1개의 이미지를 업로드해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`http://localhost:4000/api/mentee/tasks/${selectedTaskId}/submit`, {
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
        throw new Error('과제 제출에 실패했습니다.');
      }

      alert('과제가 제출되었습니다.');
      setShowSubmitModal(false);
      fetchPlannerData(currentDate);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  useEffect(() => {
    fetchPlannerData(currentDate);
  }, [currentDate]);

  return (
    <div className="p-4 pb-20">
      {/* 헤더 */}
      <div className="mb-6">
        <p className="text-sm text-gray-600">안녕하세요</p>
        <h2 className="text-2xl font-bold">
          {user?.nickname || user?.name || '멘티'}
          {user?.nickname && user?.name && <span className="text-lg font-normal">({user.name})</span>}님
        </h2>
      </div>

      {/* 날짜 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{formatDate(currentDate)}</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm bg-gray-100 rounded">일</button>
            <button
              onClick={() => router.push('/mentee/planner/weekly')}
              className="px-3 py-1 text-sm text-gray-500 rounded hover:bg-gray-100"
            >
              주
            </button>
            <button
              onClick={() => router.push('/mentee/planner/monthly')}
              className="px-3 py-1 text-sm text-gray-500 rounded hover:bg-gray-100"
            >
              월
            </button>
          </div>
        </div>
      </div>

      {/* 코멘트 영역 */}
      <div className="mb-6">
        <textarea
          className="w-full p-3 border rounded-lg resize-none"
          rows={3}
          placeholder="오늘의 코멘트나 질문을 입력하세요..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
        />
        <button
          onClick={handleSaveComment}
          className="mt-2 px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800"
        >
          코멘트 저장
        </button>
      </div>

      {/* 할 일 목록 */}
      <div className="space-y-4">
        <h3 className="font-semibold">오늘의 할 일</h3>

        {isLoading ? (
          <p className="text-gray-500">불러오는 중...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : plannerData && plannerData.tasks.length > 0 ? (
          plannerData.tasks.map((task) => (
            <div key={task.id} className="bg-white p-4 rounded-lg border">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={task.isCompleted}
                  onChange={() => handleToggleComplete(task.id, task.isCompleted)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${getSubjectColor(task.subject)}`}>
                      {getSubjectLabel(task.subject)}
                    </span>
                    {task.isFixed && (
                      <span className="text-xs text-gray-500">멘토 고정</span>
                    )}
                  </div>
                  <button
                    onClick={() => router.push(`/mentee/tasks/${task.id}`)}
                    className="font-medium text-left hover:text-blue-600 hover:underline"
                  >
                    {task.title}
                  </button>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  )}
                  {task.worksheet && (
                    <button
                      onClick={() => router.push(`/mentee/tasks/${task.id}`)}
                      className="text-xs text-blue-600 mt-1 hover:underline"
                    >
                      📄 {task.worksheet.title}
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                <button
                  onClick={() => router.push(`/mentee/tasks/${task.id}`)}
                  className="text-xs text-blue-600 underline hover:text-blue-800 font-medium"
                >
                  상세보기
                </button>
                <button
                  onClick={() => handleRecordStudyTime(task.id)}
                  className="text-xs text-gray-600 underline hover:text-black"
                >
                  공부 시간 기록
                </button>
                <button
                  onClick={() => openSubmitModal(task.id)}
                  className="text-xs text-gray-600 underline hover:text-black"
                >
                  빠른 제출
                </button>
                {!task.isFixed && (
                  <>
                    <button
                      onClick={() => openEditModal(task)}
                      className="text-xs text-green-600 underline hover:text-green-800"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-xs text-red-600 underline hover:text-red-800"
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">오늘 할 일이 없습니다.</p>
        )}

        {/* 할 일 추가 버튼 */}
        <button
          onClick={() => setShowAddTaskModal(true)}
          className="w-full py-3 border-2 border-dashed rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-700"
        >
          + 할 일 추가
        </button>
      </div>

      {/* 할 일 추가 모달 */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    반복 설정
                  </button>
                </div>

                {repeatMode === 'single' ? (
                  <div className="text-sm text-gray-600">
                    현재 선택된 날짜: {formatDate(currentDate)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">시작일</label>
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
                        <label className="block text-xs text-gray-600 mb-1">종료일</label>
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
                      <label className="block text-xs text-gray-600 mb-2">반복 요일 선택</label>
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
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">과제 제출</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  이미지 업로드 {uploadedImageUrls.length > 0 && `(${uploadedImageUrls.length}개)`}
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
                  <p className="text-sm text-gray-600 mt-1">업로드 중...</p>
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
                <label className="block text-sm font-medium mb-1">코멘트 (선택)</label>
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
                }}
                className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmitTask}
                disabled={uploadedImageUrls.length === 0 || isUploading}
                className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400"
              >
                제출
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
