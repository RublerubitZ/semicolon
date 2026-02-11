"use client";

import { useState } from "react";
import { TimeInputModal } from "./TimeInputModal";
import { apiPost } from "@/lib/api";
import { toast } from "@/stores/useToastStore";
import { calculateDuration } from "@/lib/timeUtils";

export interface AssignmentItem {
  id: string;
  title: string;
  status: "PENDING" | "DONE";
  dueAtText?: string;
  startedAtText?: string;
  endedAtText?: string;
  hasTimeLog?: boolean;
}

interface AssignmentCardProps {
  item: AssignmentItem;
  existingTimes: Array<{ start: string; end: string; title: string }>;
  onTimeAdded: () => void;
}

export function AssignmentCard({ item, existingTimes, onTimeAdded }: AssignmentCardProps) {
  const [checked, setChecked] = useState(item.hasTimeLog || false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newChecked = e.target.checked;

    if (newChecked && !item.hasTimeLog) {
      // 체크하면 시간 입력 모달 표시
      setShowTimeModal(true);
    } else if (!newChecked && item.hasTimeLog) {
      // 체크 해제는 막음 (시간이 이미 입력된 경우)
      toast.warning("이미 학습 시간이 기록된 과제는 체크를 해제할 수 없습니다.");
      setChecked(true);
    } else {
      setChecked(newChecked);
    }
  };

  const handleTimeSubmit = async (startTime: string, endTime: string) => {
    setIsSubmitting(true);

    try {
      const today = new Date().toISOString().split("T")[0];
      const duration = calculateDuration(startTime, endTime);

      const res = await apiPost(`/api/mentee/tasks/${item.id}/time`, {
        date: today,
        startTime,
        endTime,
        duration,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "시간 기록에 실패했습니다.");
      }

      setChecked(true);
      setShowTimeModal(false);
      onTimeAdded(); // 부모 컴포넌트에 알려서 데이터 새로고침
      toast.success("학습 시간이 기록되었습니다!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setChecked(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeModalClose = () => {
    setShowTimeModal(false);
    setChecked(item.hasTimeLog || false);
  };

  return (
    <>
      <div className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm">
        <div className="flex items-start gap-3">
          {/* 자가점검 체크박스 */}
          <label className="mt-0.5 flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={checked}
              onChange={handleCheckChange}
              disabled={isSubmitting}
              className="h-5 w-5 cursor-pointer rounded border-gray-300 text-blue-600 transition focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          {/* 과제 정보 */}
          <div className="flex-1">
            <h3
              className={`text-base font-semibold ${
                checked ? "text-gray-400 line-through" : "text-gray-900"
              }`}
            >
              {item.title}
            </h3>

            {item.dueAtText && (
              <p className="mt-1 text-sm text-gray-500">📅 {item.dueAtText}</p>
            )}

            {/* 학습 시간 표시 */}
            {item.startedAtText && item.endedAtText && (
              <p className="mt-2 text-sm font-medium text-blue-600">
                ⏱️ {item.startedAtText} ~ {item.endedAtText}
              </p>
            )}

            {/* 상태 표시 */}
            {item.status === "DONE" && (
              <span className="mt-2 inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                완료
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 시간 입력 모달 */}
      <TimeInputModal
        open={showTimeModal}
        onClose={handleTimeModalClose}
        onSubmit={handleTimeSubmit}
        taskTitle={item.title}
        existingTimes={existingTimes}
      />
    </>
  );
}
