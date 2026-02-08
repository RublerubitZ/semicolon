'use client';

import { getApiUrl } from '@/lib/api';
import { getSubjectLabel } from '@/constants/subjects';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import ImageModal from '@/components/ImageModal';
import { 
  MdChevronLeft, 
  MdPushPin, 
  MdAccessTime, 
  MdSend,
  MdPhotoLibrary,
  MdChatBubbleOutline,
  MdAssignment
} from 'react-icons/md';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH';

const SUBJECT_STYLES: Record<string, string> = {
  'KOREAN': 'bg-pink-50 border-pink-200 text-pink-600',
  'ENGLISH': 'bg-amber-50 border-amber-200 text-amber-600',
  'MATH': 'bg-blue-50 border-blue-200 text-blue-600',
  'DEFAULT': 'bg-gray-50 border-gray-200 text-gray-600',
};

interface Task {
  id: string;
  title: string;
  description: string | null;
  subject: Subject;
  date: string;
  mentee: {
    id: string;
    name: string;
    profileImage?: string;
  };
  submissions: {
    id: string;
    imageUrls: string[];
    comment: string | null;
    createdAt: string;
  }[];
  feedbacks: {
    id: string;
    content: string;
    summary?: string;
    subject: string;
    feedbackDate: string;
    createdAt: string;
    mentor: {
      id: string;
      name: string;
      profileImage?: string;
    };
  }[];
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

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userRole: 'MENTOR' | 'MENTEE';
  content: string;
  createdAt: string;
  profileImage?: string;
}

