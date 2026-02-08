"use client";

import { motion, AnimatePresence } from "framer-motion";
import { HiExclamationCircle } from "react-icons/hi";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

export function AlertModal({ isOpen, onClose, title = "알림", message }: AlertModalProps) {
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
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]"
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-[320px] bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
            >
              <div className="p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                  <HiExclamationCircle className="text-amber-500 text-3xl" />
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
                  className="w-full py-3 px-4 bg-sky-950 text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
