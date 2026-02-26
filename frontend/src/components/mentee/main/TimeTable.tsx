"use client";

import { SUBJECT_COLORS, getSubjectLabel } from '@/constants/subjects';

export interface TimelineItem {
  id: string;
  type: "task" | "assignment";
  title: string;
  subject: string;
  start: string; // "HH:MM" 형식
  end: string; // "HH:MM" 형식
}

interface TimeTableProps {
  items: TimelineItem[];
  startHour?: number; // 시작 시간 (기본: 0)
  endHour?: number; // 종료 시간 (기본: 24), 만약 startHour보다 작으면 다음날을 의미
}

export function TimeTable({ items, startHour = 0, endHour = 24 }: TimeTableProps) {
  // 시간을 분으로 변환
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // 시간 범위 계산
  const getHours = () => {
    const hours: number[] = [];
    if (endHour < startHour) {
      // 다음날까지 (예: 22시~6시)
      for (let i = startHour; i < 24; i++) hours.push(i);
      for (let i = 0; i <= endHour; i++) hours.push(i);
    } else {
      for (let i = startHour; i <= endHour; i++) {
        hours.push(i);
      }
    }
    return hours;
  };

  const hours = getHours();
  const startMinutes = startHour * 60;
  const totalMinutes = endHour < startHour
    ? (24 - startHour + endHour) * 60
    : (endHour - startHour) * 60;

  // 아이템의 위치와 높이 계산
  const getItemStyle = (item: TimelineItem) => {
    const itemStart = timeToMinutes(item.start);
    let itemEnd = timeToMinutes(item.end);

    // 종료 시간이 시작 시간보다 작으면 다음날로 간주 (+24시간)
    if (itemEnd < itemStart) {
      itemEnd += 24 * 60;
    }

    // 범위를 벗어나는 아이템은 잘라냄
    let adjustedStart = itemStart;
    let adjustedEnd = itemEnd;

    // 다음날까지 걸치는 경우 처리 (예: 05:00 ~ 02:00)
    if (endHour < startHour) {
      // 뷰의 범위: startHour ~ (24 + endHour)
      const rangeStart = startHour * 60;
      const rangeEnd = (24 + endHour) * 60;

      // 아이템의 시간이 뷰의 범위를 벗어나는 경우 보정 (예: 01:00 -> 25:00)
      if (adjustedStart < rangeStart) adjustedStart += 24 * 60;
      if (adjustedEnd < rangeStart) adjustedEnd += 24 * 60;

      // start만 보정되고 end는 안 된 경우 (경계를 넘는 아이템) 추가 보정
      if (adjustedEnd < adjustedStart) adjustedEnd += 24 * 60;

      // 범위 확인
      if (adjustedEnd <= rangeStart || adjustedStart >= rangeEnd) {
        return null; // 범위 밖
      }

      adjustedStart = Math.max(adjustedStart, rangeStart);
      adjustedEnd = Math.min(adjustedEnd, rangeEnd);

      const top = ((adjustedStart - rangeStart) / totalMinutes) * 100;
      const height = ((adjustedEnd - adjustedStart) / totalMinutes) * 100;

      return { top: `${top}%`, height: `${height}%` };
    } else {
      // 일반적인 당일 뷰 (예: 00:00 ~ 24:00)
      const rangeStart = startHour * 60;
      const rangeEnd = endHour * 60;

      if (adjustedEnd <= rangeStart || adjustedStart >= rangeEnd) {
        return null;
      }

      adjustedStart = Math.max(adjustedStart, rangeStart);
      adjustedEnd = Math.min(adjustedEnd, rangeEnd);

      const top = ((adjustedStart - rangeStart) / totalMinutes) * 100;
      const height = ((adjustedEnd - adjustedStart) / totalMinutes) * 100;

      return { top: `${top}%`, height: `${height}%` };
    }
  };

  const getSubjectColorClasses = (subject: string) => {
    const s = subject.toUpperCase();
    if (s === 'KOREAN') return 'bg-pink-50 border-pink-100 text-pink-700 border-l-pink-400';
    if (s === 'ENGLISH') return 'bg-amber-50 border-amber-100 text-amber-700 border-l-amber-400';
    if (s === 'MATH') return 'bg-blue-50 border-blue-100 text-blue-700 border-l-blue-400';
    return 'bg-slate-50 border-slate-100 text-slate-700 border-l-slate-400';
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">학습 시간이 기록되지 않았습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex gap-6 min-h-[600px]">
        {/* 시간 레이블 */}
        <div className="flex flex-col justify-between py-1 w-12 shrink-0">
          {hours.map((hour) => (
            <div key={hour} className="text-[11px] font-bold text-gray-400 flex items-center h-0">
              {hour.toString().padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* 타임라인 */}
        <div className="relative flex-1">
          {/* 시간 구분선 */}
          {hours.map((hour, index) => (
            <div
              key={hour}
              className={`absolute w-full border-t ${index === 0 || index === hours.length - 1 ? 'border-gray-200' : 'border-gray-100'}`}
              style={{ top: `${(index / (hours.length - 1)) * 100}%` }}
            />
          ))}

          {/* 학습 시간 블록 */}
          <div className="absolute inset-0">
            {items.map((item) => {
              const style = getItemStyle(item);
              if (!style) return null;

              const colorClasses = getSubjectColorClasses(item.subject);
              
              return (
                <div
                  key={item.id}
                  className={`absolute left-0 right-0 mx-1 overflow-hidden rounded-xl border border-l-[6px] px-4 py-3 shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer group ${colorClasses}`}
                  style={{
                    ...style,
                    zIndex: 10
                  }}
                >
                  <div className="flex flex-col h-full justify-center">
                    <div className="text-[13px] font-bold leading-tight truncate mb-1">{item.title}</div>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-medium opacity-80 flex items-center gap-1">
                        {item.start} - {item.end}
                      </div>
                      <div className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white/60 border border-current/10">
                        {getSubjectLabel(item.subject)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
