'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { FiLogOut, FiEdit3 } from 'react-icons/fi';
import { HiOutlineAcademicCap, HiOutlineFlag } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  role: string;
  grade?: string;
  profileImage?: string;
  gender?: string;
  birthDate?: string;
  goal?: string;
  phone?: string;
  subjects?: string[];
  mentorName?: string;
}

interface MyPageOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MyPageOverlay({ isOpen, onClose }: MyPageOverlayProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 오버레이 상태
  const [activeOverlay, setActiveOverlay] = useState<'profile' | 'password' | 'notifications' | null>(null);

  // 프로필 편집 상태
  const [editData, setEditData] = useState({
    nickname: '',
    grade: '',
    profileImage: '',
    gender: '',
    birthDate: '',
    goal: '',
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

  // 데이터 초기화 - API에서 프로필 조회
  useEffect(() => {
    if (isOpen) {
      const init = async () => {
        setIsLoading(true);
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${getApiUrl()}/api/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            const u = data.user;
            setUser(u);
            setEditData({
              nickname: u.nickname || '',
              grade: u.grade || '',
              profileImage: u.profileImage || '',
              gender: u.gender || '',
              birthDate: u.birthDate || '',
              goal: u.goal || '',
              phone: u.phone || '',
            });
          } else {
            // API 실패 시 localStorage 폴백
            const userStr = localStorage.getItem('user');
            if (userStr) {
              const userData = JSON.parse(userStr);
              setUser(userData);
              setEditData({
                nickname: userData.nickname || '',
                grade: userData.grade || '',
                profileImage: userData.profileImage || '',
                gender: userData.gender || '',
                birthDate: userData.birthDate || '',
                goal: userData.goal || '',
                phone: userData.phone || '',
              });
            }
          }
        } catch {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const userData = JSON.parse(userStr);
            setUser(userData);
            setEditData({
              nickname: userData.nickname || '',
              grade: userData.grade || '',
              profileImage: userData.profileImage || '',
              gender: userData.gender || '',
              birthDate: userData.birthDate || '',
              goal: userData.goal || '',
              phone: userData.phone || '',
            });
          }
        }
        setIsLoading(false);
      };
      init();
    }
  }, [isOpen]);

  const handleLogout = () => {
    if (confirm('정말 로그아웃 하시겠습니까?')) {
      localStorage.clear();
      router.push('/login');
      onClose();
    }
  };

  const handleUpdateProfile = async () => {
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
          nickname: editData.nickname,
          grade: editData.grade,
          profileImage: editData.profileImage,
          gender: editData.gender,
          birthDate: editData.birthDate,
          goal: editData.goal,
          phone: editData.phone,
        }),
      });
      if (!res.ok) throw new Error('프로필 업데이트 실패');
      const data = await res.json();
      const updatedUser = { ...user, ...data.user };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(data.user));
      setActiveOverlay(null);
      alert('프로필이 업데이트되었습니다.');
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      alert('새 비밀번호가 일치하지 않습니다.');
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
          currentPassword: passwordData.current,
          newPassword: passwordData.new,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '비밀번호 변경 실패');
      }
      alert('비밀번호가 변경되었습니다.');
      setActiveOverlay(null);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center md:justify-end items-center md:items-start md:pt-20 md:pr-10 pointer-events-none">
          {/* PC 배경 오버레이 (클릭 시 닫기) */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="hidden md:block fixed inset-0 bg-black/20 pointer-events-auto" 
          />
          
          {/* 메인 팝업 카드 */}
          <motion.div 
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full h-full md:w-[384px] md:h-[852px] md:max-h-[90vh] bg-white relative flex flex-col shadow-2xl md:rounded-[32px] overflow-hidden pointer-events-auto"
          >
            {/* 헤더 */}
            <div className="w-full h-20 px-6 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-50 flex-shrink-0">
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-start text-zinc-800 hover:bg-gray-50 rounded-full transition-colors">
                <IoIosArrowBack size={24} />
              </button>
              <h1 className="text-slate-800 text-xl font-semibold font-['Pretendard']">마이페이지</h1>
              <div className="w-10 h-10" />
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-gray-400">로딩 중...</div>
              ) : (
                <>
                  {/* 프로필 섹션 */}
                  <div className="px-6 pt-6 pb-8 flex flex-col items-start relative">
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-20 h-20 relative shrink-0">
                        <div className="w-full h-full bg-gray-100 rounded-full shadow-[inset_0px_0px_3px_0px_rgba(0,0,0,0.10)] overflow-hidden">
                          {user?.profileImage ? (
                            <img src={user.profileImage} alt="프로필" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-zinc-300 flex items-center justify-center">
                              <span className="text-white text-2xl font-bold">{user?.name?.[0]}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <h2 className="text-black text-2xl font-medium font-['Pretendard'] truncate">
                            {user?.name} 학생
                          </h2>
                          {user?.gender && (
                            <span className="text-gray-400 text-xs font-medium font-['Pretendard']">
                              ({user.gender})
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-3 flex flex-wrap gap-3 items-center">
                          <div className="flex items-center gap-1 text-gray-600 text-xs font-medium font-['Pretendard']">
                            <HiOutlineAcademicCap className="text-gray-400" size={14} />
                            <span>{user?.grade || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600 text-xs font-medium font-['Pretendard']">
                            <HiOutlineFlag className="text-gray-400" size={14} />
                            <span>{user?.subjects?.length ? user.subjects.join(', ') : '-'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600 text-xs font-medium font-['Pretendard']">
                            <div className="w-3.5 h-3.5 rounded-full bg-gray-400 flex items-center justify-center text-[8px] text-white font-bold">M</div>
                            <span>{user?.mentorName ? `${user.mentorName} 멘토` : '-'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full mt-8 h-14 bg-blue-50 rounded-[10px] flex items-center px-4 gap-3">
                      <div className="w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center text-white text-[10px] font-bold">!</div>
                      <p className="text-blue-400 text-base font-medium font-['Pretendard']">
                        오늘의 몰입이 내일의 나를 만든다!
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-gray-50"></div>

                  {/* 계정 설정 섹션 */}
                  <div className="px-6 py-8">
                    <h3 className="text-gray-900 text-xl font-semibold font-['Pretendard'] leading-8 mb-6">계정</h3>
                    
                    <div className="space-y-0">
                      <button 
                        onClick={() => setActiveOverlay('profile')}
                        className="w-full h-[67px] flex items-center justify-between border-b border-gray-100 group active:bg-gray-50 transition-colors"
                      >
                        <span className="text-slate-800 text-lg font-medium font-['Pretendard'] leading-7">프로필 수정</span>
                        <IoIosArrowForward className="text-gray-400 group-hover:text-gray-600 transition-colors" size={20} />
                      </button>
                      
                      <button 
                        onClick={() => setActiveOverlay('password')}
                        className="w-full h-[67px] flex items-center justify-between border-b border-gray-100 group active:bg-gray-50 transition-colors"
                      >
                        <span className="text-slate-800 text-lg font-medium font-['Pretendard'] leading-7">비밀번호 변경</span>
                        <IoIosArrowForward className="text-gray-400 group-hover:text-gray-600 transition-colors" size={20} />
                      </button>
                      
                      <button 
                        onClick={() => setActiveOverlay('notifications')}
                        className="w-full h-[67px] flex items-center justify-between border-b border-gray-100 group active:bg-gray-50 transition-colors"
                      >
                        <span className="text-slate-800 text-lg font-medium font-['Pretendard'] leading-7">푸시 알림 설정</span>
                        <IoIosArrowForward className="text-gray-400 group-hover:text-gray-600 transition-colors" size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 mt-4">
                    <button 
                      onClick={handleLogout}
                      className="w-full h-14 bg-gray-100 rounded-[10px] border border-gray-300 flex items-center justify-center gap-2.5 hover:bg-gray-200 transition-colors active:scale-[0.98]"
                    >
                      <FiLogOut className="text-slate-800" size={20} />
                      <span className="text-slate-800 text-base font-semibold font-['Pretendard']">로그아웃</span>
                    </button>
                  </div>
                  <div className="h-10" />
                </>
              )}
            </div>

            {/* --- 서브 오버레이 레이어 (부모 카드 내부에 띄움) --- */}
            <AnimatePresence>
              {activeOverlay && (
                <motion.div 
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="absolute inset-0 bg-white z-[20] flex flex-col"
                >
                  <div className="w-full h-20 px-6 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-50">
                    <button onClick={() => setActiveOverlay(null)} className="w-10 h-10 flex items-center justify-start text-zinc-800 hover:bg-gray-50 rounded-full transition-colors">
                      <IoIosArrowBack size={24} />
                    </button>
                    <h1 className="text-slate-800 text-xl font-semibold font-['Pretendard']">
                      {activeOverlay === 'profile' ? '프로필 수정' : activeOverlay === 'password' ? '비밀번호 변경' : '알림 설정'}
                    </h1>
                    <div className="w-10 h-10" />
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {activeOverlay === 'profile' && (
                      <div className="flex flex-col">
                        <div className="flex flex-col items-center py-10">
                          <div className="relative">
                            <div className="w-20 h-20 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center">
                              {editData.profileImage ? (
                                <img src={editData.profileImage} alt="미리보기" className="w-full h-full object-cover" />
                              ) : (
                                <div className="size-11 flex items-center justify-center">
                                  <div className="size-9 bg-gray-400 rounded-sm" />
                                </div>
                              )}
                            </div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 bg-slate-800 rounded-full border-[3px] border-white flex items-center justify-center">
                              <FiEdit3 size={12} className="text-white" />
                            </div>
                          </div>
                          <div className="mt-4 flex items-center gap-2.5">
                            <span className="text-center text-black text-xl font-medium font-['Pretendard']">{user?.name}</span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-gray-50"></div>
                        <div className="px-6 py-8 flex flex-col gap-8">
                          <h3 className="text-gray-900 text-xl font-semibold font-['Pretendard'] leading-8">기본정보</h3>
                          <div className="space-y-7">
                            <InfoRow label="이름" value={user?.name || ''} />
                            <InfoRow label="이메일주소" value={user?.email || ''} />
                            <InfoRow label="생년월일" value={editData.birthDate || '-'} onEdit={() => {}} />
                            <InfoRow label="학년" value={editData.grade || '-'} onEdit={() => {}} />
                            <InfoRow label="목표" value={editData.goal || '-'} onEdit={() => {}} />
                            <InfoRow label="휴대폰번호" value={editData.phone || '-'} onEdit={() => {}} />
                          </div>
                        </div>
                      </div>
                    )}

                    {activeOverlay === 'password' && (
                      <div className="px-6 py-8 space-y-6">
                        <div className="space-y-2">
                          <label className="text-gray-600 text-sm font-medium">현재 비밀번호</label>
                          <input type="password" value={passwordData.current} onChange={(e) => setPasswordData({...passwordData, current: e.target.value})} className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="현재 비밀번호 입력" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-gray-600 text-sm font-medium">새 비밀번호</label>
                          <input type="password" value={passwordData.new} onChange={(e) => setPasswordData({...passwordData, new: e.target.value})} className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="새 비밀번호 입력 (6자 이상)" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-gray-600 text-sm font-medium">새 비밀번호 확인</label>
                          <input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})} className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="새 비밀번호 재입력" />
                        </div>
                      </div>
                    )}

                    {activeOverlay === 'notifications' && (
                      <div className="px-6 py-8 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                          <div>
                            <p className="text-slate-800 font-semibold">푸시 알림</p>
                            <p className="text-gray-500 text-sm">새로운 과제 및 피드백 알림을 받습니다.</p>
                          </div>
                          <div className="w-12 h-6 bg-blue-500 rounded-full relative p-1 cursor-pointer">
                            <div className="w-4 h-4 bg-white rounded-full ml-auto" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 하단 저장 버튼 (프로필/비밀번호만) */}
                  {(activeOverlay === 'profile' || activeOverlay === 'password') && (
                    <div className="p-6 mt-auto flex-shrink-0">
                      <button 
                        onClick={activeOverlay === 'profile' ? handleUpdateProfile : handleChangePassword}
                        disabled={isUpdating || isChangingPassword}
                        className="w-full h-14 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                      >
                        {(isUpdating || isChangingPassword) ? '처리 중...' : '저장하기'}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function InfoRow({ label, value, onEdit, isAction }: { label: string; value: string; onEdit?: () => void; isAction?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="w-24 text-gray-400 text-lg font-medium font-['Pretendard'] leading-7">
        {label}
      </div>
      <div className="flex-1 flex items-center justify-between ml-4 min-w-0">
        <span className={`${isAction ? 'text-sky-950' : 'text-slate-800'} text-lg font-normal font-['Pretendard'] leading-7 truncate`}>
          {value}
        </span>
        {onEdit && (
          <button 
            onClick={onEdit}
            className="w-14 h-7 bg-blue-50 rounded-[60px] flex items-center justify-center text-sky-950 text-base font-medium font-['Pretendard'] leading-6 flex-shrink-0 ml-2"
          >
            수정
          </button>
        )}
      </div>
    </div>
  );
}