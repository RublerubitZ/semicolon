'use client';

import { useEffect, useState } from 'react';
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

export default function WorksheetsPage() {
  const router = useRouter();
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [filteredSubject, setFilteredSubject] = useState<Subject | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState({
    title: '',
    subject: 'KOREAN' as Subject,
    type: 'COLUMN' as WorksheetType,
    content: '',
    pdfUrl: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 학습지 목록 가져오기
  const fetchWorksheets = async (subject?: Subject | 'ALL') => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = subject && subject !== 'ALL'
        ? `http://localhost:4000/api/mentor/worksheets?subject=${subject}`
        : 'http://localhost:4000/api/mentor/worksheets';

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('학습지 목록을 불러오는데 실패했습니다.');

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

  // 학습지 생성
  const handleCreateWorksheet = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (formData.type === 'COLUMN' && !formData.content) {
      alert('칼럼 내용을 입력해주세요.');
      return;
    }

    if (formData.type === 'PDF' && !formData.pdfUrl) {
      alert('PDF URL을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      const res = await fetch('http://localhost:4000/api/mentor/worksheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          subject: formData.subject,
          type: formData.type,
          content: formData.type === 'COLUMN' ? formData.content : null,
          pdfUrl: formData.type === 'PDF' ? formData.pdfUrl : null,
        }),
      });

      if (!res.ok) throw new Error('학습지 생성에 실패했습니다.');

      alert('학습지가 생성되었습니다.');
      setShowCreateModal(false);
      setFormData({
        title: '',
        subject: 'KOREAN',
        type: 'COLUMN',
        content: '',
        pdfUrl: '',
      });
      fetchWorksheets(filteredSubject === 'ALL' ? undefined : filteredSubject);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSubjectLabel = (subject: Subject) => {
    const labels = { KOREAN: '국어', ENGLISH: '영어', MATH: '수학' };
    return labels[subject];
  };

  const getSubjectColor = (subject: Subject) => {
    const colors = {
      KOREAN: 'bg-blue-100 text-blue-700',
      ENGLISH: 'bg-green-100 text-green-700',
      MATH: 'bg-orange-100 text-orange-700',
    };
    return colors[subject];
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">학습지 관리</h2>
        <p className="text-gray-600">칼럼과 PDF 학습자료를 관리합니다</p>
      </div>

      {/* 필터 및 액션 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilteredSubject('ALL')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filteredSubject === 'ALL'
                ? 'bg-black text-white'
                : 'bg-white border hover:bg-gray-50'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setFilteredSubject('KOREAN')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filteredSubject === 'KOREAN'
                ? 'bg-black text-white'
                : 'bg-white border hover:bg-gray-50'
            }`}
          >
            국어
          </button>
          <button
            onClick={() => setFilteredSubject('ENGLISH')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filteredSubject === 'ENGLISH'
                ? 'bg-black text-white'
                : 'bg-white border hover:bg-gray-50'
            }`}
          >
            영어
          </button>
          <button
            onClick={() => setFilteredSubject('MATH')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filteredSubject === 'MATH'
                ? 'bg-black text-white'
                : 'bg-white border hover:bg-gray-50'
            }`}
          >
            수학
          </button>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
        >
          + 학습지 생성
        </button>
      </div>

      {/* 학습지 목록 */}
      {isLoading ? (
        <p className="text-center text-gray-500">로딩 중...</p>
      ) : worksheets.length === 0 ? (
        <p className="text-center text-gray-500">학습지가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {worksheets.map((worksheet) => (
            <div
              key={worksheet.id}
              className="bg-white p-6 rounded-lg border hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <span
                  className={`text-xs px-2 py-1 rounded ${getSubjectColor(
                    worksheet.subject
                  )}`}
                >
                  {getSubjectLabel(worksheet.subject)}
                </span>
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                  {worksheet.type === 'COLUMN' ? '칼럼' : 'PDF'}
                </span>
              </div>

              <h4 className="font-semibold mb-2">{worksheet.title}</h4>

              {worksheet.type === 'COLUMN' && worksheet.content && (
                <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                  {worksheet.content}
                </p>
              )}

              {worksheet.type === 'PDF' && worksheet.pdfUrl && (
                <a
                  href={worksheet.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline mb-3 block"
                >
                  📄 PDF 보기
                </a>
              )}

              <p className="text-xs text-gray-500">
                {new Date(worksheet.createdAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">학습지 생성</h3>

            <form onSubmit={handleCreateWorksheet} className="space-y-4">
              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  제목 <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="예: 비문학 독해 핵심 전략"
                  required
                />
              </div>

              {/* 과목 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  과목 <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value as Subject })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="KOREAN">국어</option>
                  <option value="ENGLISH">영어</option>
                  <option value="MATH">수학</option>
                </select>
              </div>

              {/* 타입 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  타입 <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as WorksheetType })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="COLUMN">칼럼 (텍스트)</option>
                  <option value="PDF">PDF 파일</option>
                </select>
              </div>

              {/* 칼럼 내용 */}
              {formData.type === 'COLUMN' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    내용 <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md resize-none"
                    rows={8}
                    placeholder="칼럼 내용을 입력하세요"
                    required
                  />
                </div>
              )}

              {/* PDF URL */}
              {formData.type === 'PDF' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    PDF URL <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="url"
                    value={formData.pdfUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, pdfUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="https://example.com/worksheet.pdf"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cloudinary 등에 업로드한 PDF URL을 입력하세요
                  </p>
                </div>
              )}

              {/* 버튼 */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      title: '',
                      subject: 'KOREAN',
                      type: 'COLUMN',
                      content: '',
                      pdfUrl: '',
                    });
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
                >
                  {isSubmitting ? '생성 중...' : '생성하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
