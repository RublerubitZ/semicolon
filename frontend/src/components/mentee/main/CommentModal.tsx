"use client";

import { useState } from "react";
import { toast } from "@/stores/useToastStore";

interface CommentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: { content: string }) => void;
}

export function CommentModal({ open, onClose, onSubmit }: CommentModalProps) {
  const [content, setContent] = useState("");

  const handleClose = () => {
    setContent("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.warning("내용을 입력해주세요.");
      return;
    }

    onSubmit({ content: content.trim() });
    handleClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-xl font-bold text-gray-900">멘토에게 메시지</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              메시지 내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              rows={4}
              placeholder="멘토에게 전달할 메시지를 입력하세요..."
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-gray-300 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700"
            >
              전송
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
