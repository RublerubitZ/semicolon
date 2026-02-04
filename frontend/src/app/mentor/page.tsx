'use client';
import { getApiUrl } from '@/lib/api';
import NotificationBell from '@/components/NotificationBell';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

export default function MentorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  const fetchMentees = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/mentor/mentees`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('멘티 목록을 불러오는데 실패했습니다.');
      }

      const data = await res.json();
      setMentees(data);
    } catch (err) {
      console.error('Fetch mentees error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
    fetchMentees();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 md:mb-[60px] flex justify-between items-start">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-black mb-2 font-['Pretendard']">멘티관리</h1>
          <p className="text-xl md:text-2xl font-medium text-black font-['Pretendard']">
            {user?.name || '멘토'}님의 담당 멘티
          </p>
        </div>
        <NotificationBell />
      </div>

      {/* Mentee List Grid */}
      {isLoading ? (
        <p className="text-gray-500">로딩 중...</p>
      ) : mentees.length === 0 ? (
        <p className="text-gray-500">담당 멘티가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentees.map((mentee, index) => {
            const progress = mentee.totalTasks > 0
              ? Math.round((mentee.completedTasks / mentee.totalTasks) * 100)
              : 0;
            const incomplete = mentee.totalTasks - mentee.completedTasks;

            // Get grade from database
            const grade = mentee.grade || '미설정';

            // Status Logic: < 80% is 'Warning', else 'Good'
            const isWarning = progress < 80;

            // Name display logic: Name (Nickname)
            const displayName = mentee.nickname ? `${mentee.name} (${mentee.nickname})` : mentee.name;

            return (
              <div 
                key={mentee.id}
                onClick={() => router.push(`/mentor/mentees/${mentee.id}`)}
                className="w-full bg-white rounded-[10px] p-6 md:p-8 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-lg transition-shadow border border-transparent hover:border-gray-200 min-h-[256px] relative flex flex-col justify-between"
              >
                <div>
                  {/* Header: Avatar + Status Badge */}
                  <div className="flex justify-between items-start mb-6">
                    {/* Avatar Placeholder */}
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-200 rounded-[10px] overflow-hidden flex items-center justify-center">
                      {mentee.profileImage ? (
                        <img src={mentee.profileImage} alt={mentee.name} className="w-full h-full object-cover" />
                      ) : (
                        // Default Placeholder (User Icon SVG)
                         <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 md:w-10 md:h-10">
                              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                            </svg>
                         </div>
                      )}
                    </div>
                    
                    {/* Status Badge */}
                    {isWarning ? (
                      <div className="px-2.5 py-1.5 bg-pink-100 rounded-lg border border-pink-200/30 flex items-center justify-center">
                          <span className="text-pink-500 text-sm font-medium font-['Pretendard']">관리 필요</span>
                      </div>
                    ) : (
                      <div className="px-2.5 py-1.5 bg-sky-200 rounded-lg border border-blue-200 flex items-center justify-center">
                          <span className="text-blue-400 text-sm font-medium font-['Pretendard']">양호</span>
                      </div>
                    )}
                  </div>

                  {/* Name Info */}
                  <div className="mb-6">
                      <div className="flex flex-col md:flex-row md:items-end gap-1 md:gap-2 mb-1">
                          {/* Use break-words or similar to handle long names, but 'flex-col' on mobile already stacks them if needed. 
                              The user complained about '2 lines' for name/nickname. 
                              'whitespace-nowrap' prevents wrapping. 'truncate' handles overflow.
                          */}
                          <span className="text-xl font-semibold text-black font-['Pretendard'] whitespace-nowrap overflow-hidden text-ellipsis">{displayName}</span>
                          <div className="flex items-center gap-1 mb-1">
                              <span className="text-xs font-medium text-gray-400 font-['Pretendard']">{grade}</span>
                              {/* Removed target university info */}
                          </div>
                      </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-medium text-gray-500 font-['Pretendard']">주간 목표 이행률</span>
                          <span className="text-[10px] font-medium text-sky-950 font-['Pretendard']">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                              className="bg-gray-500 h-1.5 rounded-full" 
                              style={{ width: `${progress}%` }} 
                          />
                      </div>
                  </div>
                </div>

                {/* Bottom Stats (Incomplete Tasks) */}
                <div className="flex justify-between items-center mt-auto pt-4 md:pt-0">
                     <span className="text-xs font-medium text-gray-500 font-['Pretendard']">미완료 과제</span>
                     <span className={`text-xs font-medium font-['Pretendard'] ${incomplete > 0 ? 'text-pink-500' : 'text-gray-500'}`}>
                        {incomplete}
                     </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
