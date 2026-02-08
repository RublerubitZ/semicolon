'use client';

import { getApiUrl } from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';
import { DEFAULT_SUBJECT_VALUES, getSubjectLabel, getSubjectBadgeColor } from '@/constants/subjects';
import { getTaskStatusInfo } from '@/constants/taskStatus';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  HiCalendar, 
  HiClock, 
  HiChevronRight, 
  HiChevronDown,
  HiOutlineDocumentText,
  HiChevronLeft,
  HiXMark
} from 'react-icons/hi2';
import { AlertModal } from '@/components/AlertModal';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH' | 'OTHER';
type SortOrder = 'LATEST' | 'OLDEST';
type TaskStatus = 'FUTURE' | 'FEEDBACK_COMPLETE' | 'SUBMITTED' | 'NOT_SUBMITTED' | 'IN_PROGRESS';

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

interface StudyLog {
  id: string;
  startTime?: string;
  endTime?: string;
  duration: number;
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
  studyLogs?: StudyLog[];
}

const SUBJECT_TABS = [
  { id: 'ALL', label: '전체' },
  { id: 'KOREAN', label: '국어' },
  { id: 'ENGLISH', label: '영어' },
  { id: 'MATH', label: '수학' },
  { id: 'OTHER', label: '기타' },
];

