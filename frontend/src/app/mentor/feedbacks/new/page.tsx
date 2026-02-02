'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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
      alert('과제 ID가 없습니다.');
      router.back();
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`http://localhost:4000/api/mentee/tasks/${taskId}`, {
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

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  // 피드백 작성
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.content || !formData.summary) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    if (!task) {
      alert('과제 정보를 불러오는 중입니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      const res = await fetch('http://localhost:4000/api/mentor/feedbacks', {
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
          feedbackDate: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error('피드백 작성에 실패했습니다.');

      alert('피드백이 작성되었습니다.');
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

  if (!task) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-600 hover:text-gray-900 mb-2"
        >
          ← 뒤로가기
        </button>
        <h2 className="text-2xl font-bold mb-2">피드백 작성</h2>
        <p className="text-gray-600">학생의 학습 결과에 대한 피드백을 작성합니다</p>
      </div>

      {/* 과제 정보 */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-1 rounded ${getSubjectColor(task.subject)}`}>
                {getSubjectLabel(task.subject)}
              </span>
            </div>
            <h3 className="text-lg font-semibold mb-1">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-gray-600 mb-2">{task.description}</p>
            )}
            <p className="text-sm text-gray-500">
              멘티: {task.mentee.nickname || task.mentee.name}
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
                  <p className="text-xs text-gray-500 mb-2">
                    {new Date(submission.createdAt).toLocaleString('ko-KR')}
                  </p>
                  {submission.comment && (
                    <p className="text-sm mb-3">{submission.comment}</p>
                  )}
                  {submission.imageUrls.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {submission.imageUrls.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`제출 이미지 ${idx + 1}`}
                          className="w-full h-32 object-cover rounded border"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {task.submissions.length === 0 && (
          <div className="border-t pt-4">
            <p className="text-sm text-gray-500">아직 제출 내용이 없습니다.</p>
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
          <p className="text-xs text-gray-500 mt-1">
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
          <p className="text-xs text-gray-500 mt-1">
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
    <Suspense fallback={<div className="flex justify-center items-center h-64"><p className="text-gray-500">로딩 중...</p></div>}>
      <FeedbackForm />
    </Suspense>
  );
}
