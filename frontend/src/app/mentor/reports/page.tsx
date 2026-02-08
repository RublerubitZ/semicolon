'use client';

import { getApiUrl } from '@/lib/api';
import MonthlyFeedbackForm from './MonthlyFeedbackForm';
import WeeklyFeedbackForm from './WeeklyFeedbackForm';
import MentorDashboard from './MentorDashboard';
import { useEffect, useState, useMemo } from 'react';
import { GrLineChart } from 'react-icons/gr';

interface Mentee {
  id: string;
  name: string;
  email: string;
  grade?: string;
  profileImage?: string;
  totalTasks: number;
  completedTasks: number;
}

interface MonthlyReport {
  id: string;
  year: number;
  month: number;
  createdAt: string;
}

interface WeeklyReport {
  id: string;
  year: number;
  month: number;
  weekNumber: number;
  createdAt: string;
}

function AvatarTab({
  active,
  name,
  onClick,
}: {
  active: boolean;
  name: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1">
      <div
        className={[
          'grid h-9 w-9 place-items-center rounded-full border',
          active ? 'bg-[#0B2B5B] border-[#0B2B5B]' : 'bg-gray-100 border-gray-200',
        ].join(' ')}
      >
        <span className={active ? 'text-white text-[14px]' : 'text-gray-500 text-[14px]'}>👤</span>
      </div>

      <span
        className={[
          'text-[11px] font-semibold',
          active ? 'text-gray-900' : 'text-gray-400',
        ].join(' ')}
      >
        {name}
      </span>
    </button>
  );
}

function ReportTypeToggle({
  type,
  onChange,
}: {
  type: 'weekly' | 'monthly';
  onChange: (type: 'weekly' | 'monthly') => void;
}) {
  return (
    <div className="flex bg-gray-100 p-1 rounded-lg w-fit mb-6">
      <button
        type="button"
        onClick={() => onChange('weekly')}
        className={[
          'px-4 py-1.5 text-[12px] font-bold rounded-md transition-all',
          type === 'weekly' ? 'bg-white text-[#0B2B5B] shadow-sm' : 'text-gray-500 hover:text-gray-700',
        ].join(' ')}
      >
        주간
      </button>
      <button
        type="button"
        onClick={() => onChange('monthly')}
        className={[
          'px-4 py-1.5 text-[12px] font-bold rounded-md transition-all',
          type === 'monthly' ? 'bg-white text-[#0B2B5B] shadow-sm' : 'text-gray-500 hover:text-gray-700',
        ].join(' ')}
      >
        월간
      </button>
    </div>
  );
}