export default function TaskHistoryPage() {
  const router = useRouter();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'ALL'>('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('LATEST');
  const [isLoading, setIsLoading] = useState(true);
  const [showFutureTasks, setShowFutureTasks] = useState(false);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title?: string; message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const showAlert = (message: string, title: string = '알림') => {
    setAlertState({ isOpen: true, title, message });
  };
  
  // 페이징 상태
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // 연/월 필터 상태
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [tempMonth, setTempMonth] = useState(new Date().getMonth() + 1);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      
      const res = await fetch(`${getApiUrl()}/api/mentee/planner/monthly?year=${year}&month=${month}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('과제 목록을 불러오는데 실패했습니다.');
      }

      const data = await res.json();
      const tasks: Task[] = [];
      if (data.tasksByDate) {
        Object.values(data.tasksByDate).forEach((dateTasks: any) => {
          tasks.push(...dateTasks);
        });
      }
      setAllTasks(tasks);
      setCurrentPage(1); // 데이터 로드 시 1페이지로 리셋
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedDate]);

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSubject, sortOrder, showFutureTasks]);

  const getTodayString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const isFutureTask = (taskDate: string) => {
    const today = getTodayString();
    return taskDate.split('T')[0] > today;
  };

  const getTaskStatus = (task: Task): TaskStatus => {
    if (isFutureTask(task.date)) return 'FUTURE';
    if (task.feedbacks && task.feedbacks.length > 0) return 'FEEDBACK_COMPLETE';
    if (task.submissions && task.submissions.length > 0) return 'SUBMITTED';
    
    const today = getTodayString();
    const taskDateOnly = task.date.split('T')[0];
    if (taskDateOnly === today) return 'IN_PROGRESS';
    
    return 'NOT_SUBMITTED';
  };

  const filteredTasks = useMemo(() => {
    let filtered = [...allTasks];
    const today = getTodayString();

    // 미래 과제 필터링
    if (!showFutureTasks) {
      filtered = filtered.filter(t => t.date.split('T')[0] <= today);
    }

    // 과목 필터
    if (selectedSubject !== 'ALL') {
      if (selectedSubject === 'OTHER') {
        filtered = filtered.filter(t => !DEFAULT_SUBJECT_VALUES.includes(t.subject as any));
      } else {
        filtered = filtered.filter(t => t.subject === selectedSubject);
      }
    }

    // 정렬
    filtered.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'LATEST' ? timeB - timeA : timeA - timeB;
    });

    return filtered;
  }, [allTasks, selectedSubject, sortOrder, showFutureTasks]);

  // 현재 페이지에 해당하는 데이터 계산
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTasks.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTasks, currentPage]);

  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);

  const isAccessRestricted = (task: Task) => {
    const hasPdf = task.worksheet?.pdfUrl || task.pdfUrl;
    return isFutureTask(task.date) && !!hasPdf;
  };

  const formatTimeRange = (task: Task) => {
    if (task.studyLogs && task.studyLogs.length > 0) {
      const log = task.studyLogs[0];
      if (log.startTime && log.endTime) {
        const formatTime = (time: string) => {
          const [hour, minute] = time.split(':');
          const h = parseInt(hour);
          const period = h < 12 ? '오전' : '오후';
          const hour12 = h % 12 || 12;
          return `${period} ${hour12}시${minute !== '00' ? ` ${parseInt(minute)}분` : ''}`;
        };
        return `${formatTime(log.startTime)} ~ ${formatTime(log.endTime)}`;
      }
    }
    return '시간 기록 없음';
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedDate(newDate);
  };

  const handleApplyDatePicker = () => {
    setSelectedDate(new Date(tempYear, tempMonth - 1, 1));
    setIsDatePickerOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-['Pretendard']">
      {/* Header */}
      <div className="px-6 pt-10 pb-4 flex justify-between items-center">
        <h1 className="text-[#1E293B] text-xl font-semibold">과제</h1>
        
        {/* 월 선택기 */}
        <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
          <button onClick={() => changeMonth(-1)} className="p-1 text-gray-400 hover:text-black transition-colors">
            <HiChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              setTempYear(selectedDate.getFullYear());
              setTempMonth(selectedDate.getMonth() + 1);
              setIsDatePickerOpen(true);
            }}
            className="text-sm font-semibold text-[#1E293B] min-w-[80px] text-center hover:bg-gray-100 px-2 py-0.5 rounded-md transition-colors"
          >
            {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
          </button>
          <button onClick={() => changeMonth(1)} className="p-1 text-gray-400 hover:text-black transition-colors">
            <HiChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative border-b border-gray-100 mb-2">
        <div className="flex px-4 overflow-x-auto scrollbar-hide">
          {SUBJECT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedSubject(tab.id as any)}
              className={`flex-1 min-w-[60px] py-4 text-center text-base font-semibold transition-colors relative ${
                selectedSubject === tab.id ? 'text-black' : 'text-[#94A3B8]'
              }`}
            >
              {tab.label}
              {selectedSubject === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#BFDBFE]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filter & Sort & Toggle */}
      <div className="flex justify-between items-center px-6 py-3">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className="relative">
            <input 
              type="checkbox" 
              className="sr-only" 
              checked={showFutureTasks}
              onChange={(e) => setShowFutureTasks(e.target.checked)}
            />
            <div className={`w-8 h-4 rounded-full transition-colors ${showFutureTasks ? 'bg-[#BFDBFE]' : 'bg-gray-200'}`} />
            <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showFutureTasks ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <span className="text-xs font-medium text-[#64748B]">미래 과제 포함</span>
        </label>

        <button 
          onClick={() => setSortOrder(prev => prev === 'LATEST' ? 'OLDEST' : 'LATEST')}
          className="flex items-center gap-1 text-[#94A3B8] text-xs font-normal"
        >
          {sortOrder === 'LATEST' ? '최신순' : '오래된순'}
          <HiChevronDown className={`w-2.5 h-2.5 transition-transform ${sortOrder === 'OLDEST' ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 px-6 pb-4 space-y-4 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-full h-32 bg-gray-100 rounded-[10px] animate-pulse" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
            <p className="text-sm">등록된 과제가 없습니다.</p>
          </div>
        ) : (
          <>
            {paginatedTasks.map((task) => {
              const isFuture = isFutureTask(task.date);
              const restricted = isAccessRestricted(task);
              const statusInfo = getTaskStatusInfo(task);
              const hasFeedback = task.feedbacks && task.feedbacks.length > 0;
              const feedback = hasFeedback ? task.feedbacks![0] : null;

              return (
                <div 
                  key={task.id}
                  className={`w-full p-5 bg-[#F3F4F6] rounded-[10px] flex flex-col gap-4 ${restricted ? 'opacity-60' : ''}`}
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-start gap-3.5">
                      {/* Icon */}
                      <div className={`size-7 min-w-[28px] rounded-2xl flex items-center justify-center mt-0.5 ${task.isFixed ? 'bg-[#082F49]' : 'bg-[#64748B]'}`}>
                        <div className="size-4 flex items-center justify-center">
                          <div className="size-3 bg-white rounded-sm" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div className="flex flex-col gap-1.5 min-w-0">
                            <div className="flex items-start gap-1.5 min-w-0 flex-1">
                              <h3 className="text-black text-base font-semibold leading-6 line-clamp-2 flex-1">
                                {task.title}
                              </h3>

                              <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                                {/* Subject Tag */}
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${getSubjectBadgeColor(task.subject)}`}>
                                  {getSubjectLabel(task.subject)}
                                </span>

                                {/* Status Badge */}
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap ${statusInfo.style}`}>
                                  {statusInfo.label}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Detailed View Link */}
                          <button 
                            onClick={() => {
                              if (isFuture) {
                                showAlert('미래의 과제는 해당 날짜가 되어야 접근할 수 있습니다.');
                                return;
                              }
                              router.push(`/mentee/tasks/${task.id}`);
                            }}
                            className="shrink-0 flex items-center gap-1 text-[#4B5563] text-xs font-medium pt-1"
                          >
                            상세 보기
                            <HiChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Date & Time Info */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-[#4B5563] text-xs font-medium">
                            <HiCalendar className="w-4 h-4 shrink-0" />
                            {formatDate(task.date)}
                          </div>
                          <div className="flex items-center gap-1.5 text-[#4B5563] text-xs font-medium">
                            <HiClock className="w-4 h-4 shrink-0" />
                            {formatTimeRange(task)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PDF Download Button */}
                  {(task.worksheet?.pdfUrl || task.pdfUrl) && !isFuture && (
                    <div className="ml-10.5">
                      <a
                        href={task.worksheet?.pdfUrl || task.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-[#4B5563] hover:bg-gray-50 transition-colors"
                      >
                        <HiOutlineDocumentText className="w-4 h-4 text-blue-500" />
                        학습자료(PDF) 다운로드
                      </a>
                    </div>
                  )}

                  {/* Restricted Access Message */}
                  {isFuture && (
                    <div className="ml-10.5 text-[#EF4444] text-[10px] font-medium flex items-center gap-1">
                      <span>🔒 해당 날짜가 되면 상세 내용과 학습지를 확인할 수 있습니다</span>
                    </div>
                  )}

                  {/* Feedback Section */}
                  {feedback && (
                    <div className="w-full bg-white rounded-lg p-3.5 flex flex-col gap-2.5 mt-1">
                      <div className="text-[#1E293B] text-sm font-semibold">
                        {getSubjectLabel(task.subject)} 피드백 요약
                      </div>
                      <div className="bg-[#F0F7FF] rounded-lg border border-[#BFDBFE] p-3.5">
                        <div className="text-[#082F49] text-sm font-medium leading-5">
                          {feedback.summary || feedback.content}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 py-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <HiChevronLeft className="w-6 h-6" />
                </button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                        currentPage === page 
                          ? 'bg-[#BFDBFE] text-[#082F49]' 
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <HiChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Date Picker Modal */}
      {isDatePickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-semibold text-lg text-[#1E293B]">날짜 직접 선택</h2>
              <button onClick={() => setIsDatePickerOpen(false)} className="text-gray-400">
                <HiXMark className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-500">연도</label>
                <select 
                  value={tempYear} 
                  onChange={(e) => setTempYear(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
                >
                  {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
                    <option key={year} value={year}>{year}년</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-500">월</label>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <button
                      key={month}
                      onClick={() => setTempMonth(month)}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        tempMonth === month 
                          ? 'bg-[#BFDBFE] text-[#082F49]' 
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {month}월
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex gap-2">
              <button 
                onClick={() => setIsDatePickerOpen(false)}
                className="flex-1 py-3 text-gray-500 font-medium hover:bg-gray-100 rounded-xl transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleApplyDatePicker}
                className="flex-1 py-3 bg-[#1E293B] text-white font-medium rounded-xl hover:bg-black transition-colors"
              >
                적용하기
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal 
        isOpen={alertState.isOpen} 
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))} 
        title={alertState.title} 
        message={alertState.message} 
      />
    </div>
  );
}
