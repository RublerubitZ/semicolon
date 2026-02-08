'use client';
import { getApiUrl } from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';
import { getSubjectLabel, getSubjectBadgeColor, DEFAULT_SUBJECT_VALUES } from '@/constants/subjects';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/stores/useToastStore';

interface Feedback {
  id: string;
  content: string;
  summary?: string;
  subject: string;
  feedbackDate: string;
  createdAt: string;
  mentor: {
    name: string;
  };
}

interface Task {
  id: string;
  title: string;
  subject: string;
  date: string;
  feedbacks: Feedback[];
}

type SubjectFilter = 'ALL' | 'KOREAN' | 'ENGLISH' | 'MATH';

export default function FeedbackListPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchFeedbacks = async (subject?: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = subject ? `?subject=${subject}` : '';
      const res = await fetch(`${getApiUrl()}/api/mentee/feedbacks${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('피드백을 불러오는데 실패했습니다.');
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const subjectParam = selectedSubject === 'ALL' ? undefined : selectedSubject;
    fetchFeedbacks(subjectParam);
  }, [selectedSubject]);

  return (
    <div className="p-4 pb-20">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="text-gray-900 dark:text-gray-100">
          ← 뒤로
        </button>
        <h2 className="text-xl font-bold dark:text-white">피드백</h2>
        <div className="w-12" />
      </div>

      {/* 과목 필터 */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setSelectedSubject('ALL')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap ${
            selectedSubject === 'ALL'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
          }`}
        >
          전체
        </button>
        {DEFAULT_SUBJECT_VALUES.map((subject) => (
          <button
            key={subject}
            onClick={() => setSelectedSubject(subject)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              selectedSubject === subject
                ? getSubjectBadgeColor(subject)
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            }`}
          >
            {getSubjectLabel(subject)}
          </button>
        ))}
      </div>

      {/* 피드백 목록 */}
      <div className="space-y-4">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">
              아직 받은 피드백이 없습니다
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              멘토가 피드백을 작성하면 여기에 표시됩니다
            </p>
          </div>
        ) : (
          tasks.map((task) =>
            task.feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                onClick={() => router.push(`/mentee/tasks/${task.id}`)}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${getSubjectBadgeColor(task.subject)}`}>
                      {getSubjectLabel(task.subject)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(feedback.feedbackDate)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {feedback.mentor.name} 멘토
                  </span>
                </div>

                <h3 className="font-semibold mb-1 dark:text-white">{task.title}</h3>

                {feedback.summary && (
                  <p className="text-sm text-amber-700 dark:text-amber-400 mb-1">
                    {feedback.summary}
                  </p>
                )}

                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {feedback.content}
                </p>

                <p className="mt-3 text-xs text-blue-600 dark:text-blue-400">
                  상세보기 →
                </p>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
