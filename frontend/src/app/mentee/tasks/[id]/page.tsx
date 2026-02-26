'use client';

import { getApiUrl, apiGet, apiPost, apiPatch, fetchWithAuth } from '@/lib/api';
import ImageModal from '@/components/ImageModal';
import { getSubjectLabel } from '@/constants/subjects';
import { type SelfCheckStatus } from '@/constants/selfCheck';
import HtmlContent from '@/components/HtmlContent';
import { calculateDuration, isTimeOverlapping, validateStudyTime } from '@/lib/timeUtils';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  MdChevronLeft, 
  MdAccessTime, 
  MdDescription, 
  MdFileDownload, 
  MdPushPin,
  MdOutlinePhotoCamera,
  MdDelete, 
  MdChevronRight,
  MdEdit
} from 'react-icons/md';
import { AlertModal } from '@/components/AlertModal';
import { WorksheetSelectionModal } from '@/components/mentee/main/WorksheetSelectionModal';
import { Toast, type ToastType } from '@/components/Toast';

// 과목별 스타일 매핑 (task2 디자인 반영)
const SUBJECT_STYLES: Record<string, string> = {
  'KOREAN': 'bg-pink-100 border-pink-400',
  'ENGLISH': 'bg-amber-100 border-amber-400',
  'MATH': 'bg-[#E5F4FF] border-blue-400',
  'DEFAULT': 'bg-gray-100 border-gray-400',
};

interface Worksheet {
  id: string;
  title: string;
  subject: string;
  content?: any;
  pdfUrl?: string;
  type: 'COLUMN' | 'PDF';
}

interface Feedback {
  id: string;
  content: string;
  summary?: string;
  subject: string;
  feedbackDate: string;
  mentor: {
    id: string;
    name: string;
    profileImage?: string;
  };
}

interface Submission {
  id: string;
  imageUrls: string[];
  comment?: string;
  createdAt: string;
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
    profileImage?: string;
    role: string;
  };
}

interface LearningGoalItem {
  id: string;
  title: string;
  order: number;
  isCompleted: boolean;
}

interface LearningGoal {
  id: string;
  items: LearningGoalItem[];
}

interface TaskMaterial {
  id: string;
  type: 'PDF' | 'COLUMN';
  order: number;
  pdfUrl?: string;
  pdfFileName?: string; // PDF 원본 파일명
  columnTitle?: string;
  columnContent?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  subject: string;
  date: string;
  isCompleted: boolean;
  isFixed: boolean;
  selfCheck: SelfCheckStatus;
  isApproved: boolean;
  pdfUrl?: string;
  worksheet?: Worksheet;
  materials?: TaskMaterial[]; // 새로운 필드
  feedbacks: Feedback[];
  submissions: Submission[];
  studyLogs: {
    id: string;
    duration: number;
    startTime?: string;
    endTime?: string;
  }[];
  learningGoal?: LearningGoal;
}