export default function MentorReportsPage() {
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [selectedMenteeId, setSelectedMenteeId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('monthly');
  const [activeTab, setActiveTab] = useState<'form' | 'dashboard' | 'list'>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const selectedMentee = useMemo(
    () => mentees.find((m) => m.id === selectedMenteeId),
    [mentees, selectedMenteeId]
  );

  const hasCurrentReport = useMemo(() => {
    if (reportType === 'monthly') {
      return monthlyReports.some(
        (r) => r.year === currentYear && r.month === currentMonth
      );
    } else {
      return weeklyReports.some(
        (r) => r.year === currentYear && r.month === currentMonth
      );
    }
  }, [monthlyReports, weeklyReports, reportType, currentYear, currentMonth]);

  useEffect(() => {
    const fetchMentees = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${getApiUrl()}/api/mentor/mentees`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setMentees(data);
        if (data.length > 0) {
          setSelectedMenteeId(data[0].id);
        }
      } catch {
        console.error('멘티 목록 로딩 실패');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMentees();
  }, []);

  useEffect(() => {
    if (!selectedMenteeId) return;

    const fetchReports = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // 월간 리포트 조회 (최근 6개월)
        const mReports: MonthlyReport[] = [];
        for (let i = 0; i < 6; i++) {
          const date = new Date(currentYear, currentMonth - 1 - i, 1);
          const y = date.getFullYear();
          const m = date.getMonth() + 1;
          const res = await fetch(
            `${getApiUrl()}/api/mentor/mentees/${selectedMenteeId}/monthly-feedbacks?year=${y}&month=${m}`,
            { headers }
          );
          if (res.ok) {
            const data = await res.json();
            if (data) mReports.push(data);
          }
        }
        setMonthlyReports(mReports);

        // 주간 리포트 조회 (최근 2개월)
        const wReports: WeeklyReport[] = [];
        for (let i = 0; i < 2; i++) {
          const date = new Date(currentYear, currentMonth - 1 - i, 1);
          const y = date.getFullYear();
          const m = date.getMonth() + 1;
          const res = await fetch(
            `${getApiUrl()}/api/mentor/mentees/${selectedMenteeId}/weekly-feedbacks?year=${y}&month=${m}`,
            { headers }
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) wReports.push(...data);
          }
        }
        setWeeklyReports(wReports.sort((a, b) => {
           if (a.year !== b.year) return b.year - a.year;
           if (a.month !== b.month) return b.month - a.month;
           return b.weekNumber - a.weekNumber;
        }));

      } catch (err) {
        console.error('리포트 목록 조회 오류:', err);
      }
    };

    fetchReports();
  }, [selectedMenteeId, currentYear, currentMonth]);

  if (isLoading) {
    return (
      <div className="px-10 py-10 text-center">
        <p className="text-gray-500 text-[14px]">로딩 중...</p>
      </div>
    );
  }

  if (mentees.length === 0) {
    return (
      <div className="px-10 py-10">
        <div className="max-w-[760px]">
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-[12px] text-gray-500">
            담당 멘티가 없습니다.
          </div>
        </div>
      </div>
    );
  }

  const displayedReports = reportType === 'monthly' ? monthlyReports : weeklyReports;

  return (
    <div className="max-w-[760px]">
      {/* 나의 멘티 */}
      <div className="text-[12px] font-bold text-gray-800 mb-3">나의 멘티</div>

      <div className="flex items-center gap-4 mb-8">
        {mentees.map((m) => (
          <AvatarTab
            key={m.id}
            name={m.name}
            active={m.id === selectedMenteeId}
            onClick={() => {
              setSelectedMenteeId(m.id);
              setActiveTab('list');
            }}
          />
        ))}
      </div>

      {activeTab === 'list' && (
        <>
          <ReportTypeToggle type={reportType} onChange={setReportType} />

          {/* 안내 박스 */}
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-5 mb-8">
            {!hasCurrentReport && (
              <div className="text-center text-[12px] text-gray-500 mb-4">
                {selectedMentee?.name || '멘티'}의 {currentMonth}월 {reportType === 'weekly' ? '주간 ' : ''}리포트가 아직 작성되지 않았습니다.
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="h-10 flex-1 rounded-md bg-[#0B2B5B] text-[12px] font-semibold text-white hover:opacity-95"
              >
                {currentMonth}월 종합 통계 보기
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className="h-10 flex-1 rounded-md bg-[#BBD9FF] text-[12px] font-semibold text-[#0B2B5B] hover:bg-[#AFCFFF] flex items-center justify-center gap-2"
              >
                {currentMonth}월 {reportType === 'weekly' ? '주간 ' : ''}리포트 작성하기
              </button>
            </div>
          </div>

          {/* 리포트 리스트 */}
          <div className="space-y-3">
            {displayedReports.length > 0 ? (
              (displayedReports as (MonthlyReport | WeeklyReport)[]).map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => {
                    setActiveTab('form');
                  }}
                  className="w-full rounded-xl border border-gray-100 bg-white px-4 py-4 text-left shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-[#0B2B5B]">
                      <GrLineChart className="text-[18px] text-white" />
                    </div>

                    <div className="flex-1">
                      <div className="text-[12px] font-bold text-gray-900">
                        {selectedMentee?.name}의 {report.month}월 {'weekNumber' in report ? `${report.weekNumber}주차 ` : ''}리포트
                      </div>
                      <div className="mt-1 text-[10px] text-gray-400">
                        {report.year}년 {report.month}월 {'weekNumber' in report ? `${report.weekNumber}주차` : ''}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400 text-[12px]">
                작성된 리포트가 없습니다.
              </div>
            )}
          </div>
        </>
      )}

      {/* 탭 콘텐츠 */}
      {selectedMenteeId && activeTab !== 'list' && (
        <div className="mt-4">
          <button 
            onClick={() => setActiveTab('list')}
            className="mb-6 text-[12px] text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← 목록으로 돌아가기
          </button>

          {/* 프로필 및 타이틀 (test_mentor 스타일) */}
          <div className="flex items-start gap-4 mb-6">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[#0B2B5B] text-white shadow-sm">
              <span className="text-[16px]">👤</span>
            </div>
            <div className="pt-1">
              <div className="text-[12px] font-bold text-gray-700">{selectedMentee?.name}</div>
              <div className="mt-1 text-[14px] font-bold text-[#0B2B5B]">
                {selectedMentee?.name} 멘티 {currentMonth}월 {reportType === 'weekly' ? '주간 ' : '종합 '}리포트
              </div>
            </div>
          </div>
          
          {activeTab === 'form' && (
            reportType === 'monthly' 
              ? <MonthlyFeedbackForm menteeId={selectedMenteeId} /> 
              : <WeeklyFeedbackForm menteeId={selectedMenteeId} />
          )}
          {activeTab === 'dashboard' && <MentorDashboard menteeId={selectedMenteeId} />}
        </div>
      )}
    </div>
  );
}