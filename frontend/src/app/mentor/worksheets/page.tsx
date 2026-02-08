'use client';
import { getApiUrl } from '@/lib/api';
import { EditIcon, DeleteIcon } from '@/components/icons';
import { getSubjectLabel, SUBJECT_LABELS } from '@/constants/subjects';
import { FiSearch } from 'react-icons/fi';
import { HiOutlineDocumentText } from 'react-icons/hi2';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH';
type WorksheetType = 'COLUMN' | 'PDF';

interface Worksheet {
  id: string;
  title: string;
  subject: Subject;
  content: string | null;
  pdfUrl: string | null;
  type: WorksheetType;
  createdAt: string;
}

function FilterChip({
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
        'h-9 rounded-md px-4 text-[12px] font-semibold transition border',
        active ? 'bg-[#0B2B5B] text-white border-[#0B2B5B]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function subjectIconBg(subject: Subject) {
  if (subject === 'MATH') return 'bg-blue-100 text-blue-600';
  if (subject === 'ENGLISH') return 'bg-yellow-100 text-yellow-700';
  return 'bg-pink-100 text-pink-600';
}

export default function WorksheetsPage() {
  const router = useRouter();
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [filteredSubject, setFilteredSubject] = useState<Subject | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [q, setQ] = useState('');

  const fetchWorksheets = async (subject?: Subject | 'ALL') => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url =
        subject && subject !== 'ALL'
          ? `${getApiUrl()}/api/mentor/worksheets?subject=${subject}`
          : `${getApiUrl()}/api/mentor/worksheets`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('API Error:', res.status, errorData);
        throw new Error(errorData.error || '학습지 목록을 불러오는데 실패했습니다.');
      }

      const data = await res.json();
      setWorksheets(data);
    } catch (err) {
      console.error('Fetch worksheets error:', err);
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorksheets(filteredSubject);
  }, [filteredSubject]);

  const items = useMemo(() => {
    const keyword = q.trim();
    if (!keyword) return worksheets;
    return worksheets.filter((x) => x.title.includes(keyword));
  }, [q, worksheets]);

  const handleDeleteWorksheet = async (worksheetId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/mentor/worksheets/${worksheetId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('학습지 삭제에 실패했습니다.');

      alert('학습지가 삭제되었습니다.');
      fetchWorksheets(filteredSubject === 'ALL' ? undefined : filteredSubject);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  return (
    <div className="px-10 py-10">
      <div className="max-w-[900px]">
        {/* 검색 + 등록 버튼 */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="검색어를 입력해주세요."
              className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-4 pr-10 text-[12px] text-gray-700 outline-none focus:ring-2 focus:ring-blue-200"
            />
            <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <button
            type="button"
            onClick={() => router.push('/mentor/worksheets/new')}
            className="h-11 rounded-lg border border-gray-200 bg-white px-4 text-[12px] font-semibold text-gray-800 hover:bg-gray-50"
          >
            + 학습지 신규 등록
          </button>
        </div>

        {/* 필터 칩 */}
        <div className="mt-4 flex gap-2">
          <FilterChip active={filteredSubject === 'ALL'} label="전체" onClick={() => setFilteredSubject('ALL')} />
          <FilterChip
            active={filteredSubject === 'KOREAN'}
            label="국어"
            onClick={() => setFilteredSubject('KOREAN')}
          />
          <FilterChip
            active={filteredSubject === 'ENGLISH'}
            label="영어"
            onClick={() => setFilteredSubject('ENGLISH')}
          />
          <FilterChip active={filteredSubject === 'MATH'} label="수학" onClick={() => setFilteredSubject('MATH')} />
        </div>

        {/* 리스트 */}
        <div className="mt-8 space-y-4">
          {items.map((it) => {
            return (
              <div
                key={it.id}
                className="w-full rounded-2xl bg-white p-5 shadow-sm border border-gray-100 hover:shadow-md transition text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={['h-12 w-12 rounded-xl grid place-items-center', subjectIconBg(it.subject)].join(' ')}>
                    <HiOutlineDocumentText className="text-[22px]" />
                  </div>

                  <div className="flex-1">
                    <div className="text-[14px] font-bold text-gray-900">{it.title}</div>
                    <div className="mt-1 text-[11px] text-gray-400">
                      {getSubjectLabel(it.subject)} · {it.createdAt.split('T')[0]}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/mentor/worksheets/${it.id}/edit`);
                      }}
                      className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                      title="수정"
                    >
                      <EditIcon size={20} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWorksheet(it.id);
                      }}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      title="삭제"
                    >
                      <DeleteIcon size={20} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {items.length === 0 && !isLoading && (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center text-[13px] text-gray-500">
              검색 결과가 없어요.
            </div>
          )}

          {isLoading && (
            <div className="text-center p-8 text-gray-400">불러오는 중...</div>
          )}
        </div>
      </div>
    </div>
  );
}