"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import {
  HiCheckCircle,
  HiExclamationCircle,
  HiExclamation,
  HiInformationCircle,
} from "react-icons/hi";
import { IoClose } from "react-icons/io5";
import { Z_INDEX } from "@/constants/zIndex";
import { useToastStore, type ToastType, type ToastItem } from "@/stores/useToastStore";

// 개별 토스트 아이템 컴포넌트
function ToastItem({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, item.duration);
    return () => clearTimeout(timer);
  }, [item.duration, onClose]);

  const config: Record<ToastType, { icon: React.ReactNode; colors: string; progressColor: string }> = {
    success: {
      icon: <HiCheckCircle className="text-emerald-500 text-[22px] flex-shrink-0" />,
      colors: "bg-white border-emerald-200 text-gray-800",
      progressColor: "bg-emerald-400",
    },
    error: {
      icon: <HiExclamationCircle className="text-red-500 text-[22px] flex-shrink-0" />,
      colors: "bg-white border-red-200 text-gray-800",
      progressColor: "bg-red-400",
    },
    warning: {
      icon: <HiExclamation className="text-amber-500 text-[22px] flex-shrink-0" />,
      colors: "bg-white border-amber-200 text-gray-800",
      progressColor: "bg-amber-400",
    },
    info: {
      icon: <HiInformationCircle className="text-blue-500 text-[22px] flex-shrink-0" />,
      colors: "bg-white border-blue-200 text-gray-800",
      progressColor: "bg-blue-400",
    },
  };

  const { icon, colors, progressColor } = config[item.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.92 }}
      transition={{ type: "spring", damping: 26, stiffness: 340 }}
      className={`relative overflow-hidden flex items-center gap-3 pl-4 pr-3 py-3.5 rounded-2xl shadow-lg border ${colors} pointer-events-auto`}
    >
      {/* 왼쪽 컬러 악센트 바 */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${progressColor} rounded-l-2xl`} />

      {icon}
      <p className="text-sm font-semibold leading-tight flex-1 break-keep">{item.message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 active:scale-90 transition-all"
      >
        <IoClose className="text-gray-400 text-lg" />
      </button>

      {/* 하단 프로그레스 바 */}
      <motion.div
        className={`absolute bottom-0 left-0 h-[2px] ${progressColor} opacity-40`}
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: item.duration / 1000, ease: "linear" }}
      />
    </motion.div>
  );
}

// 글로벌 토스트 컨테이너 (layout에 한 번만 배치)
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div
      style={{ zIndex: Z_INDEX.TOAST }}
      className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-[360px] flex flex-col gap-2 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} item={t} onClose={() => removeToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// 기존 로컬 Toast도 하위 호환을 위해 유지
export type { ToastType };

interface LegacyToastProps {
  show: boolean;
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ show, message, type = "success", onClose, duration = 2000 }: LegacyToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  const icons = {
    success: <HiCheckCircle className="text-emerald-500 text-xl flex-shrink-0" />,
    error: <HiExclamationCircle className="text-red-500 text-xl flex-shrink-0" />,
    warning: <HiExclamation className="text-amber-500 text-xl flex-shrink-0" />,
    info: <HiInformationCircle className="text-blue-500 text-xl flex-shrink-0" />,
  };

  const colors = {
    success: "bg-green-50 border-green-100 text-green-800",
    error: "bg-red-50 border-red-100 text-red-800",
    warning: "bg-amber-50 border-amber-100 text-amber-800",
    info: "bg-blue-50 border-blue-100 text-blue-800",
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9, x: "-50%" }}
          animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
          exit={{ opacity: 0, y: 20, scale: 0.9, x: "-50%" }}
          style={{ zIndex: Z_INDEX.TOAST }}
          className="fixed bottom-24 left-1/2 w-[90%] max-w-[320px] pointer-events-none"
        >
          <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-lg border ${colors[type]} pointer-events-auto`}>
            {icons[type]}
            <p className="text-sm font-semibold leading-tight">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
