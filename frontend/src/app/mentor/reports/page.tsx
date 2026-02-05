'use client';
import { getApiUrl } from '@/lib/api';
import NotificationBell from '@/components/NotificationBell';
import MonthlyFeedbackForm from './MonthlyFeedbackForm';
import WeeklyFeedbackForm from './WeeklyFeedbackForm';
import MentorDashboard from './MentorDashboard';
import { useEffect, useState } from 'react';

interface Mentee {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  grade?: string;
  profileImage?: string;
  totalTasks: number;
  completedTasks: number;
}

export default function MentorReportsPage() {
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [selectedMenteeId, setSelectedMenteeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'monthly' | 'weekly' | 'dashboard'>('monthly');
  const [isLoading, setIsLoading] = useState(true);

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
      } catch {
        console.error('멘티 목록 로딩 실패');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMentees();
  }, []);

  const selectedMentee = mentees.find(m => m.id === selectedMenteeId);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 md:mb-10 flex justify-between items-start">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-black mb-2 font-['Pretendard']">학습 리포트</h1>
          <p className="text-sm md:text-base text-gray-500">
            멘티별 월간/주간 총평 작성 및 학습 통계를 확인하세요
          </p>
        </div>
        <NotificationBell />
      </div>

      {/* 멘티 선택 */}
      {!selectedMenteeId ? (
        <>
          <h2 className="text-lg font-semibold mb-4">멘티를 선택하세요</h2>
          {isLoading ? (
            <p className="text-gray-500">로딩 중...</p>
          ) : mentees.length === 0 ? (
            <p className="text-gray-500">담당 멘티가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mentees.map((mentee) => {
                const progress = mentee.totalTasks > 0
                  ? Math.round((mentee.completedTasks / mentee.totalTasks) * 100)
                  : 0;
                const displayName = mentee.nickname ? `${mentee.name} (${mentee.nickname})` : mentee.name;

                return (
                  <button
                    key={mentee.id}
                    onClick={() => setSelectedMenteeId(mentee.id)}
                    className="bg-white rounded-[10px] p-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.05)] hover:shadow-lg transition-shadow border border-transparent hover:border-blue-200 text-left"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                        {mentee.profileImage ? (
                          <img src={mentee.profileImage} alt={mentee.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-black">{displayName}</p>
                        <p className="text-xs text-gray-400">{mentee.grade || '미설정'}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">달성률</span>
                      <span className="font-semibold text-blue-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {/* 선택된 멘티 헤더 */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setSelectedMenteeId(null)}
              className="text-gray-500 hover:text-black text-sm"
            >
              ← 멘티 목록
            </button>
            {selectedMentee && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center">
                  {selectedMentee.profileImage ? (
                    <img src={selectedMentee.profileImage} alt={selectedMentee.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm font-semibold">
                      {selectedMentee.name[0]}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-black">
                    {selectedMentee.nickname ? `${selectedMentee.name} (${selectedMentee.nickname})` : selectedMentee.name}
                  </p>
                  <p className="text-xs text-gray-400">{selectedMentee.grade || '미설정'}</p>
                </div>
              </div>
            )}
          </div>

          {/* 탭 */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              월간 총평
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'weekly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              주간 총평
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              멘티 통계
            </button>
          </div>

          {/* 탭 콘텐츠 */}
          {activeTab === 'monthly' ? (
            <MonthlyFeedbackForm menteeId={selectedMenteeId} />
          ) : activeTab === 'weekly' ? (
            <WeeklyFeedbackForm menteeId={selectedMenteeId} />
          ) : (
            <MentorDashboard menteeId={selectedMenteeId} />
          )}
        </>
      )}
    </div>
  );
}
