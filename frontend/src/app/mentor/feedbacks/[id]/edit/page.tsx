'use client';
import { getApiUrl } from '@/lib/api';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH';

interface Feedback {
  id: string;
  content: string;
  summary: string | null;
  subject: Subject;
  feedbackDate: string;
  task: {
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
    worksheet?: {
      id: string;
      title: string;
    } | null;
  };
}

function FeedbackEditForm() {
  const router = useRouter();
  const params = useParams();
  const feedbackId = params.id as string;

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState({
    content: '',
    summary: '',
  });

  // 피드백 정보 가져오기
  const fetchFeedback = async () => {
    if (!feedbackId) {
      alert('피드백 ID가 없습니다.');
      router.back();
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/mentor/feedbacks/${feedbackId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('피드백 정보를 불러오는데 실패했습니다.');

      const data = await res.json();
      setFeedback(data);

      // 폼 데이터 초기화
      setFormData({
        content: data.content,
        summary: data.summary || '',
      });
    } catch (err) {
      console.error('Fetch feedback error:', err);
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
      router.back();
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [feedbackId]);

  // 피드백 수정
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 이미 제출 중이면 무시 (더블클릭 방지)
    if (isSubmitting) return;

    if (!formData.content || !formData.summary) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/mentor/feedbacks/${feedbackId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: formData.content,
          summary: formData.summary,
        }),
      });

      if (!res.ok) throw new Error('피드백 수정에 실패했습니다.');

      alert('피드백이 수정되었습니다.');
      router.back();
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (!feedback) {
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
        <h2 className="text-2xl font-bold mb-2">피드백 수정</h2>
        <p className="text-gray-900">학생의 코멘트에 답변하거나 피드백 내용을 수정합니다</p>
      </div>

      {/* 과제 정보 */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-1 rounded ${getSubjectColor(feedback.task.subject)}`}>
                {getSubjectLabel(feedback.task.subject)}
              </span>
            </div>
            <h3 className="text-lg font-semibold mb-1">{feedback.task.title}</h3>
            {feedback.task.description && (
              <p className="text-sm text-gray-900 mb-2">{feedback.task.description}</p>
            )}
            <p className="text-sm text-gray-900">
              멘티: {feedback.task.mentee.name}
            </p>
          </div>
        </div>

        {/* 제출 내용 */}
        {feedback.task.submissions.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">제출 내용</h4>
            <div className="space-y-4">
              {feedback.task.submissions.map((submission) => (
                <div key={submission.id} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-900 mb-2">
                    제출일: {new Date(submission.createdAt).toLocaleString('ko-KR')}
                  </p>
                  {submission.comment && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                      <p className="text-xs text-yellow-800 font-medium mb-1">📝 멘티 코멘트:</p>
                      <p className="text-sm font-medium">{submission.comment}</p>
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
      </div>

      {/* 기존 피드백 정보 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800 font-medium mb-2">📅 기존 피드백 작성일</p>
        <p className="text-sm text-blue-700">
          {format(new Date(feedback.feedbackDate), 'yyyy년 M월 d일 (eee)', { locale: ko })}
        </p>
      </div>

      {/* 피드백 수정 폼 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6 space-y-6">
        <h3 className="text-lg font-semibold">피드백 수정</h3>

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
            rows={12}
            placeholder="구체적인 피드백을 작성하세요.&#10;&#10;학생의 코멘트에 답변:&#10;- &#10;&#10;잘한 점:&#10;- &#10;&#10;개선할 점:&#10;- &#10;&#10;다음 학습 방향:&#10;- "
            required
          />
          <p className="text-xs text-gray-900 mt-1">
            학생의 코멘트에 답변하거나 피드백 내용을 자유롭게 수정하세요
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
            {isSubmitting ? '수정 중...' : '피드백 수정'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EditFeedbackPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><p className="text-gray-900">로딩 중...</p></div>}>
      <FeedbackEditForm />
    </Suspense>
  );
}
