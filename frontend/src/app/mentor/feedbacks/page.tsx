'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { FaCommentAlt, FaCalendar, FaRegComments, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { toast } from '@/stores/useToastStore';

interface Feedback {
  id: string;
  menteeId: string;
  menteeName: string;
  taskTitle: string;
  subject: string;
  summary: string;
  content: string;
  createdAt: string;
  taskId?: string;
}

function SubjectPill({ subject }: { subject: string }) {
  const cls =
    subject === '국어' || subject === 'KOREAN'
      ? 'bg-pink-100 text-pink-600'
      : subject === '영어' || subject === 'ENGLISH'
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-blue-100 text-blue-600';

  const label = subject === 'KOREAN' ? '국어' : subject === 'ENGLISH' ? '영어' : subject === 'MATH' ? '수학' : subject;

  return (
    <span className={`inline-flex items-center rounded-md px-3 py-1 text-[11px] font-bold ${cls}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  let cls = 'border-gray-200 text-gray-500 bg-gray-50';
  if (status.includes('잘 이해')) cls = 'border-green-200 text-green-600 bg-green-50';
  if (status.includes('연습')) cls = 'border-blue-200 text-blue-600 bg-blue-50';
  if (status.includes('확인')) cls = 'border-orange-200 text-orange-600 bg-orange-50';

  return (
    <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-[11px] font-bold ${cls}`}>
      {status}
    </span>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense>
      <FeedbackContent />
    </Suspense>
  );
}

function FeedbackContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const menteeId = sp.get('menteeId');

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 페이징 관련 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const token = localStorage.getItem('token');
        const url = menteeId
          ? `${getApiUrl()}/api/mentor/mentees/${menteeId}/feedbacks`
          : `${getApiUrl()}/api/mentor/feedbacks`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          console.warn('피드백 목록을 불러오는데 실패했습니다:', res.status);
          setFeedbacks([]);
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        setFeedbacks(data);
      } catch (err) {
        console.error('Fetch feedbacks error:', err);
        toast.error('피드백 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedbacks();
  }, [menteeId]);

  // 페이징 계산
  const totalPages = Math.ceil(feedbacks.length / itemsPerPage);
  const currentFeedbacks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return feedbacks.slice(start, start + itemsPerPage);
  }, [feedbacks, currentPage]);

  const handleDelete = async (feedbackId: string) => {
    if (!confirm('정말 이 피드백을 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentor/feedbacks/${feedbackId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('피드백 삭제에 실패했습니다.');

      setFeedbacks((prev) => prev.filter((f) => f.id !== feedbackId));
      setDetailOpen(false);
      setSelected(null);
      toast.success('피드백이 삭제되었습니다.');
    } catch (err) {
      console.error('Delete feedback error:', err);
      toast.error('피드백 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="px-6 py-8 md:px-10 md:py-10 bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-[920px]">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">피드백 기록</h1>
          <div className="text-sm text-gray-500 font-medium">총 {feedbacks.length}건</div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {currentFeedbacks.map((f) => (
              <div key={f.id} className="group rounded-3xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <FaCommentAlt size={20} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[15px] font-bold text-slate-800">{f.menteeName} 학생</span>
                        <StatusBadge status={f.summary} />
                      </div>
                      <div className="text-[13px] font-semibold text-gray-700 mb-2 truncate">
                        과제: {f.taskTitle}
                      </div>
                      <div className="flex items-center gap-3 text-[12px] text-gray-400">
                        <div className="flex items-center gap-1">
                          <FaCalendar size={12} />
                          <span>{new Date(f.createdAt).toLocaleDateString('ko-KR')}</span>
                        </div>
                        <SubjectPill subject={f.subject} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {f.taskId && (
                      <button
                        onClick={() => router.push(`/mentor/tasks/${f.taskId}`)}
                        className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-all"
                        title="피드백 대화"
                      >
                        <FaRegComments size={20} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelected(f);
                        setDetailOpen(true);
                      }}
                      className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-slate-800 transition-colors"
                    >
                      상세보기
                    </button>
                  </div>
                </div>

                <div className="mt-4 pl-16">
                  <p className="text-[14px] text-slate-600 line-clamp-2 leading-relaxed">
                    {f.content}
                  </p>
                </div>
              </div>
            ))}

            {feedbacks.length > 0 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-full hover:bg-white disabled:opacity-30 transition-colors"
                >
                  <FaChevronLeft />
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-full text-sm font-bold transition-all ${
                        currentPage === page
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-400 hover:bg-white'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-full hover:bg-white disabled:opacity-30 transition-colors"
                >
                  <FaChevronRight />
                </button>
              </div>
            )}

            {feedbacks.length === 0 && (
              <div className="rounded-[32px] border border-dashed border-gray-200 bg-white/50 py-24 text-center">
                <p className="text-gray-400 font-medium">아직 작성된 피드백이 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 피드백 상세 모달 */}
      {detailOpen && selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDetailOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-[32px] bg-white shadow-2xl overflow-hidden">
            <div className="px-8 pt-8 pb-6 border-b border-gray-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 rounded-full bg-blue-500" />
                  <h2 className="text-xl font-bold text-slate-800">피드백 상세 내역</h2>
                </div>
                <button onClick={() => setDetailOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="text-2xl">×</span>
                </button>
              </div>
              <div className="flex flex-col gap-1 mb-2">
                <div className="text-[13px] font-bold text-gray-500">
                  과제: {selected.taskTitle}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-slate-700">{selected.menteeName} 학생</span>
                  <SubjectPill subject={selected.subject} />
                  <span className="text-sm text-gray-400 font-medium">
                    {new Date(selected.createdAt).toLocaleString('ko-KR')}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">피드백 요약</label>
                <StatusBadge status={selected.summary} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">상세 피드백 내용</label>
                <div className="bg-gray-50 rounded-2xl p-6 text-[15px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selected.content}
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="px-6 py-3 rounded-2xl border border-red-100 text-red-500 font-bold hover:bg-red-50 transition-colors"
                >
                  삭제하기
                </button>
                <button
                  onClick={() => setDetailOpen(false)}
                  className="flex-1 px-6 py-3 rounded-2xl bg-slate-800 text-white font-bold hover:bg-black transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}