'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { getSubjectLabel, Subject } from '@/constants/subjects';

interface TrendDataPoint {
  month: string;
  subjects: Record<string, { studyTime: number; completionRate: number; taskCount: number }>;
}

interface SubjectTrendChartProps {
  data: TrendDataPoint[];
  metric?: 'studyTime' | 'completionRate';
}

const SUBJECT_CHART_COLORS: Record<string, { stroke: string; fill: string }> = {
  KOREAN: { stroke: '#ec4899', fill: '#fce7f3' },
  ENGLISH: { stroke: '#f59e0b', fill: '#fef3c7' },
  MATH: { stroke: '#3b82f6', fill: '#dbeafe' },
};

const DEFAULT_COLOR = { stroke: '#6b7280', fill: '#f3f4f6' };

export default function SubjectTrendChart({ data, metric = 'studyTime' }: SubjectTrendChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ subject: string; month: string; value: number; x: number; y: number } | null>(null);

  // 모든 과목 수집
  const subjects = useMemo(() => {
    const set = new Set<string>();
    for (const point of data) {
      for (const subj of Object.keys(point.subjects)) {
        set.add(subj);
      }
    }
    return Array.from(set);
  }, [data]);

  // 차트 데이터 계산
  const chartData = useMemo(() => {
    if (data.length === 0) return { lines: [], maxValue: 100, labels: [] };

    const lines = subjects.map(subject => {
      const points = data.map(d => {
        const val = d.subjects[subject];
        if (!val) return 0;
        return metric === 'studyTime' ? val.studyTime : val.completionRate;
      });
      return { subject, points };
    });

    const allValues = lines.flatMap(l => l.points);
    const maxValue = Math.max(...allValues, metric === 'completionRate' ? 100 : 60);

    const labels = data.map(d => {
      const [, m] = d.month.split('-');
      return `${parseInt(m)}월`;
    });

    return { lines, maxValue, labels };
  }, [data, subjects, metric]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        트렌드 데이터가 없습니다
      </div>
    );
  }

  const { lines, maxValue, labels } = chartData;
  const W = 320;
  const H = 180;
  const PAD = { top: 20, right: 20, bottom: 30, left: 45 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW;

  const getX = (i: number) => PAD.left + (data.length > 1 ? i * xStep : chartW / 2);
  const getY = (v: number) => PAD.top + chartH - (v / maxValue) * chartH;

  // Y축 눈금
  const yTicks = metric === 'completionRate'
    ? [0, 25, 50, 75, 100]
    : Array.from({ length: 5 }, (_, i) => Math.round((maxValue / 4) * i));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* Y축 그리드 */}
        {yTicks.map(tick => (
          <g key={tick}>
            <line
              x1={PAD.left}
              y1={getY(tick)}
              x2={W - PAD.right}
              y2={getY(tick)}
              stroke="#e5e7eb"
              strokeDasharray="3,3"
            />
            <text x={PAD.left - 6} y={getY(tick) + 3} textAnchor="end" fontSize="8" fill="#9ca3af">
              {metric === 'studyTime' ? `${Math.round(tick / 60)}h` : `${tick}%`}
            </text>
          </g>
        ))}

        {/* X축 라벨 */}
        {labels.map((label, i) => (
          <text key={i} x={getX(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#6b7280">
            {label}
          </text>
        ))}

        {/* 라인 */}
        {lines.map(line => {
          const colors = SUBJECT_CHART_COLORS[line.subject] || DEFAULT_COLOR;
          const pathD = line.points
            .map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(v)}`)
            .join(' ');

          return (
            <g key={line.subject}>
              <motion.path
                d={pathD}
                fill="none"
                stroke={colors.stroke}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
              {line.points.map((v, i) => (
                <circle
                  key={i}
                  cx={getX(i)}
                  cy={getY(v)}
                  r="4"
                  fill="white"
                  stroke={colors.stroke}
                  strokeWidth="2"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint({
                    subject: line.subject,
                    month: labels[i],
                    value: v,
                    x: getX(i),
                    y: getY(v),
                  })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </g>
          );
        })}

        {/* 툴팁 */}
        {hoveredPoint && (
          <g>
            <rect
              x={hoveredPoint.x - 40}
              y={hoveredPoint.y - 32}
              width="80"
              height="22"
              rx="4"
              fill="rgba(0,0,0,0.8)"
            />
            <text
              x={hoveredPoint.x}
              y={hoveredPoint.y - 18}
              textAnchor="middle"
              fontSize="9"
              fill="white"
            >
              {getSubjectLabel(hoveredPoint.subject)} {hoveredPoint.month}:{' '}
              {metric === 'studyTime'
                ? `${Math.round(hoveredPoint.value / 60)}시간`
                : `${hoveredPoint.value}%`
              }
            </text>
          </g>
        )}
      </svg>

      {/* 범례 */}
      <div className="flex justify-center gap-4 mt-2">
        {subjects.map(subj => {
          const colors = SUBJECT_CHART_COLORS[subj] || DEFAULT_COLOR;
          return (
            <div key={subj} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: colors.stroke }}
              />
              {getSubjectLabel(subj as Subject)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
