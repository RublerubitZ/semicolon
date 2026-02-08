'use client';
import { getApiUrl } from '@/lib/api';
import { useEffect, useState } from 'react';
import { AiOutlineSave } from 'react-icons/ai';
import { toast } from '@/stores/useToastStore';
import { CONTENT_LIMITS } from '@/constants/contentLimits';

interface WeeklyFeedback {
  id: string;
  menteeId: string;
  mentorId: string;
  year: number;
  month: number;
  weekNumber: number;
  overallComment: string;
  strengths: string;
  improvements: string;
  nextWeekGoals: string;
  createdAt: string;
  updatedAt: string;
}

export default function WeeklyFeedbackForm({ menteeId }: { menteeId: string }) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [totalWeeks, setTotalWeeks] = useState(4);

  const [feedback, setFeedback] = useState<WeeklyFeedback | null>(null);
  const [allFeedbacks, setAllFeedbacks] = useState<WeeklyFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [overallComment, setOverallComment] = useState('');
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [nextWeekGoals, setNextWeekGoals] = useState('');

  useEffect(() => {
    const daysInMonth = new Date(Date.UTC(selectedYear, selectedMonth, 0)).getUTCDate();
    setTotalWeeks(Math.ceil(daysInMonth / 7));
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [feedbackRes, allFbRes] = await Promise.all([
          fetch(
            `${getApiUrl()}/api/mentor/mentees/${menteeId}/weekly-feedbacks?year=${selectedYear}&month=${selectedMonth}&weekNumber=${selectedWeek}`,
            { headers }
          ),
          fetch(
            `${getApiUrl()}/api/mentor/mentees/${menteeId}/weekly-feedbacks?year=${selectedYear}&month=${selectedMonth}`,
            { headers }
          ),
        ]);

        if (feedbackRes.ok) {
          const fbData = await feedbackRes.json();
          setFeedback(fbData);
          if (fbData) {
            setOverallComment(fbData.overallComment);
            setStrengths(fbData.strengths);
            setImprovements(fbData.improvements);
            setNextWeekGoals(fbData.nextWeekGoals);
          } else {
            setOverallComment('');
            setStrengths('');
            setImprovements('');
            setNextWeekGoals('');
          }
        }

        if (allFbRes.ok) {
          const allData = await allFbRes.json();
          setAllFeedbacks(Array.isArray(allData) ? allData : []);
        }
      } catch (err) {
        console.error('데이터 로딩 실패:', err);
        toast.error('주간 피드백 데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [menteeId, selectedYear, selectedMonth, selectedWeek]);

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
    setSelectedWeek(1);
  };

  const handleSave = async () => {
    if (!overallComment.trim() || !strengths.trim() || !improvements.trim() || !nextWeekGoals.trim()) {
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

      const body = { overallComment, strengths, improvements, nextWeekGoals };

      let res;
      if (feedback) {
        res = await fetch(`${getApiUrl()}/api/mentor/weekly-feedbacks/${feedback.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${getApiUrl()}/api/mentor/weekly-feedbacks`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...body,
            menteeId,
            year: selectedYear,
            month: selectedMonth,
            weekNumber: selectedWeek,
          }),
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '저장에 실패했습니다.');
      }

      const result = await res.json();
      setFeedback(result);
      toast.success(feedback ? '주간 총평이 수정되었습니다.' : '주간 총평이 저장되었습니다.');
      
      // Fetch all feedbacks again to update the dots
      const token2 = localStorage.getItem('token');
      const allFbRes = await fetch(
        `${getApiUrl()}/api/mentor/mentees/${menteeId}/weekly-feedbacks?year=${selectedYear}&month=${selectedMonth}`,
        { headers: { Authorization: `Bearer ${token2}` } }
      );
      if (allFbRes.ok) {
        const allData = await allFbRes.json();
        setAllFeedbacks(Array.isArray(allData) ? allData : []);
      }

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

      {/* 주차 선택 탭 */}
      <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide">
        {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => {
          const hasData = allFeedbacks.some(f => f.weekNumber === week);
          return (
            <button
              key={week}
              onClick={() => setSelectedWeek(week)}
              className={`px-5 py-2 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                selectedWeek === week
                  ? 'bg-[#0B2B5B] text-white border-[#0B2B5B] shadow-sm'
                  : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
              }`}
            >
              {week}주차
              {hasData && (
                <span className={`w-1.5 h-1.5 rounded-full ${selectedWeek === week ? 'bg-white' : 'bg-green-500'}`} />
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-5">
        {/* 이번주 총평 */}
        <div>
          <div className="text-[12px] font-bold text-gray-800 mb-2">{selectedWeek}주차 총평</div>
          <div className="relative">
            <textarea
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value.slice(0, CONTENT_LIMITS.FEEDBACK_COMMENT))}
              placeholder="이번 주 전반적인 학습 상황에 대한 총평을 작성해주세요."
              className="w-full h-[160px] resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-[12px] leading-6 text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
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
            placeholder="이번 주 학습에서 잘한 부분을 작성해주세요."
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

        {/* 다음주 목표 */}
        <div>
          <div className="text-[12px] font-bold text-gray-800 mb-2">다음주 목표</div>
          <textarea
            value={nextWeekGoals}
            onChange={(e) => setNextWeekGoals(e.target.value)}
            placeholder="다음 주에 달성할 학습 목표를 작성해주세요."
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
              {feedback ? '수정 사항 저장하기' : '주간 리포트 저장하기'}
            </>
          )}
        </button>
      </div>
      <div className="h-10" />
    </div>
  );
}
