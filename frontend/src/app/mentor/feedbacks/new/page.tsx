'use client';
import { getApiUrl } from '@/lib/api';
import { getSubjectLabel, getSubjectBadgeColor } from '@/constants/subjects';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from '@/stores/useToastStore';

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
  };
  submissions: {
    id: string;
    imageUrls: string[];
    comment: string | null;
    createdAt: string;
  }[];
}

function FeedbackForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId');

  const [task, setTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState({
    content: '',
    summary: '',
  });

  // 과제 정보 가져오기
  const fetchTask = async () => {
    if (!taskId) {
      toast.warning('과제 ID가 없습니다.');
      router.back();
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/mentee/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('과제 정보를 불러오는데 실패했습니다.');

      const data = await res.json();
      setTask(data);
    } catch (err) {
      console.error('Fetch task error:', err);
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.');
      router.back();
    }
  };

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  // 피드백 작성
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 이미 제출 중이면 무시 (더블클릭 방지)
    if (isSubmitting) return;

    if (!formData.content || !formData.summary) {
      toast.warning('모든 필드를 입력해주세요.');
      return;
    }

    if (!task) {
      toast.info('과제 정보를 불러오는 중입니다.');
      return;
    }

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
          content: formData.content,
          summary: formData.summary,
          subject: task.subject,
          feedbackDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD 형식
        }),
      });

      if (!res.ok) throw new Error('피드백 작성에 실패했습니다.');

      toast.success('피드백이 작성되었습니다.');
      router.back();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 피드백 마감 시간 계산 (과제 날짜 다음날 11시)
  const getFeedbackDeadline = (taskDate: string) => {
    const deadline = new Date(taskDate);
    deadline.setDate(deadline.getDate() + 1);
    deadline.setHours(11, 0, 0, 0);
    return deadline;
  };

  // 피드백 마감 시간 표시 정보
  const getFeedbackDeadlineInfo = () => {
    if (!task) return null;

    const deadline = getFeedbackDeadline(task.date);
    const now = new Date();
    const isOverdue = now > deadline;

    if (isOverdue) {
      return {
        text: '⚠️ 피드백 마감 시간이 지났습니다',
        subText: `마감: ${format(deadline, 'M월 d일 11:00', { locale: ko })}`,
        className: 'bg-red-50 border-red-200',
        textClassName: 'text-red-600 font-medium',
      };
    }

    return {
      text: `피드백 마감 시간: ${format(deadline, 'M월 d일 11:00', { locale: ko })}`,
      subText: null,
      className: 'bg-blue-50 border-blue-200',
      textClassName: 'text-blue-700',
    };
  };

  if (!task) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-900">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-900 hover:text-gray-900 mb-2"
        >
          ← 뒤로가기
        </button>
        <h2 className="text-2xl font-bold mb-2">피드백 작성</h2>
        <p className="text-gray-900">학생의 학습 결과에 대한 피드백을 작성합니다</p>
      </div>

      {/* 피드백 마감 시간 알림 */}
      {(() => {
        const deadlineInfo = getFeedbackDeadlineInfo();
        if (!deadlineInfo) return null;

        return (
          <div className={`rounded-lg border p-4 mb-6 ${deadlineInfo.className}`}>
            <p className={`text-sm ${deadlineInfo.textClassName}`}>
              {deadlineInfo.text}
            </p>
            {deadlineInfo.subText && (
              <p className="text-xs text-gray-600 mt-1">{deadlineInfo.subText}</p>
            )}
          </div>
        );
      })()}

      {/* 과제 정보 */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-1 rounded ${getSubjectBadgeColor(task.subject)}`}>
                {getSubjectLabel(task.subject)}
              </span>
            </div>
            <h3 className="text-lg font-semibold mb-1">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-gray-900 mb-2">{task.description}</p>
            )}
            <p className="text-sm text-gray-900">
              멘티: {task.mentee.name}
            </p>
          </div>
        </div>

        {/* 제출 내용 */}
        {task.submissions.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">제출 내용</h4>
            <div className="space-y-4">
              {task.submissions.map((submission) => (
                <div key={submission.id} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-900 mb-2">
                    제출일: {new Date(submission.createdAt).toLocaleString('ko-KR')}
                  </p>
                  {submission.comment && (
                    <div className="bg-white rounded p-3 mb-3">
                      <p className="text-xs text-gray-900 font-medium mb-1">멘티 코멘트:</p>
                      <p className="text-sm">{submission.comment}</p>
                    </div>
                  )}
                  {submission.imageUrls.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-900 font-medium mb-2">
                        제출 이미지 ({submission.imageUrls.length}개)
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {submission.imageUrls.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block aspect-square bg-white rounded-lg overflow-hidden border-2 hover:border-blue-500 transition-colors"
                          >
                            <img
                              src={url}
                              alt={`제출 이미지 ${idx + 1}`}
                              className="w-full h-full object-contain hover:scale-105 transition-transform"
                              onError={(e) => {
                                console.error('Image load error:', url);
                                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E이미지 로드 실패%3C/text%3E%3C/svg%3E';
                              }}
                            />
                          </a>
                        ))}
                      </div>
                      <p className="text-xs text-gray-900 mt-2">
                        💡 이미지를 클릭하면 새 탭에서 크게 볼 수 있습니다
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {task.submissions.length === 0 && (
          <div className="border-t pt-4">
            <p className="text-sm text-gray-900 text-center py-4">
              아직 제출 내용이 없습니다.
            </p>
          </div>
        )}

        {task.submissions.length === 0 && (
          <div className="border-t pt-4">
            <p className="text-sm text-gray-900">아직 제출 내용이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 피드백 폼 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6 space-y-6">
        {/* 요약 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            피드백 요약 <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="예: 전반적으로 우수한 결과입니다"
            required
          />
          <p className="text-xs text-gray-900 mt-1">
            멘티가 한눈에 볼 수 있는 짧은 요약을 작성하세요
          </p>
        </div>

        {/* 상세 피드백 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            상세 피드백 <span className="text-red-600">*</span>
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-3 py-2 border rounded-md resize-none"
            rows={10}
            placeholder="구체적인 피드백을 작성하세요.&#10;&#10;잘한 점:&#10;- &#10;&#10;개선할 점:&#10;- &#10;&#10;다음 학습 방향:&#10;- "
            required
          />
          <p className="text-xs text-gray-900 mt-1">
            잘한 점, 개선할 점, 다음 학습 방향 등을 구체적으로 작성하세요
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
          >
            {isSubmitting ? '작성 중...' : '피드백 제출'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewFeedbackPage() {
  return (
    <Suspense>
      <NewFeedbackContent />
    </Suspense>
  );
}

function NewFeedbackContent() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><p className="text-gray-900">로딩 중...</p></div>}>
      <FeedbackForm />
    </Suspense>
  );
}
