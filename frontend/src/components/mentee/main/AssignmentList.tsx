"use client";

import { AssignmentCard, type AssignmentItem } from "./AssignmentCard";

interface AssignmentListProps {
  items: AssignmentItem[];
  onOpen: (id: string) => void;
  onTimeAdded: () => void;
}

export function AssignmentList({ items, onOpen, onTimeAdded }: AssignmentListProps) {
  // 중복 시간 체크를 위한 기존 시간 목록 생성
  const existingTimes = items
    .filter((item) => item.startedAtText && item.endedAtText)
    .map((item) => ({
      start: item.startedAtText!,
      end: item.endedAtText!,
      title: item.title,
    }));

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">오늘 등록된 과제가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} onClick={() => onOpen(item.id)} className="cursor-pointer">
          <AssignmentCard
            item={item}
            existingTimes={existingTimes}
            onTimeAdded={onTimeAdded}
          />
        </div>
      ))}
    </div>
  );
}