// 메시지 타입 (피드백 + 댓글 통합용)
interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userRole: 'MENTOR' | 'MENTEE';
  content: string;
  createdAt: string;
  profileImage?: string;
}

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  // --- 상태 관리 ---
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title?: string; message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: ToastType }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ show: true, message, type });
  };

  const showAlert = (message: string, title: string = '알림') => {
    setAlertState({ isOpen: true, title, message });
  };

  // 제출 폼 및 채팅 입력 상태
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitComment, setSubmitComment] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeOverlapError, setTimeOverlapError] = useState<string | null>(null);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);

  const [showWorksheetModal, setShowWorksheetModal] = useState(false);
  const [selectedWorksheet, setSelectedWorksheet] = useState<any>(null);

  // 피드백/채팅 상태
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  
  // 이미지 모달
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalIndex, setImageModalIndex] = useState(0);

  // 스크롤용 Ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- 데이터 페칭 로직 ---
  const fetchTaskDetail = async () => {
    setIsLoading(true);
    try {
      const res = await apiGet(`/api/mentee/tasks/${taskId}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || '과제를 불러오는데 실패했습니다.');
      }

      const data = await res.json();
      setTask(data);

      if (data.studyLogs && data.studyLogs.length > 0) {
        const log = data.studyLogs[0];
        if (log.startTime) setStartTime(log.startTime);
        if (log.endTime) setEndTime(log.endTime);
      }

      // 해당 날짜의 모든 과제 가져오기 (시간 중복 체크용)
      if (data.date) {
        const dateStr = data.date.split('T')[0];
        const plannerRes = await apiGet(`/api/mentee/planner?date=${dateStr}`);
        if (plannerRes.ok) {
          const plannerData = await plannerRes.json();
          setDailyTasks(plannerData.tasks || []);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await apiGet(`/api/tasks/${taskId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('댓글 조회 오류:', error);
    }
  };

  // --- 효과 (Effects) ---
  useEffect(() => {
    if (taskId) {
      setUploadedImageUrls([]);
      setSelectedImages([]);
      setSubmitComment('');
      fetchTaskDetail();
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          setCurrentUser({ id: userData.id, role: userData.role });
        } catch (e) {
          console.error('User data parse error', e);
        }
      }
    }
  }, [taskId]);

  useEffect(() => {
    if (task && task.submissions.length > 0) {
      fetchComments();
    }
  }, [task]);

  useEffect(() => {
    if (task && task.submissions.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, task?.feedbacks]);

  // --- 핸들러 함수 ---
  // materials를 처리하는 함수
  const handleViewMaterials = () => {
    if (!task) return;

    const materials = task.materials || [];

    // materials가 없으면 기존 로직 사용 (하위 호환성)
    if (materials.length === 0) {
      if (task.worksheet) {
        handleViewPdf(task.worksheet);
      } else if (task.pdfUrl) {
        // pdfUrl이 여러 개인 경우 (쉼표로 구분)
        if (task.pdfUrl.includes(',')) {
          setSelectedWorksheet({
            id: 'legacy-pdfs',
            title: task.title,
            type: 'PDF',
            pdfUrl: task.pdfUrl, // 쉼표로 구분된 URL들
          });
          setShowWorksheetModal(true);
        } else {
          // 단일 PDF
          handleViewPdf(task.pdfUrl);
        }
      }
      return;
    }

    // 1개일 때: 바로 보기
    if (materials.length === 1) {
      const material = materials[0];
      if (material.type === 'PDF' && material.pdfUrl) {
        handleViewPdf(material.pdfUrl);
      } else if (material.type === 'COLUMN') {
        // 칼럼 모달 열기 (WorksheetSelectionModal 재활용)
        setSelectedWorksheet({
          id: material.id,
          title: material.columnTitle || '칼럼',
          type: 'COLUMN',
          content: material.columnContent,
        });
        setShowWorksheetModal(true);
      }
      return;
    }

    // 2개 이상: 선택 모달 열기
    setSelectedWorksheet({
      id: 'materials',
      title: task.title,
      type: 'PDF', // 타입은 모달에서 materials로 판단
      materials: materials,
    });
    setShowWorksheetModal(true);
  };

  const handleViewPdf = (worksheetOrUrl: any) => {
    if (!worksheetOrUrl) return;

    let pdfUrl = "";
    let title = "학습파일";

    if (typeof worksheetOrUrl === 'string') {
      pdfUrl = worksheetOrUrl;
    } else {
      pdfUrl = worksheetOrUrl.pdfUrl || worksheetOrUrl.fileUrl;
      title = worksheetOrUrl.title || "학습파일";
    }

    if (!pdfUrl) return;

    if (pdfUrl.includes(',')) {
      setSelectedWorksheet(typeof worksheetOrUrl === 'string' ? { title, pdfUrl } : worksheetOrUrl);
      setShowWorksheetModal(true);
      return;
    }

    let fullUrl = pdfUrl;
    if (!pdfUrl.startsWith('http')) {
      const baseUrl = getApiUrl().replace(/\/$/, '');
      const cleanPath = pdfUrl.startsWith('/') ? pdfUrl : `/${pdfUrl}`;
      fullUrl = `${baseUrl}${cleanPath}`;
    }

    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const targetFiles: File[] = [];
      
      for (const file of files) {
        if (targetFiles.length + uploadedImageUrls.length < 6) {
          targetFiles.push(file);
        }
      }

      if (targetFiles.length > 0) {
        setIsUploading(true);
        try {
          const urls: string[] = [];
          for (const file of targetFiles) {
            const formData = new FormData();
            formData.append('image', file);
            const res = await fetchWithAuth(`${getApiUrl()}/api/upload/image`, {
              method: 'POST',
              body: formData,
            });
            if (res.ok) {
              const data = await res.json();
              urls.push(data.url);
            } else {
              const errorData = await res.json().catch(() => ({}));
              showAlert(errorData.error || '이미지 업로드에 실패했습니다.');
            }
          }
          setUploadedImageUrls(prev => [...prev, ...urls]);
        } catch (err) {
          console.error(err);
          showAlert('이미지 업로드 중 오류가 발생했습니다.');
        } finally {
          setIsUploading(false);
        }
      }
    }
  };

  // 시간 중복 체크 함수
  const checkTimeOverlap = (start: string, end: string): { overlaps: boolean; message?: string } => {
    if (!start || !end || !dailyTasks.length) return { overlaps: false };

    for (const t of dailyTasks) {
      if (t.id === taskId) continue; // 현재 과제는 제외

      for (const log of t.studyLogs) {
        if (!log.startTime || !log.endTime) continue;

        if (isTimeOverlapping(start, end, log.startTime, log.endTime)) {
          return {
            overlaps: true,
            message: `${t.title} : ${log.startTime} ~ ${log.endTime} 이 설정한 공부시간과 겹칩니다.`
          };
        }
      }
    }
    return { overlaps: false };
  };

  const handleTimeChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartTime(value);
      if (value && endTime) {
        const overlap = checkTimeOverlap(value, endTime);
        if (overlap.overlaps) {
          setTimeOverlapError(overlap.message || '시간이 겹칩니다.');
        } else {
          const timeError = validateStudyTime(value, endTime);
          if (timeError) {
            setTimeOverlapError(timeError);
          } else {
            setTimeOverlapError(null);
          }
        }
      }
    } else {
      setEndTime(value);
      if (startTime && value) {
        const overlap = checkTimeOverlap(startTime, value);
        if (overlap.overlaps) {
          setTimeOverlapError(overlap.message || '시간이 겹칩니다.');
        } else {
          const timeError = validateStudyTime(startTime, value);
          if (timeError) {
            setTimeOverlapError(timeError);
          } else {
            setTimeOverlapError(null);
          }
        }
      }
    }
  };

  const handleRegister = async () => {
    if (!task) return;

    // 공부시간 유효성 검사
    if (!startTime || !endTime) {
      showToast('공부시간을 설정해주세요.', 'error');
      return;
    }

    if (timeOverlapError) {
      showToast(timeOverlapError, 'error');
      return;
    }

    const duration = calculateDuration(startTime, endTime);
    if (duration <= 0) {
      showToast('종료 시간은 시작 시간보다 늦어야 합니다.', 'error');
      return;
    }

    // 유효성 검사
    const hasImages = uploadedImageUrls.length > 0;
    const hasComment = submitComment.trim();

    if (task.isFixed) {
      // 멘토 지정 과제: 이미지 필수
      if (!hasImages) {
        showToast('멘토 지정 과제는 이미지를 최소 1개 이상 업로드해주세요.', 'error');
        return;
      }
    } else {
      // 멘티 자체 과제: 이미지 또는 코멘트 중 하나 필수
      if (!hasImages && !hasComment) {
        showToast('이미지 또는 코멘트를 최소 하나 이상 입력해주세요.', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 시간 기록이 없는 경우에만 시간 기록 API 호출
      if (task.studyLogs.length === 0) {
        await apiPost(`/api/mentee/tasks/${taskId}/time`, {
          duration,
          date: task.date.split('T')[0],
          startTime,
          endTime
        });

        // 자가점검도 완료로 업데이트
        if (task.selfCheck !== 'DONE') {
          await apiPatch(`/api/mentee/tasks/${taskId}/self-check`, { selfCheck: 'DONE' });
        }
      }

      const res = await apiPost(`/api/mentee/tasks/${taskId}/submit`, {
        imageUrls: uploadedImageUrls,
        comment: submitComment
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || '과제 제출에 실패했습니다.');
      }

      setUploadedImageUrls([]);
      setSubmitComment('');
      showToast('과제가 등록되었습니다!', 'success');
      fetchTaskDetail();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '오류 발생', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const content = chatInput.trim();
    setChatInput('');

    try {
      const res = await apiPost(`/api/tasks/${taskId}/comments`, { content });
      if (res.ok) {
        fetchComments();
      }
    } catch (error) {
      console.error('메시지 전송 오류:', error);
    }
  };

  const formatMessages = (feedbacks: Feedback[], comments: FeedbackComment[]): ChatMessage[] => {
    const messages: ChatMessage[] = [];
    feedbacks.forEach((fb) => {
      messages.push({
        id: fb.id,
        userId: fb.mentor.id,
        userName: fb.mentor.name,
        userRole: 'MENTOR',
        content: fb.content,
        createdAt: fb.feedbackDate,
        profileImage: fb.mentor.profileImage,
      });
    });
    comments.forEach((cm) => {
      messages.push({
        id: cm.id,
        userId: cm.userId,
        userName: cm.user.name,
        userRole: cm.user.role as 'MENTOR' | 'MENTEE',
        content: cm.content,
        createdAt: cm.createdAt,
        profileImage: cm.user.profileImage,
      });
    });
    return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  // --- 렌더링 준비 ---
  if (isLoading) return <div className="p-10 text-center">로딩 중...</div>;
  if (error || !task) return <div className="p-10 text-center text-red-500">{error || '과제를 찾을 수 없습니다.'}</div>;

  const subjectStyle = SUBJECT_STYLES[task.subject] || SUBJECT_STYLES['DEFAULT'];
  const hasSubmitted = task.submissions.length > 0;
  const currentSubmission = task.submissions[0];
  const firstFeedback = task.feedbacks[0];
  const messages = formatMessages(task.feedbacks, comments);

  // --- 화면 1: 과제 제출 폼 (제출 전) ---
  if (!hasSubmitted) {
    return (
      <div className="min-h-screen bg-white pb-10">
        <header className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between relative z-20">
          <button onClick={() => router.back()} className="">
            <MdChevronLeft className="w-7 h-7" />
          </button>
          <h1 className="text-lg font-semibold">{formatDate(task.date)}</h1>
          <div className="w-7 flex items-center justify-center">
            {((task.materials && task.materials.length > 0) || task.worksheet || task.pdfUrl) && (
              <button onClick={handleViewMaterials} className="text-blue-600">
                <MdFileDownload className="w-7 h-7" />
              </button>
            )}
          </div>
        </header>

        <div className="px-5 pt-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1A1A1A] rounded-full flex items-center justify-center flex-shrink-0">
              <MdPushPin className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-semibold text-black flex-1 truncate">{task.title}</h2>
            <span className={`px-4 py-1.5 text-sm font-medium text-black rounded-lg border-2 ${subjectStyle}`}>
              {getSubjectLabel(task.subject)}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MdAccessTime className="w-4 h-4" />
                <span className="font-medium">공부시간 설정</span>
              </div>
              {task.studyLogs.length === 0 && (
                <span className="text-xs text-red-500 font-bold">필수</span>
              )}
            </div>
            {task.studyLogs.length === 0 && (
              <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                과제 제출을 위해 공부시간을 설정해주세요.
              </p>
            )}
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleTimeChange('start', e.target.value)}
                className={`flex-1 px-4 py-2.5 border rounded-lg outline-none transition-colors ${
                  task.studyLogs.length === 0 && !startTime
                    ? 'border-red-300 bg-red-50'
                    : timeOverlapError
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-300'
                }`}
              />
              <span className="text-gray-400">~</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => handleTimeChange('end', e.target.value)}
                className={`flex-1 px-4 py-2.5 border rounded-lg outline-none transition-colors ${
                  task.studyLogs.length === 0 && !endTime
                    ? 'border-red-300 bg-red-50'
                    : timeOverlapError
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-300'
                }`}
              />
            </div>
            {timeOverlapError && (
              <div className="p-2.5 bg-red-50 rounded-lg border border-red-100">
                <p className="text-xs text-red-600 font-medium leading-relaxed">
                  {timeOverlapError}
                </p>
              </div>
            )}
          </div>

          {/* 학습 자료 목록 - materials가 있으면 모두 표시 */}
          {task.materials && task.materials.length > 0 ? (
            <div className="space-y-2">
              {task.materials.map((material, index) => (
                <button
                  key={material.id}
                  onClick={() => {
                    if (material.type === 'PDF' && material.pdfUrl) {
                      handleViewPdf(material.pdfUrl);
                    } else if (material.type === 'COLUMN') {
                      setSelectedWorksheet({
                        id: material.id,
                        title: material.columnTitle || '칼럼',
                        type: 'COLUMN',
                        content: material.columnContent,
                      });
                      setShowWorksheetModal(true);
                    }
                  }}
                  className="w-full bg-gray-400 rounded-xl p-4 flex items-center justify-between group hover:bg-gray-500 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <MdDescription className="w-6 h-6 text-white flex-shrink-0" />
                    <span className="text-white text-sm font-medium truncate">
                      {material.type === 'PDF' ? '📄' : '📝'} {material.type === 'PDF'
                        ? (material.pdfFileName || material.pdfUrl?.split('/').pop() || 'PDF 파일')
                        : (material.columnTitle || '칼럼')}
                    </span>
                  </div>
                  <MdFileDownload className="w-6 h-6 text-white" />
                </button>
              ))}
            </div>
          ) : (task.worksheet || task.pdfUrl) && (
            <button
              onClick={handleViewMaterials}
              className="w-full bg-gray-400 rounded-xl p-4 flex items-center justify-between group hover:bg-gray-500 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <MdDescription className="w-6 h-6 text-white flex-shrink-0" />
                <span className="text-white text-sm font-medium truncate">
                  {task.worksheet?.title || '학습 자료'}
                </span>
              </div>
              <MdFileDownload className="w-6 h-6 text-white" />
            </button>
          )}

          <div className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 relative overflow-hidden">
            {isUploading && (
              <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-4 border-sky-950/20 border-t-sky-950 rounded-full animate-spin" />
                <p className="text-[10px] font-bold text-sky-950">이미지 업로드 중...</p>
              </div>
            )}
            {uploadedImageUrls.length === 0 ? (
              <label className="w-full aspect-[4/3] flex flex-col items-center justify-center cursor-pointer">
                <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                <div className="text-5xl text-gray-300 font-light">+</div>
                {task.isFixed && <p className="text-xs text-red-400 mt-2">이미지 업로드 필수</p>}
              </label>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {uploadedImageUrls.map((url, idx) => (
                  <div key={`u-${idx}`} className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                    <img src={url} alt="Uploaded" className="w-full h-full object-cover" />
                    <button onClick={() => setUploadedImageUrls(uploadedImageUrls.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/50 rounded-full p-1"><MdDelete className="w-4 h-4 text-white" /></button>
                  </div>
                ))}
                {uploadedImageUrls.length < 6 && (
                  <label className="aspect-[3/4] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer">
                    <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                    <div className="text-3xl text-gray-300 font-light">+</div>
                  </label>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-medium">멘토에게 남기는 질문</h3>
            <textarea value={submitComment} onChange={(e) => setSubmitComment(e.target.value)} placeholder="질문을 작성해 주세요." className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg resize-none text-sm" />
          </div>

          <button 
            onClick={handleRegister} 
            disabled={isSubmitting || isUploading} 
            className={`w-full py-4 font-semibold rounded-xl transition-colors ${
              (isSubmitting || isUploading) 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-[#E5F4FF] text-[#1A1A1A] active:bg-[#D0E8FF]'
            }`}
          >
            {isSubmitting ? '등록 중...' : '등록하기'}
          </button>
        </div>

        <WorksheetSelectionModal
          isOpen={showWorksheetModal}
          onClose={() => setShowWorksheetModal(false)}
          worksheet={selectedWorksheet}
        />

        <AlertModal
          isOpen={alertState.isOpen}
          onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
          title={alertState.title}
          message={alertState.message}
        />

        <Toast
          show={toast.show}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      </div>
    );
  }

  // --- 화면 2: 피드백 상세 뷰 (제출 후) ---
  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between relative z-20">
        <button onClick={() => router.back()} className="">
          <MdChevronLeft className="w-7 h-7" />
        </button>
        <h1 className="text-lg font-semibold">{formatDate(task.date)}</h1>
        <div className="w-7 flex items-center justify-center">
          {((task.materials && task.materials.length > 0) || task.worksheet || task.pdfUrl) && (
            <button onClick={handleViewMaterials} className="text-blue-600">
              <MdFileDownload className="w-7 h-7" />
            </button>
          )}
        </div>
      </header>

      <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-6 h-6 bg-[#1A1A1A] rounded-full flex items-center justify-center flex-shrink-0"><div className="w-2.5 h-2.5 bg-white transform rotate-45"></div></div>
          <h2 className="text-base font-semibold text-black truncate flex-1">{task.title}</h2>
          <span className={`px-4 py-1.5 text-sm font-medium text-black rounded-lg border-2 ${subjectStyle}`}>{getSubjectLabel(task.subject)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 ml-9"><span>{startTime} ~ {endTime}</span></div>
      </div>

      {currentSubmission?.imageUrls.length > 0 && (
        <button onClick={() => { setImageModalOpen(true); setImageModalIndex(0); }} className="mx-5 mt-4 mb-2 px-4 py-3 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center"><img src={currentSubmission.imageUrls[0]} alt="S" className="w-full h-full object-cover opacity-60" /></div>
            <span className="text-sm font-medium text-gray-700">제출한 사진 보기 ({currentSubmission.imageUrls.length})</span>
          </div>
          <MdChevronRight className="w-6 h-6 text-gray-400" />
        </button>
      )}

      <div className="px-5 py-2 text-xs text-gray-400 font-medium">
        {firstFeedback ? `${firstFeedback.mentor.name} 멘토님` : '멘토님의 피드백을 기다리고 있습니다.'}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide">
        {firstFeedback?.summary && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2">
              <span className="text-base">✨</span>
              <div>
                <p className="text-[10px] font-bold text-amber-800 mb-0.5 uppercase">핵심 요약</p>
                <p className="text-sm text-amber-900 leading-relaxed font-medium">{firstFeedback.summary}</p>
              </div>
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isMe = !!(currentUser && m.userId === currentUser.id);
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                isMe
                  ? 'bg-sky-200 rounded-tr-none'
                  : 'bg-slate-100 rounded-tl-none'
              }`}>
                <HtmlContent
                  html={m.content}
                  className="text-sm leading-relaxed text-slate-800"
                />
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-100 px-5 py-4 bg-white flex items-end gap-2">
        <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }} placeholder="멘토님에게 질문을 남겨주세요." className="flex-1 px-4 py-3 border border-gray-200 rounded-xl resize-none outline-none text-sm" rows={1} style={{ minHeight: '44px', maxHeight: '120px' }} />
        <button onClick={handleSendChat} disabled={!chatInput.trim()} className="px-4 py-3 bg-[#1A1A1A] text-white font-semibold rounded-xl disabled:bg-gray-200 transition">보내기</button>
      </div>

      <div className="px-5 pb-6 bg-white"><button onClick={() => router.push('/mentee')} className="w-full py-4 bg-[#E5F4FF] text-[#1A1A1A] font-semibold rounded-xl">홈으로 돌아가기</button></div>

      {imageModalOpen && currentSubmission && <ImageModal images={currentSubmission.imageUrls} initialIndex={imageModalIndex} onClose={() => setImageModalOpen(false)} />}
      
      <WorksheetSelectionModal
        isOpen={showWorksheetModal}
        onClose={() => setShowWorksheetModal(false)}
        worksheet={selectedWorksheet}
      />

      <AlertModal 
        isOpen={alertState.isOpen} 
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))} 
        title={alertState.title} 
        message={alertState.message} 
      />

      <Toast 
        show={toast.show} 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast(prev => ({ ...prev, show: false }))} 
      />
    </div>
  );
}