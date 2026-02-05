'use client';
import { getApiUrl } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

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

      const res = await fetch(`${getApiUrl()}/api/mentee/tasks/${taskId}`, {
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
        <p className="text-gray-900 dark:text-gray-100">불러오는 중...</p>
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
        <button onClick={() => router.push('/mentee/feedbacks')} className="text-gray-900 dark:text-gray-100">
          ← 뒤로
        </button>
        <h2 className="text-xl font-bold dark:text-white">피드백 상세</h2>
        <div className="w-12" />
      </div>

      {/* 과제 정보 */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs px-2 py-1 rounded ${SUBJECT_LABELS[task.subject as Subject]?.color || 'bg-gray-100 text-gray-800'}`}>
            {SUBJECT_LABELS[task.subject as Subject]?.label || task.subject}
          </span>
          <span className="text-sm text-gray-900 dark:text-gray-300">
            {formatDate(task.date)}
          </span>
          {task.isCompleted && (
            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-2 py-1 rounded">완료</span>
          )}
        </div>

        <h3 className="text-lg font-bold mb-2 dark:text-white">{task.title}</h3>
        {task.description && <p className="text-sm text-gray-900 dark:text-gray-100 mb-3">{task.description}</p>}

        {task.worksheet && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <p className="text-sm font-semibold mb-1 dark:text-gray-100">📄 {task.worksheet.title}</p>
          </div>
        )}

        {totalStudyTime > 0 && (
          <div className="mt-3 text-sm text-gray-900 dark:text-gray-100">
            공부 시간: {Math.floor(totalStudyTime / 60)}시간 {totalStudyTime % 60}분
          </div>
        )}
      </div>

      {/* 제출물 */}
      {task.submissions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 mb-4">
          <h3 className="font-semibold mb-3 dark:text-white">제출물</h3>
          {task.submissions.map((submission) => (
            <div key={submission.id} className="mb-4">
              <p className="text-xs text-gray-900 dark:text-gray-300 mb-2">
                {formatDateTime(submission.createdAt)}
              </p>

              {submission.imageUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {submission.imageUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`제출물 ${idx + 1}`}
                      className="w-full rounded border dark:border-gray-600"
                    />
                  ))}
                </div>
              )}

              {submission.comment && (
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded">{submission.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 피드백 */}
      {(task.feedbacks?.length || 0) > 0 ? (
        <div className="space-y-4">
          {task.feedbacks.map((feedback) => (
            <div key={feedback.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold dark:text-white">{feedback.mentor.name} 멘토</span>
                  <span className="text-sm text-gray-900 dark:text-gray-300">
                    {formatDate(feedback.feedbackDate)}
                  </span>
                </div>
              </div>

              {feedback.summary && (
                <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded">
                  <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">{feedback.summary}</p>
                </div>
              )}

              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{feedback.content}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
          <p className="text-gray-900 dark:text-gray-100 text-center">아직 피드백이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
