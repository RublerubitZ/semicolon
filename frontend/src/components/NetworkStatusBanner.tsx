'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { MdWifiOff, MdWifi } from 'react-icons/md';

export default function NetworkStatusBanner() {
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [showReconnected, setShowReconnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      // 재연결 시 모든 쿼리 리페치
      queryClient.invalidateQueries();
      setTimeout(() => setShowReconnected(false), 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [queryClient]);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-gray-800 text-white overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold">
            <MdWifiOff className="w-4 h-4" />
            <span>인터넷 연결이 끊어졌습니다</span>
          </div>
        </motion.div>
      )}
      {showReconnected && !isOffline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-green-600 text-white overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold">
            <MdWifi className="w-4 h-4" />
            <span>인터넷에 다시 연결되었습니다</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
