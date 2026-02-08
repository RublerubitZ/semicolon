'use client';
import { getApiUrl } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FILE_LIMITS } from '@/constants/fileLimits';
import { toast } from '@/stores/useToastStore';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH';
type DateMode = 'single' | 'range';
type AssignMode = 'one' | 'all';
type MaterialType = 'PDF' | 'COLUMN';

interface Mentee {
  id: string;
  name: string;
  email: string;
}

interface Worksheet {
  id: string;
  title: string;
  subject: Subject;
  type: 'COLUMN' | 'PDF';
  content: string | null;
  pdfUrl: string | null;
  pdfFileName: string | null;
}

interface Material {
  type: MaterialType;
  order: number;
  pdfUrl?: string;
  pdfFileName?: string; // PDF 원본 파일명
  columnTitle?: string;
  columnContent?: string;
  source?: 'direct' | 'worksheet'; // UI 표시용
  worksheetTitle?: string; // 학습지에서 불러온 경우 학습지 제목
}

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function ToggleChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'h-8 rounded-md px-4 text-[12px] font-semibold transition',
        active
          ? 'border border-blue-300 bg-blue-50 text-blue-700'
          : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function RadioRow({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-left"
    >
      <span
        className={[
          'h-4 w-4 rounded-[4px] border',
          active ? 'border-pink-400 bg-pink-200' : 'border-gray-300 bg-white',
        ].join(' ')}
      />
      <span className="text-[12px] font-semibold text-gray-700">{label}</span>
    </button>
  );
}

function DayCircle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'h-9 w-9 rounded-full text-[12px] font-semibold transition',
        active
          ? 'bg-[#0B2B5B] text-white'
          : 'bg-gray-200 text-gray-500 hover:bg-gray-300',
      ].join(' ')}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

