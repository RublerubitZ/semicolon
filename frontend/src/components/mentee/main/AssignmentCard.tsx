"use client";

import { useState } from "react";
import { TimeInputModal } from "./TimeInputModal";
import { getApiUrl } from "@/lib/api";

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
      alert("이미 학습 시간이 기록된 과제는 체크를 해제할 수 없습니다.");
      setChecked(true);
    } else {
      setChecked(newChecked);
    }
  };

  const handleTimeSubmit = async (startTime: string, endTime: string) => {
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const today = new Date().toISOString().split("T")[0];

      // 시작/종료 시간으로 duration 계산 (분 단위)
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);
      const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);

      const res = await fetch(`${getApiUrl()}/api/mentee/tasks/${item.id}/time`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: today,
          startTime,
          endTime,
          duration,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "시간 기록에 실패했습니다.");
      }

      setChecked(true);
      setShowTimeModal(false);
      onTimeAdded(); // 부모 컴포넌트에 알려서 데이터 새로고침
      alert("학습 시간이 기록되었습니다!");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "오류가 발생했습니다.");
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
