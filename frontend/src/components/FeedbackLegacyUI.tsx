'use client';

interface Feedback {
  id: string;
  content: string;
  summary?: string;
  subject: string;
  feedbackDate: string;
  mentor: {
    name: string;
    nickname?: string;
  };
}

interface FeedbackLegacyUIProps {
  feedback: Feedback;
}

export default function FeedbackLegacyUI({ feedback }: FeedbackLegacyUIProps) {
  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 mb-2">
      <div className="p-4 sm:p-5 md:p-6">
        <h3 className="text-lg sm:text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
          💬 <span>멘토 피드백</span>
        </h3>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 rounded-xl p-4 sm:p-5 border border-blue-100 dark:border-gray-600 shadow-sm">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-blue-200 dark:border-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                {(feedback.mentor.nickname || feedback.mentor.name)[0]}
              </div>
              <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">
                {feedback.mentor.nickname || feedback.mentor.name} 멘토
              </span>
            </div>
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {formatDate(feedback.feedbackDate)}
            </span>
          </div>

          {/* 요약 (있는 경우) */}
          {feedback.summary && (
            <div className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 rounded-lg p-4 mb-4 border-l-4 border-amber-400 dark:border-amber-600 shadow-sm">
              <div className="flex items-start gap-2">
                <span className="text-xl">✨</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1">핵심 요약</p>
                  <p className="text-sm sm:text-base leading-relaxed text-amber-800 dark:text-amber-300 font-medium">
                    {feedback.summary}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 피드백 내용 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-5">
            <p className="text-sm sm:text-base leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {feedback.content}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
