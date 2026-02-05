'use client';

import { useState, useEffect, useRef } from 'react';

export interface Message {
  id: string;
  userId: string;
  userName: string;
  userRole: 'MENTOR' | 'MENTEE';
  content: string;
  createdAt: string;
  profileImage?: string;
}

interface FeedbackChatUIProps {
  taskId: string;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (content: string) => Promise<void>;
}

export default function FeedbackChatUI({
  taskId,
  messages,
  currentUserId,
  onSendMessage,
}: FeedbackChatUIProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 메시지 전송
  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(inputValue.trim());
      setInputValue('');
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      alert('메시지 전송에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  // 엔터키 전송 (Shift+Enter는 줄바꿈)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 새 메시지 도착 시 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 시간 포맷팅
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      {/* 채팅 메시지 영역 */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 rounded-t-lg"
        style={{ minHeight: '300px' }}
      >
        {messages.map((message) => {
          const isCurrentUser = message.userId === currentUserId;
          const isMentor = message.userRole === 'MENTOR';

          return (
            <div
              key={message.id}
              className={`flex items-end gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* 프로필 이미지 */}
              {!isCurrentUser && (
                <div className="flex-shrink-0">
                  {message.profileImage ? (
                    <img
                      src={message.profileImage}
                      alt={message.userName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-bold text-white">
                      {message.userName[0]}
                    </div>
                  )}
                </div>
              )}

              {/* 메시지 본문 */}
              <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
                {/* 보낸 사람 이름 (상대방 메시지만) */}
                {!isCurrentUser && (
                  <span className="text-xs text-gray-600 dark:text-gray-400 mb-1 px-2">
                    {message.userName} {isMentor && '멘토'}
                  </span>
                )}

                {/* 메시지 말풍선 */}
                <div
                  className={`px-3 py-2 rounded-lg whitespace-pre-wrap break-words ${
                    isCurrentUser
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none border dark:border-gray-700'
                  }`}
                >
                  {message.content}
                </div>

                {/* 시간 */}
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-2">
                  {formatTime(message.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="p-3 bg-white dark:bg-gray-800 border-t dark:border-gray-700 rounded-b-lg">
        <div className="flex items-end gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요... (Shift+Enter: 줄바꿈)"
            className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors self-end"
          >
            {isSending ? '전송 중...' : '전송'}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Enter: 전송 | Shift+Enter: 줄바꿈
        </p>
      </div>
    </div>
  );
}
