'use client';
import { useRouter, usePathname } from 'next/navigation';
import { GoHomeFill } from "react-icons/go";
import { BiSolidBookAlt } from "react-icons/bi";
import { PiCalendarDotsFill } from "react-icons/pi";
import { PiAlignBottomFill } from "react-icons/pi";
import { motion } from 'framer-motion';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: '홈', icon: GoHomeFill, path: '/mentee', active: pathname === '/mentee' },
    { label: '과제', icon: BiSolidBookAlt, path: '/mentee/history', active: pathname.includes('/history') },
    { label: '캘린더', icon: PiCalendarDotsFill, path: '/mentee/calendar', active: pathname.includes('/calendar') },
    { label: '리포트', icon: PiAlignBottomFill, path: '/mentee/reports', active: pathname.includes('/reports') },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-20 bg-white/80 backdrop-blur-lg rounded-t-[32px] flex justify-around items-center px-6 z-40 border-t border-gray-100/50 shadow-[0px_-8px_20px_rgba(0,0,0,0.04)]">
      {navItems.map((item) => (
        <button
          key={item.path}
          onClick={() => router.push(item.path)}
          className="relative flex flex-col items-center gap-1.5 py-2 px-4 transition-all"
        >
          {item.active && (
            <motion.div
              layoutId="nav-pill"
              className="absolute inset-0 bg-gray-100/80 rounded-2xl -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          
          <motion.div
            animate={{ 
              scale: item.active ? 1.1 : 1,
              y: item.active ? -2 : 0
            }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <item.icon className={`text-2xl transition-colors duration-300 ${item.active ? 'text-[#1E293B]' : 'text-gray-300'}`} />
          </motion.div>

          <motion.span 
            animate={{ 
              scale: item.active ? 1.05 : 1,
              color: item.active ? "#1E293B" : "#d1d5db"
            }}
            className={`text-[11px] font-bold font-['Pretendard'] leading-tight transition-colors duration-300`}
          >
            {item.label}
          </motion.span>

          {item.active && (
            <motion.div 
              layoutId="nav-dot"
              className="absolute -bottom-1 w-1 h-1 bg-[#1E293B] rounded-full"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
