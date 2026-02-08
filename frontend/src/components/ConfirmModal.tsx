"use client";

import { motion, AnimatePresence } from "framer-motion";
import { HiExclamationCircle } from "react-icons/hi";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  title = "확인", 
  message,
  confirmText = "확인",
  cancelText = "취소",
  variant = 'primary'
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-[2px]"
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 z-[111] flex items-center justify-center p-4 pointer-events-none font-['Pretendard']">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-[320px] bg-white rounded-[24px] shadow-2xl overflow-hidden pointer-events-auto"
            >
              <div className="p-6 flex flex-col items-center text-center">
                <div className={`w-12 h-12 ${variant === 'danger' ? 'bg-red-50' : 'bg-amber-50'} rounded-full flex items-center justify-center mb-4`}>
                  <HiExclamationCircle className={`${variant === 'danger' ? 'text-red-500' : 'text-amber-500'} text-3xl`} />
                </div>
                
                <h3 className="text-gray-900 font-bold text-lg mb-2">
                  {title}
                </h3>
                
                <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-wrap">
                  {message}
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-white text-gray-500 border border-gray-200 rounded-xl font-semibold text-sm active:scale-95 transition-transform"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`flex-1 py-3 px-4 ${variant === 'danger' ? 'bg-red-500' : 'bg-sky-950'} text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform shadow-lg ${variant === 'danger' ? 'shadow-red-900/10' : 'shadow-sky-900/10'}`}
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
