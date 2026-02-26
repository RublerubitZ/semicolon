'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl, apiGet, apiPatch, fetchWithAuth } from '@/lib/api';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { FiLogOut, FiEdit3 } from 'react-icons/fi';
import { HiOutlineAcademicCap, HiOutlineFlag } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import { SUBJECT_LABELS, Subject, DEFAULT_SUBJECT_VALUES, getSubjectStyles, getSubjectLabel } from '@/constants/subjects';
import { useOverlayStore } from '@/stores/useOverlayStore';
import { toast } from '@/stores/useToastStore';
import StreakBadge from './streak/StreakBadge';
import { Z_INDEX } from '@/constants/zIndex';

const GRADE_OPTIONS = ['고1', '고2', '고3', '재수생', 'N수생'];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  grade?: string;
  profileImage?: string;
  gender?: string;
  birthDate?: string;
  goal?: string;
  targetSchool?: string;
  phone?: string;
  subjects?: string[];
  mentorName?: string;
}

interface SubjectStats {
  total: number;
  completed: number;
}

interface Stats {
  KOREAN: SubjectStats;
  ENGLISH: SubjectStats;
  MATH: SubjectStats;
}

interface MyPageOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MyPageOverlay({ isOpen, onClose }: MyPageOverlayProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setOverlay } = useOverlayStore();

  useEffect(() => {
    setOverlay('mypage', isOpen);
  }, [isOpen, setOverlay]);

  // 오버레이 상태
  const [activeOverlay, setActiveOverlay] = useState<'profile' | 'password' | 'notifications' | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // 프로필 편집 상태
  const [editData, setEditData] = useState({
    grade: '',
    profileImage: '',
    gender: '',
    birthDate: '',
    goal: '',
    targetSchool: '',
    phone: '',
  });

  const [isUpdating, setIsUpdating] = useState(false);

  // 비밀번호 변경 상태
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 알림 설정 상태
  const [notificationSettings, setNotificationSettings] = useState({
    notifyTaskIncomplete: true,
    notifyNewFeedback: true,
    notifyReminder: true,
    notifyNewTask: true,
    notifyTaskSubmitted: true,
    notifyTaskApproved: true,
    notifyStreakBroken: true,
  });
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);

  // 스트릭 및 통계 상태
  const [streakData, setStreakData] = useState<{ currentStreak: number; longestStreak: number } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const fetchData = async () => {
    setIsLoadingStats(true);
    try {
      const [streakRes, statsRes, notifRes] = await Promise.all([
        apiGet('/api/mentee/streak'),
        apiGet('/api/mentee/stats'),
        apiGet('/api/mentee/notification-settings')
      ]);

      if (streakRes.ok) setStreakData(await streakRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (notifRes.ok) setNotificationSettings(await notifRes.json());
    } catch (err) {
      console.error('Fetch statistics error:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // 데이터 초기화 - API에서 프로필 조회
  useEffect(() => {
    if (isOpen) {
      const init = async () => {
        setIsLoading(true);
        try {
          const res = await apiGet('/api/auth/profile');
          if (res.ok) {
            const data = await res.json();
            const u = data.user;
            setUser(u);
            setEditData({
              grade: u.grade || '',
              profileImage: u.profileImage || '',
              gender: u.gender || '',
              birthDate: u.birthDate || '',
              goal: u.goal || '',
              targetSchool: u.targetSchool || '',
              phone: u.phone || '',
            });
            
            if (u.role === 'MENTEE') {
              fetchData();
            }
          }
        } catch (err) {
          console.error('Profile init error:', err);
        }
        setIsLoading(false);
      };
      init();
    }
  }, [isOpen]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
    onClose();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setIsUpdating(true);
      const res = await fetchWithAuth(`${getApiUrl()}/api/upload/image`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('이미지 업로드 실패');

      const data = await res.json();
      setEditData({ ...editData, profileImage: data.url });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      const res = await apiPatch('/api/auth/update-profile', editData);
      if (!res.ok) throw new Error('프로필 업데이트 실패');
      const data = await res.json();
      
      const updatedUser = { ...user, ...data.user };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setActiveOverlay(null);
      toast.success('프로필이 업데이트되었습니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast.warning('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await apiPatch('/api/auth/change-password', {
        currentPassword: passwordData.current,
        newPassword: passwordData.new,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '비밀번호 변경 실패');
      }
      toast.success('비밀번호가 변경되었습니다.');
      setActiveOverlay(null);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdateNotifications = async () => {
    setIsUpdatingNotifications(true);
    try {
      const res = await apiPatch('/api/mentee/notification-settings', notificationSettings);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '알림 설정 업데이트 실패');
      }
      toast.success('알림 설정이 저장되었습니다.');
      setActiveOverlay(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex justify-center md:justify-end items-center md:items-start md:pt-20 md:pr-10 pointer-events-none" style={{ zIndex: Z_INDEX.MYPAGE_BACKDROP }}>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="hidden md:block fixed inset-0 bg-black/20 pointer-events-auto" 
          />
          
          <motion.div 
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full h-full md:w-[384px] md:h-[852px] md:max-h-[90vh] bg-white relative flex flex-col shadow-2xl md:rounded-[32px] overflow-hidden pointer-events-auto font-['Pretendard']"
          >
            <div className="w-full h-20 px-6 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-50 flex-shrink-0">
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-start text-zinc-800 hover:bg-gray-50 rounded-full transition-colors">
                <IoIosArrowBack size={24} />
              </button>
              <h1 className="text-slate-800 text-xl font-bold">마이페이지</h1>
              <div className="w-10 h-10" />
            </div>

            <div className="flex-1 overflow-y-auto pb-20">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-gray-400">데이터 로딩 중...</div>
              ) : (
                <>
                  <div className="px-6 py-8 flex flex-col items-center">
                    <div className="w-24 h-24 bg-gray-50 rounded-full shadow-[inset_0px_0px_4px_0px_rgba(0,0,0,0.05)] overflow-hidden mb-5 border-4 border-white">
                      {user?.profileImage ? (
                        <img src={user.profileImage} alt="프로필" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-zinc-200 flex items-center justify-center text-white text-3xl font-bold">
                          {user?.name?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-slate-800 mb-1">{user?.name}</h2>
                      <p className="text-sm text-gray-400 font-medium">{user?.email}</p>
                    </div>
                    
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      <div className="px-3 py-1.5 bg-gray-50 rounded-full flex items-center gap-1.5">
                        <HiOutlineAcademicCap className="text-gray-400" size={14} />
                        <span className="text-xs text-slate-600 font-bold">{user?.grade || '학년 미설정'}</span>
                      </div>
                      <div className="px-3 py-1.5 bg-gray-50 rounded-full flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 rounded-full bg-blue-400 flex items-center justify-center text-[8px] text-white font-bold">M</div>
                        <span className="text-xs text-slate-600 font-bold">{user?.mentorName ? `${user.mentorName} 멘토` : '멘토 없음'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-gray-50"></div>

                  {/* 학습 통계 섹션 */}
                  {user?.role === 'MENTEE' && (
                    <div className="px-6 py-8">
                      <h3 className="text-slate-800 text-base font-semibold mb-6">나의 학습 기록</h3>
                      
                      {isLoadingStats ? (
                        <div className="py-10 text-center text-gray-400 text-sm">통계 데이터 로딩 중...</div>
                      ) : (
                        <div className="space-y-6">
                          {/* 스트릭 카드 */}
                          <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
                            {streakData ? (
                              <StreakBadge
                                currentStreak={streakData.currentStreak}
                                longestStreak={streakData.longestStreak}
                                variant="full"
                              />
                            ) : (
                              <div className="p-10 text-center text-gray-300">스트릭 기록이 없습니다.</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="w-full h-2 bg-gray-50"></div>

                  <div className="px-6 py-8">
                    <h3 className="text-slate-800 text-base font-semibold mb-4">계정 설정</h3>
                    <div className="space-y-1">
                      <MenuButton label="프로필 수정" onClick={() => setActiveOverlay('profile')} />
                      <MenuButton label="비밀번호 변경" onClick={() => setActiveOverlay('password')} />
                      <MenuButton label="푸시 알림 설정" onClick={() => setActiveOverlay('notifications')} />
                      <MenuButton label="로그아웃" onClick={() => setIsLogoutModalOpen(true)} isDestructive />
                    </div>
                  </div>
                </>
              )}
            </div>

            <AnimatePresence>
              {activeOverlay && (
                <motion.div 
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="absolute inset-0 bg-white flex flex-col"
                  style={{ zIndex: Z_INDEX.BASE + 19 }}
                >
                  <div className="w-full h-20 px-6 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-50">
                    <button onClick={() => setActiveOverlay(null)} className="w-10 h-10 flex items-center justify-start text-zinc-800 hover:bg-gray-50 rounded-full transition-colors">
                      <IoIosArrowBack size={24} />
                    </button>
                    <h1 className="text-slate-800 text-xl font-bold">
                      {activeOverlay === 'profile' ? '프로필 수정' : activeOverlay === 'password' ? '비밀번호 변경' : '알림 설정'}
                    </h1>
                    <div className="w-10 h-10" />
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {activeOverlay === 'profile' && (
                      <div className="flex flex-col">
                        <div className="flex flex-col items-center py-10">
                          <div className="relative group cursor-pointer" onClick={() => document.getElementById('profile-upload')?.click()}>
                            <div className="w-24 h-24 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center border-4 border-white shadow-md">
                              {editData.profileImage ? (
                                <img src={editData.profileImage} alt="미리보기" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-zinc-300 flex items-center justify-center text-white text-3xl font-bold">
                                  {user?.name?.[0]}
                                </div>
                              )}
                            </div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 bg-slate-800 rounded-full border-2 border-white flex items-center justify-center text-white shadow-lg">
                              <FiEdit3 size={14} />
                            </div>
                            <input id="profile-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                          </div>
                        </div>

                        <div className="px-6 space-y-6 pb-32">
                          <div className="space-y-3">
                            <label className="text-gray-400 text-xs font-bold uppercase ml-1">학년</label>
                            <div className="grid grid-cols-3 gap-2">
                              {GRADE_OPTIONS.map((g) => (
                                <button
                                  key={g}
                                  onClick={() => setEditData({...editData, grade: g})}
                                  className={`h-11 rounded-xl text-sm font-bold transition-all ${
                                    editData.grade === g ? 'bg-slate-800 text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                  }`}
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <label className="text-gray-400 text-xs font-bold uppercase ml-1">성별</label>
                            <div className="grid grid-cols-2 gap-2">
                              {['남성', '여성'].map((g) => (
                                <button
                                  key={g}
                                  onClick={() => setEditData({...editData, gender: g})}
                                  className={`h-11 rounded-xl text-sm font-bold transition-all ${
                                    editData.gender === g ? 'bg-slate-800 text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                  }`}
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                          </div>
                          <EditField label="나의 목표" value={editData.goal} onChange={(val) => setEditData({...editData, goal: val})} placeholder="예: 수능 만점!" />
                          <EditField label="목표 학교" value={editData.targetSchool} onChange={(val) => setEditData({...editData, targetSchool: val})} placeholder="예: 서울대학교" />
                          <EditField label="연락처" value={editData.phone} onChange={(val) => setEditData({...editData, phone: val})} placeholder="010-0000-0000" />
                        </div>
                      </div>
                    )}
                    
                    {activeOverlay === 'password' && (
                      <div className="px-6 py-8 space-y-6">
                        <EditField label="현재 비밀번호" value={passwordData.current} onChange={(val) => setPasswordData({...passwordData, current: val})} type="password" />
                        <EditField label="새 비밀번호" value={passwordData.new} onChange={(val) => setPasswordData({...passwordData, new: val})} type="password" placeholder="6자 이상 입력" />
                        <EditField label="비밀번호 확인" value={passwordData.confirm} onChange={(val) => setPasswordData({...passwordData, confirm: val})} type="password" />
                      </div>
                    )}

                    {activeOverlay === 'notifications' && (
                      <div className="px-6 py-8 space-y-4">
                        <div className="mb-4">
                          <h3 className="text-sm font-bold text-gray-500 mb-2">📋 과제 관련</h3>
                          <div className="space-y-3">
                            <ToggleField
                              label="과제 미완료 알림"
                              description="저녁 9시에 미완료 과제 알림"
                              checked={notificationSettings.notifyTaskIncomplete}
                              onChange={(val) => setNotificationSettings({...notificationSettings, notifyTaskIncomplete: val})}
                            />
                            <ToggleField
                              label="새로운 과제 등록"
                              description="멘토가 과제를 등록했을 때"
                              checked={notificationSettings.notifyNewTask}
                              onChange={(val) => setNotificationSettings({...notificationSettings, notifyNewTask: val})}
                            />
                            <ToggleField
                              label="과제 승인 알림"
                              description="멘토가 과제를 승인했을 때"
                              checked={notificationSettings.notifyTaskApproved}
                              onChange={(val) => setNotificationSettings({...notificationSettings, notifyTaskApproved: val})}
                            />
                            <ToggleField
                              label="과제 제출 알림"
                              description="멘티가 과제를 제출했을 때 (멘토용)"
                              checked={notificationSettings.notifyTaskSubmitted}
                              onChange={(val) => setNotificationSettings({...notificationSettings, notifyTaskSubmitted: val})}
                            />
                          </div>
                        </div>

                        <div className="mb-4">
                          <h3 className="text-sm font-bold text-gray-500 mb-2">💬 피드백 관련</h3>
                          <div className="space-y-3">
                            <ToggleField
                              label="새로운 피드백"
                              description="멘토의 피드백이 등록되었을 때"
                              checked={notificationSettings.notifyNewFeedback}
                              onChange={(val) => setNotificationSettings({...notificationSettings, notifyNewFeedback: val})}
                            />
                          </div>
                        </div>

                        <div className="mb-4">
                          <h3 className="text-sm font-bold text-gray-500 mb-2">⏰ 기타</h3>
                          <div className="space-y-3">
                            <ToggleField
                              label="리마인더"
                              description="오전 9시 오늘의 과제 알림"
                              checked={notificationSettings.notifyReminder}
                              onChange={(val) => setNotificationSettings({...notificationSettings, notifyReminder: val})}
                            />
                            <ToggleField
                              label="스트릭 깨짐 알림"
                              description="학습 스트릭이 끊겼을 때"
                              checked={notificationSettings.notifyStreakBroken}
                              onChange={(val) => setNotificationSettings({...notificationSettings, notifyStreakBroken: val})}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {(activeOverlay === 'profile' || activeOverlay === 'password' || activeOverlay === 'notifications') && (
                    <div className="p-6 bg-white border-t border-gray-50 sticky bottom-0">
                      <button
                        onClick={activeOverlay === 'profile' ? handleUpdateProfile : activeOverlay === 'password' ? handleChangePassword : handleUpdateNotifications}
                        disabled={isUpdating || isChangingPassword || isUpdatingNotifications}
                        className="w-full h-16 bg-slate-800 text-white rounded-2xl font-bold hover:bg-black transition-all disabled:bg-gray-300"
                      >
                        {(isUpdating || isChangingPassword || isUpdatingNotifications) ? '저장 중...' : '변경 사항 저장하기'}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 로그아웃 확인 모달 */}
            <AnimatePresence>
              {isLogoutModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center p-6 pointer-events-none" style={{ zIndex: Z_INDEX.LOGOUT_MODAL_BACKDROP }}>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsLogoutModalOpen(false)}
                    className="absolute inset-0 bg-black/40 pointer-events-auto"
                  />
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-[320px] bg-white rounded-[24px] p-6 shadow-2xl pointer-events-auto overflow-hidden"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                        <FiLogOut className="text-red-500" size={28} />
                      </div>
                      <h3 className="text-zinc-900 text-xl font-bold mb-2">로그아웃 하시겠습니까?</h3>
                      <p className="text-gray-500 text-base font-medium mb-8 leading-relaxed">
                        정말 로그아웃 하시겠습니까? <br />
                        로그인 페이지로 이동합니다.
                      </p>
                      <div className="flex gap-3 w-full">
                        <button 
                          onClick={() => setIsLogoutModalOpen(false)}
                          className="flex-1 h-14 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                          취소
                        </button>
                        <button 
                          onClick={handleLogout}
                          className="flex-1 h-14 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                        >
                          로그아웃
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function MenuButton({ label, onClick, isDestructive }: { label: string; onClick: () => void; isDestructive?: boolean }) {
  return (
    <button onClick={onClick} className="w-full h-14 flex items-center justify-between group active:bg-gray-50 px-2 rounded-xl transition-colors">
      <span className={`text-lg font-medium ${isDestructive ? 'text-red-500' : 'text-slate-700'}`}>{label}</span>
      <IoIosArrowForward className={`${isDestructive ? 'text-red-300' : 'text-gray-300'} group-hover:translate-x-1 transition-transform`} size={18} />
    </button>
  );
}

function EditField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (val: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-gray-400 text-xs font-bold uppercase ml-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-14 px-5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 transition-all font-bold text-slate-800"
      />
    </div>
  );
}

function ToggleField({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div className="flex-1">
        <p className="text-slate-800 font-bold text-sm">{label}</p>
        <p className="text-gray-500 text-xs mt-1">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full transition-colors ${
          checked ? 'bg-blue-500' : 'bg-gray-300'
        }`}
      >
        <div
          className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
