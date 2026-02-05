'use client';
import { getApiUrl } from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH' | 'OTHER';
type TaskStatus = 'NOT_SUBMITTED' | 'OVERDUE' | 'SUBMITTED' | 'FEEDBACK_COMPLETE';
type DateFilter = 'ALL' | 'TODAY';

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

interface Submission {
  id: string;
  imageUrls: string[];
  comment?: string;
  createdAt: string;
}

interface Worksheet {
  id: string;
  title: string;
  pdfUrl?: string;
}

interface Task {
  id: string;
  title: string;
  subject: string;
  date: string;
  isFixed: boolean;
  worksheet?: Worksheet;
  pdfUrl?: string;
  feedbacks?: Feedback[];
  submissions?: Submission[];
}

const DEFAULT_SUBJECTS = ['KOREAN', 'ENGLISH', 'MATH'];

const SUBJECT_LABELS: Record<string, { label: string; color: string }> = {
  KOREAN: { label: '국어', color: 'bg-blue-100 text-blue-800' },
  ENGLISH: { label: '영어', color: 'bg-green-100 text-green-800' },
  MATH: { label: '수학', color: 'bg-purple-100 text-purple-800' },
};

const STATUS_BADGES: Record<TaskStatus, { label: string; color: string }> = {
  NOT_SUBMITTED: { label: '제출 전', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  OVERDUE: { label: '미제출', color: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300' },
  SUBMITTED: { label: '제출됨', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  FEEDBACK_COMPLETE: { label: '피드백 완료', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
};

// 오늘 날짜 문자열 (YYYY-MM-DD)
const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// 과제 날짜가 오늘인지 확인
const isTaskToday = (taskDate: string) => {
  const today = getTodayString();
  const taskDateStr = taskDate.split('T')[0];
  return taskDateStr === today;
};

// 과제 날짜가 지났는지 확인
const isTaskOverdue = (taskDate: string) => {
  const today = getTodayString();
  const taskDateStr = taskDate.split('T')[0];
  return taskDateStr < today;
};

export default function TaskHistoryPage() {
  const router = useRouter();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<Set<string>>(new Set());

  const fetchTasks = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');

      // 모든 과제 조회 (임시로 플래너 API 활용)
      // TODO: 백엔드에 전체 과제 히스토리 API 추가 필요
      const res = await fetch(`${getApiUrl()}/api/mentee/planner/monthly`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('과제 목록을 불러오는데 실패했습니다.');
      }

      const data = await res.json();

      // tasksByDate에서 모든 과제 추출
      const tasks: Task[] = [];
      if (data.tasksByDate) {
        Object.values(data.tasksByDate).forEach((dateTasks: any) => {
          tasks.push(...dateTasks);
        });
      }

      // 날짜 내림차순 정렬
      tasks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAllTasks(tasks);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTaskStatus = (task: Task): TaskStatus => {
    if (task.feedbacks && task.feedbacks.length > 0) return 'FEEDBACK_COMPLETE';
    if (task.submissions && task.submissions.length > 0) return 'SUBMITTED';
    // 제출 기한(오늘)이 지났는데 미제출인 경우
    if (isTaskOverdue(task.date)) return 'OVERDUE';
    return 'NOT_SUBMITTED';
  };

  // 날짜 + 과목 필터 적용
  const filteredTasks = useMemo(() => {
    let filtered = allTasks;

    // 날짜 필터
    if (dateFilter === 'TODAY') {
      filtered = filtered.filter(t => isTaskToday(t.date));
    }

    // 과목 필터
    if (selectedSubject !== 'ALL') {
      if (selectedSubject === 'OTHER') {
        filtered = filtered.filter(t => !DEFAULT_SUBJECTS.includes(t.subject));
      } else {
        filtered = filtered.filter(t => t.subject === selectedSubject);
      }
    }

    return filtered;
  }, [allTasks, dateFilter, selectedSubject]);

  const toggleCollapse = (taskId: string) => {
    setCollapsedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // 접근 제한 여부: 미래 과제 + PDF 학습지 있음 (지난 과제는 열람 가능)
  const isAccessRestricted = (task: Task) => {
    const hasPdf = task.worksheet?.pdfUrl || task.pdfUrl;
    const isFuture = !isTaskToday(task.date) && !isTaskOverdue(task.date);
    return !!(isFuture && hasPdf);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div className="p-4 pb-20">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/mentee')} className="text-gray-900 dark:text-gray-100">
          ← 뒤로
        </button>
        <h2 className="text-xl font-bold dark:text-white">과제 히스토리</h2>
        <div className="w-12" />
      </div>

      {/* 날짜 필터 (전체 / 오늘 할 일) */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setDateFilter('ALL')}
          className={`px-4 py-2 rounded-lg font-medium ${
            dateFilter === 'ALL'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setDateFilter('TODAY')}
          className={`px-4 py-2 rounded-lg font-medium ${
            dateFilter === 'TODAY'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
          }`}
        >
          오늘 할 일
        </button>
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
        <button
          onClick={() => setSelectedSubject('OTHER')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap ${
            selectedSubject === 'OTHER'
              ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-black'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
          }`}
        >
          기타
        </button>
      </div>

      {/* 과제 목록 */}
      <div className="space-y-4">
        {isLoading ? (
          <>
            {/* 로딩 스켈레톤 */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">
              {dateFilter === 'TODAY' ? '오늘 할 과제가 없습니다' : '과제가 없습니다'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {dateFilter === 'TODAY'
                ? '오늘 예정된 과제가 없습니다'
                : selectedSubject === 'ALL'
                  ? '아직 등록된 과제가 없습니다'
                  : `${SUBJECT_LABELS[selectedSubject as Subject]?.label || '해당 과목'} 과제가 없습니다`}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const status = getTaskStatus(task);
            const statusInfo = STATUS_BADGES[status];
            const isCollapsed = collapsedTaskIds.has(task.id);
            const restricted = isAccessRestricted(task);

            return (
              <div
                key={task.id}
                className={`bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 ${restricted ? 'opacity-60' : ''}`}
              >
                {/* 헤더 */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded ${SUBJECT_LABELS[task.subject as Subject]?.color || 'bg-gray-100 text-gray-800'}`}>
                      {SUBJECT_LABELS[task.subject as Subject]?.label || task.subject}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-300">
                      {formatDate(task.date)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* 과제 제목 */}
                <h3 className="font-semibold mb-2 dark:text-white">{task.title}</h3>

                {/* 접근 제한 안내 */}
                {restricted && (
                  <p className="text-xs text-red-500 dark:text-red-400 mb-2">
                    🔒 해당 날짜의 학습지만 열람할 수 있습니다
                  </p>
                )}

                {/* 상태별 UI */}
                {(status === 'NOT_SUBMITTED' || status === 'OVERDUE') && (
                  <div className="flex gap-2">
                    {task.worksheet?.pdfUrl && !restricted && (
                      <a
                        href={task.worksheet.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1 bg-blue-500 dark:bg-blue-600 text-white text-sm rounded hover:bg-blue-600 dark:hover:bg-blue-700"
                      >
                        📄 다운로드
                      </a>
                    )}
                    {!restricted && (
                      <button
                        onClick={() => router.push(`/mentee/tasks/${task.id}`)}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        상세보기 →
                      </button>
                    )}
                  </div>
                )}

                {status === 'SUBMITTED' && (
                  <button
                    onClick={() => router.push(`/mentee/tasks/${task.id}`)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    상세보기 →
                  </button>
                )}

                {status === 'FEEDBACK_COMPLETE' && task.feedbacks && task.feedbacks.length > 0 && (
                  <div>
                    {/* 기본: 펼침 상태 (피드백 요약 보임), 접을 수 있음 */}
                    {!isCollapsed && (
                      <div className="mt-1 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        {task.feedbacks[0]?.summary && (
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                            💡 {task.feedbacks[0].summary}
                          </p>
                        )}
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                          {task.feedbacks[0]?.content}
                        </p>
                        <button
                          onClick={() => router.push(`/mentee/tasks/${task.id}`)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          상세보기 →
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => toggleCollapse(task.id)}
                      className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      {isCollapsed ? '▼ 피드백 펼치기' : '▲ 피드백 접기'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
