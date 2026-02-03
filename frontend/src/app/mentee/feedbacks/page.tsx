'use client';
import { getApiUrl } from '@/lib/api';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH';

interface Feedback {
  id: string;
  content: string;
  summary: string;
  subject: Subject;
  feedbackDate: string;
  createdAt: string;
  mentor: {
    name: string;
  };
}

interface Task {
  id: string;
  title: string;
  subject: Subject;
  date: string;
  feedbacks: Feedback[];
}

const SUBJECT_LABELS: Record<Subject, { label: string; color: string }> = {
  KOREAN: { label: '국어', color: 'bg-blue-100 text-blue-800' },
  ENGLISH: { label: '영어', color: 'bg-green-100 text-green-800' },
  MATH: { label: '수학', color: 'bg-purple-100 text-purple-800' },
};

export default function FeedbackList() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchFeedbacks = async (subject?: Subject) => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = subject
        ? `${getApiUrl()}/api/mentee/feedbacks?subject=${subject}`
        : `${getApiUrl()}/api/mentee/feedbacks`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('피드백을 불러오는데 실패했습니다.');
      }

      const data = await res.json();
      setTasks(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks(selectedSubject === 'ALL' ? undefined : selectedSubject);
  }, [selectedSubject]);

  return (
    <div className="p-4 pb-20">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/mentee')} className="text-gray-900 dark:text-gray-100">
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
            selectedSubject === 'ALL' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
          }`}
        >
          전체
        </button>
        {(Object.keys(SUBJECT_LABELS) as Subject[]).map((subject) => (
          <button
            key={subject}
            onClick={() => setSelectedSubject(subject)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              selectedSubject === subject
                ? SUBJECT_LABELS[subject].color
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            }`}
          >
            {SUBJECT_LABELS[subject].label}
          </button>
        ))}
      </div>

      {/* 피드백 목록 */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-gray-900 dark:text-gray-100">불러오는 중...</p>
        ) : tasks.length === 0 ? (
          <p className="text-gray-900 dark:text-gray-100">아직 받은 피드백이 없습니다.</p>
        ) : (
          tasks.map((task) =>
            task.feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                onClick={() => router.push(`/mentee/feedbacks/${task.id}`)}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${SUBJECT_LABELS[task.subject].color}`}>
                      {SUBJECT_LABELS[task.subject].label}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-300">
                      {new Date(feedback.feedbackDate).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <span className="text-xs text-gray-900 dark:text-gray-300">{feedback.mentor.name} 멘토</span>
                </div>

                <h3 className="font-semibold mb-1 dark:text-white">{task.title}</h3>

                {feedback.summary && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{feedback.summary}</p>
                )}

                <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">{feedback.content}</p>

                <div className="mt-3 text-xs text-blue-600 dark:text-blue-400">자세히 보기 →</div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
