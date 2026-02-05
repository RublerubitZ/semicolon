'use client';

import { getApiUrl } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import ImageModal from '@/components/ImageModal';
import FeedbackChatUI, { Message } from '@/components/FeedbackChatUI';
import FeedbackLegacyUI from '@/components/FeedbackLegacyUI';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH';

interface Task {
  id: string;
  title: string;
  description: string | null;
  subject: Subject;
  date: string;
  mentee: {
    id: string;
    name: string;
    nickname?: string;
    profileImage?: string;
  };
  submissions: {
    id: string;
    imageUrls: string[];
    comment: string | null;
    createdAt: string;
  }[];
  feedbacks: {
    id: string;
    content: string;
    summary?: string;
    subject: string;
    feedbackDate: string;
    createdAt: string;
    mentor: {
      id: string;
      name: string;
      nickname?: string;
      profileImage?: string;
    };
  }[];
}

interface FeedbackComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    nickname?: string;
    profileImage?: string;
    role: string;
  };
}

interface CurrentUser {
  id: string;
  name: string;
  nickname?: string;
  role: string;
}

export default function MentorTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 이미지 모달
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalIndex, setImageModalIndex] = useState(0);

  // 첫 피드백 작성 폼
  const [feedbackForm, setFeedbackForm] = useState({
    summary: '',
    content: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 과제 정보 가져오기
  const fetchTask = async () => {
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/mentor/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('과제 정보를 불러오는데 실패했습니다.');

      const data = await res.json();
      setTask(data);
    } catch (err) {
      console.error('Fetch task error:', err);
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
      router.back();
    }
  };

  // 댓글 조회
  const fetchComments = async () => {
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/tasks/${taskId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('댓글을 불러오는데 실패했습니다.');

      const data = await res.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error('Fetch comments error:', err);
      setComments([]);
    }
  };

  // 댓글 전송
  const handleSendComment = async (content: string) => {
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || '댓글 전송에 실패했습니다.');
    }

      await fetchComments();
    } catch (err) {
      console.error('Send comment error:', err);
      throw err;
    }
  };

  // 첫 피드백 제출
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedbackForm.summary || !feedbackForm.content) {
      alert('요약과 상세 피드백을 모두 입력해주세요.');
      return;
    }

    if (!task) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/mentor/feedbacks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          taskId: task.id,
          content: feedbackForm.content,
          summary: feedbackForm.summary,
          subject: task.subject,
          feedbackDate: new Date().toISOString().split('T')[0],
        }),
      });

      if (!res.ok) throw new Error('피드백 작성에 실패했습니다.');

      alert('피드백이 작성되었습니다.');
      setFeedbackForm({ summary: '', content: '' });
      await fetchTask();
      await fetchComments();
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 피드백 + 댓글을 메시지로 변환
  const formatMessages = (): Message[] => {
    if (!task) return [];

    const messages: Message[] = [];

    // 피드백을 메시지로 변환
    task.feedbacks.forEach((fb) => {
      messages.push({
        id: fb.id,
        userId: fb.mentor.id,
        userName: fb.mentor.nickname || fb.mentor.name,
        userRole: 'MENTOR',
        content: fb.content,
        createdAt: fb.createdAt,
        profileImage: fb.mentor.profileImage,
      });
    });

    // 댓글을 메시지로 변환
    comments.forEach((cm) => {
      messages.push({
        id: cm.id,
        userId: cm.userId,
        userName: cm.user.nickname || cm.user.name,
        userRole: cm.user.role as 'MENTOR' | 'MENTEE',
        content: cm.content,
        createdAt: cm.createdAt,
        profileImage: cm.user.profileImage,
      });
    });

    // 시간순 정렬
    return messages.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }

    fetchTask();
  }, [taskId]);

  useEffect(() => {
    if (task) {
      fetchComments();
      setIsLoading(false);
    }
  }, [task]);

  const getSubjectLabel = (subject: Subject) => {
    const labels = { KOREAN: '국어', ENGLISH: '영어', MATH: '수학' };
    return labels[subject];
  };

  const getSubjectColor = (subject: Subject) => {
    const colors = {
      KOREAN: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
      ENGLISH: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
      MATH: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
    };
    return colors[subject];
  };

  if (isLoading || !task || !currentUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-900 dark:text-gray-100">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* 헤더 */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 mb-2"
        >
          ← 뒤로가기
        </button>
        <h2 className="text-2xl font-bold mb-2 dark:text-white">과제 피드백</h2>
        <p className="text-gray-600 dark:text-gray-400">
          멘티: {task.mentee ? (task.mentee.nickname || task.mentee.name) : '알 수 없음'}
        </p>
      </div>

      {/* 과제 정보 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-1 rounded ${getSubjectColor(task.subject)}`}>
                {getSubjectLabel(task.subject)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {format(new Date(task.date), 'yyyy년 M월 d일', { locale: ko })}
              </span>
            </div>
            <h3 className="text-lg font-semibold mb-1 dark:text-white">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{task.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* 제출 내용 */}
      {task.submissions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold dark:text-white">제출 내용</h3>
            {task.submissions[0].imageUrls.length > 0 && (
              <button
                onClick={() => {
                  setImageModalOpen(true);
                  setImageModalIndex(0);
                }}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
              >
                📷 사진 보기 ({task.submissions[0].imageUrls.length})
              </button>
            )}
          </div>

          {/* 멘티 코멘트 */}
          {task.submissions[0].comment && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">
                멘티 코멘트:
              </p>
              <p className="text-sm dark:text-gray-200">{task.submissions[0].comment}</p>
            </div>
          )}

          {/* 제출 시간 */}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            제출일: {new Date(task.submissions[0].createdAt).toLocaleString('ko-KR')}
          </p>

          {/* 이미지 미리보기 */}
          {task.submissions[0].imageUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {task.submissions[0].imageUrls.slice(0, 4).map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setImageModalOpen(true);
                    setImageModalIndex(idx);
                  }}
                  className="relative aspect-square cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <img
                    src={url}
                    alt={`제출 ${idx + 1}`}
                    className="w-full h-full object-cover rounded"
                  />
                  {idx === 3 && task.submissions[0].imageUrls.length > 4 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                      <span className="text-white text-xl font-bold">
                        +{task.submissions[0].imageUrls.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 피드백/댓글 영역 */}
      {task.feedbacks.length === 0 ? (
        // 첫 피드백 작성 폼
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
          <h3 className="font-semibold mb-4 dark:text-white">피드백 작성</h3>
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                피드백 요약 <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={feedbackForm.summary}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, summary: e.target.value })}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="예: 전반적으로 우수한 결과입니다"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                멘티가 한눈에 볼 수 있는 짧은 요약을 작성하세요
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                상세 피드백 <span className="text-red-600">*</span>
              </label>
              <textarea
                value={feedbackForm.content}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, content: e.target.value })}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                rows={10}
                placeholder="구체적인 피드백을 작성하세요.&#10;&#10;잘한 점:&#10;- &#10;&#10;개선할 점:&#10;- &#10;&#10;다음 학습 방향:&#10;- "
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                잘한 점, 개선할 점, 다음 학습 방향 등을 구체적으로 작성하세요
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600"
              >
                {isSubmitting ? '작성 중...' : '피드백 제출'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        // 피드백 1개 이상: 최초 피드백 요약 + 채팅 UI
        <>
          {/* 최초 피드백 요약 (강조) */}
          {task.feedbacks[0].summary && (
            <div className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 rounded-lg p-4 mb-4 border-l-4 border-amber-400 dark:border-amber-600 shadow-sm">
              <div className="flex items-start gap-2">
                <span className="text-xl">✨</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1">
                    핵심 요약
                  </p>
                  <p className="text-sm sm:text-base leading-relaxed text-amber-800 dark:text-amber-300 font-medium">
                    {task.feedbacks[0].summary}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 채팅 UI */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 mb-4">
            <h3 className="font-semibold mb-3 dark:text-white">피드백 대화</h3>
            <FeedbackChatUI
              taskId={task.id}
              messages={formatMessages()}
              currentUserId={currentUser.id}
              onSendMessage={handleSendComment}
            />
          </div>
        </>
      )}

      {/* 이미지 모달 */}
      {imageModalOpen && task.submissions.length > 0 && (
        <ImageModal
          images={task.submissions[0].imageUrls}
          initialIndex={imageModalIndex}
          onClose={() => setImageModalOpen(false)}
        />
      )}
    </div>
  );
}
