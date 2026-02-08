'use client';
import Image from 'next/image';

export interface WeeklyRankingItem {
  menteeId: string;
  menteeName: string;
  profileImage: string | null;
  totalStudyTime: number; // 분 단위
  completedTasks: number;
  rank: number;
}

interface WeeklyRankingProps {
  rankings: WeeklyRankingItem[];
  myMenteeId?: string;
  variant?: 'default' | 'plain';
}

// 시간을 "N시간 M분" 형식으로 변환
const formatStudyTime = (minutes: number): string => {
  if (minutes === 0) return '0분';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
};

// 순위별 메달 아이콘
const getRankIcon = (rank: number): string | null => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
};

export default function WeeklyRanking({ rankings, myMenteeId, variant = 'default' }: WeeklyRankingProps) {
  // 최대 학습 시간 계산 (바 차트 정규화용)
  const maxStudyTime = rankings.length > 0
    ? Math.max(...rankings.map((r) => r.totalStudyTime))
    : 0;

  if (rankings.length === 0) {
    return (
      <div className={`w-full bg-white rounded-3xl p-12 text-center ${variant === 'default' ? 'border border-gray-50 shadow-sm' : ''}`}>
        <div className="text-gray-200 text-5xl mb-4">📈</div>
        <div className="text-gray-600 font-bold">
          아직 랭킹 데이터가 없습니다
        </div>
        <div className="text-gray-400 text-xs mt-2">
          이번 주 학습을 시작하면 랭킹이 표시됩니다
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full bg-white overflow-hidden ${variant === 'default' ? 'rounded-3xl border border-gray-50 shadow-sm' : ''}`}>
      {/* 헤더 - variant가 default일 때만 표시 */}
      {variant === 'default' && (
        <div className="px-6 py-5 bg-gray-50/50 border-b border-gray-50">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <span>📈</span>
            <span>이번 주 학습 랭킹</span>
          </h3>
          <p className="text-[11px] text-gray-400 mt-1 font-medium">
            함께 공부하는 친구들의 학습 시간 순위입니다
          </p>
        </div>
      )}

      {/* 랭킹 리스트 */}
      <div className="divide-y divide-gray-50">
        {rankings.map((item) => {
          const isMe = item.menteeId === myMenteeId;
          const rankIcon = getRankIcon(item.rank);
          const barWidth = maxStudyTime > 0
            ? (item.totalStudyTime / maxStudyTime) * 100
            : 0;

          return (
            <div
              key={item.menteeId}
              className={`px-6 py-5 transition-all ${
                isMe ? 'bg-blue-50/50' : 'hover:bg-gray-50/30'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* 순위 */}
                <div className="flex-shrink-0 w-10 flex items-center justify-center">
                  {rankIcon ? (
                    <span className="text-2xl" role="img" aria-label={`${item.rank}위`}>
                      {rankIcon}
                    </span>
                  ) : (
                    <span className="text-base font-black text-gray-300">
                      {item.rank}
                    </span>
                  )}
                </div>

                {/* 프로필 이미지 */}
                <div className="flex-shrink-0">
                  {item.profileImage ? (
                    <Image
                      src={item.profileImage}
                      alt={item.menteeName}
                      width={44}
                      height={44}
                      className="w-11 h-11 rounded-2xl object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-500 font-black text-base border-2 border-white shadow-sm">
                      {item.menteeName.charAt(0)}
                    </div>
                  )}
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  {/* 이름과 배지 */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-bold text-sm ${isMe ? 'text-blue-600' : 'text-gray-800'}`}>
                      {item.menteeName}
                    </span>
                    {isMe && (
                      <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-black rounded-lg uppercase">
                        Me
                      </span>
                    )}
                  </div>

                  {/* 학습 시간 바 */}
                  <div className="mb-2">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          isMe
                            ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]'
                            : 'bg-gray-200'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* 통계 */}
                  <div className="flex items-center gap-4 text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">⏱️</span>
                      <span className={`font-bold ${isMe ? 'text-blue-500' : 'text-gray-500'}`}>
                        {formatStudyTime(item.totalStudyTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">✅</span>
                      <span className={`font-bold ${isMe ? 'text-blue-500' : 'text-gray-500'}`}>
                        과제 {item.completedTasks}개
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 푸터 정보 */}
      <div className="px-6 py-3 bg-gray-50/30 border-t border-gray-50">
        <p className="text-[9px] text-gray-300 font-bold text-center uppercase tracking-wider">
          Reset every Monday 00:00
        </p>
      </div>
    </div>
  );
}