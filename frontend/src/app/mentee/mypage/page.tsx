'use client';
import { getApiUrl } from '@/lib/api';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH';

interface SubjectStats {
  total: number;
  completed: number;
}

interface Stats {
  KOREAN: SubjectStats;
  ENGLISH: SubjectStats;
  MATH: SubjectStats;
}

interface User {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  role: string;
  grade?: string;
  profileImage?: string;
}

const SUBJECT_LABELS: Record<Subject, { label: string; color: string; bgColor: string }> = {
  KOREAN: {
    label: '국어',
    color: 'text-blue-600',
    bgColor: 'bg-blue-600'
  },
  ENGLISH: {
    label: '영어',
    color: 'text-green-600',
    bgColor: 'bg-green-600'
  },
  MATH: {
    label: '수학',
    color: 'text-purple-600',
    bgColor: 'bg-purple-600'
  },
};

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 설정 모달 상태
  const [showSettings, setShowSettings] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // 프로필 편집 상태
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editProfileImage, setEditProfileImage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // 비밀번호 변경 상태
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 통계 조회
  const fetchStats = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/mentee/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('통계를 불러오는데 실패했습니다.');
      }

      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Stats error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 프로필 업데이트
  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }

    setIsUpdating(true);

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/auth/update-profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nickname: editName,
          grade: editGrade || null,
          profileImage: editProfileImage || null,
        }),
      });

      if (!res.ok) {
        throw new Error('프로필 업데이트에 실패했습니다.');
      }

      const data = await res.json();
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      setShowProfileModal(false);
      alert('프로필이 업데이트되었습니다.');
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 비밀번호 변경
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPassword.length < 6) {
      alert('새 비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/auth/change-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '비밀번호 변경에 실패했습니다.');
      }

      alert('비밀번호가 변경되었습니다.');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // 달성률 계산
  const calculateProgress = (completed: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  // 전체 달성률 계산
  const calculateOverallProgress = (): number => {
    if (!stats) return 0;

    const totalTasks = stats.KOREAN.total + stats.ENGLISH.total + stats.MATH.total;
    const completedTasks = stats.KOREAN.completed + stats.ENGLISH.completed + stats.MATH.completed;

    if (totalTasks === 0) return 0;
    return Math.round((completedTasks / totalTasks) * 100);
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      setEditName(userData.nickname || '');
      setEditProfileImage(userData.profileImage || '');
    }
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-center text-gray-900">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => router.back()} className="text-xl sm:text-2xl">
              ←
            </button>
            <h1 className="text-base sm:text-lg md:text-xl font-bold">마이페이지</h1>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xl sm:text-2xl"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* 프로필 카드 */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="px-4 sm:px-6 md:px-8 py-5 sm:py-6 text-white">
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
          {user?.profileImage ? (
            <img
              src={user.profileImage}
              alt="프로필"
              className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full object-cover bg-white/20"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-white/20 flex items-center justify-center text-xl sm:text-2xl md:text-3xl font-bold">
              {user?.nickname?.[0] || user?.name?.[0] || '학'}
            </div>
          )}
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold">
              {user?.nickname || user?.name || '멘티'}
              {user?.nickname && user?.name && <span className="text-sm sm:text-base font-normal">({user.name})</span>}
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm">{user?.email}</p>
          </div>
        </div>

        {/* 전체 달성률 */}
        <div className="bg-white/10 rounded-lg p-3 sm:p-4 md:p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm">전체 달성률</span>
            <span className="text-xl sm:text-2xl md:text-3xl font-bold">{calculateOverallProgress()}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2.5 sm:h-3 overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${calculateOverallProgress()}%` }}
            />
          </div>
          {stats && (
            <div className="mt-2 sm:mt-3 flex items-center justify-between text-xs sm:text-sm text-blue-100">
              <span>
                완료: {stats.KOREAN.completed + stats.ENGLISH.completed + stats.MATH.completed}개
              </span>
              <span>
                전체: {stats.KOREAN.total + stats.ENGLISH.total + stats.MATH.total}개
              </span>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* 설정 메뉴 */}
      {showSettings && (
        <div className="bg-white border-b">
          <div className="p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">설정</h3>
          <div className="space-y-2">
            <button
              onClick={() => {
                setEditName(user?.nickname || '');
                setEditGrade(user?.grade || '');
                setEditProfileImage(user?.profileImage || '');
                setShowProfileModal(true);
                setShowSettings(false);
              }}
              className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              ✏️ 프로필 편집
            </button>
            <button
              onClick={() => {
                setShowPasswordModal(true);
                setShowSettings(false);
              }}
              className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              🔒 비밀번호 변경
            </button>
          </div>
          </div>
        </div>
      )}

      {/* 계정 정보 */}
      <div className="bg-white mb-2">
        <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5">
        <h3 className="text-sm sm:text-base font-bold text-gray-700 mb-3">계정 정보</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-900 mb-1">아이디 (변경 불가)</p>
            <p className="text-sm font-medium text-gray-800">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-900 mb-1">이름 (변경 불가)</p>
            <p className="text-sm font-medium text-gray-800">{user?.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-900 mb-1">닉네임</p>
            <p className="text-sm font-medium text-gray-800">{user?.nickname || '미설정'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-900 mb-1">학년</p>
            <p className="text-sm font-medium text-gray-800">{user?.grade || '미설정'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-900 mb-1">역할</p>
            <p className="text-sm font-medium text-gray-800">
              {user?.role === 'MENTEE' ? '멘티' : user?.role === 'MENTOR' ? '멘토' : '관리자'}
            </p>
          </div>
        </div>
        </div>
      </div>

      {/* 과목별 달성률 */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5">
        <h3 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4">과목별 달성률</h3>

        <div className="space-y-3 sm:space-y-4">
          {(Object.keys(SUBJECT_LABELS) as Subject[]).map((subject) => {
            const subjectStats = stats?.[subject] || { total: 0, completed: 0 };
            const progress = calculateProgress(subjectStats.completed, subjectStats.total);

            return (
              <div key={subject} className="bg-white rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${SUBJECT_LABELS[subject as Subject]?.bgColor || 'bg-gray-600'}`} />
                    <span className="font-semibold">{SUBJECT_LABELS[subject as Subject]?.label || subject}</span>
                  </div>
                  <span className={`text-xl font-bold ${SUBJECT_LABELS[subject as Subject]?.color || 'text-gray-600'}`}>
                    {progress}%
                  </span>
                </div>

                {/* 프로그레스 바 */}
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${SUBJECT_LABELS[subject as Subject]?.bgColor || 'bg-gray-600'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* 상세 정보 */}
                <div className="flex items-center justify-between text-sm text-gray-900">
                  <span>완료: {subjectStats.completed}개</span>
                  <span>전체: {subjectStats.total}개</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 통계 요약 카드 */}
      {stats && (
        <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg p-4 border text-center">
              <p className="text-xs text-gray-900 mb-1">총 할 일</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.KOREAN.total + stats.ENGLISH.total + stats.MATH.total}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border text-center">
              <p className="text-xs text-gray-900 mb-1">완료</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.KOREAN.completed + stats.ENGLISH.completed + stats.MATH.completed}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border text-center">
              <p className="text-xs text-gray-900 mb-1">미완료</p>
              <p className="text-2xl font-bold text-orange-600">
                {(stats.KOREAN.total - stats.KOREAN.completed) +
                  (stats.ENGLISH.total - stats.ENGLISH.completed) +
                  (stats.MATH.total - stats.MATH.completed)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 월 리포트 버튼 */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5">
        <button
          onClick={() => router.push('/mentee/reports/monthly')}
          className="block w-full py-3 sm:py-4 md:py-5 bg-gradient-to-r from-green-500 to-blue-500 text-white text-center rounded-lg text-sm sm:text-base font-bold shadow-lg hover:shadow-xl transition-shadow"
        >
          📊 월간 리포트 보기
        </button>
        <p className="text-xs sm:text-sm text-gray-900 text-center mt-2">
          한 달 동안의 학습 통계를 확인하세요
        </p>
      </div>

      {/* 상담받아보기 버튼 */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5">
        <a
          href="https://forms.gle/FchKdDcm23JdGHpK9"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 sm:py-4 md:py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center rounded-lg text-sm sm:text-base font-bold shadow-lg hover:shadow-xl transition-shadow"
        >
          📞 1:1 상담받아보기
        </a>
        <p className="text-xs sm:text-sm text-gray-900 text-center mt-2">
          설스터디 전문 멘토와 무료 상담을 받아보세요
        </p>
      </div>

      {/* 프로필 편집 모달 */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">프로필 편집</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">닉네임</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="닉네임 입력"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">학년</label>
                <select
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">미설정</option>
                  <option value="고1">고1</option>
                  <option value="고2">고2</option>
                  <option value="고3">고3</option>
                  <option value="재수생">재수생</option>
                  <option value="N수생">N수생</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">프로필 이미지 URL (선택)</label>
                <input
                  type="text"
                  value={editProfileImage}
                  onChange={(e) => setEditProfileImage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="이미지 URL 입력"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowProfileModal(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleUpdateProfile}
                disabled={isUpdating}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isUpdating ? '업데이트 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 변경 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">비밀번호 변경</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">현재 비밀번호</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="현재 비밀번호"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">새 비밀번호</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="새 비밀번호 (6자 이상)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">새 비밀번호 확인</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="새 비밀번호 확인"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isChangingPassword ? '변경 중...' : '변경'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하단 여백 */}
      <div className="h-4" />
    </div>
  );
}
