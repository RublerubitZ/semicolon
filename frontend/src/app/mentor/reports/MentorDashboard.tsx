'use client';
import { getSubjectLabel, SUBJECT_COLORS } from '@/constants/subjects';
import { useMemo, useRef } from 'react';
import { GrLineChart } from 'react-icons/gr';
import { useMentorDashboard, useMentorTrends } from '@/lib/queries/use-stats';
import SubjectTrendChart from '@/components/reports/SubjectTrendChart';
import ReportPDFButton from '@/components/reports/ReportPDFButton';

interface DashboardData {
  currentMonth: {
    year: number;
    month: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalStudyTime: number;
    totalFeedbacks: number;
    subjectStats: Record<string, { total: number; completed: number; completionRate: number; studyTime: number }>;
    weeklyBreakdown: Array<{
      weekNumber: number;
      totalTasks: number;
      completedTasks: number;
      completionRate: number;
      studyTime: number;
    }>;
  };
  previousMonth: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalStudyTime: number;
  };
  monthOverMonth: {
    completionRateChange: number;
    studyTimeChange: number;
    taskCountChange: number;
  };
  feedbackResponseRate: {
    tasksSubmitted: number;
    feedbacksGiven: number;
    rate: number;
  };
  learningGoalAchievement: {
    totalGoalItems: number;
    completedGoalItems: number;
    achievementRate: number;
  };
}

const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
};

const ChangeIndicator = ({ value, unit = '%', showLabel = false }: { value: number; unit?: string, showLabel?: boolean }) => {
  if (value === 0) return <span className="text-[10px] text-gray-400">변동 없음</span>;
  const isPositive = value > 0;
  return (
    <span className={`text-[12px] font-semibold ${isPositive ? 'text-blue-600' : 'text-red-500'}`}>
      {showLabel && '지난 달 대비 '}
      {isPositive ? '+' : '-'} {Math.abs(value)}{unit}
    </span>
  );
};

export default function MentorDashboard({ menteeId, selectedYear, selectedMonth, onChangeMonth }: {
  menteeId: string;
  selectedYear: number;
  selectedMonth: number;
  onChangeMonth: (direction: 'prev' | 'next') => void;
}) {
  const reportRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useMentorDashboard(menteeId, selectedYear, selectedMonth);
  const { data: trends } = useMentorTrends(menteeId, 6);

  const subjectStatsList = useMemo(() => {
    if (!data) return [];
    return Object.entries((data as DashboardData).currentMonth.subjectStats)
      .filter(([, stat]) => stat.total > 0)
      .sort((a, b) => b[1].studyTime - a[1].studyTime);
  }, [data]);

  const totalStudyTime = (data as DashboardData)?.currentMonth.totalStudyTime || 0;

  if (isLoading) {
    return <p className="text-gray-500 py-8 text-center text-[12px]">로딩 중...</p>;
  }

  if (!data) {
    return <p className="text-gray-500 py-8 text-center text-[12px]">통계를 불러올 수 없습니다.</p>;
  }

  const typedData = data as DashboardData;
  const { currentMonth, monthOverMonth } = typedData;

  return (
    <div ref={reportRef} className="space-y-6">
      {/* 년/월 선택기 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <button onClick={() => onChangeMonth('prev')} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">
          ←
        </button>
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-bold text-gray-900">
            {selectedYear}년 {selectedMonth}월
          </h3>
          <ReportPDFButton
            targetRef={reportRef}
            fileName={`설스터디_멘토리포트_${selectedYear}년${selectedMonth}월`}
          />
        </div>
        <button onClick={() => onChangeMonth('next')} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">
          →
        </button>
      </div>

      {/* 상단 요약 카드 2개 */}
      <div className="grid grid-cols-2 gap-4 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div>
          <div className="text-[11px] font-semibold text-gray-500">총 학습 시간</div>
          <div className="mt-1 text-[18px] font-extrabold text-gray-900">
            {currentMonth.totalStudyTime.toLocaleString()}<span className="text-[12px] font-bold text-gray-700 ml-0.5">분</span>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold text-gray-500">학습 완료율</div>
          <div className="mt-1 text-[18px] font-extrabold text-gray-900">{currentMonth.completionRate}%</div>
        </div>
      </div>

      {/* 주간 평균 카드 및 차트 */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[12px] font-bold text-gray-700">주간 학습 추이</div>
            <div className="mt-2 text-[26px] font-extrabold text-gray-900">
              {Math.round(currentMonth.totalStudyTime / (currentMonth.weeklyBreakdown.length || 1)).toLocaleString()}분
              <span className="text-[14px] font-bold text-gray-500 ml-1">/ 주 평균</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-[#00265A]">
              <GrLineChart className="text-[14px] text-white" />
            </div>
            <ChangeIndicator value={monthOverMonth.completionRateChange} showLabel={true} />
          </div>
        </div>

        {/* 바 차트 */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="relative h-[180px]">
            {/* 평균선 */}
            <div className="absolute left-0 right-0 top-[40%] border-t-2 border-dashed border-blue-100" />

            <div className="absolute inset-x-6 bottom-4 top-4 flex items-end justify-between">
              {currentMonth.weeklyBreakdown.map((week) => {
                const maxTime = Math.max(...currentMonth.weeklyBreakdown.map(w => w.studyTime), 1);
                const barHeight = (week.studyTime / maxTime) * 140;
                return (
                  <div key={week.weekNumber} className="flex flex-col items-center gap-2 flex-1">
                    <div
                      className="w-10 rounded-md bg-blue-200 transition-all hover:bg-blue-300"
                      style={{ height: `${Math.max(barHeight, 4)}px` }}
                    />
                    <div className="text-[11px] font-semibold text-gray-500">{week.weekNumber}주차</div>
                  </div>
                );
              })}
            </div>

            <div className="absolute right-[-10px] top-[36%] rounded-full border border-blue-200 bg-white px-2 py-1 text-[9px] font-bold text-blue-500 shadow-sm">
              평균
            </div>
          </div>
        </div>
      </div>

      {/* 과목별 공부 시간 */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[14px]">✎</span>
            <div className="text-[12px] font-bold text-gray-800">과목별 공부 시간</div>
          </div>
          <div className="text-[11px] font-semibold text-gray-400">총 {formatTime(currentMonth.totalStudyTime)}</div>
        </div>

        {/* 누적 바 */}
        <div className="mt-4 h-10 w-full overflow-hidden rounded-xl bg-gray-50 flex">
          {subjectStatsList.map(([subject, stat]) => {
            const width = totalStudyTime > 0 ? (stat.studyTime / totalStudyTime) * 100 : 0;
            const color = SUBJECT_COLORS[subject as keyof typeof SUBJECT_COLORS]?.primary || '#CBD5E1';
            return (
              <div
                key={subject}
                className="h-full transition-all"
                style={{
                  width: `${width}%`,
                  backgroundColor: color
                }}
              />
            );
          })}
        </div>

        {/* 범례 */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {subjectStatsList.map(([subject, stat]) => {
            const color = SUBJECT_COLORS[subject as keyof typeof SUBJECT_COLORS]?.primary || '#CBD5E1';
            return (
              <div key={subject} className="flex items-start gap-2">
                <span className="mt-1 h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                <div>
                  <div className="text-[11px] font-bold text-gray-700">{getSubjectLabel(subject)}</div>
                  <div className="text-[10px] text-gray-400">{formatTime(stat.studyTime)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 과목별 트렌드 */}
      {trends && trends.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="text-[12px] font-bold text-gray-800 mb-4">최근 6개월 과목별 트렌드</div>
          <SubjectTrendChart data={trends} metric="studyTime" />
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
