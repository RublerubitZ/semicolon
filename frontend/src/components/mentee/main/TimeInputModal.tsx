"use client";

import { useState, useEffect } from "react";

interface TimeInputModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (startTime: string, endTime: string) => void;
  taskTitle: string;
  existingTimes?: Array<{ start: string; end: string; title: string }>;
}

export function TimeInputModal({
  open,
  onClose,
  onSubmit,
  taskTitle,
  existingTimes = [],
}: TimeInputModalProps) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setStartTime("");
      setEndTime("");
      setError("");
    }
  }, [open]);

  // 시간을 분으로 변환
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // 시간 중복 체크
  const checkTimeOverlap = (start: string, end: string): boolean => {
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);

    for (const existing of existingTimes) {
      const existingStart = timeToMinutes(existing.start);
      const existingEnd = timeToMinutes(existing.end);

      // 시간 겹침 체크
      if (
        (startMin >= existingStart && startMin < existingEnd) ||
        (endMin > existingStart && endMin <= existingEnd) ||
        (startMin <= existingStart && endMin >= existingEnd)
      ) {
        setError(`"${existing.title}"와 시간이 겹칩니다 (${existing.start}~${existing.end})`);
        return true;
      }
    }
    return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!startTime || !endTime) {
      setError("시작 시간과 종료 시간을 모두 입력해주세요.");
      return;
    }

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);

    if (startMin >= endMin) {
      setError("종료 시간은 시작 시간보다 늦어야 합니다.");
      return;
    }

    // 시간 중복 체크
    if (checkTimeOverlap(startTime, endTime)) {
      return;
    }

    onSubmit(startTime, endTime);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-xl font-bold text-gray-900">학습 시간 입력</h3>
        <p className="mb-4 text-sm text-gray-600">{taskTitle}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              시작 시간
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              종료 시간
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
