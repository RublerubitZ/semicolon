'use client';
import { useRouter } from 'next/navigation';
import NotificationBell from './NotificationBell';
import MyPageOverlay from './MyPageOverlay';
import Image from 'next/image';
import { RiUserFill } from "react-icons/ri";
import { useState } from 'react';

export default function MenteeHeader() {
  const router = useRouter();
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);

  return (
    <div className="w-full px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-40 border-b border-gray-50">
      <div 
        className="flex items-center gap-2 cursor-pointer transition-opacity active:opacity-70" 
        onClick={() => router.push('/mentee')}
      >
        <Image src="/logo.svg" alt="설스터디 로고" width={24} height={24} className="w-auto h-6" />
        <span className="text-zinc-800 text-xl font-bold font-['S-Core_Dream']">
          설스터디
        </span>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <button 
          onClick={() => setIsMyPageOpen(true)} 
          className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:bg-gray-100 rounded-full transition-colors"
          title="마이페이지"
        >
           <RiUserFill className="text-2xl" />
        </button>
      </div>

      <MyPageOverlay 
        isOpen={isMyPageOpen} 
        onClose={() => setIsMyPageOpen(false)} 
      />
    </div>
  );
}
