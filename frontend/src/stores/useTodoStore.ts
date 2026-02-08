import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TodoItem {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
}

interface TodoStore {
  todos: TodoItem[];
  addAtTop: (title: string) => void;
  toggleDone: (id: string) => void;
  updateTitle: (id: string, title: string) => void;
  remove: (id: string) => void;
}

export const useTodoStore = create<TodoStore>()(
  persist(
    (set) => ({
      todos: [],

      addAtTop: (title) =>
        set((state) => ({
          todos: [
            {
              id: Date.now().toString(),
              title,
              done: false,
              createdAt: Date.now(),
            },
            ...state.todos,
          ],
        })),

      toggleDone: (id) =>
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === id ? { ...todo, done: !todo.done } : todo
          ),
        })),

      updateTitle: (id, title) =>
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === id ? { ...todo, title } : todo
          ),
        })),

      remove: (id) =>
        set((state) => ({
          todos: state.todos.filter((todo) => todo.id !== id),
        })),
    }),
    {
      name: "todo-storage",
    }
  )
);