export default function MentorTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalIndex, setImageModalIndex] = useState(0);

  const [feedbackForm, setFeedbackForm] = useState({
    summary: '',
    content: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTask = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentor/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('과제 정보를 불러오는데 실패했습니다.');
      const data = await res.json();
      setTask(data);
    } catch (err) {
      console.error('Fetch task error:', err);
      router.back();
    }
  };

  const fetchComments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/tasks/${taskId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Fetch comments error:', error);
    }
  };

  const handleSendComment = async (content: string) => {
    if (!content.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setChatInput('');
        fetchComments();
      }
    } catch (err) {
      console.error('Send comment error:', err);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackForm.summary || !feedbackForm.content) {
      alert('요약과 상세 피드백을 모두 입력해주세요.');
      return;
    }
    if (!task) return;

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
          content: feedbackForm.content,
          summary: feedbackForm.summary,
          subject: task.subject,
          feedbackDate: new Date().toISOString().split('T')[0],
        }),
      });
      if (!res.ok) throw new Error('피드백 작성에 실패했습니다.');
      setFeedbackForm({ summary: '', content: '' });
      await fetchTask();
      await fetchComments();
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMessages = (): ChatMessage[] => {
    if (!task) return [];
    const messages: ChatMessage[] = [];
    task.feedbacks.forEach((fb) => {
      messages.push({
        id: fb.id,
        userId: fb.mentor.id,
        userName: fb.mentor.name,
        userRole: 'MENTOR',
        content: fb.content,
        createdAt: fb.createdAt,
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

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setCurrentUser(JSON.parse(userStr));
    fetchTask();
  }, [taskId]);

  useEffect(() => {
    if (task) {
      fetchComments();
      setIsLoading(false);
    }
  }, [task]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments, task?.feedbacks]);

  if (isLoading || !task || !currentUser) {
    return <div className="flex justify-center items-center h-screen bg-slate-50">로딩 중...</div>;
  }

  const subjectStyle = SUBJECT_STYLES[task.subject] || SUBJECT_STYLES['DEFAULT'];
  const hasFeedback = task.feedbacks.length > 0;
  const messages = formatMessages();
  const currentSubmission = task.submissions[0];

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-['Pretendard'] overflow-hidden">
      {/* 상단 헤더 */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
            <MdChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-800">과제 상세 피드백</h1>
            <span className={`px-3 py-1 text-[11px] font-bold rounded-lg border ${subjectStyle}`}>
              {getSubjectLabel(task.subject)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <MdAccessTime className="w-4 h-4" />
            <span>{format(new Date(task.date), 'yyyy년 M월 d일 (E)', { locale: ko })}</span>
          </div>
          <div className="h-4 w-[1px] bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">{task.mentee.name} 멘티</span>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 영역: 2컬럼 레이아웃 */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* 왼쪽 컬럼: 제출 내용 (이미지 & 코멘트) */}
        <section className="flex-1 flex flex-col bg-slate-100 border-r border-slate-200 overflow-hidden">
          <div className="h-14 px-6 flex items-center justify-between bg-white/50 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-2 text-slate-800">
              <MdPhotoLibrary className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold">멘티 제출 내용</h2>
            </div>
            {currentSubmission && (
              <span className="text-[11px] font-bold text-slate-400 bg-slate-200/50 px-2 py-1 rounded-md">
                {format(new Date(currentSubmission.createdAt), 'HH:mm 제출')}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {currentSubmission ? (
              <div className="max-w-4xl mx-auto space-y-8">
                {/* 멘티 코멘트 */}
                {currentSubmission.comment && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <p className="text-[10px] font-black text-blue-500 mb-3 uppercase tracking-widest">Mentee's Note</p>
                    <p className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap">{currentSubmission.comment}</p>
                  </div>
                )}

                {/* 이미지 그리드 */}
                <div className="grid grid-cols-1 gap-6">
                  {currentSubmission.imageUrls.map((url, idx) => (
                    <div 
                      key={idx} 
                      className="group relative bg-white rounded-3xl overflow-hidden shadow-md border border-slate-200 cursor-zoom-in transition-transform hover:scale-[1.01]"
                      onClick={() => { setImageModalOpen(true); setImageModalIndex(idx); }}
                    >
                      <img 
                        src={url} 
                        alt={`Submission ${idx + 1}`} 
                        className="w-full h-auto object-contain max-h-[800px] block mx-auto"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="bg-white/90 px-4 py-2 rounded-full text-xs font-bold text-slate-800 shadow-xl">클릭하여 확대</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <MdAssignment className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-bold">아직 제출된 내용이 없습니다.</p>
              </div>
            )}
          </div>
        </section>

        {/* 오른쪽 컬럼: 피드백 & 대화 */}
        <section className="w-[450px] flex flex-col bg-white overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-10">
          <div className="h-14 px-6 flex items-center justify-between border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2 text-slate-800">
              <MdChatBubbleOutline className="w-5 h-5 text-blue-500" />
              <h2 className="font-bold">피드백 대화</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-tighter">과제명</h4>
              <p className="text-sm font-bold text-slate-800">{task.title}</p>
              {task.description && <p className="text-xs text-slate-500 mt-1">{task.description}</p>}
            </div>

            {!hasFeedback ? (
              /* 첫 피드백 작성 폼 (PC 최적화) */
              <form onSubmit={handleSubmitFeedback} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">피드백 핵심 요약</label>
                    <input
                      type="text"
                      value={feedbackForm.summary}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, summary: e.target.value })}
                      className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium placeholder:text-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      placeholder="멘티를 위한 따뜻한 한 줄 평"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">상세 피드백</label>
                    <textarea
                      value={feedbackForm.content}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, content: e.target.value })}
                      className="w-full px-5 py-4 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium placeholder:text-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all h-[300px] resize-none leading-relaxed"
                      placeholder="학습 내용에 대해 구체적이고 전문적인 피드백을 남겨주세요."
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-blue-600 disabled:bg-slate-200 transition-all shadow-lg shadow-slate-200"
                >
                  {isSubmitting ? '전송 중...' : '첫 피드백 전송하기'}
                </button>
              </form>
            ) : (
              /* 채팅 인터페이스 (PC 최적화) */
              <div className="space-y-5">
                {task.feedbacks[0].summary && (
                  <div className="flex justify-start">
                    <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3 shadow-sm">
                      <span className="text-lg">✨</span>
                      <div>
                        <p className="text-[10px] font-bold text-amber-800 mb-1 uppercase tracking-wider">핵심 요약</p>
                        <p className="text-sm text-amber-900 leading-relaxed font-bold">{task.feedbacks[0].summary}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4 pb-4">
                  {messages.map((m) => {
                    const isMe = m.userId === currentUser.id;
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                          {!isMe && <span className="text-[10px] font-bold text-slate-400 ml-2 mb-1 block">{m.userName}</span>}
                          <div className={`rounded-2xl px-4 py-2.5 shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                            isMe 
                              ? 'bg-slate-800 text-white rounded-tr-none' 
                              : 'bg-slate-100 text-slate-800 rounded-tl-none'
                          }`}>
                            {m.content}
                          </div>
                          <span className="text-[9px] text-slate-400 px-2">
                            {format(new Date(m.createdAt), 'HH:mm')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* 하단 입력바 (피드백이 있을 때만 활성화) */}
          {hasFeedback && (
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              <div className="relative flex items-end gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment(chatInput);
                    }
                  }}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none outline-none text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all max-h-32"
                  rows={1}
                />
                <button
                  onClick={() => handleSendComment(chatInput)}
                  disabled={!chatInput.trim()}
                  className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-xl disabled:bg-slate-100 disabled:text-slate-300 hover:bg-blue-600 transition-all shrink-0"
                >
                  <MdSend className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* 이미지 모달 (확대용으로 유지) */}
      {imageModalOpen && currentSubmission && (
        <ImageModal
          images={currentSubmission.imageUrls}
          initialIndex={imageModalIndex}
          onClose={() => setImageModalOpen(false)}
        />
      )}
    </div>
  );
}
