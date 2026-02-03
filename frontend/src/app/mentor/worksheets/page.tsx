'use client';
import { getApiUrl } from '@/lib/api';

import { useEffect, useState } from 'react';

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

interface Topic {
  title: string;
  description: string;
}

export default function WorksheetsPage() {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [filteredSubject, setFilteredSubject] = useState<Subject | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWorksheet, setEditingWorksheet] = useState<Worksheet | null>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    title: '',
    subject: 'KOREAN' as Subject,
    type: 'COLUMN' as WorksheetType,
  });
  const [topics, setTopics] = useState<Topic[]>([{ title: '', description: '' }]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 학습지 목록 가져오기
  const fetchWorksheets = async (subject?: Subject | 'ALL') => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = subject && subject !== 'ALL'
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

  // 주제 추가
  const addTopic = () => {
    setTopics([...topics, { title: '', description: '' }]);
  };

  // 주제 삭제
  const removeTopic = (index: number) => {
    if (topics.length === 1) {
      alert('최소 1개의 주제가 필요합니다.');
      return;
    }
    setTopics(topics.filter((_, i) => i !== index));
  };

  // 주제 업데이트
  const updateTopic = (index: number, field: 'title' | 'description', value: string) => {
    const newTopics = [...topics];
    newTopics[index][field] = value;
    setTopics(newTopics);
  };

  // PDF 파일 업로드 (백엔드 API 사용)
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('PDF 파일만 업로드 가능합니다.');
      return;
    }

    setPdfFile(file);
    setIsUploading(true);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('pdf', file);

      const res = await fetch(`${getApiUrl()}/api/upload/pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Upload error:', errorData);
        throw new Error(errorData.error || 'PDF 업로드에 실패했습니다.');
      }

      const data = await res.json();
      setPdfUrl(data.url);
      alert('PDF가 업로드되었습니다.');
    } catch (err) {
      console.error('Upload error:', err);
      alert(err instanceof Error ? err.message : 'PDF 업로드 중 오류가 발생했습니다.');
      setPdfFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  // 학습지 생성
  const handleCreateWorksheet = async (e: React.FormEvent) => {
    e.preventDefault();

    // 이미 제출 중이면 무시 (더블클릭 방지)
    if (isSubmitting || isUploading) return;

    if (!formData.title) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (formData.type === 'COLUMN') {
      const hasEmptyTopic = topics.some(t => !t.title || !t.description);
      if (hasEmptyTopic) {
        alert('모든 주제의 제목과 설명을 입력해주세요.');
        return;
      }
    }

    if (formData.type === 'PDF' && !pdfUrl) {
      alert('PDF 파일을 업로드해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/mentor/worksheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          subject: formData.subject,
          type: formData.type,
          content: formData.type === 'COLUMN' ? JSON.stringify({ topics }) : null,
          pdfUrl: formData.type === 'PDF' ? pdfUrl : null,
        }),
      });

      if (!res.ok) throw new Error('학습지 생성에 실패했습니다.');

      alert('학습지가 생성되었습니다.');
      handleCloseModal();
      fetchWorksheets(filteredSubject === 'ALL' ? undefined : filteredSubject);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 모달 닫기 및 초기화
  const handleCloseModal = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingWorksheet(null);
    setFormData({
      title: '',
      subject: 'KOREAN',
      type: 'COLUMN',
    });
    setTopics([{ title: '', description: '' }]);
    setPdfFile(null);
    setPdfUrl('');
  };

  // 수정 모달 열기
  const openEditModal = (worksheet: Worksheet) => {
    setEditingWorksheet(worksheet);
    setFormData({
      title: worksheet.title,
      subject: worksheet.subject,
      type: worksheet.type,
    });

    // 기존 데이터 로드
    if (worksheet.type === 'COLUMN' && worksheet.content) {
      const parsedContent = parseContent(worksheet.content);
      if (parsedContent?.topics) {
        setTopics(parsedContent.topics);
      }
    } else if (worksheet.type === 'PDF' && worksheet.pdfUrl) {
      setPdfUrl(worksheet.pdfUrl);
    }

    setShowEditModal(true);
  };

  // 학습지 수정
  const handleUpdateWorksheet = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || isUploading || !editingWorksheet) return;

    if (!formData.title) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (formData.type === 'COLUMN') {
      const hasEmptyTopic = topics.some(t => !t.title || !t.description);
      if (hasEmptyTopic) {
        alert('모든 주제의 제목과 설명을 입력해주세요.');
        return;
      }
    }

    if (formData.type === 'PDF' && !pdfUrl) {
      alert('PDF 파일을 업로드해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${getApiUrl()}/api/mentor/worksheets/${editingWorksheet.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          subject: formData.subject,
          type: formData.type,
          content: formData.type === 'COLUMN' ? JSON.stringify({ topics }) : null,
          pdfUrl: formData.type === 'PDF' ? pdfUrl : null,
        }),
      });

      if (!res.ok) throw new Error('학습지 수정에 실패했습니다.');

      alert('학습지가 수정되었습니다.');
      handleCloseModal();
      fetchWorksheets(filteredSubject === 'ALL' ? undefined : filteredSubject);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 학습지 삭제
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

  // content 파싱 헬퍼
  const parseContent = (content: string | null) => {
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  };


  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">학습지 관리</h2>
        <p className="text-gray-900">칼럼과 PDF 학습자료를 관리합니다</p>
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
        <p className="text-center text-gray-900">로딩 중...</p>
      ) : worksheets.length === 0 ? (
        <p className="text-center text-gray-900">학습지가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {worksheets.map((worksheet) => {
            const parsedContent = parseContent(worksheet.content);

            return (
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

                {worksheet.type === 'COLUMN' && parsedContent?.topics && (
                  <div className="text-sm text-gray-900 mb-3">
                    <p className="font-medium mb-1">주제:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {parsedContent.topics.slice(0, 3).map((topic: Topic, idx: number) => (
                        <li key={idx} className="line-clamp-1">
                          {topic.title}
                        </li>
                      ))}
                      {parsedContent.topics.length > 3 && (
                        <li className="text-gray-900">
                          외 {parsedContent.topics.length - 3}개
                        </li>
                      )}
                    </ul>
                  </div>
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

                <p className="text-xs text-gray-900 mb-3">
                  {new Date(worksheet.createdAt).toLocaleDateString('ko-KR')}
                </p>

                {/* 수정/삭제 버튼 */}
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <button
                    onClick={() => openEditModal(worksheet)}
                    className="flex-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDeleteWorksheet(worksheet.id)}
                    className="flex-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded"
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
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
                  onChange={(e) => {
                    setFormData({ ...formData, type: e.target.value as WorksheetType });
                    // 타입 변경 시 초기화
                    setTopics([{ title: '', description: '' }]);
                    setPdfFile(null);
                    setPdfUrl('');
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="COLUMN">칼럼 (주제 기반)</option>
                  <option value="PDF">PDF 파일</option>
                </select>
              </div>

              {/* 칼럼 - 주제 입력 */}
              {formData.type === 'COLUMN' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    주제 목록 <span className="text-red-600">*</span>
                  </label>
                  <div className="space-y-3">
                    {topics.map((topic, index) => (
                      <div key={index} className="border rounded-lg p-4 relative">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            주제 {index + 1}
                          </span>
                          {topics.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTopic(index)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={topic.title}
                            onChange={(e) => updateTopic(index, 'title', e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            placeholder="주제 제목 (예: 극한의 개념)"
                            required
                          />
                          <input
                            type="text"
                            value={topic.description}
                            onChange={(e) => updateTopic(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            placeholder="주제 설명 (예: 함수의 극한값 이해하기)"
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addTopic}
                    className="mt-3 w-full px-4 py-2 border border-dashed rounded-lg text-sm text-gray-900 hover:bg-gray-50"
                  >
                    + 주제 추가
                  </button>
                </div>
              )}

              {/* PDF 업로드 */}
              {formData.type === 'PDF' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    PDF 파일 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    disabled={isUploading}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                  {isUploading && (
                    <p className="text-xs text-blue-600 mt-2">업로드 중...</p>
                  )}
                  {pdfFile && pdfUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-green-600">✓ 업로드 완료:</span>
                      <span className="text-xs text-gray-900">{pdfFile.name}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-900 mt-1">
                    PDF 파일을 선택하면 자동으로 업로드됩니다
                  </p>
                </div>
              )}

              {/* 버튼 */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
                >
                  {isSubmitting ? '생성 중...' : '생성하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {showEditModal && editingWorksheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">학습지 수정</h3>

            <form onSubmit={handleUpdateWorksheet} className="space-y-4">
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

              {/* 타입 (수정 시 변경 불가) */}
              <div>
                <label className="block text-sm font-medium mb-2">타입</label>
                <input
                  type="text"
                  value={formData.type === 'COLUMN' ? '칼럼 (주제 기반)' : 'PDF 파일'}
                  disabled
                  className="w-full px-3 py-2 border rounded-md bg-gray-100 text-gray-900"
                />
              </div>

              {/* 칼럼 - 주제 입력 */}
              {formData.type === 'COLUMN' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    주제 목록 <span className="text-red-600">*</span>
                  </label>
                  <div className="space-y-3">
                    {topics.map((topic, index) => (
                      <div key={index} className="border rounded-lg p-4 relative">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            주제 {index + 1}
                          </span>
                          {topics.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTopic(index)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={topic.title}
                            onChange={(e) => updateTopic(index, 'title', e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            placeholder="주제 제목"
                            required
                          />
                          <input
                            type="text"
                            value={topic.description}
                            onChange={(e) => updateTopic(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            placeholder="주제 설명"
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addTopic}
                    className="mt-3 w-full px-4 py-2 border border-dashed rounded-lg text-sm text-gray-900 hover:bg-gray-50"
                  >
                    + 주제 추가
                  </button>
                </div>
              )}

              {/* PDF 업로드 */}
              {formData.type === 'PDF' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    PDF 파일 <span className="text-red-600">*</span>
                  </label>
                  {pdfUrl && (
                    <div className="mb-2">
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        📄 현재 PDF 보기
                      </a>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    disabled={isUploading}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                  {isUploading && (
                    <p className="text-xs text-blue-600 mt-2">업로드 중...</p>
                  )}
                  {pdfFile && pdfUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-green-600">✓ 새 파일 업로드 완료</span>
                    </div>
                  )}
                </div>
              )}

              {/* 버튼 */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
                >
                  {isSubmitting ? '수정 중...' : '수정하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
