'use client';
import { getApiUrl } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Mentee {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  profileImage?: string;
  totalTasks: number;
  completedTasks: number;
}

export default function FeedbackDashboard() {
  const router = useRouter();
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMentees = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${getApiUrl()}/api/mentor/mentees`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch mentees');
        const data = await res.json();
        setMentees(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMentees();
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 font-['Pretendard']">피드백 관리</h1>
        <p className="text-gray-600">피드백을 작성할 멘티를 선택하세요.</p>
      </div>

      {isLoading ? (
        <p>로딩 중...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mentees.map((mentee) => (
            <div
              key={mentee.id}
              onClick={() => router.push(`/mentor/mentees/${mentee.id}`)}
              className="bg-white p-6 rounded-xl border hover:shadow-lg transition-shadow cursor-pointer flex items-center gap-4"
            >
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-xl font-bold text-gray-500">
                {mentee.name[0]}
              </div>
              <div>
                <h3 className="text-xl font-semibold">{mentee.name}</h3>
                <p className="text-gray-500 text-sm">{mentee.email}</p>
                <div className="mt-2 text-sm text-blue-600 font-medium">
                  과제 관리 및 피드백 작성하러 가기 &rarr;
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