export default function NewTaskPage() {
  const router = useRouter();
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [assignMode, setAssignMode] = useState<AssignMode>('one');
  const [selectedMenteeIds, setSelectedMenteeIds] = useState<string[]>([]);

  const [dateMode, setDateMode] = useState<DateMode>('single');
  const [singleDate, setSingleDate] = useState(todayStr());
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());

  const WEEKDAYS = [
    { key: '월', label: '월' },
    { key: '화', label: '화' },
    { key: '수', label: '수' },
    { key: '목', label: '목' },
    { key: '금', label: '금' },
    { key: '토', label: '토' },
    { key: '일', label: '일' },
  ] as const;

  const [weekdays, setWeekdays] = useState<string[]>([]);

  const [taskName, setTaskName] = useState('');
  const [goal, setGoal] = useState('');

  const [subject, setSubject] = useState<Subject>('KOREAN');

  const [isUploading, setIsUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  // 통합된 materials 배열로 관리
  const [materials, setMaterials] = useState<Material[]>([]);

  function toggleWeekday(d: string) {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function toggleMentee(id: string) {
    setSelectedMenteeIds((prev) => 
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const fetchMentees = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentor/mentees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('멘티 목록을 불러오는데 실패했습니다.');
      const data = await res.json();
      setMentees(data);
    } catch (err) {
      console.error('Fetch mentees error:', err);
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  const fetchWorksheets = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/mentor/worksheets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('학습지 목록을 불러오는데 실패했습니다.');
      const data = await res.json();
      setWorksheets(data);
    } catch (err) {
      console.error('Fetch worksheets error:', err);
    }
  };

  useEffect(() => {
    fetchMentees();
    fetchWorksheets();
  }, []);

  // PDF URL에서 파일명 추출 함수
  const extractFileName = (url: string) => {
    try {
      const decoded = decodeURIComponent(url);
      const parts = decoded.split('/');
      const fileNameWithQuery = parts[parts.length - 1];
      const fileName = fileNameWithQuery.split('?')[0];

      // Cloudinary 형식에서 원본 이름 추출 시도
      const nameParts = fileName.split('_');
      if (nameParts.length >= 2) {
        const extension = fileName.split('.').pop();
        let cleanName = '';

        if (nameParts.length >= 3) {
          cleanName = nameParts.slice(0, nameParts.length - 2).join('_');
        } else {
          cleanName = nameParts.slice(0, nameParts.length - 1).join('_');
        }

        return cleanName ? `${cleanName}.${extension}` : fileName;
      }
      return fileName;
    } catch (e) {
      return '학습 파일.pdf';
    }
  };

  const handleWorksheetSelect = (worksheetId: string) => {
    const worksheet = worksheets.find((w) => w.id === worksheetId);
    if (!worksheet) return;

    const currentCount = materials.length;

    // 학습지 타입에 따라 materials에 추가 (복사 방식)
    if (worksheet.type === 'COLUMN' && worksheet.content) {
      try {
        const parsed = JSON.parse(worksheet.content);
        const columnItems = parsed.topics || [];

        // 5개 초과 방지
        if (currentCount + columnItems.length > FILE_LIMITS.MAX_TASK_MATERIALS) {
          toast.warning(`학습 자료는 최대 ${FILE_LIMITS.MAX_TASK_MATERIALS}개까지 등록 가능합니다. (현재: ${currentCount}개)`);
          return;
        }

        // 칼럼 데이터를 materials에 추가 (복사)
        const newMaterials: Material[] = columnItems.map((topic: any, idx: number) => ({
          type: 'COLUMN',
          order: materials.length + idx,
          columnTitle: topic.title || '',
          columnContent: topic.description || '',
          source: 'worksheet',
          worksheetTitle: worksheet.title,
        }));

        setMaterials([...materials, ...newMaterials]);
      } catch (err) {
        console.error('Content parsing error:', err);
        toast.error('학습지 내용을 불러오는데 실패했습니다.');
        return;
      }
    } else if (worksheet.type === 'PDF' && worksheet.pdfUrl) {
      // 5개 초과 방지
      if (currentCount >= FILE_LIMITS.MAX_TASK_MATERIALS) {
        toast.warning(`학습 자료는 최대 ${FILE_LIMITS.MAX_TASK_MATERIALS}개까지 등록 가능합니다.`);
        return;
      }

      // PDF URL을 materials에 추가 (복사) - 저장된 파일명 우선 사용
      setMaterials([
        ...materials,
        {
          type: 'PDF',
          order: materials.length,
          pdfUrl: worksheet.pdfUrl,
          pdfFileName: worksheet.pdfFileName || extractFileName(worksheet.pdfUrl),
          source: 'worksheet',
          worksheetTitle: worksheet.title,
        },
      ]);
    }

    toast.success(`"${worksheet.title}" 학습지를 불러왔습니다.`);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const pdfFilesArray = Array.from(files).filter((file) => file.type === 'application/pdf');
    if (pdfFilesArray.length === 0) {
      toast.warning('PDF 파일만 업로드 가능합니다.');
      return;
    }

    const currentCount = materials.length;
    if (currentCount + pdfFilesArray.length > FILE_LIMITS.MAX_TASK_MATERIALS) {
      toast.warning(`학습 자료는 최대 ${FILE_LIMITS.MAX_TASK_MATERIALS}개까지 등록 가능합니다. (현재: ${currentCount}개)`);
      return;
    }

    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const uploadedUrls: string[] = [];

      // 다중 PDF 업로드
      if (pdfFilesArray.length > 1) {
        const formData = new FormData();
        pdfFilesArray.forEach((file) => {
          formData.append('pdfs', file);
        });

        const res = await fetch(`${getApiUrl()}/api/upload/pdfs`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) throw new Error('PDF 업로드에 실패했습니다.');
        const data = await res.json();
        uploadedUrls.push(...data.urls);
      } else {
        // 단일 PDF 업로드
        const formData = new FormData();
        formData.append('pdf', pdfFilesArray[0]);

        const res = await fetch(`${getApiUrl()}/api/upload/pdf`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) throw new Error('PDF 업로드에 실패했습니다.');
        const data = await res.json();
        uploadedUrls.push(data.url);
      }

      // materials에 추가 (원본 파일명 포함)
      const newMaterials: Material[] = uploadedUrls.map((url, idx) => ({
        type: 'PDF',
        order: materials.length + idx,
        pdfUrl: url,
        pdfFileName: pdfFilesArray[idx].name, // 원본 파일명 저장
        source: 'direct',
      }));

      setMaterials([...materials, ...newMaterials]);
      toast.success(`${pdfFilesArray.length}개의 PDF가 업로드되었습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'PDF 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const addColumn = () => {
    if (materials.length >= FILE_LIMITS.MAX_TASK_MATERIALS) {
      toast.warning(`학습 자료는 최대 ${FILE_LIMITS.MAX_TASK_MATERIALS}개까지 등록 가능합니다.`);
      return;
    }

    setMaterials([
      ...materials,
      {
        type: 'COLUMN',
        order: materials.length,
        columnTitle: '',
        columnContent: '',
        source: 'direct',
      },
    ]);
  };

  const removeMaterial = (index: number) => {
    const newMaterials = materials.filter((_, i) => i !== index);
    // order 재정렬
    newMaterials.forEach((m, idx) => {
      m.order = idx;
    });
    setMaterials(newMaterials);
  };

  const updateMaterial = (index: number, field: 'columnTitle' | 'columnContent', value: string) => {
    const newMaterials = [...materials];
    newMaterials[index][field] = value;
    setMaterials(newMaterials);
  };

  const calculateRepeatDates = () => {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const weekdayMap: Record<string, number> = {
      일: 0,
      월: 1,
      화: 2,
      수: 3,
      목: 4,
      금: 5,
      토: 6,
    };
    const selectedDays = weekdays.map((d) => weekdayMap[d]);
    if (selectedDays.length === 0) return dates;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (selectedDays.includes(d.getDay())) {
        dates.push(new Date(d).toISOString().split('T')[0]);
      }
    }
    return dates;
  };

  const onSubmit = async () => {
    if (selectedMenteeIds.length === 0 && assignMode !== 'all') {
      toast.warning('멘티를 선택해 주세요.');
      return;
    }
    if (!taskName) {
      toast.warning('과제 이름을 입력해주세요.');
      return;
    }
    if (dateMode === 'range' && weekdays.length === 0) {
      toast.warning('최소 하나의 요일을 선택해주세요.');
      return;
    }

    // 검증: 학습 자료 최소 1개
    if (materials.length === 0) {
      toast.warning('최소 1개의 학습 자료를 등록해주세요.');
      return;
    }

    // 검증: 학습 자료 최대 5개
    if (materials.length > FILE_LIMITS.MAX_TASK_MATERIALS) {
      toast.warning(`학습 자료는 최대 ${FILE_LIMITS.MAX_TASK_MATERIALS}개까지 등록 가능합니다.`);
      return;
    }

    // 빈 칼럼 필터링
    const validMaterials = materials.filter((m) => {
      if (m.type === 'PDF') return m.pdfUrl;
      if (m.type === 'COLUMN') return m.columnTitle || m.columnContent;
      return false;
    });

    if (validMaterials.length === 0) {
      toast.warning('유효한 학습 자료가 없습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const dates = dateMode === 'single' ? [singleDate] : calculateRepeatDates();
      if (dates.length === 0) {
        toast.warning('선택한 요일에 해당하는 날짜가 없습니다.');
        setIsSubmitting(false);
        return;
      }

      const targetMenteeIds = assignMode === 'all' ? mentees.map(m => m.id) : selectedMenteeIds;

      for (const mId of targetMenteeIds) {
        for (const dateStr of dates) {
          const res = await fetch(`${getApiUrl()}/api/mentor/tasks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              menteeId: mId,
              title: taskName,
              description: goal,
              subject,
              date: dateStr,
              materials: validMaterials, // 새로운 materials 배열
            }),
          });
          if (!res.ok) throw new Error('할 일 생성에 실패했습니다.');
        }
      }

      const totalCount = targetMenteeIds.length * dates.length;
      const successMessage = `${totalCount}개의 할 일이 등록되었습니다.`;
      toast.success(successMessage);
      router.push('/mentor');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-10 py-10">
      <div className="max-w-[1080px] ml-auto">
        <div className="text-[16px] font-bold text-gray-900">학습 과제 등록</div>

        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-6">
          {/* 멘티 선택 */}
          <div className="space-y-3">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  toggleMentee(e.target.value);
                  e.target.value = '';
                }
              }}
              className="w-full rounded-lg bg-white px-4 py-3 text-[12px] text-gray-700 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-200"
              disabled={assignMode === 'all'}
            >
              <option value="" disabled>
                멘티를 선택해 주세요.
              </option>
              {mentees
                .filter(m => !selectedMenteeIds.includes(m.id))
                .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* 선택된 멘티 목록 */}
            {assignMode === 'one' && selectedMenteeIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedMenteeIds.map(id => {
                  const mentee = mentees.find(m => m.id === id);
                  if (!mentee) return null;
                  return (
                    <div key={id} className="h-8 px-2.5 bg-gray-200 rounded-[8px] inline-flex justify-start items-center gap-1.5">
                      <div className="justify-start text-black text-[13px] font-medium font-['Pretendard']">
                        {mentee.name} 멘티
                      </div>
                      <button 
                        type="button"
                        onClick={() => toggleMentee(id)}
                        className="size-3 bg-gray-400 rounded-full flex items-center justify-center text-white text-[8px] hover:bg-gray-500 transition"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 대상 모드 */}
          <div className="mt-3 flex gap-2">
            <ToggleChip active={assignMode === 'one'} label="선택 멘티" onClick={() => setAssignMode('one')} />
            <ToggleChip 
              active={assignMode === 'all'} 
              label="전체 멘티" 
              onClick={() => {
                setAssignMode('all');
                setSelectedMenteeIds([]);
              }} 
            />
          </div>

          {/* 학습 날짜 */}
          <div className="mt-6 text-[12px] font-bold text-gray-800">학습 날짜</div>
          <div className="mt-3 space-y-4">
            <div>
              <RadioRow active={dateMode === 'single'} label="단일 날짜" onClick={() => setDateMode('single')} />
              {dateMode === 'single' && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className="h-10 w-[220px] rounded-md bg-gray-100 px-3 text-[12px] text-gray-700 outline-none"
                  />
                  <span className="text-[12px] text-gray-400">일</span>
                </div>
              )}
            </div>

            <div>
              <RadioRow active={dateMode === 'range'} label="반복 날짜" onClick={() => setDateMode('range')} />
              {dateMode === 'range' && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 w-[220px] rounded-md bg-gray-100 px-3 text-[12px] text-gray-700 outline-none"
                  />
                  <span className="text-[12px] text-gray-400">~</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 w-[220px] rounded-md bg-gray-100 px-3 text-[12px] text-gray-700 outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 요일 선택 - 반복 날짜일 때만 표시 */}
          {dateMode === 'range' && (
            <>
              <div className="mt-6 text-[12px] font-bold text-gray-800">요일 선택</div>
              <div className="mt-3 flex gap-2">
                {WEEKDAYS.map((d) => (
                  <DayCircle
                    key={d.key}
                    label={d.label}
                    active={weekdays.includes(d.key)}
                    onClick={() => toggleWeekday(d.key)}
                  />
                ))}
              </div>
            </>
          )}

          {/* 과제 이름 */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-bold text-gray-800">과제 이름</div>
              <div className="text-[11px] text-gray-400">{taskName.length}/50</div>
            </div>
            <input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value.slice(0, 50))}
              placeholder="과제명을 작성해 주세요."
              className="mt-2 h-10 w-full rounded-md bg-white px-3 text-[12px] text-gray-700 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* 목표 */}
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-bold text-gray-800">목표</div>
              <div className="text-[11px] text-gray-400">{goal.length}/500</div>
            </div>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value.slice(0, 500))}
              placeholder="학습 목표를 작성해 주세요."
              className="mt-2 h-[120px] w-full resize-none rounded-md bg-white px-3 py-3 text-[12px] text-gray-700 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* 학습 과목 */}
          <div className="mt-10 text-[12px] font-bold text-gray-800">학습 과목</div>
          <div className="mt-3 flex gap-3">
            {(['KOREAN', 'ENGLISH', 'MATH'] as Subject[]).map((s) => {
              const active = subject === s;
              const label = s === 'KOREAN' ? '국어' : s === 'ENGLISH' ? '영어' : '수학';
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubject(s)}
                  className={[
                    'h-10 w-[110px] rounded-md border text-[12px] font-semibold transition',
                    active ? 'bg-[#0B2B5B] text-white border-[#0B2B5B]' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 학습 자료 등록 */}
          <div className="mt-8">
            <div className="text-[12px] font-bold text-gray-800">
              학습 자료 등록 ({materials.length}/{FILE_LIMITS.MAX_TASK_MATERIALS})
            </div>
            <div className="mt-1 text-[10px] text-gray-500">
              PDF, 칼럼, 학습지를 합쳐 최대 {FILE_LIMITS.MAX_TASK_MATERIALS}개까지 등록 가능합니다.
            </div>
          </div>

          {/* 자료실에서 불러오기 */}
          <div className="mt-3 rounded-md bg-gray-200 p-3">
            <button
              type="button"
              onClick={() => setLibraryOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-md bg-gray-300 px-4 py-3 text-left"
            >
              <span className="text-[12px] font-bold text-gray-800">📚 자료실에서 불러오기</span>
              <span className="text-[14px] text-gray-700">{libraryOpen ? '▾' : '▸'}</span>
            </button>

            {libraryOpen && (
              <div className="mt-3 rounded-md bg-white p-3 max-h-[300px] overflow-y-auto">
                {worksheets.filter((w) => w.subject === subject).length === 0 ? (
                  <div className="text-[12px] text-gray-500 text-center py-4">
                    {subject === 'KOREAN' ? '국어' : subject === 'ENGLISH' ? '영어' : '수학'} 과목의 등록된 학습지가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {worksheets
                      .filter((w) => w.subject === subject)
                      .map((worksheet) => {
                        const subjectLabel =
                          worksheet.subject === 'KOREAN' ? '국어' :
                          worksheet.subject === 'ENGLISH' ? '영어' : '수학';
                        const subjectColor =
                          worksheet.subject === 'KOREAN' ? 'bg-pink-100 text-pink-600' :
                          worksheet.subject === 'ENGLISH' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-blue-100 text-blue-600';
                        const typeLabel = worksheet.type === 'PDF' ? '📄 PDF' : '📝 칼럼';
                        const typeColor =
                          worksheet.type === 'PDF' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600';

                        return (
                          <button
                            key={worksheet.id}
                            type="button"
                            onClick={() => handleWorksheetSelect(worksheet.id)}
                            className="w-full flex items-center gap-2 rounded-md p-3 text-left transition bg-gray-50 border border-gray-200 hover:bg-gray-100"
                          >
                            <span className={`text-[10px] font-semibold px-2 py-1 rounded ${subjectColor}`}>
                              {subjectLabel}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-1 rounded ${typeColor}`}>
                              {typeLabel}
                            </span>
                            <span className="text-[12px] text-gray-700 flex-1">
                              {worksheet.title}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 등록된 학습 자료 목록 */}
          <div className="mt-4 space-y-2">
            {materials.map((material, index) => (
              <div key={index} className="rounded-md bg-gray-100 p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[11px] font-semibold text-gray-600">
                      {material.type === 'PDF' ? '📄 PDF' : '📝 칼럼'}
                    </span>
                    {material.source === 'worksheet' && material.worksheetTitle && (
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        학습지: {material.worksheetTitle}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMaterial(index)}
                    className="text-[11px] text-red-500 hover:text-red-700"
                  >
                    ✕ 삭제
                  </button>
                </div>

                {material.type === 'PDF' && material.pdfUrl && (
                  <div className="text-[11px] text-gray-600 truncate">
                    {material.pdfFileName || material.pdfUrl.split('/').pop()}
                  </div>
                )}

                {material.type === 'COLUMN' && material.source === 'direct' && (
                  <div className="space-y-2">
                    <div>
                      <input
                        value={material.columnTitle || ''}
                        onChange={(e) => updateMaterial(index, 'columnTitle', e.target.value.slice(0, 50))}
                        placeholder="제목 작성"
                        className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-[12px] text-gray-700 outline-none focus:ring-2 focus:ring-blue-200"
                      />
                      <div className="mt-1 text-right text-[10px] text-gray-400">
                        {(material.columnTitle || '').length}/50
                      </div>
                    </div>
                    <div>
                      <textarea
                        value={material.columnContent || ''}
                        onChange={(e) => updateMaterial(index, 'columnContent', e.target.value.slice(0, 1000))}
                        placeholder="내용 입력"
                        className="h-[120px] w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-3 text-[12px] text-gray-700 outline-none focus:ring-2 focus:ring-blue-200"
                      />
                      <div className="mt-1 text-right text-[10px] text-gray-400">
                        {(material.columnContent || '').length}/1000
                      </div>
                    </div>
                  </div>
                )}

                {material.type === 'COLUMN' && material.source === 'worksheet' && (
                  <div className="text-[11px] text-gray-600 space-y-1">
                    {material.columnTitle && (
                      <div className="font-semibold">{material.columnTitle}</div>
                    )}
                    {material.columnContent && (
                      <div className="text-gray-500 line-clamp-2">{material.columnContent}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 자료 추가 버튼들 */}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={addColumn}
              disabled={materials.length >= FILE_LIMITS.MAX_TASK_MATERIALS}
              className="flex-1 rounded-md border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-[12px] font-semibold text-gray-600 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + 칼럼 추가
            </button>
            <label
              className={[
                'flex-1 rounded-md border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-[12px] font-semibold text-gray-600 text-center transition',
                materials.length >= FILE_LIMITS.MAX_TASK_MATERIALS || isUploading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-100 cursor-pointer',
              ].join(' ')}
            >
              {isUploading ? '업로드 중...' : '+ PDF 업로드'}
              <input
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={handlePdfUpload}
                disabled={materials.length >= FILE_LIMITS.MAX_TASK_MATERIALS || isUploading}
              />
            </label>
          </div>

          {/* 하단 버튼 */}
          <div className="mt-6 flex gap-4">
            <button
              type="button"
              onClick={() => {
                setMaterials([]);
                router.back();
              }}
              className="h-12 flex-1 rounded-md bg-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-300 transition"
            >
              취소
            </button>

            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="h-12 flex-[2] rounded-md bg-[#BBD9FF] text-[12px] font-semibold text-[#0B2B5B] hover:bg-[#AFCFFF] transition disabled:opacity-50"
            >
              {isSubmitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
