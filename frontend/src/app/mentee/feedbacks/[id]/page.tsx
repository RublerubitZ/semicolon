'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH';

interface Feedback {
  id: string;
  content: string;
  summary: string;
  subject: Subject;
  feedbackDate: string;
  mentor: {
    name: string;
  };
}

interface Submission {
  id: string;
  imageUrls: string[];
  comment: string;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  subject: Subject;
  date: string;
  isCompleted: boolean;
  worksheet?: {
    id: string;
    title: string;
    content: any;
  };
  feedbacks: Feedback[];
  submissions: Submission[];
  studyLogs: Array<{
    duration: number;
  }>;
}

const SUBJECT_LABELS: Record<Subject, { label: string; color: string }> = {
  KOREAN: { label: '국어', color: 'bg-blue-100 text-blue-800' },
  ENGLISH: { label: '영어', color: 'bg-green-100 text-green-800' },
  MATH: { label: '수학', color: 'bg-purple-100 text-purple-800' },
};

export default function FeedbackDetail() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTaskDetail = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`http://localhost:4000/api/mentee/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('과제를 불러오는데 실패했습니다.');
      }

      const data = await res.json();
      setTask(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
      router.push('/mentee/feedbacks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchTaskDetail();
    }
  }, [taskId]);

  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  const totalStudyTime = task.studyLogs.reduce((sum, log) => sum + log.duration, 0);

  return (
    <div className="p-4 pb-20">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/mentee/feedbacks')} className="text-gray-600">
          ← 뒤로
        </button>
        <h2 className="text-xl font-bold">피드백 상세</h2>
        <div className="w-12" />
      </div>

      {/* 과제 정보 */}
      <div className="bg-white p-4 rounded-lg border mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs px-2 py-1 rounded ${SUBJECT_LABELS[task.subject].color}`}>
            {SUBJECT_LABELS[task.subject].label}
          </span>
          <span className="text-sm text-gray-600">
            {new Date(task.date).toLocaleDateString('ko-KR')}
          </span>
          {task.isCompleted && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">완료</span>
          )}
        </div>

        <h3 className="text-lg font-bold mb-2">{task.title}</h3>
        {task.description && <p className="text-sm text-gray-600 mb-3">{task.description}</p>}

        {task.worksheet && (
          <div className="mt-3 p-3 bg-gray-50 rounded">
            <p className="text-sm font-semibold mb-1">📄 {task.worksheet.title}</p>
          </div>
        )}

        {totalStudyTime > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            공부 시간: {Math.floor(totalStudyTime / 60)}시간 {totalStudyTime % 60}분
          </div>
        )}
      </div>

      {/* 제출물 */}
      {task.submissions.length > 0 && (
        <div className="bg-white p-4 rounded-lg border mb-4">
          <h3 className="font-semibold mb-3">제출물</h3>
          {task.submissions.map((submission) => (
            <div key={submission.id} className="mb-4">
              <p className="text-xs text-gray-500 mb-2">
                {new Date(submission.createdAt).toLocaleString('ko-KR')}
              </p>

              {submission.imageUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {submission.imageUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`제출물 ${idx + 1}`}
                      className="w-full rounded border"
                    />
                  ))}
                </div>
              )}

              {submission.comment && (
                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{submission.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 피드백 */}
      {task.feedbacks.length > 0 ? (
        <div className="space-y-4">
          {task.feedbacks.map((feedback) => (
            <div key={feedback.id} className="bg-white p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{feedback.mentor.name} 멘토</span>
                  <span className="text-sm text-gray-500">
                    {new Date(feedback.feedbackDate).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>

              {feedback.summary && (
                <div className="mb-3 p-3 bg-yellow-50 rounded">
                  <p className="text-sm font-semibold text-yellow-800">{feedback.summary}</p>
                </div>
              )}

              <div className="text-sm text-gray-700 whitespace-pre-wrap">{feedback.content}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-gray-500 text-center">아직 피드백이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
