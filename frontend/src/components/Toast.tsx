"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { HiCheckCircle, HiExclamationCircle, HiInformationCircle } from "react-icons/hi";
import { Z_INDEX } from "@/constants/zIndex";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  show: boolean;
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ show, message, type = "success", onClose, duration = 2000 }: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  const icons = {
    success: <HiCheckCircle className="text-green-500 text-xl flex-shrink-0" />,
    error: <HiExclamationCircle className="text-red-500 text-xl flex-shrink-0" />,
    info: <HiInformationCircle className="text-blue-500 text-xl flex-shrink-0" />,
  };

  const colors = {
    success: "bg-green-50 border-green-100 text-green-800",
    error: "bg-red-50 border-red-100 text-red-800",
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
