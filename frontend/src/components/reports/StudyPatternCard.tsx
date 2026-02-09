'use client';

import { useMemo } from 'react';

interface StudyPatternData {
  busiestDay: string | null;
  busiestDayMinutes: number;
  averageDaily: number;
  dayOfWeekDistribution: { day: string; minutes: number }[];
  timeSlotDistribution: { slot: string; minutes: number }[];
}

interface StudyPatternCardProps {
  pattern: StudyPatternData;
}

const DAY_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function StudyPatternCard({ pattern }: StudyPatternCardProps) {
  const { dayOfWeekDistribution, timeSlotDistribution, busiestDay, averageDaily } = pattern;

  const maxDayMinutes = useMemo(
    () => Math.max(...dayOfWeekDistribution.map(d => d.minutes), 1),
    [dayOfWeekDistribution]
  );

  const maxSlotMinutes = useMemo(
    () => Math.max(...timeSlotDistribution.map(s => s.minutes), 1),
    [timeSlotDistribution]
  );

  // 가장 활발한 시간대
  const busiestSlot = useMemo(() => {
    let max = 0;
    let slot = '';
    for (const s of timeSlotDistribution) {
      if (s.minutes > max) {
        max = s.minutes;
        slot = s.slot;
      }
    }
    return slot;
  }, [timeSlotDistribution]);

  const hasData = dayOfWeekDistribution.some(d => d.minutes > 0);

  if (!hasData) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">학습 패턴</h3>
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          아직 학습 기록이 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
      <h3 className="text-sm font-semibold text-gray-800">학습 패턴</h3>

      {/* 인사이트 텍스트 */}
      <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-800">
        {busiestDay && (
          <p>
            <span className="font-medium">{busiestDay}요일</span>에 가장 많이 공부하고,{' '}
            {busiestSlot && (
              <><span className="font-medium">{busiestSlot.replace(/[()]/g, '')}</span>에 가장 집중해요.</>
            )}
          </p>
        )}
        <p className="text-xs text-blue-600 mt-1">
          평균 하루 {Math.floor(averageDaily / 60)}시간 {averageDaily % 60}분 학습
        </p>
      </div>

      {/* 요일별 히트맵 */}
      <div>
        <p className="text-xs text-gray-500 mb-2">요일별 학습 시간</p>
        <div className="flex gap-1.5">
          {dayOfWeekDistribution.map((d, i) => {
            const ratio = d.minutes / maxDayMinutes;
            const opacity = d.minutes === 0 ? 0.08 : 0.15 + ratio * 0.85;
            return (
              <div key={d.day} className="flex-1 text-center">
                <div
                  className="rounded-md mb-1 transition-all"
                  style={{
                    height: '40px',
                    backgroundColor: DAY_COLORS[i],
                    opacity,
                  }}
                  title={`${d.day}: ${Math.floor(d.minutes / 60)}시간 ${d.minutes % 60}분`}
                />
                <span className="text-[10px] text-gray-500">{d.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 시간대별 분포 */}
      <div>
        <p className="text-xs text-gray-500 mb-2">시간대별 분포</p>
        <div className="space-y-1.5">
          {timeSlotDistribution.map(s => {
            const ratio = s.minutes / maxSlotMinutes;
            const barWidth = s.minutes === 0 ? 0 : Math.max(ratio * 100, 4);
            return (
              <div key={s.slot} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 w-20 shrink-0 text-right">
                  {s.slot.split(' ')[0]}
                </span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 w-10 shrink-0">
                  {s.minutes > 0 ? `${Math.round(s.minutes / 60)}h` : '-'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
