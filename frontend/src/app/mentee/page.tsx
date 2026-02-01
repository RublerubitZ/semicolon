'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH';

interface Task {
  id: string;
  title: string;
  description?: string;
  subject: Subject;
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

const SUBJECT_LABELS: Record<Subject, { label: string; color: string }> = {
  KOREAN: { label: '국어', color: 'bg-blue-100 text-blue-800' },
  ENGLISH: { label: '영어', color: 'bg-green-100 text-green-800' },
  MATH: { label: '수학', color: 'bg-purple-100 text-purple-800' },
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
  const [showStudyTimeModal, setShowStudyTimeModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  // 할 일 추가 폼 상태
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    subject: 'KOREAN' as Subject,
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

  // 할 일 추가
  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      alert('할 일 제목을 입력해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const dateStr = currentDate.toISOString().split('T')[0];

      const res = await fetch('http://localhost:4000/api/mentee/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newTask,
          date: dateStr,
        }),
      });

      if (!res.ok) {
        throw new Error('할 일 추가에 실패했습니다.');
      }

      alert('할 일이 추가되었습니다.');
      setShowAddTaskModal(false);
      setNewTask({ title: '', description: '', subject: 'KOREAN' });
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
        <h2 className="text-2xl font-bold">{user?.name || '멘티'}님</h2>
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
                    <span className={`text-xs px-2 py-0.5 rounded ${SUBJECT_LABELS[task.subject].color}`}>
                      {SUBJECT_LABELS[task.subject].label}
                    </span>
                    {task.isFixed && (
                      <span className="text-xs text-gray-500">멘토 고정</span>
                    )}
                  </div>
                  <p className="font-medium">{task.title}</p>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  )}
                  {task.worksheet && (
                    <p className="text-xs text-blue-600 mt-1">
                      📄 {task.worksheet.title}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
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
                  과제 제출
                </button>
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
                  onChange={(e) => setNewTask({ ...newTask, subject: e.target.value as Subject })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="KOREAN">국어</option>
                  <option value="ENGLISH">영어</option>
                  <option value="MATH">수학</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowAddTaskModal(false);
                  setNewTask({ title: '', description: '', subject: 'KOREAN' });
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
