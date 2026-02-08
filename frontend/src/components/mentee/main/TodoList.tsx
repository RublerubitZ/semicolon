"use client";

import { useState } from "react";

export interface TodoItem {
  id: string;
  title: string;
  done: boolean;
}

interface TodoListProps {
  items: TodoItem[];
  onAddAtTop: (title: string) => void;
  onToggleDone: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function TodoList({
  items,
  onAddAtTop,
  onToggleDone,
  onUpdateTitle,
  onDelete,
}: TodoListProps) {
  const [newTodo, setNewTodo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const handleAdd = () => {
    if (newTodo.trim()) {
      onAddAtTop(newTodo.trim());
      setNewTodo("");
    }
  };

  const handleStartEdit = (item: TodoItem) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
  };

  const handleSaveEdit = (id: string) => {
    if (editingTitle.trim()) {
      onUpdateTitle(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="mt-6">
      <h2 className="mb-3 text-lg font-bold text-gray-900">할 일</h2>

      {/* 새 할 일 추가 */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="새 할 일 추가..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleAdd}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          추가
        </button>
      </div>

      {/* 할 일 목록 */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-500">할 일이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition hover:border-gray-300"
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => onToggleDone(item.id)}
                className="h-5 w-5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />

              {editingId === item.id ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit(item.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onBlur={() => handleSaveEdit(item.id)}
                  autoFocus
                  className="flex-1 rounded border border-blue-500 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              ) : (
                <span
                  onClick={() => handleStartEdit(item)}
                  className={`flex-1 cursor-pointer text-sm ${
                    item.done ? "text-gray-400 line-through" : "text-gray-900"
                  }`}
                >
                  {item.title}
                </span>
              )}

              <button
                onClick={() => onDelete(item.id)}
                className="text-red-500 hover:text-red-700 transition"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
