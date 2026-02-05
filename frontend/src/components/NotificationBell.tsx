'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { IoIosNotifications, IoIosArrowBack } from "react-icons/io";
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  type: string;
  title: string;
  content?: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: string;
}

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 알림 목록 조회
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiUrl()}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // 읽지 않은 알림 개수 조회
  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiUrl()}/api/notifications/unread-count`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  // 알림 읽음 처리
  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiUrl()}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchNotifications();
        await fetchUnreadCount();
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // 모든 알림 읽음 처리
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiUrl()}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchNotifications();
        await fetchUnreadCount();
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // 알림 클릭 처리 (읽음 처리 + 페이지 이동)
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
    if (!notification.relatedId) return;

    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    const userRole = user.role;

    switch (notification.type) {
      case 'NEW_TASK':
        router.push(`/mentee/tasks/${notification.relatedId}`);
        break;
      case 'TASK_SUBMITTED':
        router.push(`/mentor/tasks/${notification.relatedId}`);
        break;
      case 'NEW_FEEDBACK':
        if (userRole === 'MENTOR') {
          router.push(`/mentor/tasks/${notification.relatedId}`);
        } else {
          router.push(`/mentee/tasks/${notification.relatedId}`);
        }
        break;
      case 'TASK_APPROVED':
        router.push(`/mentee/tasks/${notification.relatedId}`);
        break;
      case 'TASK_INCOMPLETE':
        router.push(`/mentee/tasks/${notification.relatedId}`);
        break;
      default:
        break;
    }
  };

  // 초기 로드 및 주기적 갱신
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // 알림 타입에 따른 이모지 반환
  const getNotificationEmoji = (type: string) => {
    switch (type) {
      case 'NEW_TASK': return '📝';
      case 'TASK_SUBMITTED': return '✅';
      case 'NEW_FEEDBACK': return '💬';
      case 'TASK_APPROVED': return '👍';
      case 'TASK_INCOMPLETE': return '⚠️';
      default: return '🔔';
    }
  };

  // 시간 포맷팅
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 알림 벨 버튼 */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors text-zinc-800 active:scale-90"
      >
        <IoIosNotifications className="text-2xl" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 오버레이 */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex justify-center md:justify-end items-center md:items-start md:pt-20 md:pr-10 pointer-events-none">
            {/* 배경 오버레이 (PC) */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="hidden md:block fixed inset-0 bg-black/20 pointer-events-auto" 
            />

            {/* 카드 */}
            <motion.div 
              initial={{ opacity: 0, x: 100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full h-full md:w-[384px] md:h-[852px] md:max-h-[90vh] bg-white relative flex flex-col shadow-2xl md:rounded-[32px] overflow-hidden pointer-events-auto"
            >
              {/* 헤더 (MyPage와 동일한 스타일) */}
              <div className="w-full h-20 px-6 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-10 h-10 flex items-center justify-start text-zinc-800 hover:bg-gray-50 rounded-full transition-colors"
                  >
                    <IoIosArrowBack size={24} />
                  </button>
                  <h1 className="text-slate-800 text-xl font-semibold font-['Pretendard']">알림</h1>
                </div>
                
                {unreadCount > 0 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      markAllAsRead();
                    }} 
                    className="px-3 py-1.5 text-xs text-blue-600 font-bold hover:bg-blue-50 rounded-full transition-colors"
                  >
                    모두 읽기
                  </button>
                )}
              </div>

              {/* 스크롤 영역 */}
              <div className="flex-1 overflow-y-auto bg-gray-50/30">
                <div className="px-6 py-6 space-y-5">
                  {/* 상단 추천 카드 (선택사항) */}
                  <div className="w-full rounded-2xl bg-white px-5 py-5 flex items-center justify-between cursor-pointer active:scale-[0.98] transition border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 grid place-items-center">
                        <span className="text-lg font-bold text-blue-600">!</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-700 leading-tight">
                        오늘의 학습 목표를 확인하고<br/>열공해볼까요?
                      </div>
                    </div>
                  </div>

                  {/* 알림 리스트 */}
                  <div className="rounded-[24px] overflow-hidden bg-white border border-gray-100 shadow-sm">
                    {notifications.length === 0 ? (
                      <div className="py-20 text-center flex flex-col items-center gap-3">
                        <span className="text-4xl opacity-50">🔕</span>
                        <div className="text-gray-400 text-sm font-medium">새로운 알림이 없습니다.</div>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full text-left flex items-start gap-4 px-5 py-5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50/10' : ''}`}
                        >
                          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex-shrink-0 grid place-items-center text-2xl shadow-inner">
                            {getNotificationEmoji(notification.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className={`text-sm font-bold text-gray-800 line-clamp-1 ${!notification.isRead ? 'text-black' : 'text-gray-600'}`}>
                                {notification.title}
                              </div>
                              {!notification.isRead && (
                                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                              )}
                            </div>
                            <div className="mt-1 text-xs text-gray-500 line-clamp-2 leading-relaxed font-medium">
                              {notification.content || '새로운 알림이 도착했습니다.'}
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              {formatTime(notification.createdAt)}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
