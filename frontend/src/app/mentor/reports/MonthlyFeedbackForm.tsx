'use client';
import { getApiUrl } from '@/lib/api';
import { useEffect, useState } from 'react';
import { AiOutlineSave } from 'react-icons/ai';
import { toast } from '@/stores/useToastStore';

interface MonthlyFeedback {
  id: string;
  menteeId: string;
  mentorId: string;
  year: number;
  month: number;
  overallComment: string;
  strengths: string;
  improvements: string;
  nextMonthGoals: string;
  createdAt: string;
  updatedAt: string;
}

export default function MonthlyFeedbackForm({ menteeId }: { menteeId: string }) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const [feedback, setFeedback] = useState<MonthlyFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [overallComment, setOverallComment] = useState('');
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [nextMonthGoals, setNextMonthGoals] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const res = await fetch(
          `${getApiUrl()}/api/mentor/mentees/${menteeId}/monthly-feedbacks?year=${selectedYear}&month=${selectedMonth}`,
          { headers }
        );

        if (res.ok) {
          const fbData = await res.json();
          setFeedback(fbData);
          if (fbData) {
            setOverallComment(fbData.overallComment);
            setStrengths(fbData.strengths);
            setImprovements(fbData.improvements);
            setNextMonthGoals(fbData.nextMonthGoals);
          } else {
            setOverallComment('');
            setStrengths('');
            setImprovements('');
            setNextMonthGoals('');
          }
        }
      } catch (err) {
        console.error('데이터 로딩 실패:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [menteeId, selectedYear, selectedMonth]);

  const changeMonth = (direction: 'prev' | 'next') => {
    let newYear = selectedYear;
    let newMonth = selectedMonth;
    if (direction === 'next') {
      newMonth += 1;
      if (newMonth > 12) { newMonth = 1; newYear += 1; }
    } else {
      newMonth -= 1;
      if (newMonth < 1) { newMonth = 12; newYear -= 1; }
    }
    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
  };

  const handleSave = async () => {
    if (!overallComment.trim() || !strengths.trim() || !improvements.trim() || !nextMonthGoals.trim()) {
      toast.warning('모든 항목을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const body = { overallComment, strengths, improvements, nextMonthGoals };

      let res;
      if (feedback) {
        res = await fetch(`${getApiUrl()}/api/mentor/monthly-feedbacks/${feedback.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${getApiUrl()}/api/mentor/monthly-feedbacks`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...body,
            menteeId,
            year: selectedYear,
            month: selectedMonth,
          }),
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '저장에 실패했습니다.');
      }

      const result = await res.json();
      setFeedback(result);
      toast.success(feedback ? '월간 총평이 수정되었습니다.' : '월간 총평이 저장되었습니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-gray-500 py-8 text-center text-[12px]">로딩 중...</p>;
  }

  return (
    <div className="space-y-6">
      {/* 년/월 선택기 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <button onClick={() => changeMonth('prev')} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">
          ←
        </button>
        <h3 className="text-[14px] font-bold text-gray-900">
          {selectedYear}년 {selectedMonth}월
        </h3>
        <button onClick={() => changeMonth('next')} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">
          →
        </button>
      </div>

      <div className="space-y-5">
        {/* 이번달 총평 */}
        <div>
          <div className="text-[12px] font-bold text-gray-800 mb-2">이번달 총평</div>
          <div className="relative">
            <textarea
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value.slice(0, 1000))}
              placeholder="이번 달 전반적인 학습 상황에 대한 총평을 작성해주세요."
              className="w-full h-[180px] resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-[12px] leading-6 text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
            <div className="text-right text-[10px] text-gray-400 mt-1">
              {overallComment.length}/1000
            </div>
          </div>
        </div>

        {/* 잘한 점 */}
        <div>
          <div className="text-[12px] font-bold text-gray-800 mb-2">잘한 점</div>
          <textarea
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            placeholder="이번 달 학습에서 잘한 부분을 작성해주세요."
            className="w-full h-[100px] resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-[12px] leading-6 text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* 개선할 점 */}
        <div>
          <div className="text-[12px] font-bold text-gray-800 mb-2">개선할 점</div>
          <textarea
            value={improvements}
            onChange={(e) => setImprovements(e.target.value)}
            placeholder="개선이 필요한 부분과 구체적인 방법을 작성해주세요."
            className="w-full h-[100px] resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-[12px] leading-6 text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* 다음달 목표 */}
        <div>
          <div className="text-[12px] font-bold text-gray-800 mb-2">다음달 목표</div>
          <textarea
            value={nextMonthGoals}
            onChange={(e) => setNextMonthGoals(e.target.value)}
            placeholder="다음 달에 달성할 학습 목표를 작성해주세요."
            className="w-full h-[100px] resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-[12px] leading-6 text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-12 rounded-xl bg-[#0B2B5B] text-[13px] font-bold text-white hover:opacity-95 transition-all flex items-center justify-center gap-2 mt-4"
        >
          {isSaving ? (
            '저장 중...'
          ) : (
            <>
              <AiOutlineSave className="text-[18px]" />
              {feedback ? '수정 사항 저장하기' : '월간 리포트 저장하기'}
            </>
          )}
        </button>
      </div>
      <div className="h-10" />
    </div>
  );
}
