'use client';
import { useState, useMemo } from 'react';
import { IoIosArrowBack, IoIosArrowForward, IoIosArrowDown } from 'react-icons/io';
import { motion, AnimatePresence } from 'framer-motion';
import { Z_INDEX } from '@/constants/zIndex';

export interface HeatmapData {
  date: string; // YYYY-MM-DD
  taskCount: number;
  studyTime: number;
  score: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface HeatmapProps {
  data: HeatmapData[];
  year: number;
  onYearChange?: (year: number) => void;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

// 색상 레벨별 Tailwind 클래스
const getLevelColor = (level: 0 | 1 | 2 | 3 | 4): string => {
  const colors = {
    0: 'bg-gray-50',
    1: 'bg-blue-100',
    2: 'bg-blue-200',
    3: 'bg-blue-300',
    4: 'bg-blue-400',
  };
  return colors[level];
};

const formatStudyTime = (minutes: number): string => {
  if (minutes === 0) return '0분';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
};

export default function Heatmap({ data, year, onYearChange }: HeatmapProps) {
  const [selectedYear, setSelectedYear] = useState(year);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<HeatmapData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const dataMap = useMemo(() => {
    const map = new Map<string, HeatmapData>();
    data.forEach((item) => map.set(item.date, item));
    return map;
  }, [data]);

  const grid = useMemo(() => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();

    const tempGrid: (HeatmapData | null)[][] = Array.from({ length: 7 }, () => []);

    for (let i = 0; i < startDayOfWeek; i++) {
      tempGrid[i].push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cellData = dataMap.get(dateStr) || null;
      const dayOfWeek = new Date(selectedYear, selectedMonth, day).getDay();
      tempGrid[dayOfWeek].push(cellData || { date: dateStr, taskCount: 0, studyTime: 0, score: 0, level: 0 });
    }

    return tempGrid;
  }, [selectedYear, selectedMonth, dataMap]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      const newYear = selectedYear - 1;
      setSelectedYear(newYear);
      setSelectedMonth(11);
      if (onYearChange) onYearChange(newYear);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      const newYear = selectedYear + 1;
      setSelectedYear(newYear);
      setSelectedMonth(0);
      if (onYearChange) onYearChange(newYear);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  return (
    <div className="w-full font-['Pretendard']">
      {/* 년/월 선택 헤더 (멘티 홈 화면 스타일) */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-xl transition-all active:scale-90"
        >
          <IoIosArrowBack className="text-gray-400" size={20} />
        </button>
        
        <button
          onClick={() => setIsDatePickerOpen(true)}
          className="flex items-center gap-1.5 px-4 py-1.5 hover:bg-gray-50 rounded-full transition-colors active:scale-95"
        >
          <span className="text-slate-800 text-sm font-bold">
            {selectedYear}년 {selectedMonth + 1}월
          </span>
          <IoIosArrowDown className="text-slate-400 text-xs" />
        </button>

        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-xl transition-all active:scale-90"
        >
          <IoIosArrowForward className="text-gray-400" size={20} />
        </button>
      </div>

      {/* 히트맵 그리드 (여백 최적화) */}
      <div className="flex justify-center">
        <div className="inline-flex flex-col gap-[3px]">
          {grid.map((row, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-2">
              <div className="w-4 text-[10px] text-gray-400 font-bold text-center">
                {DAYS[rowIndex]}
              </div>
              <div className="flex gap-[3px]">
                {row.map((cell, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`w-[18px] h-[18px] rounded-[4px] transition-all ${
                      cell ? 'cursor-pointer ' + getLevelColor(cell.level) : 'bg-transparent'
                    } ${cell && cell.level > 0 ? 'hover:ring-2 hover:ring-blue-400 hover:ring-offset-1' : ''}`}
                    onMouseEnter={(e) => {
                      if (cell && (cell.taskCount > 0 || cell.studyTime > 0)) {
                        setHoveredCell(cell);
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top - 8 });
                      }
                    }}
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 범례 (여백 최적화) */}
      <div className="flex items-center justify-end gap-1.5 mt-6 text-[10px] text-gray-400 font-bold">
        <span>Less</span>
        <div className="flex gap-[2px]">
          {[0, 1, 2, 3, 4].map((level) => (
            <div key={level} className={`w-2.5 h-2.5 rounded-[2px] ${getLevelColor(level as 0 | 1 | 2 | 3 | 4)}`} />
          ))}
        </div>
        <span>More</span>
      </div>

      {/* Date Picker 모달 */}
      <AnimatePresence>
        {isDatePickerOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-6" style={{ zIndex: Z_INDEX.OVERLAY }}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDatePickerOpen(false)}
              className="fixed inset-0 bg-black/40"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-[320px] rounded-[32px] overflow-hidden shadow-2xl relative z-10 flex flex-col p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800">날짜 이동</h2>
                <button onClick={() => setIsDatePickerOpen(false)} className="text-gray-400 p-1">&times;</button>
              </div>

              {/* 년도 선택 */}
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-2xl mb-4">
                <button 
                  onClick={() => {
                    const newYear = selectedYear - 1;
                    setSelectedYear(newYear);
                    if (onYearChange) onYearChange(newYear);
                  }}
                  className="p-2 hover:bg-white rounded-xl transition-colors"
                >
                  <IoIosArrowBack />
                </button>
                <span className="font-bold text-slate-800">{selectedYear}년</span>
                <button 
                  onClick={() => {
                    const newYear = selectedYear + 1;
                    setSelectedYear(newYear);
                    if (onYearChange) onYearChange(newYear);
                  }}
                  className="p-2 hover:bg-white rounded-xl transition-colors"
                >
                  <IoIosArrowForward />
                </button>
              </div>

              {/* 월 선택 그리드 */}
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((m, idx) => (
                  <button
                    key={m}
                    onClick={() => {
                      setSelectedMonth(idx);
                      setIsDatePickerOpen(false);
                    }}
                    className={`py-3 rounded-2xl text-xs font-bold transition-all ${
                      selectedMonth === idx 
                        ? 'bg-blue-400 text-white shadow-lg shadow-blue-100' 
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 툴팁 */}
      {hoveredCell && (
        <div
          className="fixed bg-slate-800 text-white px-3 py-2 rounded-xl shadow-xl text-[10px] font-bold pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: Z_INDEX.NOTIFICATION_DROPDOWN,
          }}
        >
          <div className="text-blue-300 mb-1">{hoveredCell.date}</div>
          <div className="flex items-center gap-2">
            <span>📚 {hoveredCell.taskCount}개</span>
            <span className="w-px h-2 bg-slate-600"></span>
            <span>⏱️ {formatStudyTime(hoveredCell.studyTime)}</span>
          </div>
        </div>
      )}
    </div>
  );
}