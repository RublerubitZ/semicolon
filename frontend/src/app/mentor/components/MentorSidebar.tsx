'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { IoPeople, IoChatbox } from "react-icons/io5";
import { RiBookFill } from "react-icons/ri";
import { FiLogOut } from "react-icons/fi";
import { FaRegFolderOpen } from "react-icons/fa6";
import { PiAlignBottomFill } from "react-icons/pi";
import { apiGet } from '@/lib/api';

interface MentorSidebarProps {
  user: any;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  handleLogout: () => void;
}

function NavBtn({
  active,
  icon,
  label,
  onClick,
  isCollapsed,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isCollapsed: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full cursor-pointer rounded-lg transition-all duration-300 active:scale-[0.98]",
        "flex items-center text-[13px] font-semibold overflow-hidden whitespace-nowrap",
        active ? "bg-[#C5EAFF] text-[#00265A]" : "text-gray-500 hover:bg-gray-50",
        isCollapsed 
          ? (active ? "px-3 justify-start" : "justify-center") 
          : "px-4 gap-3",
        "py-3",
      ].join(" ")}
    >
      <div className={`flex-shrink-0 flex items-center justify-center w-6 ${isCollapsed && active ? 'mr-3' : ''}`}>
        {icon}
      </div>
      <span className={`
        transition-all duration-300 overflow-hidden
        ${isCollapsed && !active ? 'max-w-0 opacity-0' : 'max-w-[220px] opacity-100'}
      `}>
        {label}
      </span>
    </button>
  );
}

export default function MentorSidebar({
  user: initialUser,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  handleLogout,
}: MentorSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [isHovered, setIsHovered] = useState(false);

  const isCollapsed = !isHovered && !isMobileMenuOpen;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await apiGet('/api/auth/profile');

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };

    fetchProfile();
  }, []);

  const menuItems = [
    { name: '멘티관리', path: '/mentor', icon: IoPeople, id: 'mentees' },
    { name: '학습 과제 등록', path: '/mentor/tasks/new', icon: RiBookFill, id: 'tasks' },
    { name: '피드백', path: '/mentor/feedbacks', icon: IoChatbox, id: 'feedback' },
    { name: '학습지 관리', path: '/mentor/worksheets', icon: FaRegFolderOpen, id: 'library' },
    { name: '학습 리포트', path: '/mentor/reports', icon: PiAlignBottomFill, id: 'report' },
  ];

  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
      fixed inset-0 ${isMobileMenuOpen ? 'z-50' : 'z-20'} bg-white md:relative md:z-0 md:flex flex-shrink-0 border-r border-gray-100 flex-col
      transition-all duration-300 ease-in-out
      ${isHovered ? 'md:w-[280px]' : 'md:w-[180px]'}
      ${isMobileMenuOpen ? 'flex w-full' : 'hidden md:flex'}
    `}>
      <div className={`transition-all duration-300 ${isCollapsed ? 'px-3' : 'px-10'} pt-10`}>
        {/* Logo */}
        <button
          type="button"
          onClick={() => {
            router.push("/mentor");
            setIsMobileMenuOpen(false);
          }}
          className={`flex items-center cursor-pointer overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'justify-center w-full' : 'gap-3'}`}
        >
          <Image src="/logo.png" alt="설스터디 로고" width={40} height={40} className="flex-shrink-0" />
          <span className={`
            text-[28px] font-extrabold text-gray-900 transition-all duration-300
            ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}
          `}>
            설스터디
          </span>
        </button>

        {/* Navigation */}
        <nav className="mt-14 space-y-2">
          {menuItems.map((item) => {
            let isActive = false;
            if (item.path === '/mentor') {
              isActive = pathname === '/mentor' || pathname.startsWith('/mentor/mentees');
            } else {
              isActive = pathname.startsWith(item.path);
            }

            const Icon = item.icon;

            return (
              <NavBtn
                key={item.path}
                active={isActive}
                isCollapsed={isCollapsed}
                icon={<Icon className={["text-[24px]", isActive ? "text-[#00265A]" : "text-gray-400"].join(" ")} />}
                label={item.name}
                onClick={() => {
                  router.push(item.path);
                  setIsMobileMenuOpen(false);
                }}
              />
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className={`mt-auto w-full pb-10 transition-all duration-300 ${isCollapsed ? 'px-3' : 'px-10'}`}>
        <button
          type="button"
          onClick={handleLogout}
          className={`flex items-center text-[12px] font-semibold text-gray-600 hover:text-gray-900 transition-colors overflow-hidden whitespace-nowrap ${isCollapsed ? 'justify-center' : 'gap-3'}`}
        >
          <FiLogOut className="text-[16px] flex-shrink-0" />
          <span className={`
            transition-all duration-300
            ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[100px] opacity-100'}
          `}>
            로그아웃
          </span>
        </button>
      </div>

      {/* Mobile Close Button Overlay */}
      {isMobileMenuOpen && (
        <button 
          className="md:hidden absolute top-4 right-4 text-gray-500"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <span className="sr-only">메뉴 닫기</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </aside>
  );
}
