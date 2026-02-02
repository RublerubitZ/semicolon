'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

type Subject = 'KOREAN' | 'ENGLISH' | 'MATH';

interface Worksheet {
  id: string;
  title: string;
  subject: Subject;
  content?: any;
  pdfUrl?: string;
  type: 'COLUMN' | 'PDF';
}

interface Feedback {
  id: string;
  content: string;
  summary?: string;
  subject: Subject;
  feedbackDate: string;
  mentor: {
    name: string;
  };
}

interface Submission {
  id: string;
  imageUrls: string[];
  comment?: string;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  subject: Subject;
  date: string;
  isCompleted: boolean;
  isFixed: boolean;
  worksheet?: Worksheet;
  feedbacks: Feedback[];
  submissions: Submission[];
  studyLogs: any[];
}

const SUBJECT_LABELS: Record<Subject, { label: string; color: string }> = {
  KOREAN: { label: '국어', color: 'bg-blue-100 text-blue-800' },
  ENGLISH: { label: '영어', color: 'bg-green-100 text-green-800' },
  MATH: { label: '수학', color: 'bg-purple-100 text-purple-800' },
};

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // 과제 제출 상태
  const [showSubmitSection, setShowSubmitSection] = useState(false);
  const [submitComment, setSubmitComment] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 과제 상세 조회
  const fetchTaskDetail = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`http://localhost:4000/api/mentee/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('과제를 불러오는데 실패했습니다.');
      }

      const data = await res.json();
      setTask(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 이미지 파일 선택
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedImages([...selectedImages, ...files]);
    }
  };

  // 이미지 업로드
  const handleImageUpload = async () => {
    if (selectedImages.length === 0) {
      alert('업로드할 이미지를 선택해주세요.');
      return;
    }

    setIsUploading(true);
    const urls: string[] = [];

    try {
      const token = localStorage.getItem('token');

      for (const file of selectedImages) {
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch('http://localhost:4000/api/upload/image', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!res.ok) {
          throw new Error('이미지 업로드에 실패했습니다.');
        }

        const data = await res.json();
        urls.push(data.url);
      }

      setUploadedImageUrls([...uploadedImageUrls, ...urls]);
      setSelectedImages([]);
      alert(`${urls.length}개의 이미지가 업로드되었습니다.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  // 과제 제출
  const handleSubmitTask = async () => {
    if (uploadedImageUrls.length === 0) {
      alert('최소 1개의 이미지를 업로드해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`http://localhost:4000/api/mentee/tasks/${taskId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageUrls: uploadedImageUrls,
          comment: submitComment,
        }),
      });

      if (!res.ok) {
        throw new Error('과제 제출에 실패했습니다.');
      }

      alert('과제가 제출되었습니다.');
      setShowSubmitSection(false);
      setSubmitComment('');
      setUploadedImageUrls([]);
      fetchTaskDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  useEffect(() => {
    if (taskId) {
      fetchTaskDetail();
    }
  }, [taskId]);

  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-center text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="p-4">
        <p className="text-center text-red-500">{error || '과제를 찾을 수 없습니다.'}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 mx-auto block px-4 py-2 bg-gray-200 rounded"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-2xl">
            ←
          </button>
          <h1 className="text-lg font-bold">과제 상세</h1>
        </div>
      </div>

      {/* 과제 정보 */}
      <div className="bg-white p-4 mb-2">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-1 rounded ${SUBJECT_LABELS[task.subject].color}`}>
            {SUBJECT_LABELS[task.subject].label}
          </span>
          {task.isFixed && <span className="text-xs text-gray-500">멘토 고정</span>}
          {task.isCompleted && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">완료</span>
          )}
        </div>

        <h2 className="text-xl font-bold mb-2">{task.title}</h2>

        {task.description && <p className="text-gray-700 mb-2">{task.description}</p>}

        <p className="text-sm text-gray-500">📅 {formatDate(task.date)}</p>

        {task.studyLogs.length > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            ⏱️ 공부 시간:{' '}
            {task.studyLogs.reduce((sum, log) => sum + log.duration, 0)}분
          </p>
        )}
      </div>

      {/* 학습지 */}
      {task.worksheet && (
        <div className="bg-white p-4 mb-2">
          <h3 className="text-lg font-bold mb-3">📄 학습지</h3>

          <div className="mb-3">
            <p className="font-semibold text-gray-800">{task.worksheet.title}</p>
            <span className={`text-xs px-2 py-1 rounded inline-block mt-1 ${SUBJECT_LABELS[task.worksheet.subject].color}`}>
              {SUBJECT_LABELS[task.worksheet.subject].label}
            </span>
          </div>

          {/* PDF 다운로드 */}
          {task.worksheet.type === 'PDF' && task.worksheet.pdfUrl && (
            <div className="mb-4">
              <a
                href={task.worksheet.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <span>📥</span>
                <span>PDF 다운로드</span>
              </a>
            </div>
          )}

          {/* 칼럼 형식 콘텐츠 */}
          {task.worksheet.type === 'COLUMN' && task.worksheet.content && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="prose prose-sm max-w-none">
                {task.worksheet.content.sections &&
                  task.worksheet.content.sections.map((section: any, idx: number) => (
                    <div key={idx} className="mb-4">
                      <h4 className="font-bold text-gray-900 mb-2">{section.title}</h4>
                      <p className="text-gray-700 whitespace-pre-wrap">{section.content}</p>
                    </div>
                  ))}

                {task.worksheet.content.vocabulary && (
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">필수 어휘</h4>
                    <ul className="space-y-1">
                      {task.worksheet.content.vocabulary.map((item: any, idx: number) => (
                        <li key={idx} className="text-gray-700">
                          <span className="font-semibold">{item.word}</span> - {item.meaning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {task.worksheet.content.topics && (
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">학습 주제</h4>
                    <ul className="space-y-2">
                      {task.worksheet.content.topics.map((topic: any, idx: number) => (
                        <li key={idx}>
                          <p className="font-semibold text-gray-900">{topic.title}</p>
                          <p className="text-gray-700 text-sm">{topic.description}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 피드백 */}
      {task.feedbacks.length > 0 && (
        <div className="bg-white p-4 mb-2">
          <h3 className="text-lg font-bold mb-3">💬 피드백</h3>
          {task.feedbacks.map((feedback) => (
            <div key={feedback.id} className="border rounded-lg p-3 mb-3 last:mb-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900">
                  {feedback.mentor.name} 멘토
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(feedback.feedbackDate)}
                </span>
              </div>

              {feedback.summary && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 mb-2">
                  <p className="text-sm font-semibold text-yellow-900">요약</p>
                  <p className="text-sm text-yellow-800">{feedback.summary}</p>
                </div>
              )}

              <p className="text-gray-700 whitespace-pre-wrap">{feedback.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* 제출 내역 */}
      {task.submissions.length > 0 && (
        <div className="bg-white p-4 mb-2">
          <h3 className="text-lg font-bold mb-3">📤 제출 내역</h3>
          {task.submissions.map((submission) => (
            <div key={submission.id} className="border rounded-lg p-3 mb-3 last:mb-0">
              <p className="text-xs text-gray-500 mb-2">
                제출일: {new Date(submission.createdAt).toLocaleString('ko-KR')}
              </p>

              {submission.comment && (
                <p className="text-sm text-gray-700 mb-2 p-2 bg-gray-50 rounded">
                  {submission.comment}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                {submission.imageUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square bg-gray-100 rounded-lg overflow-hidden"
                  >
                    <img
                      src={url}
                      alt={`제출 이미지 ${idx + 1}`}
                      className="w-full h-full object-cover hover:opacity-90"
                    />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 과제 제출 버튼 */}
      {!showSubmitSection && (
        <div className="p-4">
          <button
            onClick={() => setShowSubmitSection(true)}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            과제 제출하기
          </button>
        </div>
      )}

      {/* 과제 제출 섹션 */}
      {showSubmitSection && (
        <div className="bg-white p-4">
          <h3 className="text-lg font-bold mb-3">과제 제출</h3>

          {/* 이미지 선택 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">이미지 업로드</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {selectedImages.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-2">
                  선택된 이미지: {selectedImages.length}개
                </p>
                <button
                  onClick={handleImageUpload}
                  disabled={isUploading}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  {isUploading ? '업로드 중...' : '업로드'}
                </button>
              </div>
            )}
          </div>

          {/* 업로드된 이미지 미리보기 */}
          {uploadedImageUrls.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">업로드된 이미지 ({uploadedImageUrls.length}개)</p>
              <div className="grid grid-cols-3 gap-2">
                {uploadedImageUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-square bg-gray-100 rounded overflow-hidden">
                    <img src={url} alt={`업로드 ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setUploadedImageUrls(uploadedImageUrls.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 코멘트 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">코멘트 (선택)</label>
            <textarea
              value={submitComment}
              onChange={(e) => setSubmitComment(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg resize-none"
              rows={3}
              placeholder="제출 관련 코멘트를 입력하세요..."
            />
          </div>

          {/* 제출 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowSubmitSection(false);
                setSubmitComment('');
                setSelectedImages([]);
                setUploadedImageUrls([]);
              }}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
            >
              취소
            </button>
            <button
              onClick={handleSubmitTask}
              disabled={isSubmitting || uploadedImageUrls.length === 0}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSubmitting ? '제출 중...' : '제출'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
