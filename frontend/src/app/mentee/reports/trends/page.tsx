'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IoIosArrowBack } from 'react-icons/io';

import { useSubjectTrends } from '@/lib/queries/use-reports';
import SubjectTrendChart from '@/components/reports/SubjectTrendChart';

const PERIOD_OPTIONS = [
  { label: '최근 4개월', value: 4 },
  { label: '최근 6개월', value: 6 },
  { label: '최근 12개월', value: 12 },
];

export default function TrendsPage() {
  const router = useRouter();
  const [months, setMonths] = useState(6);
  const [metric, setMetric] = useState<'studyTime' | 'completionRate'>('studyTime');

  const { data: trends, isLoading } = useSubjectTrends(months);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
          <button onClick={() => router.back()} className="text-gray-600 p-1 mr-3">
            <IoIosArrowBack size={22} />
          </button>
          <h1 className="text-sm font-semibold text-gray-800">과목별 트렌드 분석</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* 기간 선택 */}
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setMonths(opt.value)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                months === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 메트릭 토글 */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setMetric('studyTime')}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
              metric === 'studyTime'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            학습 시간
          </button>
          <button
            onClick={() => setMetric('completionRate')}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
              metric === 'completionRate'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            완료율
          </button>
        </div>

        {/* 차트 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            {metric === 'studyTime' ? '과목별 학습 시간 추이' : '과목별 완료율 추이'}
          </h3>
          {isLoading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : trends ? (
            <SubjectTrendChart data={trends} metric={metric} />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              데이터가 없습니다
            </div>
          )}
        </div>

        {/* 과목별 요약 테이블 */}
        {!isLoading && trends && trends.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">최근 월 과목별 요약</h3>
            <LatestMonthSummary data={trends} />
          </div>
        )}
      </div>
    </div>
  );
}

function LatestMonthSummary({ data }: { data: Record<string, unknown>[] }) {
  const latest = data[data.length - 1];
  if (!latest) return null;

  const subjects = Object.entries(latest.subjects as Record<string, unknown>);
  if (subjects.length === 0) {
    return <p className="text-xs text-gray-400">데이터가 없습니다</p>;
  }

  const SUBJECT_LABELS: Record<string, string> = {
    KOREAN: '국어',
    ENGLISH: '영어',
    MATH: '수학',
  };

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-gray-400 border-b border-gray-100">
          <th className="text-left py-2 font-medium">과목</th>
          <th className="text-right py-2 font-medium">학습 시간</th>
          <th className="text-right py-2 font-medium">완료율</th>
          <th className="text-right py-2 font-medium">과제 수</th>
        </tr>
      </thead>
      <tbody>
        {subjects.map(([subj, stat]) => (
          <tr key={subj} className="border-b border-gray-50">
            <td className="py-2 text-gray-700 font-medium">{SUBJECT_LABELS[subj] || subj}</td>
            <td className="py-2 text-right text-gray-600">
              {Math.floor(stat.studyTime / 60)}h {stat.studyTime % 60}m
            </td>
            <td className="py-2 text-right text-gray-600">{stat.completionRate}%</td>
            <td className="py-2 text-right text-gray-600">{stat.taskCount}개</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
