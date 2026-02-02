'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH';

interface Mentee {
  id: string;
  name: string;
  nickname?: string;
  email: string;
}

interface Worksheet {
  id: string;
  title: string;
  subject: Subject;
}

export default function NewTaskPage() {
  const router = useRouter();
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState({
    menteeId: '',
    title: '',
    description: '',
    subject: 'KOREAN' as Subject,
    date: new Date().toISOString().split('T')[0],
    worksheetId: '',
  });

  // 반복 설정 상태
  const [repeatMode, setRepeatMode] = useState<'single' | 'repeat'>('single');
  const [repeatSettings, setRepeatSettings] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    weekdays: {
      0: false, // 일요일
      1: false, // 월요일
      2: false, // 화요일
      3: false, // 수요일
      4: false, // 목요일
      5: false, // 금요일
      6: false, // 토요일
    },
  });

  // 멘티 목록 가져오기
  const fetchMentees = async () => {
    try {
      const token = localStorage.getItem('token');

      const res = await fetch('http://localhost:4000/api/mentor/mentees', {
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
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  // 학습지 목록 가져오기
  const fetchWorksheets = async (subject?: Subject) => {
    try {
      const token = localStorage.getItem('token');

      const url = subject
        ? `http://localhost:4000/api/mentor/worksheets?subject=${subject}`
        : 'http://localhost:4000/api/mentor/worksheets';

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('학습지 목록을 불러오는데 실패했습니다.');
      }

      const data = await res.json();
      setWorksheets(data);
    } catch (err) {
      console.error('Fetch worksheets error:', err);
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    fetchMentees();
    fetchWorksheets();
  }, []);

  // 과목 변경 시 학습지 필터링
  useEffect(() => {
    fetchWorksheets(formData.subject);
    setFormData((prev) => ({ ...prev, worksheetId: '' }));
  }, [formData.subject]);

  // 반복 날짜 계산
  const calculateRepeatDates = () => {
    const dates: string[] = [];
    const start = new Date(repeatSettings.startDate);
    const end = new Date(repeatSettings.endDate);

    // 선택된 요일 확인
    const selectedWeekdays = Object.entries(repeatSettings.weekdays)
      .filter(([_, selected]) => selected)
      .map(([day, _]) => parseInt(day));

    if (selectedWeekdays.length === 0) {
      return dates;
    }

    // 시작일부터 종료일까지 순회
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (selectedWeekdays.includes(d.getDay())) {
        dates.push(new Date(d).toISOString().split('T')[0]);
      }
    }

    return dates;
  };

  // 할 일 생성
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.menteeId || !formData.title) {
      alert('멘티와 제목을 입력해주세요.');
      return;
    }

    // 반복 모드일 때 요일 선택 확인
    if (repeatMode === 'repeat') {
      const hasSelectedWeekday = Object.values(repeatSettings.weekdays).some((selected) => selected);
      if (!hasSelectedWeekday) {
        alert('최소 하나의 요일을 선택해주세요.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');

      // 날짜 목록 계산
      const dates =
        repeatMode === 'repeat' ? calculateRepeatDates() : [formData.date];

      if (dates.length === 0) {
        alert('선택한 요일에 해당하는 날짜가 없습니다.');
        setIsSubmitting(false);
        return;
      }

      // 각 날짜에 대해 할 일 생성
      for (const dateStr of dates) {
        const res = await fetch('http://localhost:4000/api/mentor/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...formData,
            date: dateStr,
            worksheetId: formData.worksheetId || undefined,
          }),
        });

        if (!res.ok) {
          throw new Error('할 일 생성에 실패했습니다.');
        }
      }

      const successMessage =
        repeatMode === 'repeat'
          ? `${dates.length}개의 할 일이 등록되었습니다.`
          : '할 일이 등록되었습니다.';
      alert(successMessage);
      router.push('/mentor');
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">할 일 등록</h2>
        <p className="text-gray-600">멘티에게 새로운 할 일을 등록합니다</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6 space-y-6">
        {/* 멘티 선택 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            멘티 선택 <span className="text-red-600">*</span>
          </label>
          <select
            value={formData.menteeId}
            onChange={(e) => setFormData({ ...formData, menteeId: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          >
            <option value="">멘티를 선택하세요</option>
            {mentees.map((mentee) => (
              <option key={mentee.id} value={mentee.id}>
                {mentee.nickname || mentee.name} ({mentee.email})
              </option>
            ))}
          </select>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            할 일 제목 <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="예: 비문학 지문 3개 풀기"
            required
          />
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-medium mb-2">설명 (선택)</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-md resize-none"
            rows={3}
            placeholder="할 일에 대한 상세 설명을 입력하세요"
          />
        </div>

        {/* 과목 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            과목 <span className="text-red-600">*</span>
          </label>
          <select
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value as Subject })}
            className="w-full px-3 py-2 border rounded-md"
            required
          >
            <option value="KOREAN">국어</option>
            <option value="ENGLISH">영어</option>
            <option value="MATH">수학</option>
          </select>
        </div>

        {/* 날짜 설정 */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <label className="block text-sm font-medium mb-3">날짜 설정</label>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setRepeatMode('single')}
              className={`flex-1 px-3 py-2 rounded-md text-sm ${
                repeatMode === 'single'
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border'
              }`}
            >
              단일 날짜
            </button>
            <button
              type="button"
              onClick={() => setRepeatMode('repeat')}
              className={`flex-1 px-3 py-2 rounded-md text-sm ${
                repeatMode === 'repeat'
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border'
              }`}
            >
              반복 설정
            </button>
          </div>

          {repeatMode === 'single' ? (
            <div>
              <label className="block text-xs text-gray-600 mb-1">날짜 선택</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-white"
                required
              />
            </div>
          ) : (
            <div className="space-y-3 bg-white rounded-md p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    시작일 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={repeatSettings.startDate}
                    onChange={(e) =>
                      setRepeatSettings({ ...repeatSettings, startDate: e.target.value })
                    }
                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    종료일 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={repeatSettings.endDate}
                    onChange={(e) =>
                      setRepeatSettings({ ...repeatSettings, endDate: e.target.value })
                    }
                    className="w-full px-2 py-1.5 text-sm border rounded-md"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-2">
                  반복 요일 선택 <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() =>
                        setRepeatSettings({
                          ...repeatSettings,
                          weekdays: {
                            ...repeatSettings.weekdays,
                            [index]: !repeatSettings.weekdays[index as keyof typeof repeatSettings.weekdays],
                          },
                        })
                      }
                      className={`py-2 text-xs rounded-md transition-colors ${
                        repeatSettings.weekdays[index as keyof typeof repeatSettings.weekdays]
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 학습지 선택 */}
        <div>
          <label className="block text-sm font-medium mb-2">학습지 (선택)</label>
          <select
            value={formData.worksheetId}
            onChange={(e) => setFormData({ ...formData, worksheetId: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">학습지 없음</option>
            {worksheets
              .filter((ws) => ws.subject === formData.subject)
              .map((worksheet) => (
                <option key={worksheet.id} value={worksheet.id}>
                  {worksheet.title}
                </option>
              ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            선택한 과목({formData.subject === 'KOREAN' ? '국어' : formData.subject === 'ENGLISH' ? '영어' : '수학'})의 학습지만 표시됩니다
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
          >
            {isSubmitting ? '등록 중...' : '등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
