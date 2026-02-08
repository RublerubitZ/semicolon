"use client";

import { useState } from "react";

interface CalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  metaByDate?: Record<string, { assignmentCount: number; todoCount: number }>;
  defaultExpanded?: boolean;
}

export function Calendar({
  value,
  onChange,
  metaByDate = {},
  defaultExpanded = false,
}: CalendarProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    return { daysInMonth, startDayOfWeek };
  };

  const { daysInMonth, startDayOfWeek } = getDaysInMonth(value);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: startDayOfWeek }, (_, i) => i);

  const handlePrevMonth = () => {
    const newDate = new Date(value);
    newDate.setMonth(newDate.getMonth() - 1);
    onChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(value);
    newDate.setMonth(newDate.getMonth() + 1);
    onChange(newDate);
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(value);
    newDate.setDate(day);
    onChange(newDate);
    setExpanded(false);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      value.getMonth() === today.getMonth() &&
      value.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return day === value.getDate();
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="rounded-lg p-2 hover:bg-gray-100 transition"
        >
          ←
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-base font-semibold text-gray-900"
        >
          {value.getFullYear()}년 {value.getMonth() + 1}월
        </button>
        <button
          onClick={handleNextMonth}
          className="rounded-lg p-2 hover:bg-gray-100 transition"
        >
          →
        </button>
      </div>

      {/* 달력 */}
      {expanded && (
        <div>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
            <div>일</div>
            <div>월</div>
            <div>화</div>
            <div>수</div>
            <div>목</div>
            <div>금</div>
            <div>토</div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {emptyDays.map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map((day) => {
              const dateStr = formatDate(
                new Date(value.getFullYear(), value.getMonth(), day)
              );
              const meta = metaByDate[dateStr];

              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`relative aspect-square rounded-lg p-1 text-sm transition ${
                    isSelected(day)
                      ? "bg-blue-600 text-white font-semibold"
                      : isToday(day)
                      ? "bg-blue-100 text-blue-900 font-medium"
                      : "hover:bg-gray-100 text-gray-900"
                  }`}
                >
                  <div>{day}</div>
                  {meta && (meta.assignmentCount > 0 || meta.todoCount > 0) && (
                    <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                      {meta.assignmentCount > 0 && (
                        <div className="h-1 w-1 rounded-full bg-blue-500" />
                      )}
                      {meta.todoCount > 0 && (
                        <div className="h-1 w-1 rounded-full bg-green-500" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 축소 모드 */}
      {!expanded && (
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {value.getDate()}일
          </div>
          <div className="text-sm text-gray-500">
            {["일", "월", "화", "수", "목", "금", "토"][value.getDay()]}요일
          </div>
        </div>
      )}
    </div>
  );
}
