'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IoIosNotifications, IoIosArrowBack } from "react-icons/io";
import { 
  MdAssignment, 
  MdCheckCircle, 
  MdChatBubble, 
  MdSms,
  MdThumbUp, 
  MdWarning, 
  MdNotifications 
} from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import { useOverlayStore } from '@/stores/useOverlayStore';
import { Z_INDEX } from '@/constants/zIndex';
import { getUser } from '@/lib/auth';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from '@/lib/queries/use-notifications';

import { formatRelativeTime } from '@/lib/dateUtils';

interface Notification {
  id: string;
  type: string;
  title: string;
  content?: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: string;
}

const ENCOURAGING_MESSAGES = [
  "오늘도 책상 지키는 당신, 이미 반은 성공했어요",
  "지금 앉아 있는 것만으로도 대단해요. 같이 달려봐요!",
  "한 페이지라도 넘기면 그게 바로 승리",
  "집중 ON, 잡생각 OFF! 오늘도 잘 해봅시다",
  "지금의 노력이 내일의 나를 살려줘요. 파이팅!",
  "완벽 말고 꾸준함! 오늘도 조금씩 가요",
  "시작했으면 이미 이긴 거예요. 열공 모드 가동!"
];

export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [randomMessage, setRandomMessage] = useState(ENCOURAGING_MESSAGES[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { setOverlay } = useOverlayStore();

  const { data: notifications = [] } = useNotifications();
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.count ?? 0;
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const handleToggle = () => {
    const next = !isOpen;
    if (next) {
      const idx = Math.floor(Math.random() * ENCOURAGING_MESSAGES.length);
      setRandomMessage(ENCOURAGING_MESSAGES[idx]);
    }
    setIsOpen(next);
    setOverlay('notifications', next);
  };

  const handleClose = () => {
    setIsOpen(false);
    setOverlay('notifications', false);
  };

  // 알림 클릭 처리 (읽음 처리 + 페이지 이동)
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
    handleClose();
    if (!notification.relatedId) return;

    const user = getUser();
    if (!user) return;
    const userRole = user.role;

    switch (notification.type) {
      case 'NEW_TASK':
        router.push(`/mentee/tasks/${notification.relatedId}`);
        break;
      case 'TASK_SUBMITTED':
        // 멘토가 멘티의 제출물을 확인하는 페이지로 이동
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

  // 알림 타입에 따른 아이콘 반환
  const getNotificationEmoji = (type: string) => {
    switch (type) {
      case 'NEW_TASK': return <MdAssignment className="text-sky-300" />;
      case 'TASK_SUBMITTED': return <MdCheckCircle className="text-emerald-200" />;
      case 'NEW_FEEDBACK': return <MdSms className="text-indigo-200" />;
      case 'TASK_APPROVED': return <MdThumbUp className="text-amber-200" />;
      case 'TASK_INCOMPLETE': return <MdWarning className="text-rose-300" />;
      default: return <MdNotifications className="text-orange-300" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 알림 벨 버튼 */}
      <button
        onClick={handleToggle}
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
          <div className="fixed inset-0 flex justify-center md:justify-end items-center md:items-start md:pt-20 md:pr-10 pointer-events-none" style={{ zIndex: Z_INDEX.OVERLAY_BACKDROP }}>
            {/* 배경 오버레이 (PC) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
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
              {/* 헤더 */}
              <div className="w-full h-20 px-6 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClose}
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
                      markAllAsRead.mutate();
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
                  {/* 상단 추천 카드 */}
                  <div className="w-full rounded-2xl bg-white px-5 py-5 flex items-center justify-between cursor-pointer active:scale-[0.98] transition border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 grid place-items-center">
                        <span className="text-lg font-bold text-blue-600">!</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-700 leading-tight">
                        {randomMessage}
                      </div>
                    </div>
                  </div>

                  {/* 알림 리스트 */}
                  <div className="rounded-[24px] overflow-hidden bg-white border border-gray-100 shadow-sm">
                    {(notifications as Notification[]).length === 0 ? (
                      <div className="py-20 text-center flex flex-col items-center gap-3">
                        <span className="text-4xl opacity-50">🔕</span>
                        <div className="text-gray-400 text-sm font-medium">새로운 알림이 없습니다.</div>
                      </div>
                    ) : (
                      (notifications as Notification[]).map((notification) => (
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
                              {formatRelativeTime(notification.createdAt)}
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
